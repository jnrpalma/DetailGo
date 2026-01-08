import React, { useEffect, useMemo, useRef, useState } from 'react';
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

import { Menu, User as UserIcon, History, LogOut, Calendar, PlayCircle, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react-native';

import type { RootStackParamList } from '@app/types';
import { colors, surfaces, radii, spacing } from '@shared/theme';

import { updateAppointmentStatus } from '@features/admin/services/adminAppointments.service';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type QDoc = FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>;

type UserProfile = {
  firstName?: string;
  lastName?: string;
  coverUrl?: string;
  photoURL?: string;
  coverB64?: string;
  photoB64?: string;
  role?: 'admin' | 'user';
};

type AppointmentStatus = 'scheduled' | 'in_progress' | 'done' | 'no_show';

type Appointment = {
  id: string;
  customerUid: string;
  customerName: string;
  serviceLabel: string | null;
  vehicleType: 'Carro' | 'Moto';
  carCategory: 'Hatch' | 'Sedan' | 'Caminhonete' | null;
  price: number | null;
  startAtMs: number;
  status: AppointmentStatus;
  dayKey?: string;
};

const COVER_H = 285;
const AVATAR = 130;
const MENU_W = 220;

const NO_SHOW_GRACE_MS = 15 * 60 * 1000;

function startOfWeekMs(anchor: Date) {
  const d = new Date(anchor);
  const day = d.getDay(); // 0 dom ... 6 sab
  const diffToMonday = (day + 6) % 7; // monday=0
  d.setDate(d.getDate() - diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function endOfWeekMs(anchor: Date) {
  const s = new Date(startOfWeekMs(anchor));
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e.getTime();
}
function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
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
function formatWeekLabel(startMs: number, endMs: number) {
  const s = new Date(startMs);
  const e = new Date(endMs);

  const ddS = String(s.getDate()).padStart(2, '0');
  const ddE = String(e.getDate()).padStart(2, '0');

  const monthS = s.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
  const monthE = e.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');

  const yyyyS = s.getFullYear();
  const yyyyE = e.getFullYear();

  if (yyyyS === yyyyE && s.getMonth() === e.getMonth()) {
    return `${ddS}–${ddE} ${monthS} ${yyyyS}`;
  }
  if (yyyyS === yyyyE) {
    return `${ddS} ${monthS} – ${ddE} ${monthE} ${yyyyS}`;
  }
  return `${ddS} ${monthS} ${yyyyS} – ${ddE} ${monthE} ${yyyyE}`;
}
function isCurrentWeek(anchor: Date) {
  return startOfWeekMs(anchor) === startOfWeekMs(new Date());
}

function normalizeAppointmentFromDoc(d: FirebaseFirestoreTypes.QueryDocumentSnapshot): Appointment | null {
  const v = d.data() as any;

  const startAtMs = Number(v.startAtMs ?? 0);
  if (!startAtMs) return null;

  const status = (v.status as Appointment['status']) ?? 'scheduled';

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
  const navigation = useNavigation<Nav>();

  const auth = getAuth();
  const user = auth.currentUser;

  const [profile, setProfile] = useState<UserProfile>({});

  const [appointmentsWeek, setAppointmentsWeek] = useState<Appointment[]>([]);
  const [loadingWeek, setLoadingWeek] = useState(true);

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const noShowMarkedRef = useRef<Set<string>>(new Set());

  const [menuOpen, setMenuOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const [weekAnchor, setWeekAnchor] = useState<Date>(() => new Date());
  const weekStartMs = useMemo(() => startOfWeekMs(weekAnchor), [weekAnchor]);
  const weekEndMs = useMemo(() => endOfWeekMs(weekAnchor), [weekAnchor]);
  const weekLabel = useMemo(() => formatWeekLabel(weekStartMs, weekEndMs), [weekStartMs, weekEndMs]);
  const onCurrentWeek = useMemo(() => isCurrentWeek(weekAnchor), [weekAnchor]);

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
        } catch {}
        updated.push({ ...it, customerName: name });
      })
    );

    updated.sort((a, b) => a.startAtMs - b.startAtMs);
    return updated;
  };

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
    if (profile.role && profile.role !== 'admin') {
      Alert.alert('Acesso negado', 'Sua conta não é admin.');
      navigation.replace('Dashboard' as any);
    }
  }, [profile.role, navigation, user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;

    const db = getFirestore();
    setLoadingWeek(true);

    const qyWeek = query(
      collection(db, 'appointments'),
      where('status', 'in', ['scheduled', 'in_progress']),
      where('startAtMs', '>=', weekStartMs),
      where('startAtMs', '<=', weekEndMs),
      orderBy('startAtMs', 'asc')
    );

    const unsub = onSnapshot(
      qyWeek,
      async (snap) => {
        const base = snap.docs
          .map((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => normalizeAppointmentFromDoc(d))
          .filter(Boolean) as Appointment[];

        // auto no_show se passou 15min e ainda estava scheduled (opcional, mas mantém coerência)
        const now = Date.now();
        const expiredScheduled = base.filter(
          (it) => it.status === 'scheduled' && now > it.startAtMs + NO_SHOW_GRACE_MS && !noShowMarkedRef.current.has(it.id)
        );

        if (expiredScheduled.length > 0) {
          await Promise.all(
            expiredScheduled.map(async (it) => {
              noShowMarkedRef.current.add(it.id);
              try {
                await updateAppointmentStatus({
                  appointmentId: it.id,
                  customerUid: it.customerUid,
                  status: 'no_show',
                });
              } catch {
                noShowMarkedRef.current.delete(it.id);
              }
            })
          );
        }

        const finalList = await fillMissingNamesAndUpdate(base);
        setAppointmentsWeek(finalList);
        setLoadingWeek(false);
      },
      () => setLoadingWeek(false)
    );

    return () => unsub();
  }, [user?.uid, weekStartMs, weekEndMs]);

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
    profile.photoB64
      ? { uri: profile.photoB64 }
      : profile.photoURL
      ? { uri: profile.photoURL }
      : user.photoURL
      ? { uri: user.photoURL }
      : undefined;

  const fullName = profile.firstName ? `${profile.firstName} ${profile.lastName ?? ''}` : user.displayName ?? 'Administrador';

  const alertCannotWork = () => {
    Alert.alert(
      'Serviço não realizado',
      'Já passaram 15 minutos do horário marcado.\nEsse agendamento é considerado NÃO REALIZADO e não pode mais ser iniciado/concluído.'
    );
  };

  const doUpdate = async (item: Appointment, next: AppointmentStatus) => {
    if (updatingId) return;
    setUpdatingId(item.id);
    try {
      await updateAppointmentStatus({
        appointmentId: item.id,
        customerUid: item.customerUid,
        status: next,
      });
    } catch (e: any) {
      console.error(e);
      Alert.alert('Erro', e?.code === 'APPOINTMENT_EXPIRED' ? 'Agendamento expirado.' : 'Não foi possível atualizar.');
    } finally {
      setUpdatingId(null);
    }
  };

  const renderAppointment = ({ item }: { item: Appointment }) => {
    const subtitle = item.vehicleType === 'Carro' && item.carCategory ? `Carro • ${item.carCategory}` : item.vehicleType;

    const expired = Date.now() > item.startAtMs + NO_SHOW_GRACE_MS;
    const isNoShow = item.status === 'scheduled' && expired;

    const displayStatus: AppointmentStatus = isNoShow ? 'no_show' : item.status;

    const statusLabel =
      displayStatus === 'in_progress'
        ? 'Em andamento'
        : displayStatus === 'done'
        ? 'Concluído'
        : displayStatus === 'no_show'
        ? 'Não realizado'
        : 'Agendado';

    const statusColor =
      displayStatus === 'done'
        ? '#16A34A'
        : displayStatus === 'in_progress'
        ? '#2563EB'
        : displayStatus === 'no_show'
        ? '#DC2626'
        : '#6B7280';

    const canPress = !isNoShow && updatingId !== item.id;
    const action =
      displayStatus === 'scheduled'
        ? { label: 'Começar', icon: <PlayCircle size={18} color={colors.bg} />, next: 'in_progress' as AppointmentStatus }
        : displayStatus === 'in_progress'
        ? { label: 'Concluir', icon: <CheckCircle2 size={18} color={colors.bg} />, next: 'done' as AppointmentStatus }
        : null;

    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardTitle}>{item.serviceLabel ?? 'Serviço'}</Text>
          <Text style={styles.cardClient}>👤 {item.customerName}</Text>

          <Text style={styles.cardSubtitle}>
            {subtitle} • {formatDate(item.startAtMs)} • {formatHour(item.startAtMs)}
          </Text>

          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>

          <Text style={styles.cardPrice}>+{formatCurrency(item.price)}</Text>
        </View>

        <View style={styles.actions}>
          {action ? (
            <TouchableOpacity
              style={[
                styles.primaryActionBtn,
                displayStatus === 'in_progress' && styles.primaryActionBtnAlt,
                (!canPress || isNoShow) && styles.disabledBtn,
              ]}
              onPress={() => (isNoShow ? alertCannotWork() : doUpdate(item, action.next))}
              activeOpacity={0.85}
              disabled={!canPress || isNoShow}
            >
              {updatingId === item.id ? (
                <ActivityIndicator color={colors.bg} />
              ) : (
                <>
                  {action.icon}
                  <Text style={styles.primaryActionText}>{action.label}</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={[styles.primaryActionBtn, styles.disabledBtn]}>
              <Text style={styles.primaryActionText}>Sem ação</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const overlayStyle = [StyleSheet.absoluteFill, styles.overlay, { opacity: overlayOpacity }];

  const doSignOut = async () => {
    closeMenu();
    try {
      await auth.signOut();
    } catch {
      Alert.alert('Erro', 'Falha ao sair. Tente novamente.');
    }
  };

  const HeaderWeek = () => (
    <View style={styles.weekHeader}>
      <Text style={styles.sectionTitle}>Agendamentos da semana</Text>
      <Text style={styles.weekRangeTitle}>{weekLabel}</Text>

      <View style={styles.weekNavRow}>
        <TouchableOpacity style={styles.weekNavBtn} onPress={() => setWeekAnchor((prev) => addDays(prev, -7))} activeOpacity={0.85}>
          <ChevronLeft size={18} color={colors.bg} />
          <Text style={styles.weekNavTxt}>Anterior</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.weekChip, onCurrentWeek && styles.weekChipDisabled]}
          onPress={() => setWeekAnchor(new Date())}
          activeOpacity={0.85}
          disabled={onCurrentWeek}
        >
          <Text style={[styles.weekChipTxt, onCurrentWeek && styles.weekChipTxtDisabled]}>Semana atual</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.weekNavBtn} onPress={() => setWeekAnchor((prev) => addDays(prev, 7))} activeOpacity={0.85}>
          <Text style={styles.weekNavTxt}>Próxima</Text>
          <ChevronRight size={18} color={colors.bg} />
        </TouchableOpacity>
      </View>
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
          {loadingWeek ? (
            <View style={{ paddingTop: 18 }}>
              <ActivityIndicator />
            </View>
          ) : (
            <FlatList
              data={appointmentsWeek}
              keyExtractor={(it) => `week-${it.id}`}
              renderItem={renderAppointment}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={<HeaderWeek />}
              ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#6B7280' }}>Nada marcado nessa semana.</Text>}
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

              <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('AdminHistory')} activeOpacity={0.8}>
                <History size={30} color={colors.sand} />
                <Text style={styles.itemText}>Histórico</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('AdminManage')} activeOpacity={0.8}>
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

  weekHeader: { marginBottom: 12, gap: 10, alignItems: 'center' },
  weekRangeTitle: { fontSize: 16, fontWeight: '900', color: '#111827' },
  weekNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%' },

  weekNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 110,
    justifyContent: 'center',
  },
  weekNavTxt: { color: colors.bg, fontWeight: '900' },

  weekChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: surfaces.card,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  weekChipTxt: { fontWeight: '900', color: colors.primary },
  weekChipDisabled: { opacity: 0.6 },
  weekChipTxtDisabled: { color: '#64748B' },

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
  cardSubtitle: { color: '#616E7C', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  statusText: { fontSize: 13, fontWeight: '900', marginBottom: 8 },
  cardPrice: { color: colors.primary, fontSize: 14, fontWeight: '900' },

  actions: { gap: 10 },

  primaryActionBtn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 130,
    justifyContent: 'center',
  },
  primaryActionBtnAlt: { backgroundColor: colors.primary },
  primaryActionText: { color: colors.bg, fontWeight: '900' },
  disabledBtn: { opacity: 0.45 },

  overlay: { backgroundColor: 'rgba(0,0,0,0.45)' },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
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
