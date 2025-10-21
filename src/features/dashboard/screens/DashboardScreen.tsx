import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary, ImageLibraryOptions, Asset } from 'react-native-image-picker';

import { getAuth, updateProfile } from '@react-native-firebase/auth';

// Firestore API modular
import {
  getFirestore,
  doc,
  onSnapshot,
  setDoc,
} from '@react-native-firebase/firestore';

type UserProfile = {
  firstName?: string;
  lastName?: string;
  // urls (se algum dia migrar pro Storage)
  coverUrl?: string;
  photoURL?: string;
  // base64
  coverB64?: string; // "data:image/jpeg;base64,...."
  photoB64?: string; // idem
};

const COVER_H = 240;
const AVATAR = 160;

LogBox.ignoreLogs([
  'SafeAreaView has been deprecated',
  'This method is deprecated (as well as all React Native Firebase namespaced API)',
]);

export default function DashboardScreen() {
  const auth = getAuth();
  const user = auth.currentUser!;
  const uid = user.uid;

  const [profile, setProfile] = useState<UserProfile>({
    photoURL: user.photoURL ?? undefined,
  });
  const [saving, setSaving] = useState<'cover' | 'avatar' | null>(null);

  const mockServices = [
    { id: '1', title: 'Higienização Completa' },
    { id: '2', title: 'Polimento Técnico' },
    { id: '3', title: 'Vitrificação de Pintura' },
  ];

  // Carrega perfil
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

  // --- helpers: escolher imagem e obter Base64 controlado ---
  const pickAsBase64 = async () => {
    const opts: ImageLibraryOptions = {
      mediaType: 'photo',
      selectionLimit: 1,
      includeBase64: true,     // <-- essencial
      quality: 0.6,            // reduz tamanho (0–1)
      maxWidth: 640,           // limita dimensões (ajuda muito no tamanho)
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

      // grava no firestore (merge)
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

      // atualiza auth (opcional – o Auth aceita uma URL; como é dataURI, só use se precisar exibir pelo user.photoURL)
      // Para evitar side effects, vamos manter só em Firestore e usar no app.
      await setDoc(doc(getFirestore(), 'users', uid), { photoB64: b64 }, { merge: true });

      setProfile((p) => ({ ...p, photoB64: b64 }));
    } catch (e: any) {
      console.warn('saveAvatar error:', e?.code, e?.message, e);
      Alert.alert('Erro', `Falha ao salvar a foto de perfil.\n${e?.code ?? ''}`);
    } finally {
      setSaving(null);
    }
  };

  // decide a fonte da capa/ avatar (b64 tem prioridade; depois url; depois fallback)
  const coverSource =
    profile.coverB64
      ? { uri: profile.coverB64 }
      : profile.coverUrl
      ? { uri: profile.coverUrl }
      : { uri: 'https://singlecolorimage.com/get/1f46d3/1200x600' };

  const avatarSource =
    profile.photoB64
      ? { uri: profile.photoB64 }
      : profile.photoURL
      ? { uri: profile.photoURL }
      : undefined;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.headerWrapper}>
          <ImageBackground
            style={styles.header}
            imageStyle={styles.headerImg}
            source={coverSource}
          >
            <TouchableOpacity style={styles.menuBtn} activeOpacity={0.8}>
              <View style={styles.menuLine} />
              <View style={[styles.menuLine, { width: 20 }]} />
            </TouchableOpacity>

            <TouchableOpacity onPress={saveCover} style={styles.coverBtn} activeOpacity={0.9}>
              {saving === 'cover' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.coverBtnTxt}>Trocar capa</Text>
              )}
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#B5B7BC' },
  container: { flex: 1 },

  headerWrapper: {
    height: COVER_H,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1F46D3',
  },
  header: { flex: 1, justifyContent: 'center' },
  headerImg: { borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  menuBtn: { position: 'absolute', left: 18, top: 18, gap: 6, padding: 4 },
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
  avatarImg: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: '#000',
  },
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
});
