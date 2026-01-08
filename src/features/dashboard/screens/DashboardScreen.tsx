import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  LogBox,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { launchImageLibrary, ImageLibraryOptions, Asset } from 'react-native-image-picker';
import { getAuth } from '@react-native-firebase/auth';
import {
  getFirestore,
  doc,
  onSnapshot,
  setDoc,
  collection,
  query,
  orderBy,
} from '@react-native-firebase/firestore';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

import { useAuth } from '@features/auth/context/AuthContext';
import { isAdminEmail } from '@features/auth/utils/roles';
import { Menu, User as UserIcon, History, LogOut, Calendar } from 'lucide-react-native';
import { colors, surfaces, radii, spacing } from '@shared/theme';
import type { RootStackParamList } from '@app/types';

type UserProfile = {
  firstName?: string;
  lastName?: string;
  coverUrl?: string;
  photoURL?: string;
  coverB64?: string;
  photoB64?: string;
};

type Appointment = {
  id: string;
  vehicleType: 'Carro' | 'Moto';
  carCategory: 'Hatch' | 'Sedan' | 'Caminhonete' | null;
  serviceLabel: string | null;
  price: number | null;
  whenMs: number;
  status: 'scheduled' | 'canceled' | 'done';
};

const COVER_H = 285;
const AVATAR = 130;
const MENU_W = 220;

LogBox.ignoreLogs([
  'SafeAreaView has been deprecated',
  'This method is deprecated (as well as all React Native Firebase namespaced API)',
]);

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function DashboardScreen() {
  const navigation = useNavigation<Nav>();

  const auth = getAuth();
  const user = auth.currentUser!;
  const uid = user.uid;

  const { signOut } = useAuth();

  const [profile, setProfile] = useState<UserProfile>({ photoURL: user.photoURL ?? undefined });
  const [saving, setSaving] = useState<'cover' | 'avatar' | null>(null);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Drawer
  const [menuOpen, setMenuOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const openMenu = () => {
    setMenuOpen(true);
    Animated.timing(anim, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  };
  const closeMenu = () => {
    Animated.timing(anim, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(
      ({ finished }) => finished && setMenuOpen(false)
    );
  };

  const drawerTx = anim.interpolate({ inputRange: [0, 1], outputRange: [-MENU_W, 0] });
  const overlayOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  const isAdmin = isAdminEmail(user.email);

  useEffect(() => {
    const db = getFirestore();

    const userRef = doc(db, 'users', uid);
    const unsubProfile = onSnapshot(userRef, (snap) => {
      const data = snap.data() as UserProfile | undefined;
      if (data) {
        setProfile((p) => ({
          ...p,
          ...data,
          photoURL: data.photoURL ?? p.photoURL ?? user.photoURL ?? undefined,
        }));
      }
    });

    const qy = query(collection(db, 'users', uid, 'appointments'), orderBy('whenMs', 'desc'));

    const unsubList = onSnapshot(
      qy,
      (snap) => {
        const arr: Appointment[] = snap.docs
          .map((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
            const v = d.data() as any;
            if (typeof v?.whenMs !== 'number') return null;

            return {
              id: d.id,
              vehicleType: v.vehicleType ?? 'Carro',
              carCategory: v.carCategory ?? null,
              serviceLabel: v.serviceLabel ?? null,
              price: typeof v.price === 'number' ? v.price : null,
              whenMs: v.whenMs,
              status: (v.status ?? 'scheduled') as Appointment['status'],
            } as Appointment;
          })
          .filter(Boolean) as Appointment[];

        setAppointments(arr);
        setLoadingList(false);
      },
      () => setLoadingList(false)
    );

    return () => {
      unsubProfile();
      unsubList();
    };
  }, [uid, user.photoURL]);

  const pickAsBase64 = async () => {
    const opts: ImageLibraryOptions = {
      mediaType: 'photo',
      selectionLimit: 1,
      includeBase64: true,
      quality: 0.6,
      maxWidth: 640,
      maxHeight: 640,
    };
    const res = await launchImageLibrary(opts);
    if (res.didCancel) return null;
    const a: Asset | undefined = res.assets?.[0];
    if (!a?.base64) return null;
    const mime = a.type && a.type.startsWith('image/') ? a.type : 'image/jpeg';
    return `data:${mime};base64,${a.base64}`;
  };

  const saveCover = async () => {
    try {
      const b64 = await pickAsBase64();
      if (!b64) return;
      setSaving('cover');
      await setDoc(doc(getFirestore(), 'users', uid), { coverB64: b64 }, { merge: true });
      setProfile((p) => ({ ...p, coverB64: b64 }));
    } catch (e: any) {
      Alert.alert('Erro', `Falha ao salvar a capa.\n${e?.code ?? ''}`);
    } finally {
      setSaving(null);
    }
  };

  const saveAvatar = async () => {
    try {
      const b64 = await pickAsBase64();
      if (!b64) return;
      setSaving('avatar');
      await setDoc(doc(getFirestore(), 'users', uid), { photoB64: b64 }, { merge: true });
      setProfile((p) => ({ ...p, photoB64: b64 }));
    } catch (e: any) {
      Alert.alert('Erro', `Falha ao salvar a foto de perfil.\n${e?.code ?? ''}`);
    } finally {
      setSaving(null);
    }
  };

  const coverSource =
    profile.coverB64
      ? { uri: profile.coverB64 }
      : profile.coverUrl
      ? { uri: profile.coverUrl }
      : { uri: 'https://singlecolorimage.com/get/0F7173/1200x600' };

  const avatarSource = profile.photoB64 ? { uri: profile.photoB64 } : profile.photoURL ? { uri: profile.photoURL } : undefined;

  const fullName = profile.firstName ? `${profile.firstName} ${profile.lastName ?? ''}` : user.displayName ?? 'Usuário';

  const goProfile = () => {
    closeMenu();
    Alert.alert('Meu Perfil', 'Navegar para Perfil (TODO)');
  };
  const goHistory = () => {
    closeMenu();
    Alert.alert('Histórico', 'Navegar para Histórico (TODO)');
  };

  // ✅ Admin vai pro painel (AdminDashboard)
  const goAdmin = () => {
    closeMenu();
    navigation.navigate('AdminDashboard');
  };

  const doSignOut = async () => {
    closeMenu();
    try {
      await signOut();
    } catch {
      Alert.alert('Erro', 'Falha ao sair. Tente novamente.');
    }
  };

  const formatCurrency = (v: number | null) => (typeof v === 'number' ? `R$ ${v.toFixed(2).replace('.', ',')}` : '--');
  const formatDate = (ms: number) => {
    const d = new Date(ms);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const renderAppointment = ({ item }: { item: Appointment }) => {
    const subtitle =
      item.vehicleType === 'Carro' && item.carCategory ? `Carro • ${item.carCategory}` : item.vehicleType;

    const statusLabel =
      item.status === 'scheduled' ? 'Agendado' : item.status === 'done' ? 'Concluído' : 'Cancelado';

    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardTitle}>{item.serviceLabel ?? 'Serviço'}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
          <Text style={{ color: '#6B7280', fontWeight: '800', marginTop: 6 }}>{statusLabel}</Text>
        </View>

        <View style={styles.cardRight}>
          <Text style={styles.cardPrice}>+{formatCurrency(item.price)}</Text>
          <Text style={styles.cardDate}>{formatDate(item.whenMs)}</Text>
        </View>
      </View>
    );
  };

  const EmptyList = () => (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyText}>Você ainda não possui serviços.</Text>
      <TouchableOpacity
        style={styles.primaryBtn}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('Appointment')}
      >
        <Calendar size={18} color={colors.bg} />
        <Text style={styles.primaryBtnText}>Agendar Serviço</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.headerWrapper}>
          <ImageBackground style={styles.header} imageStyle={styles.headerImg} source={coverSource}>
            <TouchableOpacity style={styles.menuBtn} activeOpacity={0.8} onPress={openMenu}>
              <Menu size={26} color={colors.white} />
            </TouchableOpacity>

            <TouchableOpacity onPress={saveCover} style={styles.coverBtn} activeOpacity={0.9}>
              {saving === 'cover' ? <ActivityIndicator color={colors.white} /> : <Text style={styles.coverBtnTxt}>Trocar capa</Text>}
            </TouchableOpacity>
          </ImageBackground>
        </View>

        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={saveAvatar} activeOpacity={0.9}>
            {avatarSource ? (
              <Image source={avatarSource} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatarImg, styles.avatarFallback]}>
                <Text style={styles.avatarPlaceholder}>Insira sua foto</Text>
              </View>
            )}
          </TouchableOpacity>

          {saving === 'avatar' && (
            <View style={styles.avatarLoading}>
              <ActivityIndicator color={colors.white} />
            </View>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.sectionTitle}>Últimos serviços</Text>

          {loadingList ? (
            <View style={{ paddingTop: 24 }}>
              <ActivityIndicator />
            </View>
          ) : (
            <FlatList
              data={appointments}
              keyExtractor={(it) => it.id}
              renderItem={renderAppointment}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={<EmptyList />}
            />
          )}
        </View>

        {menuOpen && (
          <>
            <Animated.View
              pointerEvents={menuOpen ? 'auto' : 'none'}
              style={[StyleSheet.absoluteFill, styles.overlay, { opacity: overlayOpacity }]}
            >
              <Pressable style={{ flex: 1 }} onPress={closeMenu} />
            </Animated.View>

            <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerTx }] }]}>
              <View style={styles.drawerHeader}>
                <Text style={styles.drawerWelcome}>Bem-vindo {fullName}</Text>
                <Text style={styles.drawerTitle}>Menu</Text>
              </View>

              {isAdmin && (
                <TouchableOpacity style={styles.item} onPress={goAdmin} activeOpacity={0.8}>
                  <Text style={styles.itemText}>Admin</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.item} onPress={goProfile} activeOpacity={0.8}>
                <UserIcon size={30} color={colors.sand} />
                <Text style={styles.itemText}>Meu Perfil</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.item} onPress={goHistory} activeOpacity={0.8}>
                <History size={30} color={colors.sand} />
                <Text style={styles.itemText}>Histórico</Text>
              </TouchableOpacity>

              <View style={{ flex: 1 }} />

              <TouchableOpacity style={[styles.item, { marginBottom: 50 }]} onPress={doSignOut} activeOpacity={0.8}>
                <LogOut size={30} color={colors.sand} />
                <Text style={styles.itemText}>Sair</Text>
              </TouchableOpacity>
            </Animated.View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1 },

  headerWrapper: {
    height: 285,
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.primary,
  },
  header: { flex: 1, justifyContent: 'center' },
  headerImg: { borderBottomLeftRadius: radii.lg, borderBottomRightRadius: radii.lg },
  menuBtn: { position: 'absolute', left: 18, top: 18, padding: 6, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.15)' },
  coverBtn: {
    position: 'absolute',
    right: 12,
    top: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 10,
  },
  coverBtnTxt: { color: colors.white, fontWeight: '700' },

  avatarContainer: {
    alignSelf: 'center',
    marginTop: -130 / 2,
    width: 130 + 12,
    height: 130 + 12,
    borderRadius: (130 + 12) / 2,
    backgroundColor: colors.white,
    padding: 6,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  avatarImg: { width: 130, height: 130, borderRadius: 130 / 2, backgroundColor: colors.black },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarPlaceholder: { color: '#E6F6FF', fontSize: 16, fontWeight: '600' },
  avatarLoading: {
    position: 'absolute',
    inset: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 130 / 2,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, backgroundColor: colors.bg },
  sectionTitle: { textAlign: 'center', fontSize: 22, fontWeight: '800', marginBottom: 20, color: colors.text },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: surfaces.card,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: 'flex-end' },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  cardSubtitle: { color: '#616E7C', fontSize: 15 },
  cardPrice: { color: colors.primary, fontSize: 16, fontWeight: '800', marginBottom: 6 },
  cardDate: { color: '#616E7C', fontSize: 15 },

  emptyWrap: { paddingTop: 16, alignItems: 'center', gap: 16 },
  emptyText: { color: '#707A86', fontSize: 14 },
  primaryBtn: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryBtnText: { color: colors.bg, fontSize: 16, fontWeight: '800' },

  overlay: { backgroundColor: surfaces.overlay },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 220,
    backgroundColor: surfaces.drawer,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  drawerHeader: {
    minHeight: 56,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 2,
    marginBottom: 8,
  },
  drawerWelcome: { color: colors.bg, fontWeight: '600', fontSize: 14 },
  drawerTitle: { color: colors.sand, fontWeight: '800', fontSize: 20 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  itemText: { fontSize: 20, color: colors.bg, fontWeight: '600' },
});
