import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from '@react-native-firebase/auth';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
} from '@react-native-firebase/firestore';

export type RegisterInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
};

export type AuthResult =
  | {
      ok: true;
      user: FirebaseAuthTypes.User;
      cred?: FirebaseAuthTypes.UserCredential;
    }
  | { ok: false; message: string; code?: string };

function mapFirebaseError(
  code?: string,
  fallback = 'Ocorreu um erro. Tente novamente.',
) {
  switch (code) {
    case 'auth/invalid-email':
      return 'E-mail inválido.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'E-mail ou senha inválidos.';
    case 'auth/email-already-in-use':
      return 'Este e-mail já está em uso.';
    case 'auth/weak-password':
      return 'A senha é muito fraca (mínimo 6 caracteres).';
    case 'permission-denied':
      return 'Sem permissão para acessar o banco de dados.';
    default:
      return fallback;
  }
}

async function ensureUserDocument(
  uid: string,
  data: Partial<RegisterInput> & { email: string },
) {
  const db = getFirestore();
  const ref = doc(db, 'users', uid);
  await setDoc(
    ref,
    {
      uid,
      firstName: data.firstName ?? '',
      lastName: data.lastName ?? '',
      email: data.email,
      phone: data.phone ?? '',
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function signIn(
  email: string,
  password: string,
): Promise<AuthResult> {
  try {
    const auth = getAuth();
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    return { ok: true, user: cred.user, cred };
  } catch (e: any) {
    return {
      ok: false,
      message: mapFirebaseError(e?.code, 'Erro ao autenticar.'),
      code: e?.code,
    };
  }
}

export async function register(data: RegisterInput): Promise<AuthResult> {
  try {
    const auth = getAuth();
    const cred = await createUserWithEmailAndPassword(
      auth,
      data.email.trim(),
      data.password,
    );

    const displayName = `${data.firstName} ${data.lastName}`.trim();
    if (displayName) await updateProfile(cred.user, { displayName });

    await ensureUserDocument(cred.user.uid, data);
    return { ok: true, user: cred.user, cred };
  } catch (e: any) {
    return {
      ok: false,
      message: mapFirebaseError(e?.code, 'Erro ao criar conta.'),
      code: e?.code,
    };
  }
}

export async function signOutUser() {
  await signOut(getAuth());
}

export function getCurrentUser(): FirebaseAuthTypes.User | null {
  return getAuth().currentUser;
}

export function subscribeAuth(
  callback: (user: FirebaseAuthTypes.User | null) => void,
) {
  return onAuthStateChanged(getAuth(), callback);
}
