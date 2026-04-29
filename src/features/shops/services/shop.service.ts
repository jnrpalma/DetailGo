import { getFirestore, doc, updateDoc, serverTimestamp } from '@react-native-firebase/firestore';

export async function updateShopName(shopId: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Nome da loja não pode ser vazio.');

  await updateDoc(doc(getFirestore(), 'shops', shopId), {
    name: trimmed,
    updatedAt: serverTimestamp(),
  });
}
