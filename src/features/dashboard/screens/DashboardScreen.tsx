import React, { useEffect, useRef, useState } from 'react';
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
} from 'react-native-image-picker';
import { getAuth } from '@react-native-firebase/auth';
import {
  doc,
  getFirestore,
  onSnapshot,
  setDoc,
} from '@react-native-firebase/firestore';

import { colors, spacing, radii } from '@shared/theme';
import { UI } from '@shared/constants/app.constants';

import { useAuth } from '@features/auth';
import { useShop } from '@features/shops/context/ShopContext';
import { useDashboardAppointments } from '@features/appointments/hooks/useDashboardAppointments';
import AppointmentCard from '@features/appointments/ui/components/AppointmentCard';
import type { RootStackParamList } from '@app/types';

import {
  Calendar,
  History,
  LogOut,
  Settings,
  User,
  ChevronRight,
  Camera,
  Bell,
} from 'lucide-react-native';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

type UserProfile = {
  firstName?: string;
  lastName?: string;
  coverUrl?: string;
  photoURL?: string;
  coverB64?: string;
  photoB64?: string;
};

const AVATAR_SIZE = UI.AVATAR_SIZE;

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
  const [saving, setSaving] = useState<'cover' | 'avatar' | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-UI.MENU_WIDTH)).current;

  const { loading: loadingAppointments, items: appointments } =
    useDashboardAppointments({
      uid,
      shopId: shopId ?? '',
      limitN: 30,
    });

  useEffect(() => {
    const db = getFirestore();
    const userRef = doc(db, 'users', uid);

    const unsubProfile = onSnapshot(userRef, snap => {
      const data = snap.data() as UserProfile | undefined;
      if (data) {
        setProfile(p => ({
          ...p,
          ...data,
          photoURL: data.photoURL ?? p.photoURL ?? user.photoURL ?? undefined,
        }));
      }
    });

    return () => unsubProfile();
  }, [uid, user.photoURL]);

  const pickImage = async () => {
    const opts: ImageLibraryOptions = {
      mediaType: 'photo',
      selectionLimit: 1,
      includeBase64: true,
      quality: 0.7,
      maxWidth: 500,
      maxHeight: 500,
    };

    const res = await launchImageLibrary(opts);
    if (res.didCancel) return null;

    const asset = res.assets?.[0];
    if (!asset?.base64) return null;

    const mime = asset.type?.startsWith('image/') ? asset.type : 'image/jpeg';
    return `data:${mime};base64,${asset.base64}`;
  };

  const saveAvatar = async () => {
    try {
      const b64 = await pickImage();
      if (!b64) return;

      setSaving('avatar');
      await setDoc(
        doc(getFirestore(), 'users', uid),
        { photoB64: b64 },
        { merge: true },
      );
      setProfile(p => ({ ...p, photoB64: b64 }));
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar a foto');
    } finally {
      setSaving(null);
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

  const navigateFromMenu = (route: keyof RootStackParamList, params?: any) => {
    toggleMenu();
    navigation.navigate(route, params);
  };

  const navigateDirect = (route: keyof RootStackParamList, params?: any) => {
    navigation.navigate(route, params);
  };

  const handleSignOut = async () => {
    try {
      toggleMenu();
      await signOut();
    } catch {
      Alert.alert('Erro', 'Falha ao sair da conta');
    }
  };

  // TODO AQUI
  const handleNotifications = () => {
    Alert.alert(
      'Notificações',
      'Em breve você receberá notificações sobre seus agendamentos!',
      [{ text: 'OK' }],
    );
  };

  const fullName = profile.firstName
    ? `${profile.firstName} ${profile.lastName || ''}`
    : user.displayName || 'Usuário';

  const avatarSource = profile.photoB64
    ? { uri: profile.photoB64 }
    : profile.photoURL
    ? { uri: profile.photoURL }
    : null;

  const recentAppointments = appointments.slice(0, 3);

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
                onPress={handleNotifications}
                style={styles.notificationButton}
                activeOpacity={0.7}
              >
                <Bell size={22} color={colors.text.white} />
              </TouchableOpacity>
            </View>

            {/* Perfil do usuário */}
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
                    <User size={40} color={colors.primary.main} />
                  </View>
                )}
                {saving === 'avatar' && (
                  <View style={styles.avatarLoading}>
                    <ActivityIndicator color={colors.primary.main} />
                  </View>
                )}
                <View style={styles.cameraBadge}>
                  <Camera size={14} color={colors.text.white} />
                </View>
              </TouchableOpacity>

              <View style={styles.userInfo}>
                <Text style={styles.userName}>{fullName}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Conteúdo principal */}
          <View style={styles.content}>
            {/* Botão de agendamento */}
            <TouchableOpacity
              style={styles.bookingButton}
              onPress={() => navigateDirect('Appointment')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[colors.primary.main, colors.secondary.main]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.bookingGradient}
              >
                <Calendar size={22} color={colors.text.white} />
                <Text style={styles.bookingText}>Agendar novo serviço</Text>
                <ChevronRight size={20} color={colors.text.white} />
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Próximos serviços</Text>
                {appointments.length > 3 && (
                  <TouchableOpacity
                    onPress={() => navigateDirect('MyAppointments')}
                  >
                    <Text style={styles.sectionLink}>Ver todos</Text>
                  </TouchableOpacity>
                )}
              </View>

              {loadingAppointments ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={colors.primary.main} />
                </View>
              ) : recentAppointments.length > 0 ? (
                <FlatList
                  data={recentAppointments}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => <AppointmentCard item={item} />}
                  ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                  scrollEnabled={false}
                  style={styles.appointmentsList}
                />
              ) : (
                <View style={styles.emptyState}>
                  <Calendar size={48} color={colors.text.disabled} />
                  <Text style={styles.emptyStateTitle}>
                    Nenhum serviço agendado
                  </Text>
                  <Text style={styles.emptyStateText}>
                    Agende seu primeiro serviço de estética automotiva
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Menu lateral */}
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
                </View>
              </View>

              <View style={styles.drawerContent}>
                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => navigateFromMenu('Profile')}
                >
                  <User size={22} color={colors.primary.main} />
                  <Text style={styles.drawerItemText}>Perfil</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => navigateFromMenu('MyAppointments')}
                >
                  <Calendar size={22} color={colors.primary.main} />
                  <Text style={styles.drawerItemText}>Meus agendamentos</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => navigateFromMenu('History')}
                >
                  <History size={22} color={colors.primary.main} />
                  <Text style={styles.drawerItemText}>Histórico</Text>
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
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.white,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  bookingButton: {
    marginBottom: 32,
    borderRadius: radii.lg,
    overflow: 'hidden',
    shadowColor: colors.primary.main,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  bookingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  bookingText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.white,
    flex: 1,
    marginLeft: spacing.md,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.main,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  appointmentsList: {
    marginTop: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
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
    lineHeight: 20,
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
    width: UI.MENU_WIDTH,
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
