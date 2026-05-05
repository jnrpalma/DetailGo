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
  Timestamp,
} from '@react-native-firebase/firestore';
import { mapFirebaseAuthError } from '@shared/utils/firebase.utils';
import { stringUtils } from '@shared/utils/string.utils';

export type UserRole = 'owner' | 'customer';

export type RegisterInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  shopName?: string; // obrigatório para owner
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

async function registerAsOwner(uid: string, data: RegisterInput): Promise<string> {
  const db = getFirestore();
  const shopRef = doc(collection(db, 'shops'));
  const shopId = shopRef.id;
  const code = stringUtils.generateRandomCode();
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

async function registerAsCustomer(uid: string, data: RegisterInput): Promise<void> {
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

export async function signIn(email: string, password: string): Promise<AuthResult> {
  try {
    const auth = getAuth();
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    return { ok: true, user: cred.user, cred };
  } catch (e: any) {
    return {
      ok: false,
      message: mapFirebaseAuthError(e?.code, 'Erro ao autenticar.'),
      code: e?.code,
    };
  }
}

export async function register(data: RegisterInput): Promise<AuthResult> {
  try {
    const auth = getAuth();
    const cred = await createUserWithEmailAndPassword(auth, data.email.trim(), data.password);

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
      message: e?.message ?? mapFirebaseAuthError(e?.code, 'Erro ao criar conta.'),
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

export function subscribeAuth(callback: (user: FirebaseAuthTypes.User | null) => void) {
  return onAuthStateChanged(getAuth(), callback);
}
