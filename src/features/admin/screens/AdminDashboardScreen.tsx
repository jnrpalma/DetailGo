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
  collection,
  onSnapshot,
  getDocs,
  orderBy,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  onSnapshot as onDocSnap,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';

import { Menu, User as UserIcon, History, LogOut, Calendar, CheckCircle2, XCircle } from 'lucide-react-native';
import type { RootStackParamList } from '@app/types';
import { colors, surfaces, radii, spacing } from '@shared/theme';

import { updateAppointmentStatus } from '@features/admin/services/adminAppointments.service';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type UserProfile = {
  firstName?: string;
  lastName?: string;
  coverUrl?: string;
  photoURL?: string;
  coverB64?: string;
  photoB64?: string;
  role?: 'admin' | 'user';
};

type Appointment = {
  id: string;
  customerUid: string;
  customerName: string;
  serviceLabel: string | null;
  vehicleType: 'Carro' | 'Moto';
  carCategory: 'Hatch' | 'Sedan' | 'Caminhonete' | null;
  price: number | null;
  startAtMs: number;
  status: 'scheduled' | 'canceled' | 'done';
  dayKey?: string;
};

const COVER_H = 285;
const AVATAR = 130;
const MENU_W = 220;

function toDayKey(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
function startOfDayMs(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function endOfDayMs(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}
function formatHour(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function formatDate(ms: number) {
  const d = new Date(ms);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
function formatCurrency(v: number | null) {
  return typeof v === 'number' ? `R$ ${v.toFixed(2).replace('.', ',')}` : '--';
}

function normalizeAppointmentFromDoc(d: FirebaseFirestoreTypes.QueryDocumentSnapshot): Appointment | null {
  const v = d.data() as any;

  const startAtMs = Number(v.startAtMs ?? 0);
  if (!startAtMs) return null;

  const status = (v.status as Appointment['status']) ?? 'scheduled';
  if (status !== 'scheduled') return null;

  const customerUid = String(v.customerUid ?? '');
  if (!customerUid) return null;

  return {
    id: d.id,
    customerUid,
    customerName: String(v.customerName ?? 'Cliente'),
    serviceLabel: v.serviceLabel ?? null,
    vehicleType: (v.vehicleType as 'Carro' | 'Moto') ?? 'Carro',
    carCategory: v.carCategory ?? null,
    price: typeof v.price === 'number' ? v.price : null,
    startAtMs,
    status,
    dayKey: v.dayKey,
  };
}

export default function AdminDashboardScreen() {
  // ✅ Hooks SEMPRE no topo, SEM return antes disso
  const navigation = useNavigation<Nav>();

  const auth = getAuth();
  const user = auth.currentUser; // ✅ pode ser null sem quebrar

  const [profile, setProfile] = useState<UserProfile>({});
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Drawer
  const [menuOpen, setMenuOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toDayKey(today), [today]);

  const nameCacheRef = useRef<Map<string, string>>(new Map());

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

  const resolveCustomerName = async (customerUid: string): Promise<string> => {
    const cached = nameCacheRef.current.get(customerUid);
    if (cached) return cached;

    try {
      const snap = await getDoc(doc(getFirestore(), 'users', customerUid));
      const data = (snap.data() ?? {}) as { firstName?: string; lastName?: string };
      const name = `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() || 'Cliente';
      nameCacheRef.current.set(customerUid, name);
      return name;
    } catch {
      return 'Cliente';
    }
  };

  const fillMissingNamesAndUpdate = async (list: Appointment[]) => {
    const updated: Appointment[] = [];

    await Promise.all(
      list.map(async (it) => {
        if (it.customerName && it.customerName !== 'Cliente') {
          updated.push(it);
          return;
        }

        const name = await resolveCustomerName(it.customerUid);

        try {
          await updateDoc(doc(getFirestore(), 'appointments', it.id), { customerName: name });
        } catch {
          // ignora
        }

        updated.push({ ...it, customerName: name });
      })
    );

    updated.sort((a, b) => a.startAtMs - b.startAtMs);
    setAppointments(updated);
  };

  // ✅ Se não tiver user ainda, só fica em loading (sem quebrar hooks)
  useEffect(() => {
    if (!user?.uid) return;
    const db = getFirestore();

    const unsubProfile = onDocSnap(
      doc(db, 'users', user.uid),
      (snap) => {
        const data = snap.data() as UserProfile | undefined;
        if (data) setProfile(data);
      },
      () => {}
    );

    return () => unsubProfile();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;

    const db = getFirestore();
    setLoadingList(true);

    const qyDayKey = query(
      collection(db, 'appointments'),
      where('dayKey', '==', todayKey),
      where('status', '==', 'scheduled'),
      orderBy('startAtMs', 'asc')
    );

    const unsub = onSnapshot(
      qyDayKey,
      async (snap) => {
        const byDayKey = snap.docs
          .map((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => normalizeAppointmentFromDoc(d))
          .filter(Boolean) as Appointment[];

        const dayStart = startOfDayMs(today);
        const dayEnd = endOfDayMs(today);

        let byRange: Appointment[] = [];
        try {
          const qyRange = query(
            collection(db, 'appointments'),
            where('status', '==', 'scheduled'),
            where('startAtMs', '>=', dayStart),
            where('startAtMs', '<=', dayEnd),
            orderBy('startAtMs', 'asc')
          );
          const rangeSnap = await getDocs(qyRange);
          byRange = rangeSnap.docs
            .map((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => normalizeAppointmentFromDoc(d))
            .filter(Boolean) as Appointment[];
        } catch {
          byRange = [];
        }

        const map = new Map<string, Appointment>();
        [...byRange, ...byDayKey].forEach((it) => map.set(it.id, it));

        const merged = Array.from(map.values()).sort((a, b) => a.startAtMs - b.startAtMs);

        setLoadingList(false);
        await fillMissingNamesAndUpdate(merged);
      },
      () => setLoadingList(false)
    );

    return () => unsub();
  }, [user?.uid, todayKey, today]);

  // ✅ Bloqueio admin (sem return antes dos hooks)
  useEffect(() => {
    if (!user?.uid) return;
    if (profile.role && profile.role !== 'admin') {
      Alert.alert('Acesso negado', 'Sua conta não é admin.');
      navigation.replace('Dashboard' as any);
    }
  }, [profile.role, navigation, user?.uid]);

  // Render fallback se user ainda não carregou
  if (!user?.uid) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  const coverSource =
    profile.coverB64
      ? { uri: profile.coverB64 }
      : profile.coverUrl
      ? { uri: profile.coverUrl }
      : { uri: 'https://singlecolorimage.com/get/0F7173/1200x600' };

  const avatarSource =
    profile.photoB64 ? { uri: profile.photoB64 } : profile.photoURL ? { uri: profile.photoURL } : user.photoURL ? { uri: user.photoURL } : undefined;

  const fullName =
    profile.firstName ? `${profile.firstName} ${profile.lastName ?? ''}` : user.displayName ?? 'Administrador';

  const confirmDone = (item: Appointment) => {
    Alert.alert(
      'Concluir serviço',
      `Concluir ${item.serviceLabel ?? 'Serviço'} de ${item.customerName} às ${formatHour(item.startAtMs)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Concluir',
          onPress: async () => {
            try {
              await updateAppointmentStatus({
                appointmentId: item.id,
                customerUid: item.customerUid,
                status: 'done',
              });
            } catch (e) {
              console.error(e);
              Alert.alert('Erro', 'Não foi possível concluir.');
            }
          },
        },
      ]
    );
  };

  const confirmCancel = (item: Appointment) => {
    Alert.alert(
      'Cancelar agendamento',
      `Cancelar ${item.serviceLabel ?? 'Serviço'} de ${item.customerName} às ${formatHour(item.startAtMs)}?`,
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateAppointmentStatus({
                appointmentId: item.id,
                customerUid: item.customerUid,
                status: 'canceled',
              });
            } catch (e) {
              console.error(e);
              Alert.alert('Erro', 'Não foi possível cancelar.');
            }
          },
        },
      ]
    );
  };

  const renderAppointment = ({ item }: { item: Appointment }) => {
    const subtitle =
      item.vehicleType === 'Carro' && item.carCategory ? `Carro • ${item.carCategory}` : item.vehicleType;

    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardTitle}>{item.serviceLabel ?? 'Serviço'}</Text>
          <Text style={styles.cardClient}>👤 {item.customerName}</Text>

          <Text style={styles.cardSubtitle}>
            {subtitle} • {formatDate(item.startAtMs)} • {formatHour(item.startAtMs)}
          </Text>

          <Text style={styles.cardPrice}>+{formatCurrency(item.price)}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.doneBtn} onPress={() => confirmDone(item)} activeOpacity={0.85}>
            <CheckCircle2 size={18} color={colors.bg} />
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => confirmCancel(item)} activeOpacity={0.85}>
            <XCircle size={18} color={colors.bg} />
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const doSignOut = async () => {
    closeMenu();
    try {
      await auth.signOut();
    } catch {
      Alert.alert('Erro', 'Falha ao sair. Tente novamente.');
    }
  };

  const overlayStyle = [StyleSheet.absoluteFill, styles.overlay, { opacity: overlayOpacity }];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.headerWrapper}>
          <ImageBackground style={styles.header} imageStyle={styles.headerImg} source={coverSource}>
            <TouchableOpacity style={styles.menuBtn} activeOpacity={0.8} onPress={openMenu}>
              <Menu size={26} color={colors.white} />
            </TouchableOpacity>
          </ImageBackground>
        </View>

        <View style={styles.avatarContainer}>
          {avatarSource ? (
            <Image source={avatarSource} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatarImg, styles.avatarFallback]}>
              <Text style={styles.avatarPlaceholder}>Foto</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.sectionTitle}>Agendamentos hoje</Text>
          <Text style={styles.sectionSub}>{todayKey}</Text>

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

              <TouchableOpacity style={styles.item} onPress={() => Alert.alert('Meu Perfil', 'TODO')} activeOpacity={0.8}>
                <UserIcon size={30} color={colors.sand} />
                <Text style={styles.itemText}>Meu Perfil</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.item} onPress={() => Alert.alert('Histórico', 'TODO')} activeOpacity={0.8}>
                <History size={30} color={colors.sand} />
                <Text style={styles.itemText}>Histórico</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('AdminManage' as any)} activeOpacity={0.8}>
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
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1 },

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

  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, backgroundColor: colors.bg },
  sectionTitle: { textAlign: 'center', fontSize: 22, fontWeight: '800', marginBottom: 6, color: colors.text },
  sectionSub: { textAlign: 'center', color: '#6B7280', fontWeight: '700', marginBottom: 18 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: surfaces.card,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  cardLeft: { flex: 1 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 4 },
  cardClient: { fontSize: 14, fontWeight: '900', color: '#111827', marginBottom: 6 },
  cardSubtitle: { color: '#616E7C', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  cardPrice: { color: colors.primary, fontSize: 14, fontWeight: '900' },

  actions: { gap: 10 },
  doneBtn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  doneText: { color: colors.bg, fontWeight: '900' },
  cancelBtn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cancelText: { color: colors.bg, fontWeight: '900' },

  overlay: { backgroundColor: 'rgba(0,0,0,0.45)' },
  drawer: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: MENU_W,
    backgroundColor: surfaces.drawer,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  drawerHeader: { minHeight: 56, gap: 2, marginBottom: 8 },
  drawerWelcome: { color: colors.bg, fontWeight: '600', fontSize: 14 },
  drawerTitle: { color: colors.sand, fontWeight: '800', fontSize: 20 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  itemText: { fontSize: 20, color: colors.bg, fontWeight: '600' },
});
