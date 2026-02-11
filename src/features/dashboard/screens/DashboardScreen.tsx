// src/features/dashboard/screens/DashboardScreen.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
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

import { launchImageLibrary, type ImageLibraryOptions, type Asset } from 'react-native-image-picker';
import { getAuth } from '@react-native-firebase/auth';
import { doc, getFirestore, onSnapshot, setDoc } from '@react-native-firebase/firestore';

import { useAuth } from '@features/auth';
import { isAdminEmail } from '@features/auth/utils/roles';
import { updateAppointmentStatus } from '@features/admin/services/adminAppointments.service';
import { useDashboardAppointments, type DashboardAppointment } from '@features/appointments/hooks/useDashboardAppointments';
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
  Clock,
} from 'lucide-react-native';

// Paleta DetailGo
const colors = {
  primary: '#175676', // Baltic Blue
  secondary: '#4BA3C3', // Turquoise Surf
  error: '#D62839', // Classic Crimson
  errorLight: '#BA324F', // Rosewood
  background: '#FFFFFF',
  surface: '#F8FAFC',
  border: '#E2E8F0',
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    tertiary: '#64748B',
    disabled: '#94A3B8',
    white: '#FFFFFF',
  },
  card: {
    background: '#FFFFFF',
    border: '#F1F5F9',
  }
};

type NavProp = NativeStackNavigationProp<RootStackParamList>;

type UserProfile = {
  firstName?: string;
  lastName?: string;
  coverUrl?: string;
  photoURL?: string;
  coverB64?: string;
  photoB64?: string;
};

const AVATAR_SIZE = 96;

export default function DashboardScreen() {
  const navigation = useNavigation<NavProp>();
  const auth = getAuth();
  const user = auth.currentUser!;
  const uid = user.uid;
  const { signOut } = useAuth();

  const [profile, setProfile] = useState<UserProfile>({
    photoURL: user.photoURL ?? undefined,
  });
  const [saving, setSaving] = useState<'cover' | 'avatar' | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-280)).current;

  const isAdmin = isAdminEmail(user.email);

  const markNoShow = useCallback(async (appointmentId: string, customerUid: string) => {
    await updateAppointmentStatus({
      appointmentId,
      customerUid,
      status: 'no_show',
    });
  }, []);

  const { loading: loadingAppointments, items: appointments } = useDashboardAppointments({
    uid,
    limitN: 30,
    markNoShow,
  });

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
      await setDoc(doc(getFirestore(), 'users', uid), { photoB64: b64 }, { merge: true });
      setProfile((p) => ({ ...p, photoB64: b64 }));
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar a foto');
    } finally {
      setSaving(null);
    }
  };

  const toggleMenu = () => {
    if (menuVisible) {
      Animated.timing(slideAnim, {
        toValue: -280,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setMenuVisible(false));
    } else {
      setMenuVisible(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  };

  // Navegação pelo menu lateral - FECHA o menu primeiro
  const navigateFromMenu = (route: keyof RootStackParamList, params?: any) => {
    toggleMenu();
    navigation.navigate(route, params);
  };

  // Navegação direta - NÃO mexe no menu
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
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.container}>
          {/* Header com gradiente */}
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerTop}>
              <TouchableOpacity onPress={toggleMenu} style={styles.menuButton} activeOpacity={0.7}>
                <View style={styles.menuIcon}>
                  <View style={styles.menuBar} />
                  <View style={[styles.menuBar, { width: 20 }]} />
                  <View style={[styles.menuBar, { width: 16 }]} />
                </View>
              </TouchableOpacity>
              
              <Text style={styles.brand}>DETAILGO</Text>
              
              <TouchableOpacity 
                onPress={() => navigateDirect('MyAppointments')} 
                style={styles.notificationButton}
                activeOpacity={0.7}
              >
                <Clock size={22} color={colors.text.white} />
              </TouchableOpacity>
            </View>

            {/* Perfil do usuário */}
            <View style={styles.profileSection}>
              <TouchableOpacity onPress={saveAvatar} style={styles.avatarWrapper} activeOpacity={0.9}>
                {avatarSource ? (
                  <Image source={avatarSource} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <User size={40} color={colors.primary} />
                  </View>
                )}
                {saving === 'avatar' && (
                  <View style={styles.avatarLoading}>
                    <ActivityIndicator color={colors.primary} />
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
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.bookingGradient}
              >
                <Calendar size={22} color={colors.text.white} />
                <Text style={styles.bookingText}>Agendar novo serviço</Text>
                <ChevronRight size={20} color={colors.text.white} />
              </LinearGradient>
            </TouchableOpacity>

            {/* Seção de próximos serviços */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Próximos serviços</Text>
                {appointments.length > 3 && (
                  <TouchableOpacity onPress={() => navigateDirect('MyAppointments')}>
                    <Text style={styles.sectionLink}>Ver todos</Text>
                  </TouchableOpacity>
                )}
              </View>

              {loadingAppointments ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : recentAppointments.length > 0 ? (
                <FlatList
                  data={recentAppointments}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => <AppointmentCard item={item} />}
                  ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                  scrollEnabled={false}
                  style={styles.appointmentsList}
                />
              ) : (
                <View style={styles.emptyState}>
                  <Calendar size={48} color={colors.text.disabled} />
                  <Text style={styles.emptyStateTitle}>Nenhum serviço agendado</Text>
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
            <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
              <View style={styles.drawerHeader}>
                <View style={styles.drawerUserInfo}>
                  <Text style={styles.drawerUserName}>{fullName}</Text>
                  <Text style={styles.drawerUserEmail}>{user.email}</Text>
                </View>
              </View>

              <View style={styles.drawerContent}>
                <TouchableOpacity 
                  style={styles.drawerItem}
                  onPress={() => navigateFromMenu('MyAppointments')}
                >
                  <Calendar size={22} color={colors.primary} />
                  <Text style={styles.drawerItemText}>Meus agendamentos</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.drawerItem}
                  onPress={() => navigateFromMenu('History')}
                >
                  <History size={22} color={colors.primary} />
                  <Text style={styles.drawerItemText}>Histórico</Text>
                </TouchableOpacity>

                {isAdmin && (
                  <TouchableOpacity 
                    style={styles.drawerItem}
                    onPress={() => navigateFromMenu('AdminDashboard')}
                  >
                    <Settings size={22} color={colors.primary} />
                    <Text style={styles.drawerItemText}>Painel Admin</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.drawerDivider} />

                <TouchableOpacity 
                  style={[styles.drawerItem, styles.drawerLogout]}
                  onPress={handleSignOut}
                >
                  <LogOut size={22} color={colors.error} />
                  <Text style={[styles.drawerItemText, styles.drawerLogoutText]}>Sair</Text>
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
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  menuButton: {
    padding: 8,
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
    padding: 8,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
    backgroundColor: colors.primary,
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
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  bookingButton: {
    marginBottom: 32,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  bookingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  bookingText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.white,
    flex: 1,
    marginLeft: 12,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  appointmentsList: {
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: colors.background,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 2, height: 0 },
    elevation: 8,
  },
  drawerHeader: {
    padding: 24,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  drawerUserInfo: {
    gap: 4,
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
    padding: 16,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 14,
  },
  drawerItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
  },
  drawerDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  drawerLogout: {
    marginTop: 'auto',
  },
  drawerLogoutText: {
    color: colors.error,
    fontWeight: '600',
  },
});