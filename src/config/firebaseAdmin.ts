import { type ServiceAccount, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const toServiceAccount = (secretJson: string): ServiceAccount => {
  try {
    return JSON.parse(secretJson) as ServiceAccount;
  } catch (error) {
    throw new Error('FIREBASE_SECRET_JSON の形式が正しくありません', { cause: error });
  }
};

const firebaseSecret = process.env.FIREBASE_SECRET_JSON;
if (!firebaseSecret) {
  throw new Error('FIREBASE_SECRET_JSON が設定されていません');
}

const serviceAccount = toServiceAccount(firebaseSecret);

const firebaseApp =
  getApps()[0] ??
  initializeApp({
    credential: cert(serviceAccount)
  });

export const firestore = getFirestore(firebaseApp);
firestore.settings({ ignoreUndefinedProperties: true });
