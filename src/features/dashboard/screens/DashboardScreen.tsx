import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
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
  ArrowRight,
  Bell,
  Calendar,
  Camera,
  CircleUserRound,
  History,
  Home,
  Link as LinkIcon,
  LogOut,
  Menu,
  User,
} from 'lucide-react-native';

import { darkColors as D } from '@shared/theme';
import { UI } from '@shared/constants/app.constants';
import { useAuth } from '@features/auth';
import { useShop, useShopServices, joinShop, getShopServiceIcon } from '@features/shops';
import { useDashboardAppointments } from '@features/appointments';
import type { RootStackParamList } from '@app/types';
import type { UserAppointment } from '@features/appointments';
import { dateUtils } from '@shared/utils/date.utils';
import { formatUtils } from '@shared/utils/format.utils';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

type UserProfile = {
  firstName?: string;
  lastName?: string;
  photoURL?: string;
  photoB64?: string;
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'BOM DIA';
  if (hour < 18) return 'BOA TARDE';
  return 'BOA NOITE';
}

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
  const { loading: loadingServices, items: shopServices } = useShopServices({
    shopId,
    activeOnly: true,
  });

  const nextAppointment = appointments[0] ?? null;
  const upcomingAppointments = appointments.slice(0, 3);
  const homeServices = shopServices;

  useEffect(() => {
    const db = getFirestore();
    const unsub = onSnapshot(doc(db, 'users', uid), snap => {
      const data = snap.data() as UserProfile | undefined;
      if (data) setProfile(p => ({ ...p, ...data }));
    });
    return () => unsub();
  }, [uid]);

  const initials = useMemo(() => {
    if (profile.firstName) {
      return `${profile.firstName[0]}${profile.lastName?.[0] ?? ''}`.toUpperCase();
    }

    return (
      user.displayName
        ?.split(' ')
        .map(w => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() ?? 'U'
    );
  }, [profile.firstName, profile.lastName, user.displayName]);

  const displayName = useMemo(() => {
    const profileName = `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim();
    return profileName || user.displayName || 'Você';
  }, [profile.firstName, profile.lastName, user.displayName]);

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
          <View style={styles.heroSurface}>
            <View style={styles.heroGlow} />

            <View style={styles.topBar}>
              <TouchableOpacity style={styles.squareBtn} onPress={toggleMenu} activeOpacity={0.75}>
                <Menu size={20} color={D.ink} strokeWidth={2.4} />
              </TouchableOpacity>

              <Text style={styles.brand}>DETAILGO</Text>

              <TouchableOpacity
                style={styles.squareBtn}
                onPress={() => Alert.alert('Notificações', 'Em breve!')}
                activeOpacity={0.75}
              >
                <Bell size={20} color={D.ink} strokeWidth={2} />
                <View style={styles.notificationDot} />
              </TouchableOpacity>
            </View>

            <View style={styles.profileBlock}>
              <TouchableOpacity
                style={styles.avatarWrap}
                onPress={saveAvatar}
                activeOpacity={0.8}
                disabled={saving}
              >
                {profile.photoB64 ? (
                  <Image source={{ uri: profile.photoB64 }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarInitials}>
                    <Text style={styles.avatarInitialsText}>{initials}</Text>
                  </View>
                )}
                <View style={styles.cameraBadge}>
                  {saving ? (
                    <ActivityIndicator color={D.primary} size="small" />
                  ) : (
                    <Camera size={12} color={D.primary} strokeWidth={2.4} />
                  )}
                </View>
              </TouchableOpacity>

              <View style={styles.profileInfo}>
                <Text style={styles.greeting}>{getGreeting()}</Text>
                <Text style={styles.profileName} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={styles.profileEmail} numberOfLines={1}>
                  {user.email}
                </Text>
              </View>
            </View>
          </View>

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
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.scheduleCard}
            onPress={goToAppointment}
            activeOpacity={0.88}
          >
            <View style={styles.scheduleIcon}>
              <Calendar size={24} color={D.primary} strokeWidth={2.1} />
            </View>
            <View style={styles.scheduleTextWrap}>
              <Text style={styles.scheduleTitle}>Agendar serviço</Text>
              <Text style={styles.scheduleSubtitle}>30s · sem ligar</Text>
            </View>
            <View style={styles.scheduleArrow}>
              <ArrowRight size={22} color={D.primary} strokeWidth={2.1} />
            </View>
          </TouchableOpacity>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionKicker}>SERVIÇOS</Text>
          </View>

          {loadingServices ? (
            <View style={styles.servicesLoading}>
              <ActivityIndicator color={D.primary} size="small" />
            </View>
          ) : homeServices.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.servicesRail}
            >
              {homeServices.map((svc, index) => {
                const Icon = getShopServiceIcon(svc);
                const isActive = index === 0;
                return (
                  <TouchableOpacity
                    key={svc.id}
                    style={styles.serviceCard}
                    onPress={goToAppointment}
                    activeOpacity={0.82}
                  >
                    <View style={[styles.serviceIconWrap, isActive && styles.serviceIconActive]}>
                      <Icon size={22} color={isActive ? D.primary : D.ink2} strokeWidth={2} />
                    </View>
                    <Text style={styles.serviceLabel} numberOfLines={1}>
                      {svc.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.servicesEmpty}>
              <Text style={styles.servicesEmptyText}>Nenhum serviço disponível</Text>
            </View>
          )}

          <View style={styles.upcomingHeader}>
            <Text style={styles.upcomingTitle}>Próximos serviços</Text>
            <Text style={styles.upcomingCount}>{upcomingAppointments.length} ATIVOS</Text>
          </View>

          {loadingAppointments ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={D.primary} size="small" />
            </View>
          ) : nextAppointment ? (
            <View style={styles.appointmentsCard}>
              {upcomingAppointments.map((appt, i) => (
                <AppointmentRow
                  key={appt.id}
                  appt={appt}
                  last={i === upcomingAppointments.length - 1}
                  onPress={() => navigation.navigate('MyAppointments')}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Calendar size={32} color={D.primary} strokeWidth={2.1} />
                <View style={styles.emptyPlus}>
                  <Text style={styles.emptyPlusText}>+</Text>
                </View>
              </View>
              <Text style={styles.emptyTitle}>Sem agendamentos</Text>
              <Text style={styles.emptyText}>Que tal cuidar do seu carro hoje?</Text>
              <Text style={styles.emptyText}>Em 30 segundos você marca o primeiro.</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={goToAppointment}
                activeOpacity={0.82}
              >
                <Text style={styles.emptyButtonText}>Começar</Text>
                <ArrowRight size={19} color={D.primary} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 112 }} />
        </ScrollView>

        <View style={styles.bottomNav}>
          <BottomNavItem active icon={<Home size={24} color={D.primary} />} label="Início" />
          <BottomNavItem
            icon={<History size={24} color={D.ink3} />}
            label="Histórico"
            onPress={() => navigation.navigate('History')}
          />
          <BottomNavItem
            icon={<CircleUserRound size={24} color={D.ink3} />}
            label="Perfil"
            onPress={() => navigation.navigate('Profile')}
          />
        </View>

        {menuVisible && (
          <>
            <Pressable style={styles.overlay} onPress={toggleMenu} />
            <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
              <View style={styles.drawerHeader}>
                <View style={styles.drawerAvatar}>
                  <Text style={styles.drawerAvatarText}>{initials}</Text>
                </View>
                <Text style={styles.drawerName}>{displayName}</Text>
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

function AppointmentRow({
  appt,
  last,
  onPress,
}: {
  appt: UserAppointment;
  last: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.appointmentRow, !last && styles.appointmentRowBorder]}
      onPress={onPress}
      activeOpacity={0.78}
    >
      <View style={styles.appointmentIcon}>
        <Calendar size={22} color={D.primary} />
      </View>
      <View style={styles.appointmentInfo}>
        <Text style={styles.appointmentTitle} numberOfLines={1}>
          {appt.serviceLabel ?? 'Serviço'}
        </Text>
        <Text style={styles.appointmentMeta} numberOfLines={1}>
          {dateUtils.formatDate(appt.startAtMs)} · {dateUtils.formatHour(appt.startAtMs)} ·{' '}
          {appt.carCategory ?? appt.vehicleType}
        </Text>
      </View>
      <Text style={styles.appointmentPrice}>{formatUtils.currencyCompact(appt.price)}</Text>
    </TouchableOpacity>
  );
}

function BottomNavItem({
  icon,
  label,
  active,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.bottomNavItem}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.75}
    >
      {icon}
      <Text style={[styles.bottomNavLabel, active && styles.bottomNavLabelActive]}>{label}</Text>
    </TouchableOpacity>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: D.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16 },

  heroSurface: {
    minHeight: 190,
    borderBottomWidth: 1,
    borderBottomColor: D.borderStrong,
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  heroGlow: {
    position: 'absolute',
    width: 180,
    height: 140,
    right: -55,
    top: 9,
    borderRadius: 90,
    backgroundColor: 'rgba(129,166,31,0.22)',
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  squareBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1.5,
    borderColor: D.borderStrong,
  },
  brand: {
    color: D.ink,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 4,
    marginLeft: 4,
  },
  notificationDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    right: 9,
    top: 8,
    backgroundColor: D.primary,
  },
  profileBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrap: {
    width: 72,
    height: 72,
    position: 'relative',
  },
  avatarImg: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarInitials: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: D.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#050708',
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#050708',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: D.bg,
  },
  profileInfo: { flex: 1 },
  greeting: {
    color: D.ink3,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.9,
    marginBottom: 3,
  },
  profileName: {
    color: D.ink,
    fontSize: 25,
    lineHeight: 29,
    fontWeight: '900',
  },
  profileEmail: {
    color: D.ink3,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginTop: 2,
  },

  joinCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212,255,61,0.11)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: D.borderFocus,
    padding: 15,
    marginHorizontal: 20,
    marginTop: 14,
    gap: 12,
  },
  joinIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#050708',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinCardText: { flex: 1 },
  joinCardTitle: { fontSize: 15, fontWeight: '800', color: D.primary, marginBottom: 2 },
  joinCardDesc: { fontSize: 12, color: D.primary, opacity: 0.78 },

  scheduleCard: {
    minHeight: 72,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 18,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: D.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: D.primary,
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 9 },
    shadowRadius: 12,
    elevation: 8,
  },
  scheduleIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#050708',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleTextWrap: { flex: 1 },
  scheduleTitle: {
    color: '#050708',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
  },
  scheduleSubtitle: {
    color: 'rgba(5,7,8,0.62)',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  scheduleArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#050708',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionHeader: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 11,
  },
  sectionKicker: {
    color: D.ink3,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  servicesRail: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 18,
  },
  servicesLoading: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  servicesEmpty: {
    marginHorizontal: 20,
    height: 72,
    borderRadius: 15,
    backgroundColor: D.card,
    borderWidth: 1,
    borderColor: D.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 17,
  },
  servicesEmptyText: {
    color: D.ink3,
    fontSize: 12,
    fontWeight: '800',
  },
  serviceCard: {
    width: 104,
    height: 104,
    borderRadius: 18,
    backgroundColor: D.card,
    borderWidth: 1.5,
    borderColor: D.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: D.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  serviceIconActive: {
    borderColor: D.primary,
  },
  serviceLabel: {
    color: D.ink2,
    fontSize: 13,
    fontWeight: '900',
  },

  upcomingHeader: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  upcomingTitle: {
    color: D.ink,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
  },
  upcomingCount: {
    color: D.ink3,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  loadingWrap: {
    marginHorizontal: 20,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appointmentsCard: {
    marginHorizontal: 20,
    borderRadius: 17,
    backgroundColor: D.card,
    borderWidth: 1.5,
    borderColor: D.borderStrong,
    overflow: 'hidden',
  },
  appointmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 10,
  },
  appointmentRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: D.border,
  },
  appointmentIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#050708',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appointmentInfo: { flex: 1 },
  appointmentTitle: {
    color: D.ink,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },
  appointmentMeta: {
    color: D.ink3,
    fontSize: 11,
    fontWeight: '700',
  },
  appointmentPrice: {
    color: D.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  emptyCard: {
    marginHorizontal: 20,
    minHeight: 224,
    borderRadius: 20,
    backgroundColor: D.card,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: D.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  emptyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#050708',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  emptyPlus: {
    position: 'absolute',
    right: -4,
    top: -4,
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: D.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPlusText: {
    color: '#050708',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 16,
  },
  emptyTitle: {
    color: D.ink,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 10,
  },
  emptyText: {
    color: D.ink2,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
    textAlign: 'center',
  },
  emptyButton: {
    height: 36,
    minWidth: 120,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: D.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 15,
  },
  emptyButtonText: {
    color: D.primary,
    fontSize: 15,
    fontWeight: '900',
  },

  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 86,
    backgroundColor: '#050708',
    borderTopWidth: 1,
    borderTopColor: D.borderStrong,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingTop: 14,
  },
  bottomNavItem: {
    width: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomNavLabel: {
    marginTop: 4,
    color: D.ink3,
    fontSize: 12,
    fontWeight: '900',
  },
  bottomNavLabelActive: {
    color: D.primary,
  },

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
