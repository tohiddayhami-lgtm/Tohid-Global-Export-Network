import './index.css';
import { ensureFirebaseApp, firebaseApp } from './firebase.ts';

if (firebaseApp) {
  // Firebase already initialized from VITE_FIREBASE_* env vars — render immediately.
  // firebase/auth and firebase/firestore are loaded lazily by networkContext after mount.
  void import('./root.tsx');
} else {
  // firebase-config.json deployment: fetch config first, then render.
  void ensureFirebaseApp().then(() => import('./root.tsx'));
}
