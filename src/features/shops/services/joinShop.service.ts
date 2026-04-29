import {
  getFirestore,
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
} from '@react-native-firebase/firestore';

export async function joinShop(uid: string, inviteCode: string): Promise<void> {
  const db = getFirestore();
  const code = inviteCode.trim().toUpperCase();

  if (code.length !== 6) {
    throw new Error('O código deve ter 6 caracteres.');
  }

  const snap = await getDocs(query(collection(db, 'shops'), where('code', '==', code), limit(1)));

  if (snap.empty) {
    throw new Error('Código inválido. Verifique com a estética e tente novamente.');
  }

  const shopId = snap.docs[0].id;

  await updateDoc(doc(db, 'users', uid), { shopId });
}
