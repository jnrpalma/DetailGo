import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  ImageBackground,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  LogBox,
  Pressable,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary, ImageLibraryOptions, Asset } from 'react-native-image-picker';

import { getAuth } from '@react-native-firebase/auth';

// Firestore API modular
import { getFirestore, doc, onSnapshot, setDoc } from '@react-native-firebase/firestore';

// se você já tem o AuthContext:
import { useAuth } from '@features/auth/context/AuthContext';

type UserProfile = {
  firstName?: string;
  lastName?: string;
  coverUrl?: string;
  photoURL?: string;
  coverB64?: string;
  photoB64?: string;
};

const COVER_H = 240;
const AVATAR = 160;
const MENU_W = 260; // largura do drawer

LogBox.ignoreLogs([
  'SafeAreaView has been deprecated',
  'This method is deprecated (as well as all React Native Firebase namespaced API)',
]);

export default function DashboardScreen() {
  const auth = getAuth();
  const user = auth.currentUser!;
  const uid = user.uid;

  const { signOut } = useAuth(); // para botão "Sair"

  const [profile, setProfile] = useState<UserProfile>({ photoURL: user.photoURL ?? undefined });
  const [saving, setSaving] = useState<'cover' | 'avatar' | null>(null);

  // ---- MENU STATE / ANIMAÇÃO ----
  const [menuOpen, setMenuOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current; // 0 fechado, 1 aberto

  const openMenu = () => {
    setMenuOpen(true);
    Animated.timing(anim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setMenuOpen(false);
    });
  };

  const drawerTx = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-MENU_W, 0],
  });

  const overlayOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  // ---- MOCK ----
  const mockServices = [
    { id: '1', title: 'Higienização Completa' },
    { id: '2', title: 'Polimento Técnico' },
    { id: '3', title: 'Vitrificação de Pintura' },
  ];

  // ---- CARREGAR PERFIL ----
  useEffect(() => {
    const db = getFirestore();
    const userRef = doc(db, 'users', uid);
    const unsub = onSnapshot(userRef, (snap) => {
      const data = snap.data() as UserProfile | undefined;
      if (data) {
        setProfile((p) => ({
          ...p,
          ...data,
          photoURL: data.photoURL ?? p.photoURL ?? user.photoURL ?? undefined,
        }));
      }
    });
    return unsub;
  }, [uid, user.photoURL]);

  // ---- IMAGE PICK (base64) ----
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
    const dataUri = `data:${mime};base64,${a.base64}`;
    return dataUri;
  };

  const saveCover = async () => {
    try {
      const b64 = await pickAsBase64();
      if (!b64) return;
      setSaving('cover');
      await setDoc(doc(getFirestore(), 'users', uid), { coverB64: b64 }, { merge: true });
      setProfile((p) => ({ ...p, coverB64: b64 }));
    } catch (e: any) {
      console.warn('saveCover error:', e?.code, e?.message, e);
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
      console.warn('saveAvatar error:', e?.code, e?.message, e);
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
      : { uri: 'https://singlecolorimage.com/get/1f46d3/1200x600' };

  const avatarSource =
    profile.photoB64 ? { uri: profile.photoB64 } : profile.photoURL ? { uri: profile.photoURL } : undefined;

  // ---- AÇÕES DO MENU ----
  const goProfile = () => {
    closeMenu();
    Alert.alert('Meu Perfil', 'Aqui você navega para a tela de Perfil. (TODO)');
    // navigation.navigate('Perfil') // quando criar a rota
  };

  const goHistory = () => {
    closeMenu();
    Alert.alert('Histórico', 'Aqui você navega para a tela de Histórico. (TODO)');
    // navigation.navigate('Historico') // quando criar a rota
  };

  const doSignOut = async () => {
    closeMenu();
    try {
      await signOut();
      // RootNavigator vai redirecionar para Login automaticamente
    } catch (e) {
      Alert.alert('Erro', 'Falha ao sair. Tente novamente.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.headerWrapper}>
          <ImageBackground style={styles.header} imageStyle={styles.headerImg} source={coverSource}>
            {/* Botão menu (hambúrguer) */}
            <TouchableOpacity style={styles.menuBtn} activeOpacity={0.8} onPress={openMenu}>
              <View style={styles.menuLine} />
              <View style={[styles.menuLine, { width: 22 }]} />
              <View style={[styles.menuLine, { width: 18 }]} />
            </TouchableOpacity>

            {/* Trocar capa */}
            <TouchableOpacity onPress={saveCover} style={styles.coverBtn} activeOpacity={0.9}>
              {saving === 'cover' ? <ActivityIndicator color="#fff" /> : <Text style={styles.coverBtnTxt}>Trocar capa</Text>}
            </TouchableOpacity>
          </ImageBackground>
        </View>

        {/* AVATAR */}
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
              <ActivityIndicator color="#fff" />
            </View>
          )}
        </View>

        {/* BODY */}
        <View style={styles.body}>
          <Text style={styles.sectionTitle}>Últimos serviços</Text>
          <FlatList
            data={mockServices}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.serviceCard}>
                <Text style={styles.serviceText}>{item.title}</Text>
              </View>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* -------- OVERLAY + DRAWER ------- */}
        {(menuOpen || /* render durante animação */ true) && (
          <>
            {/* Overlay clicável para fechar */}
            <Animated.View
              pointerEvents={menuOpen ? 'auto' : 'none'}
              style={[StyleSheet.absoluteFill, styles.overlay, { opacity: overlayOpacity }]}
            >
              <Pressable style={{ flex: 1 }} onPress={closeMenu} />
            </Animated.View>

            {/* Gaveta */}
            <Animated.View
              style={[
                styles.drawer,
                {
                  transform: [{ translateX: drawerTx }],
                },
              ]}
            >
              {/* Cabeçalho do menu */}
              <View style={styles.drawerHeader}>
                <View style={styles.hamburgerGhost}>
                  <View style={styles.menuLine} />
                  <View style={[styles.menuLine, { width: 22 }]} />
                  <View style={[styles.menuLine, { width: 18 }]} />
                </View>
              </View>

              {/* Itens */}
              <TouchableOpacity style={styles.item} onPress={goProfile} activeOpacity={0.8}>
                <Text style={styles.itemIcon}>👤</Text>
                <Text style={styles.itemText}>Meu Perfil</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.item} onPress={goHistory} activeOpacity={0.8}>
                <Text style={styles.itemIcon}>📘</Text>
                <Text style={styles.itemText}>Histórico</Text>
              </TouchableOpacity>

              <View style={{ flex: 1 }} />

              <TouchableOpacity style={[styles.item, { marginBottom: 18 }]} onPress={doSignOut} activeOpacity={0.8}>
                <Text style={styles.itemIcon}>🚪</Text>
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
  safe: { flex: 1, backgroundColor: '#0F1115' },
  container: { flex: 1, backgroundColor: '#B5B7BC' },

  headerWrapper: {
    height: COVER_H,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1F46D3',
  },
  header: { flex: 1, justifyContent: 'center' },
  headerImg: { borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },

  menuBtn: { position: 'absolute', left: 18, top: 18, gap: 6, padding: 6, borderRadius: 8 },
  menuLine: { height: 3, width: 26, backgroundColor: '#000', borderRadius: 2 },

  coverBtn: {
    position: 'absolute',
    right: 12,
    top: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 10,
  },
  coverBtnTxt: { color: '#fff', fontWeight: '700' },

  avatarContainer: {
    alignSelf: 'center',
    marginTop: -AVATAR / 2,
    width: AVATAR + 12,
    height: AVATAR + 12,
    borderRadius: (AVATAR + 12) / 2,
    backgroundColor: '#fff',
    padding: 6,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  avatarImg: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, backgroundColor: '#000' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarPlaceholder: { color: '#E6F6FF', fontSize: 16, fontWeight: '600' },
  avatarLoading: {
    position: 'absolute',
    inset: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: AVATAR / 2,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  body: { flex: 1, paddingHorizontal: 24, paddingTop: 24, backgroundColor: '#B5B7BC' },
  sectionTitle: { textAlign: 'center', fontSize: 18, fontWeight: '700', marginBottom: 20 },
  serviceCard: { backgroundColor: '#000', borderRadius: 12, paddingVertical: 20, paddingHorizontal: 12 },
  serviceText: { color: '#fff', textAlign: 'center', fontSize: 15 },

  // overlay + drawer
  overlay: {
    backgroundColor: '#000',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: MENU_W,
    backgroundColor: '#5F646B', // tom parecido da referência
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  drawerHeader: {
    height: 56,
    justifyContent: 'center',
  },
  hamburgerGhost: { width: 32, gap: 6 },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  itemIcon: { fontSize: 18, color: '#1F2C3A' },
  itemText: { fontSize: 16, color: '#FFFFFF' },
});
