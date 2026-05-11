import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

let firebaseApp: FirebaseApp | null = null;

function initFirebase(): FirebaseApp | null {
  if (getApps().length) {
    return getApps()[0]!;
  }
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn(
      '[Firebase] Missing VITE_FIREBASE_* variables. Copy .env.example to .env and add your Firebase Web config.'
    );
    return null;
  }
  try {
    return initializeApp(firebaseConfig);
  } catch (e) {
    console.error('[Firebase] initializeApp failed', e);
    return null;
  }
}

firebaseApp = initFirebase();

if (typeof window !== 'undefined' && firebaseApp && firebaseConfig.measurementId) {
  void isSupported().then((supported) => {
    if (supported) {
      try {
        getAnalytics(firebaseApp!);
      } catch (e) {
        console.warn('[Firebase] getAnalytics failed', e);
      }
    }
  });
}

export { firebaseApp };
