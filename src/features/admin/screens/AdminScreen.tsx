import React, { useEffect, useRef, useState, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { getAuth } from '@react-native-firebase/auth';
import {
  getFirestore,
  collectionGroup,
  onSnapshot,
  orderBy,
  query,
  where,
  doc,
  onSnapshot as onDocSnap,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';

import { Menu, User as UserIcon, History, LogOut, Calendar } from 'lucide-react-native';
import type { RootStackParamList } from '@app/types';
import { colors, surfaces, radii, spacing } from '@shared/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

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
  uid: string; // dono do agendamento
  serviceLabel: string | null;
  vehicleType: 'Carro' | 'Moto';
  carCategory: 'Hatch' | 'Sedan' | 'Caminhonete' | null;
  price: number | null;
  whenMs: number;
};

const COVER_H = 285;
const AVATAR = 130;
const MENU_W = 220;

export default function AdminDashboardScreen() {
  const navigation = useNavigation<Nav>();

  const auth = getAuth();
  const user = auth.currentUser!;
  const uid = user.uid;

  const [profile, setProfile] = useState<UserProfile>({ photoURL: user.photoURL ?? undefined });

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

  // HOJE (range)
  const todayRange = useMemo(() => {
    const s = new Date(); s.setHours(0,0,0,0);
    const e = new Date(); e.setHours(23,59,59,999);
    return { start: s.getTime(), end: e.getTime() };
  }, []);

  // lista de “agendamentos hoje” (TODOS os users)
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // carregar perfil do próprio admin e agendamentos de hoje
  useEffect(() => {
    const db = getFirestore();

    // perfil
    const unsubProfile = onDocSnap(doc(db, 'users', uid), (snap) => {
      const data = snap.data() as UserProfile | undefined;
      if (data) {
        setProfile((p) => ({
          ...p,
          ...data,
          photoURL: data.photoURL ?? p.photoURL ?? user.photoURL ?? undefined,
        }));
      }
    });

    // agendamentos de HOJE (collectionGroup across users)
    const qy = query(
      collectionGroup(db, 'appointments'),
      where('whenMs', '>=', todayRange.start),
      where('whenMs', '<=', todayRange.end),
      orderBy('whenMs', 'asc')
    );

    const unsubList = onSnapshot(
      qy,
      (snap) => {
        const arr: Appointment[] = snap.docs.map((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
          const v = d.data() as any;
          const pathParts = d.ref.path.split('/'); // users/{uid}/appointments/{id}
          const parentUid = pathParts[1] ?? '';
          return {
            id: d.id,
            uid: parentUid,
            serviceLabel: v.serviceLabel ?? null,
            vehicleType: (v.vehicleType as 'Carro' | 'Moto') ?? 'Carro',
            carCategory: v.carCategory ?? null,
            price: typeof v.price === 'number' ? v.price : null,
            whenMs: v.whenMs as number,
          };
        });
        setAppointments(arr);
        setLoadingList(false);
      },
      () => setLoadingList(false)
    );

    return () => {
      unsubProfile();
      unsubList();
    };
  }, [uid, user.photoURL, todayRange.end, todayRange.start]);

  // helpers UI
  const coverSource =
    profile.coverB64
      ? { uri: profile.coverB64 }
      : profile.coverUrl
      ? { uri: profile.coverUrl }
      : { uri: 'https://singlecolorimage.com/get/0F7173/1200x600' };
  const avatarSource = profile.photoB64 ? { uri: profile.photoB64 } : profile.photoURL ? { uri: profile.photoURL } : undefined;
  const fullName = profile.firstName ? `${profile.firstName} ${profile.lastName ?? ''}` : user.displayName ?? 'Administrador';

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

    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardTitle}>{item.serviceLabel ?? 'Serviço'}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>

        <View style={styles.cardRight}>
          <Text style={styles.cardPrice}>+{formatCurrency(item.price)}</Text>
          <Text style={styles.cardDate}>{formatDate(item.whenMs)}</Text>
        </View>
      </View>
    );
  };

  // ações drawer
  const goProfile = () => {
    closeMenu();
    Alert.alert('Meu Perfil', 'Navegar para Perfil (TODO)');
  };
  const goHistory = () => {
    closeMenu();
    Alert.alert('Histórico', 'Navegar para Histórico (TODO)');
  };
  const goManage = () => {
    closeMenu();
    navigation.navigate('Admin'); // vai para a tela de GERENCIAR (serviços/horários)
  };
  const doSignOut = async () => {
    closeMenu();
    try {
      await auth.signOut();
    } catch {
      Alert.alert('Erro', 'Falha ao sair. Tente novamente.');
    }
  };

  // animações
  const overlayStyle = [StyleSheet.absoluteFill, styles.overlay, { opacity: overlayOpacity }];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.headerWrapper}>
          <ImageBackground style={styles.header} imageStyle={styles.headerImg} source={coverSource}>
            <TouchableOpacity style={styles.menuBtn} activeOpacity={0.8} onPress={openMenu}>
              <Menu size={26} color={colors.white} />
            </TouchableOpacity>

            {/* no admin não tem botão “Trocar capa” aqui; pode adicionar depois se quiser */}
          </ImageBackground>
        </View>

        {/* AVATAR */}
        <View style={styles.avatarContainer}>
          {avatarSource ? (
            <Image source={avatarSource} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatarImg, styles.avatarFallback]}>
              <Text style={styles.avatarPlaceholder}>Foto</Text>
            </View>
          )}
        </View>

        {/* BODY */}
        <View style={styles.body}>
          <Text style={styles.sectionTitle}>Agendamentos hoje</Text>

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
              ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#6B7280' }}>Nada marcado para hoje.</Text>}
            />
          )}
        </View>

        {/* OVERLAY + DRAWER */}
        {menuOpen && (
          <>
            <Animated.View pointerEvents="auto" style={overlayStyle}>
              <Pressable style={{ flex: 1 }} onPress={closeMenu} />
            </Animated.View>

            <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerTx }] }]}>
              <View style={styles.drawerHeader}>
                <Text style={styles.drawerWelcome}>Bem-vindo {fullName}</Text>
                <Text style={styles.drawerTitle}>Menu</Text>
              </View>

              <TouchableOpacity style={styles.item} onPress={goProfile} activeOpacity={0.8}>
                <UserIcon size={30} color={colors.sand} />
                <Text style={styles.itemText}>Meu Perfil</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.item} onPress={goHistory} activeOpacity={0.8}>
                <History size={30} color={colors.sand} />
                <Text style={styles.itemText}>Histórico</Text>
              </TouchableOpacity>

              {/* OPÇÃO EXTRA DO ADMIN */}
              <TouchableOpacity style={styles.item} onPress={goManage} activeOpacity={0.8}>
                <Calendar size={30} color={colors.sand} />
                <Text style={styles.itemText}>Gerenciar</Text>
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
  // base (mesmos do cliente)
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1 },

  // header
  headerWrapper: {
    height: COVER_H,
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.primary,
  },
  header: { flex: 1, justifyContent: 'center' },
  headerImg: { borderBottomLeftRadius: radii.lg, borderBottomRightRadius: radii.lg },
  menuBtn: { position: 'absolute', left: 18, top: 18, padding: 6, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.15)' },

  // avatar
  avatarContainer: {
    alignSelf: 'center',
    marginTop: -(AVATAR / 2),
    width: AVATAR + 12,
    height: AVATAR + 12,
    borderRadius: (AVATAR + 12) / 2,
    backgroundColor: colors.white,
    padding: 6,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  avatarImg: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, backgroundColor: colors.black },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarPlaceholder: { color: '#E6F6FF', fontSize: 16, fontWeight: '600' },

  // body
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, backgroundColor: colors.bg },
  sectionTitle: { textAlign: 'center', fontSize: 22, fontWeight: '800', marginBottom: 20, color: colors.text },

  // card
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

  // overlay + drawer
  overlay: { backgroundColor: 'rgba(0,0,0,0.45)' },
  drawer: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: MENU_W,
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
