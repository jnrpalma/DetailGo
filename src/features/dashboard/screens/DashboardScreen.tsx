import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { launchImageLibrary, type ImageLibraryOptions } from 'react-native-image-picker';
import { getAuth } from '@react-native-firebase/auth';
import { doc, getFirestore, onSnapshot, setDoc } from '@react-native-firebase/firestore';
import {
  Bell,
  Calendar,
  History,
  LogOut,
  User,
  ChevronRight,
  ArrowRight,
  Droplets,
  Sparkles,
  Zap,
  Wrench,
  Car,
  Clock,
  Link as LinkIcon,
  Menu,
} from 'lucide-react-native';

import { darkColors as D } from '@shared/theme';
import { UI } from '@shared/constants/app.constants';
import { useAuth } from '@features/auth';
import { useShop } from '@features/shops/context/ShopContext';
import { joinShop } from '@features/shops/services/joinShop.service';
import { useDashboardAppointments } from '@features/appointments/hooks/useDashboardAppointments';
import type { RootStackParamList } from '@app/types';
import type { UserAppointment } from '@features/appointments/domain/appointment.types';
import { dateUtils } from '@shared/utils/date.utils';
import { formatUtils } from '@shared/utils/format.utils';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

type UserProfile = {
  firstName?: string;
  lastName?: string;
  photoURL?: string;
  photoB64?: string;
};

const SERVICES = [
  { label: 'Lavagem\nsimples', duration: '30min', price: 'R$ 50', Icon: Droplets },
  { label: 'Lavagem\ncompleta', duration: '60min', price: 'R$ 80', Icon: Sparkles },
  { label: 'Polimento', duration: '2h', price: 'R$ 220', Icon: Zap },
  { label: 'Lavagem\nde motor', duration: '45min', price: 'R$ 70', Icon: Wrench },
];

export default function DashboardScreen() {
  const navigation = useNavigation<NavProp>();
  const auth = getAuth();
  const user = auth.currentUser!;
  const uid = user.uid;
  const { signOut } = useAuth();
  const { shopId } = useShop();

  const [profile, setProfile] = useState<UserProfile>({
    photoURL: user.photoURL ?? undefined,
  });
  const [saving, setSaving] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-UI.MENU_WIDTH)).current;

  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joiningShop, setJoiningShop] = useState(false);

  const { loading: loadingAppointments, items: appointments } = useDashboardAppointments({
    uid,
    shopId: shopId ?? '',
    limitN: 30,
  });

  const nextAppointment = appointments[0] ?? null;
  const recentAppointments = appointments.slice(0, 3);

  useEffect(() => {
    const db = getFirestore();
    const unsub = onSnapshot(doc(db, 'users', uid), snap => {
      const data = snap.data() as UserProfile | undefined;
      if (data) setProfile(p => ({ ...p, ...data }));
    });
    return () => unsub();
  }, [uid]);

  // ── Avatar initials ──
  const initials = profile.firstName
    ? `${profile.firstName[0]}${profile.lastName?.[0] ?? ''}`.toUpperCase()
    : user.displayName
        ?.split(' ')
        .map(w => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() ?? 'U';

  const firstName = profile.firstName ?? user.displayName?.split(' ')[0] ?? 'Você';

  // ── Avatar pick ──
  const saveAvatar = async () => {
    try {
      const res = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        includeBase64: true,
        quality: 0.7,
        maxWidth: 500,
        maxHeight: 500,
      } as ImageLibraryOptions);
      if (res.didCancel) return;
      const asset = res.assets?.[0];
      if (!asset?.base64) return;
      setSaving(true);
      const b64 = `data:${asset.type?.startsWith('image/') ? asset.type : 'image/jpeg'};base64,${
        asset.base64
      }`;
      await setDoc(doc(getFirestore(), 'users', uid), { photoB64: b64 }, { merge: true });
      setProfile(p => ({ ...p, photoB64: b64 }));
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar a foto');
    } finally {
      setSaving(false);
    }
  };

  // ── Drawer ──
  const toggleMenu = () => {
    if (menuVisible) {
      Animated.timing(slideAnim, {
        toValue: -UI.MENU_WIDTH,
        duration: UI.DRAWER_ANIMATION_DURATION,
        useNativeDriver: true,
      }).start(() => setMenuVisible(false));
    } else {
      setMenuVisible(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: UI.DRAWER_ANIMATION_DURATION,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleSignOut = async () => {
    toggleMenu();
    await signOut();
  };

  // ── Join shop ──
  const handleJoinShop = async () => {
    if (joinCode.trim().length !== 6) {
      Alert.alert('Atenção', 'O código deve ter 6 caracteres.');
      return;
    }
    setJoiningShop(true);
    try {
      await joinShop(uid, joinCode);
      setJoinModalVisible(false);
      setJoinCode('');
      Alert.alert('Vinculado!', 'Agora você pode agendar serviços!');
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Código inválido.');
    } finally {
      setJoiningShop(false);
    }
  };

  const goToAppointment = () => {
    if (!shopId) {
      setJoinModalVisible(true);
      return;
    }
    navigation.navigate('Appointment');
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={D.bg} />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.avatarWrap} onPress={saveAvatar} activeOpacity={0.8}>
              {profile.photoB64 ? (
                <Image source={{ uri: profile.photoB64 }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarInitials}>
                  <Text style={styles.avatarInitialsText}>{initials}</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.headerGreeting}>OLÁ,</Text>
              <Text style={styles.headerName}>{firstName}</Text>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => Alert.alert('Notificações', 'Em breve!')}
                activeOpacity={0.7}
              >
                <Bell size={18} color={D.ink} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={toggleMenu} activeOpacity={0.7}>
                <Menu size={18} color={D.ink} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Vincule-se card (sem shopId) ── */}
          {!shopId && (
            <TouchableOpacity
              style={styles.joinCard}
              onPress={() => setJoinModalVisible(true)}
              activeOpacity={0.85}
            >
              <View style={styles.joinIconWrap}>
                <LinkIcon size={18} color={D.primary} />
              </View>
              <View style={styles.joinCardText}>
                <Text style={styles.joinCardTitle}>Vincule-se a uma estética</Text>
                <Text style={styles.joinCardDesc}>Insira o código de convite para agendar</Text>
              </View>
              <ChevronRight size={16} color={D.primary} />
            </TouchableOpacity>
          )}

          {/* ── Hero card — próximo agendamento ── */}
          {nextAppointment ? (
            <View style={styles.heroCard}>
              <View style={styles.heroGlow} />
              <Text style={styles.heroLabel}>PRÓXIMO AGENDAMENTO</Text>
              <Text style={styles.heroTitle}>
                {nextAppointment.serviceLabel}
                {'\n'}
                <Text style={{ color: D.primary }}>
                  ·{' '}
                  {dateUtils.isToday(new Date(nextAppointment.startAtMs))
                    ? 'hoje'
                    : dateUtils.formatDate(nextAppointment.startAtMs)}
                  {', '}
                  {dateUtils.formatHour(nextAppointment.startAtMs)}
                </Text>
              </Text>

              <View style={styles.heroTags}>
                <HeroTag
                  icon={<Car size={11} color={D.ink3} />}
                  label={nextAppointment.carCategory ?? nextAppointment.vehicleType}
                />
                <HeroTag
                  icon={<Clock size={11} color={D.ink3} />}
                  label={`${nextAppointment.durationMin ?? 60} min`}
                />
              </View>

              <View style={styles.heroBtns}>
                <TouchableOpacity
                  style={styles.heroBtnPrimary}
                  onPress={() => navigation.navigate('MyAppointments')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.heroBtnPrimaryText}>Ver detalhes</Text>
                  <ArrowRight size={14} color="#0B0D0E" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.heroBtnGhost}
                  onPress={() =>
                    navigation.navigate('Appointment', {
                      mode: 'reschedule',
                      originalAppointmentId: nextAppointment.id,
                      vehicleType: nextAppointment.vehicleType,
                      carCategory: nextAppointment.carCategory,
                      serviceLabel: nextAppointment.serviceLabel,
                    })
                  }
                  activeOpacity={0.7}
                >
                  <Text style={styles.heroBtnGhostText}>Reagendar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.heroCardEmpty}>
              <View style={styles.heroGlow} />
              <Text style={styles.heroLabel}>PRÓXIMO AGENDAMENTO</Text>
              <Text style={styles.heroEmptyText}>Nenhum serviço agendado{'\n'}ainda.</Text>
              <TouchableOpacity
                style={styles.heroBtnPrimary}
                onPress={goToAppointment}
                activeOpacity={0.85}
              >
                <Text style={styles.heroBtnPrimaryText}>Agendar agora</Text>
                <ArrowRight size={14} color="#0B0D0E" />
              </TouchableOpacity>
            </View>
          )}

          {/* ── Serviços ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Serviços</Text>
              <TouchableOpacity onPress={goToAppointment}>
                <Text style={styles.sectionLink}>Agendar →</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.servicesRail}
            >
              {SERVICES.map((svc, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.serviceCard}
                  onPress={goToAppointment}
                  activeOpacity={0.8}
                >
                  <View style={styles.serviceIconWrap}>
                    <svc.Icon size={18} color={D.primary} />
                  </View>
                  <Text style={styles.serviceLabel}>{svc.label}</Text>
                  <View style={styles.serviceFooter}>
                    <Text style={styles.serviceDuration}>{svc.duration}</Text>
                    <Text style={styles.servicePrice}>{svc.price}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* ── Recente ── */}
          {loadingAppointments ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={D.primary} size="small" />
            </View>
          ) : recentAppointments.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recente</Text>
                <TouchableOpacity onPress={() => navigation.navigate('History')}>
                  <Text style={styles.sectionLink}>Ver tudo →</Text>
                </TouchableOpacity>
              </View>

              {recentAppointments.map((appt, i) => (
                <RecentRow key={appt.id} appt={appt} last={i === recentAppointments.length - 1} />
              ))}
            </View>
          ) : null}

          <View style={{ height: 32 }} />
        </ScrollView>

        {/* ── Drawer ── */}
        {menuVisible && (
          <>
            <Pressable style={styles.overlay} onPress={toggleMenu} />
            <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
              <View style={styles.drawerHeader}>
                <View style={styles.drawerAvatar}>
                  <Text style={styles.drawerAvatarText}>{initials}</Text>
                </View>
                <Text style={styles.drawerName}>{firstName}</Text>
                <Text style={styles.drawerEmail}>{user.email}</Text>
              </View>

              <View style={styles.drawerMenu}>
                <DrawerItem
                  icon={<Calendar size={18} color={D.primary} />}
                  label="Meus agendamentos"
                  onPress={() => {
                    toggleMenu();
                    navigation.navigate('MyAppointments');
                  }}
                />
                <DrawerItem
                  icon={<History size={18} color={D.primary} />}
                  label="Histórico"
                  onPress={() => {
                    toggleMenu();
                    navigation.navigate('History');
                  }}
                />
                <DrawerItem
                  icon={<User size={18} color={D.primary} />}
                  label="Perfil"
                  onPress={() => {
                    toggleMenu();
                    navigation.navigate('Profile');
                  }}
                />
                {!shopId && (
                  <DrawerItem
                    icon={<LinkIcon size={18} color={D.primary} />}
                    label="Vincular estética"
                    onPress={() => {
                      toggleMenu();
                      setJoinModalVisible(true);
                    }}
                  />
                )}
              </View>

              <View style={styles.drawerDivider} />

              <DrawerItem
                icon={<LogOut size={18} color={D.accent} />}
                label="Sair"
                onPress={handleSignOut}
                danger
              />
            </Animated.View>
          </>
        )}

        {/* ── Modal join shop ── */}
        <Modal
          visible={joinModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setJoinModalVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setJoinModalVisible(false)}>
            <Pressable style={styles.modalBox} onPress={() => {}}>
              <Text style={styles.modalTitle}>Código de convite</Text>
              <Text style={styles.modalDesc}>
                Peça o código de 6 letras para a estética e insira abaixo.
              </Text>
              <TextInput
                style={styles.modalInput}
                value={joinCode}
                onChangeText={t => setJoinCode(t.toUpperCase())}
                placeholder="Ex: AB34CD"
                placeholderTextColor={D.ink3}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={6}
                editable={!joiningShop}
              />
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  (joinCode.trim().length !== 6 || joiningShop) && styles.modalBtnDisabled,
                ]}
                onPress={handleJoinShop}
                disabled={joinCode.trim().length !== 6 || joiningShop}
                activeOpacity={0.8}
              >
                {joiningShop ? (
                  <ActivityIndicator color="#0B0D0E" />
                ) : (
                  <Text style={styles.modalBtnText}>Vincular minha conta</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setJoinModalVisible(false)}
                style={styles.modalCancel}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────

function HeroTag({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={styles.heroTag}>
      {icon}
      <Text style={styles.heroTagText}>{label}</Text>
    </View>
  );
}

function RecentRow({ appt, last }: { appt: UserAppointment; last: boolean }) {
  const statusColor =
    appt.status === 'done' ? '#22C55E' : appt.status === 'cancelled' ? '#FF5C39' : '#A8B0B4';
  return (
    <View style={[styles.recentRow, !last && styles.recentRowBorder]}>
      <View style={styles.recentIconWrap}>
        <Sparkles size={14} color={D.primary} />
      </View>
      <View style={styles.recentInfo}>
        <Text style={styles.recentTitle}>{appt.serviceLabel}</Text>
        <Text style={styles.recentSub}>
          {appt.carCategory ?? appt.vehicleType} · {dateUtils.formatDate(appt.startAtMs)}
        </Text>
      </View>
      <Text style={[styles.recentPrice, { color: statusColor }]}>
        {formatUtils.currencyCompact(appt.price)}
      </Text>
    </View>
  );
}

function DrawerItem({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.drawerItem} onPress={onPress} activeOpacity={0.7}>
      {icon}
      <Text style={[styles.drawerItemText, danger && styles.drawerItemDanger]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: D.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 16 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 18,
    gap: 12,
  },
  avatarWrap: { position: 'relative' },
  avatarImg: { width: 40, height: 40, borderRadius: 20 },
  avatarInitials: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: D.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: { fontSize: 14, fontWeight: '800', color: '#0B0D0E' },
  headerCenter: { flex: 1 },
  headerGreeting: {
    fontSize: 10,
    fontWeight: '600',
    color: D.ink3,
    letterSpacing: 0.5,
  },
  headerName: { fontSize: 16, fontWeight: '600', color: D.ink },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: D.card,
    borderWidth: 1,
    borderColor: D.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Join card
  joinCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: D.primaryLight,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: D.primary,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  joinIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: D.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinCardText: { flex: 1 },
  joinCardTitle: { fontSize: 14, fontWeight: '700', color: D.primary, marginBottom: 2 },
  joinCardDesc: { fontSize: 12, color: D.primary, opacity: 0.75 },

  // Hero card
  heroCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#141719',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: D.border,
    overflow: 'hidden',
  },
  heroCardEmpty: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#141719',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: D.border,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    top: -60,
    right: -50,
    borderRadius: 100,
    backgroundColor: 'rgba(212,255,61,0.18)',
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: D.ink3,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: D.ink,
    letterSpacing: -0.5,
    lineHeight: 28,
    marginBottom: 12,
  },
  heroEmptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: D.ink2,
    lineHeight: 24,
    marginBottom: 14,
  },
  heroTags: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  heroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: D.border,
  },
  heroTagText: { fontSize: 11, color: D.ink3, fontWeight: '500' },
  heroBtns: { flexDirection: 'row', gap: 8 },
  heroBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: D.primary,
  },
  heroBtnPrimaryText: { fontSize: 13, fontWeight: '700', color: '#0B0D0E' },
  heroBtnGhost: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: D.border,
    justifyContent: 'center',
  },
  heroBtnGhostText: { fontSize: 13, fontWeight: '600', color: D.ink },

  // Section
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: D.ink },
  sectionLink: { fontSize: 12, fontWeight: '600', color: D.primary },

  // Services
  servicesRail: { paddingHorizontal: 20, gap: 10 },
  serviceCard: {
    width: 120,
    padding: 14,
    backgroundColor: D.card,
    borderWidth: 1,
    borderColor: D.border,
    borderRadius: 16,
  },
  serviceIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: D.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  serviceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: D.ink,
    lineHeight: 18,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  serviceDuration: { fontSize: 11, color: D.ink3 },
  servicePrice: { fontSize: 11, fontWeight: '700', color: D.ink },

  // Recent
  loadingWrap: { paddingVertical: 24, alignItems: 'center' },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  recentRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: D.border,
  },
  recentIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: D.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentInfo: { flex: 1 },
  recentTitle: { fontSize: 13, fontWeight: '600', color: D.ink },
  recentSub: { fontSize: 11, color: D.ink3, marginTop: 2 },
  recentPrice: { fontSize: 13, fontWeight: '700' },

  // Drawer
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)' },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: UI.MENU_WIDTH,
    backgroundColor: '#111416',
    borderRightWidth: 1,
    borderRightColor: D.border,
    paddingTop: 60,
  },
  drawerHeader: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
  },
  drawerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: D.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  drawerAvatarText: { fontSize: 16, fontWeight: '800', color: '#0B0D0E' },
  drawerName: { fontSize: 16, fontWeight: '700', color: D.ink, marginBottom: 2 },
  drawerEmail: { fontSize: 12, color: D.ink3 },
  drawerMenu: { paddingTop: 12 },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  drawerItemText: { fontSize: 15, fontWeight: '500', color: D.ink },
  drawerItemDanger: { color: D.accent },
  drawerDivider: { height: 1, backgroundColor: D.border, marginVertical: 8 },

  // Join modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#1A1D20',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: D.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: D.ink, marginBottom: 6 },
  modalDesc: { fontSize: 13, color: D.ink2, lineHeight: 20, marginBottom: 18 },
  modalInput: {
    borderWidth: 1.5,
    borderColor: D.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 24,
    fontWeight: '800',
    color: D.ink,
    textAlign: 'center',
    letterSpacing: 6,
    marginBottom: 14,
    backgroundColor: D.card,
  },
  modalBtn: {
    height: 48,
    backgroundColor: D.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalBtnDisabled: { opacity: 0.35 },
  modalBtnText: { color: '#0B0D0E', fontSize: 15, fontWeight: '700' },
  modalCancel: { alignItems: 'center', paddingVertical: 8 },
  modalCancelText: { fontSize: 14, color: D.ink3, fontWeight: '600' },
});
