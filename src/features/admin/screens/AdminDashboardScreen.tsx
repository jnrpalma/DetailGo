import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';

import {
  launchImageLibrary,
  type ImageLibraryOptions,
  type Asset,
} from 'react-native-image-picker';
import { getAuth } from '@react-native-firebase/auth';
import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  setDoc,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';

import {
  User as UserIcon,
  History,
  LogOut,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  PlayCircle,
  Settings,
} from 'lucide-react-native';

import type { RootStackParamList } from '@app/types';
import { colors, spacing, radii, borders } from '@shared/theme';
import { dateUtils } from '@shared/utils/date.utils';
import { formatUtils } from '@shared/utils/format.utils';
import { useCustomerName } from '@shared/hooks/useFirestoreCache';
import { UI } from '@shared/constants/app.constants';

import { updateAppointmentStatus } from '@features/admin/services/adminAppointments.service';
import { useShop } from '@features/shops/context/ShopContext';
import { NO_SHOW_GRACE_MS } from '@features/appointments/domain/appointment.constants';
import { getAppointmentStatusConfig } from '@features/appointments/domain/appointment.helpers';
import type { AppointmentStatus } from '@features/appointments/domain/appointment.types';
import type { AdminAppointment } from '../domain/adminAppointment.types';
import { normalizeAdminAppointmentFromGlobal } from '../data/adminAppointment.normalizers';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type UserProfile = {
  firstName?: string;
  lastName?: string;

  photoURL?: string;

  photoB64?: string;
  role?: 'admin' | 'user';
};

type QDoc =
  FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>;

const AVATAR_SIZE = UI.AVATAR_SIZE;
const MENU_W = UI.MENU_WIDTH;

export default function AdminDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const auth = getAuth();
  const user = auth.currentUser;
  const db = getFirestore();
  const { shopId } = useShop();

  const [profile, setProfile] = useState<UserProfile>({});
  const [saving, setSaving] = useState<'cover' | 'avatar' | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-MENU_W)).current;

  const [appointmentsWeek, setAppointmentsWeek] = useState<AdminAppointment[]>(
    [],
  );
  const [loadingWeek, setLoadingWeek] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const noShowMarkedRef = useRef<Set<string>>(new Set());

  const [weekAnchor, setWeekAnchor] = useState<Date>(() => new Date());

  const weekStartMs = useMemo(
    () => dateUtils.startOfWeek(weekAnchor),
    [weekAnchor],
  );
  const weekEndMs = useMemo(
    () => dateUtils.endOfWeek(weekAnchor),
    [weekAnchor],
  );

  const { fetchCustomerName } = useCustomerName();

  const toggleMenu = () => {
    if (menuVisible) {
      Animated.timing(slideAnim, {
        toValue: -MENU_W,
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

    const mime = a.type?.startsWith('image/') ? a.type : 'image/jpeg';
    return `data:${mime};base64,${a.base64}`;
  };

  const saveAvatar = async () => {
    try {
      const b64 = await pickAsBase64();
      if (!b64) return;

      setSaving('avatar');
      await setDoc(
        doc(getFirestore(), 'users', user!.uid),
        { photoB64: b64 },
        { merge: true },
      );
      setProfile(p => ({ ...p, photoB64: b64 }));
    } catch (e: any) {
      Alert.alert(
        'Erro',
        `Falha ao salvar a foto de perfil.\n${e?.code ?? ''}`,
      );
    } finally {
      setSaving(null);
    }
  };

  const fillMissingNamesAndUpdate = async (list: AdminAppointment[]) => {
    const updated: AdminAppointment[] = [];
    await Promise.all(
      list.map(async it => {
        if (it.customerName && it.customerName !== 'Cliente') {
          updated.push(it);
          return;
        }

        const name = await fetchCustomerName(it.customerUid);
        if (shopId) {
          try {
            await updateDoc(doc(db, 'shops', shopId, 'appointments', it.id), {
              customerName: name,
            });
          } catch {}
        }
        updated.push({ ...it, customerName: name });
      }),
    );
    return updated.sort((a, b) => a.startAtMs - b.startAtMs);
  };

  useEffect(() => {
    if (!user?.uid) return;

    const unsubProfile = onSnapshot(
      doc(db, 'users', user.uid),
      snap => {
        const data = snap.data() as UserProfile | undefined;
        if (data) setProfile(data);
      },
      () => {},
    );

    return () => unsubProfile();
  }, [db, user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    if (profile.role && profile.role !== 'admin') {
      Alert.alert('Acesso negado', 'Sua conta não é admin.');
      navigation.replace('Dashboard' as any);
    }
  }, [profile.role, navigation, user?.uid]);

  useEffect(() => {
    if (!user?.uid || !shopId) return;

    setLoadingWeek(true);

    const qyWeek = query(
      collection(db, 'shops', shopId, 'appointments'),
      where('status', 'in', ['scheduled', 'in_progress']),
      where('startAtMs', '>=', weekStartMs),
      where('startAtMs', '<=', weekEndMs),
      orderBy('startAtMs', 'asc'),
    );

    const unsub = onSnapshot(
      qyWeek,
      async snap => {
        const base = snap.docs
          .map((d: QDoc) => normalizeAdminAppointmentFromGlobal(d))
          .filter(Boolean) as AdminAppointment[];

        const now = Date.now();
        const expiredScheduled = base.filter(
          it =>
            it.status === 'scheduled' &&
            now > it.startAtMs + NO_SHOW_GRACE_MS &&
            !noShowMarkedRef.current.has(it.id),
        );

        if (expiredScheduled.length > 0) {
          await Promise.all(
            expiredScheduled.map(async it => {
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
            }),
          );
        }

        const finalList = await fillMissingNamesAndUpdate(base);
        setAppointmentsWeek(finalList);
        setLoadingWeek(false);
      },
      () => setLoadingWeek(false),
    );

    return () => unsub();
  }, [db, user?.uid, shopId, weekStartMs, weekEndMs, fetchCustomerName]);

  if (!user?.uid) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </SafeAreaView>
    );
  }

  const avatarSource = profile.photoB64
    ? { uri: profile.photoB64 }
    : profile.photoURL
    ? { uri: profile.photoURL }
    : user.photoURL
    ? { uri: user.photoURL }
    : undefined;

  const fullName = profile.firstName
    ? `${profile.firstName} ${profile.lastName ?? ''}`
    : user.displayName ?? 'Administrador';

  const alertCannotWork = () => {
    Alert.alert(
      'Serviço não realizado',
      'Já passaram 15 minutos do horário marcado.\nEsse agendamento é considerado NÃO REALIZADO e não pode mais ser iniciado/concluído.',
    );
  };

  const doUpdate = async (item: AdminAppointment, next: AppointmentStatus) => {
    if (updatingId || !shopId) return;
    setUpdatingId(item.id);
    try {
      await updateAppointmentStatus({
        shopId,
        appointmentId: item.id,
        customerUid: item.customerUid,
        status: next,
      });
    } catch (e: any) {
      console.error(e);
      Alert.alert(
        'Erro',
        e?.code === 'APPOINTMENT_EXPIRED'
          ? 'Agendamento expirado.'
          : 'Não foi possível atualizar.',
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const navigateFromMenu = (route: keyof RootStackParamList) => {
    toggleMenu();
    navigation.navigate(route);
  };

  const handleSignOut = async () => {
    try {
      toggleMenu();
      await auth.signOut();
    } catch {
      Alert.alert('Erro', 'Falha ao sair da conta');
    }
  };

  const WeekHeaderPremium = () => {
    const weekDays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
    const startDate = new Date(weekStartMs);
    const endDate = new Date(weekEndMs);

    const startDay = startDate.getDate();
    const endDay = endDate.getDate();

    const startMonth = startDate
      .toLocaleString('pt-BR', { month: 'long' })
      .toUpperCase();
    const endMonth = endDate
      .toLocaleString('pt-BR', { month: 'long' })
      .toUpperCase();
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();

    let periodText = '';
    if (startMonth === endMonth && startYear === endYear) {
      periodText = `${startDay}–${endDay} ${startMonth} ${startYear}`;
    } else if (startYear === endYear) {
      periodText = `${startDay} ${startMonth} – ${endDay} ${endMonth} ${startYear}`;
    } else {
      periodText = `${startDay} ${startMonth} ${startYear} – ${endDay} ${endMonth} ${endYear}`;
    }

    const totalAppointments = appointmentsWeek.length;

    return (
      <View style={styles.premiumContainer}>
        <View style={styles.premiumHeader}>
          <View style={styles.premiumTitleContainer}>
            <Text style={styles.premiumSubtitle}>AGENDAMENTOS</Text>
            <Text style={styles.premiumTitle}>{periodText}</Text>
          </View>
          <View style={styles.premiumCount}>
            <Text style={styles.premiumCountText}>{totalAppointments}</Text>
            <Text style={styles.premiumCountLabel}>agend.</Text>
          </View>
        </View>

        <View style={styles.premiumNav}>
          <TouchableOpacity
            style={styles.premiumNavButton}
            onPress={() => setWeekAnchor(prev => dateUtils.addDays(prev, -7))}
            activeOpacity={0.7}
          >
            <ChevronLeft size={16} color={colors.primary.main} />
            <Text style={styles.premiumNavText}>Anterior</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.premiumNavToday}
            onPress={() => setWeekAnchor(new Date())}
            activeOpacity={0.7}
          >
            <Text style={styles.premiumNavTodayText}>Hoje</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.premiumNavButton}
            onPress={() => setWeekAnchor(prev => dateUtils.addDays(prev, 7))}
            activeOpacity={0.7}
          >
            <Text style={styles.premiumNavText}>Próxima</Text>
            <ChevronRight size={16} color={colors.primary.main} />
          </TouchableOpacity>
        </View>

        <View style={styles.premiumProgress}>
          <View
            style={[
              styles.premiumProgressBar,
              { width: `${(new Date().getDay() / 6) * 100}%` },
            ]}
          />
        </View>

        <View style={styles.premiumDays}>
          {weekDays.map((day, index) => {
            const dayDate = dateUtils.addDays(startDate, index);
            const dayNumber = dayDate.getDate();
            const isToday =
              dateUtils.isCurrentWeek(weekAnchor) &&
              dayDate.getDate() === new Date().getDate() &&
              dayDate.getMonth() === new Date().getMonth() &&
              dayDate.getFullYear() === new Date().getFullYear();

            const dayAppointments = appointmentsWeek.filter(item => {
              const itemDate = new Date(item.startAtMs);
              return (
                itemDate.getDate() === dayNumber &&
                itemDate.getMonth() === dayDate.getMonth() &&
                itemDate.getFullYear() === dayDate.getFullYear()
              );
            }).length;

            return (
              <TouchableOpacity
                key={day}
                style={[styles.premiumDay, isToday && styles.premiumDayToday]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.premiumDayName,
                    isToday && styles.premiumDayTextToday,
                  ]}
                >
                  {day}
                </Text>
                <Text
                  style={[
                    styles.premiumDayNumber,
                    isToday && styles.premiumDayTextToday,
                  ]}
                >
                  {dayNumber}
                </Text>
                <View
                  style={[
                    styles.premiumDayDot,
                    dayAppointments > 0 && styles.premiumDayDotActive,
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderAppointment = ({ item }: { item: AdminAppointment }) => {
    const subtitle =
      item.vehicleType === 'Carro' && item.carCategory
        ? `Carro • ${item.carCategory}`
        : item.vehicleType;

    const expired = dateUtils.isExpired(item.startAtMs, NO_SHOW_GRACE_MS);
    const isNoShow = item.status === 'scheduled' && expired;
    const displayStatus: AppointmentStatus = isNoShow ? 'no_show' : item.status;

    const statusConfig = getAppointmentStatusConfig(displayStatus);

    const getStatusIcon = () => {
      switch (displayStatus) {
        case 'done':
          return CheckCircle2;
        case 'in_progress':
          return Clock;
        case 'no_show':
          return XCircle;
        default:
          return Calendar;
      }
    };

    const StatusIcon = getStatusIcon();

    const action =
      displayStatus === 'scheduled' && !isNoShow
        ? {
            label: 'Começar',
            icon: PlayCircle,
            next: 'in_progress' as AppointmentStatus,
            color: colors.status.warning,
          }
        : displayStatus === 'in_progress'
        ? {
            label: 'Concluir',
            icon: CheckCircle2,
            next: 'done' as AppointmentStatus,
            color: colors.status.success,
          }
        : null;

    const canPress = !isNoShow && updatingId !== item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.serviceName} numberOfLines={2}>
              {item.serviceLabel ?? 'Serviço'}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${statusConfig.color}20` },
              ]}
            >
              <StatusIcon size={14} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>

          <Text style={styles.clientName} numberOfLines={1}>
            👤 {item.customerName}
          </Text>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Calendar size={14} color={colors.text.tertiary} />
              <Text style={styles.detailText}>
                {dateUtils.formatDate(item.startAtMs)}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Clock size={14} color={colors.text.tertiary} />
              <Text style={styles.detailText}>
                {dateUtils.formatHour(item.startAtMs)}
              </Text>
            </View>
          </View>

          <View style={styles.vehicleBadge}>
            <Text style={styles.vehicleText}>{subtitle}</Text>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.price}>{formatUtils.currency(item.price)}</Text>
            {action && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: action.color },
                  (!canPress || isNoShow) && styles.actionButtonDisabled,
                ]}
                onPress={() =>
                  isNoShow ? alertCannotWork() : doUpdate(item, action.next)
                }
                disabled={!canPress || isNoShow}
                activeOpacity={0.7}
              >
                {updatingId === item.id ? (
                  <ActivityIndicator size="small" color={colors.text.white} />
                ) : (
                  <>
                    <action.icon size={16} color={colors.text.white} />
                    <Text style={styles.actionButtonText}>{action.label}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.primary.main}
      />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.container}>
          <LinearGradient
            colors={[colors.primary.main, colors.secondary.main]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerTop}>
              <TouchableOpacity
                onPress={toggleMenu}
                style={styles.menuButton}
                activeOpacity={0.7}
              >
                <View style={styles.menuIcon}>
                  <View style={styles.menuBar} />
                  <View style={[styles.menuBar, { width: 20 }]} />
                  <View style={[styles.menuBar, { width: 16 }]} />
                </View>
              </TouchableOpacity>

              <Text style={styles.brand}>DETAILGO</Text>

              <TouchableOpacity
                onPress={() => navigation.navigate('AdminHistory')}
                style={styles.notificationButton}
                activeOpacity={0.7}
              >
                <History size={22} color={colors.text.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.profileSection}>
              <TouchableOpacity
                onPress={saveAvatar}
                style={styles.avatarWrapper}
                activeOpacity={0.9}
              >
                {avatarSource ? (
                  <Image source={avatarSource} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <UserIcon size={40} color={colors.primary.main} />
                  </View>
                )}
                {saving === 'avatar' && (
                  <View style={styles.avatarLoading}>
                    <ActivityIndicator color={colors.primary.main} />
                  </View>
                )}
                <View style={styles.cameraBadge}>
                  <Text style={styles.cameraBadgeText}>📷</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.userInfo}>
                <Text style={styles.userName}>{fullName}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>Administrador</Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.content}>
            {loadingWeek ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary.main} />
              </View>
            ) : (
              <FlatList
                data={appointmentsWeek}
                keyExtractor={item => item.id}
                renderItem={renderAppointment}
                ItemSeparatorComponent={() => (
                  <View style={{ height: spacing.md }} />
                )}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={<WeekHeaderPremium />}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Calendar size={48} color={colors.text.disabled} />
                    <Text style={styles.emptyStateTitle}>
                      Nenhum agendamento
                    </Text>
                    <Text style={styles.emptyStateText}>
                      Não há serviços agendados para esta semana.
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </View>

        {menuVisible && (
          <>
            <Pressable style={styles.overlay} onPress={toggleMenu} />
            <Animated.View
              style={[
                styles.drawer,
                { transform: [{ translateX: slideAnim }] },
              ]}
            >
              <View style={styles.drawerHeader}>
                <View style={styles.drawerUserInfo}>
                  <Text style={styles.drawerUserName}>{fullName}</Text>
                  <Text style={styles.drawerUserEmail}>{user.email}</Text>
                  {profile.role === 'admin' && (
                    <View style={styles.drawerAdminBadge}>
                      <Text style={styles.drawerAdminBadgeText}>
                        Administrador
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.drawerContent}>
                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => navigateFromMenu('AdminDashboard')}
                >
                  <Calendar size={22} color={colors.primary.main} />
                  <Text style={styles.drawerItemText}>Dashboard</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => navigateFromMenu('AdminHistory')}
                >
                  <History size={22} color={colors.primary.main} />
                  <Text style={styles.drawerItemText}>Histórico</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => navigateFromMenu('AdminManage')}
                >
                  <Settings size={22} color={colors.primary.main} />
                  <Text style={styles.drawerItemText}>Gerenciar</Text>
                </TouchableOpacity>

                <View style={styles.drawerDivider} />

                <TouchableOpacity
                  style={[styles.drawerItem, styles.drawerLogout]}
                  onPress={handleSignOut}
                >
                  <LogOut size={22} color={colors.status.error} />
                  <Text
                    style={[styles.drawerItemText, styles.drawerLogoutText]}
                  >
                    Sair
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background.main,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: 32,
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  menuButton: {
    padding: spacing.xs,
  },
  menuIcon: {
    width: 24,
    height: 20,
    justifyContent: 'space-between',
  },
  menuBar: {
    height: 2,
    width: 24,
    backgroundColor: colors.text.white,
    borderRadius: 2,
  },
  brand: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text.white,
    letterSpacing: 1.5,
  },
  notificationButton: {
    padding: spacing.xs,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    borderColor: colors.text.white,
  },
  avatarPlaceholder: {
    backgroundColor: colors.text.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary.main,
    borderWidth: 2,
    borderColor: colors.text.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadgeText: {
    fontSize: 14,
    color: colors.text.white,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.white,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  adminBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
    alignSelf: 'flex-start',
  },
  adminBadgeText: {
    color: colors.text.white,
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  listContent: {
    paddingBottom: spacing.xl,
    paddingTop: spacing.xs,
  },
  premiumContainer: {
    backgroundColor: colors.background.card,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.main,
    shadowColor: colors.text.primary,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  premiumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  premiumTitleContainer: {
    flex: 1,
  },
  premiumSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.tertiary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  premiumTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  premiumCount: {
    alignItems: 'flex-end',
    marginLeft: spacing.xs,
  },
  premiumCountText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary.main,
    lineHeight: 20,
  },
  premiumCountLabel: {
    fontSize: 10,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  premiumNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: 4,
  },
  premiumNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border.main,
    flex: 1,
    justifyContent: 'center',
  },
  premiumNavText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary.main,
  },
  premiumNavToday: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary.main,
    borderRadius: radii.sm,
    flex: 1,
    alignItems: 'center',
  },
  premiumNavTodayText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.white,
  },
  premiumProgress: {
    height: 3,
    backgroundColor: colors.background.surface,
    borderRadius: 1.5,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  premiumProgressBar: {
    height: '100%',
    backgroundColor: colors.primary.main,
    borderRadius: 1.5,
  },
  premiumDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 2,
  },
  premiumDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  premiumDayToday: {
    backgroundColor: colors.primary.light,
  },
  premiumDayName: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.tertiary,
    marginBottom: 1,
  },
  premiumDayNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 2,
  },
  premiumDayTextToday: {
    color: colors.primary.main,
  },
  premiumDayDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'transparent',
  },
  premiumDayDotActive: {
    backgroundColor: colors.primary.main,
  },
  card: {
    backgroundColor: colors.background.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.main,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  cardContent: {
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    gap: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clientName: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 80,
  },
  detailText: {
    fontSize: 13,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  vehicleBadge: {
    backgroundColor: colors.background.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border.main,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  vehicleText: {
    fontSize: 12,
    color: colors.text.tertiary,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border.main,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary.main,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    minWidth: 100,
    justifyContent: 'center',
    elevation: 2,
    shadowColor: colors.text.primary,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  actionButtonDisabled: {
    opacity: 0.5,
    elevation: 0,
    shadowOpacity: 0,
  },
  actionButtonText: {
    color: colors.text.white,
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.main,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: MENU_W,
    backgroundColor: colors.background.main,
    borderTopRightRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
    shadowColor: colors.text.primary,
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 2, height: 0 },
    elevation: 8,
  },
  drawerHeader: {
    padding: spacing.lg,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.main,
  },
  drawerUserInfo: {
    gap: spacing.xs,
  },
  drawerUserName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  drawerUserEmail: {
    fontSize: 14,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  drawerAdminBadge: {
    backgroundColor: colors.primary.light,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
    alignSelf: 'flex-start',
  },
  drawerAdminBadgeText: {
    color: colors.primary.main,
    fontSize: 12,
    fontWeight: '600',
  },
  drawerContent: {
    padding: spacing.md,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    gap: 14,
  },
  drawerItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
  },
  drawerDivider: {
    height: 1,
    backgroundColor: colors.border.main,
    marginVertical: spacing.md,
  },
  drawerLogout: {
    marginTop: 'auto',
  },
  drawerLogoutText: {
    color: colors.status.error,
    fontWeight: '600',
  },
});
