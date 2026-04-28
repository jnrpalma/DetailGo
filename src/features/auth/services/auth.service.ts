import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from '@react-native-firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  limit,
  Timestamp,
} from '@react-native-firebase/firestore';

export type UserRole = 'owner' | 'customer';

export type RegisterInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  shopName?: string;   // obrigatório para owner
  inviteCode?: string; // obrigatório para customer
};

export type AuthResult =
  | {
      ok: true;
      user: FirebaseAuthTypes.User;
      cred?: FirebaseAuthTypes.UserCredential;
      inviteCode?: string;
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

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function findShopByCode(inviteCode: string): Promise<string | null> {
  const db = getFirestore();
  const qy = query(
    collection(db, 'shops'),
    where('code', '==', inviteCode.toUpperCase().trim()),
    limit(1),
  );
  const snap = await getDocs(qy);
  if (snap.empty) return null;
  return snap.docs[0].id;
}

async function registerAsOwner(
  uid: string,
  data: RegisterInput,
): Promise<string> {
  const db = getFirestore();
  const shopRef = doc(collection(db, 'shops'));
  const shopId = shopRef.id;
  const code = generateInviteCode();
  const shopName = data.shopName?.trim() || 'Minha Estética';

  const trialEndsAt = Timestamp.fromMillis(Date.now() + 14 * 24 * 60 * 60 * 1000);

  await setDoc(shopRef, {
    name: shopName,
    code,
    ownerId: uid,
    createdAt: serverTimestamp(),
    subscriptionStatus: 'trial',
    trialEndsAt,
    activeUntil: null,
  });

  await setDoc(doc(db, 'shops', shopId, 'settings', 'config'), {
    openHour: 8,
    closeHour: 18,
    slotStepMin: 30,
    parallelCapacity: 2,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await setDoc(
    doc(db, 'users', uid),
    {
      uid,
      firstName: data.firstName ?? '',
      lastName: data.lastName ?? '',
      email: data.email,
      phone: data.phone ?? '',
      role: 'owner',
      shopId,
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );

  return code;
}

async function registerAsCustomer(
  uid: string,
  data: RegisterInput,
): Promise<void> {
  const db = getFirestore();
  await setDoc(
    doc(db, 'users', uid),
    {
      uid,
      firstName: data.firstName ?? '',
      lastName: data.lastName ?? '',
      email: data.email,
      phone: data.phone ?? '',
      role: 'customer',
      shopId: null,
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

    if (data.role === 'owner') {
      const inviteCode = await registerAsOwner(cred.user.uid, data);
      return { ok: true, user: cred.user, cred, inviteCode };
    } else {
      await registerAsCustomer(cred.user.uid, data);
      return { ok: true, user: cred.user, cred };
    }
  } catch (e: any) {
    return {
      ok: false,
      message: e?.message ?? mapFirebaseError(e?.code, 'Erro ao criar conta.'),
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
