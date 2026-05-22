import { initializeApp, getApps, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';

function trimStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function envStr(key: string): string {
  const v = import.meta.env[key as keyof ImportMeta['env']];
  return trimStr(v);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function mergeFirebaseConfig(file: Record<string, unknown> | null): FirebaseOptions {
  const f = file ?? {};
  const pick = (envKey: string, fileKey: string) => envStr(envKey) || trimStr(f[fileKey]);

  return {
    apiKey: pick('VITE_FIREBASE_API_KEY', 'apiKey'),
    authDomain: pick('VITE_FIREBASE_AUTH_DOMAIN', 'authDomain'),
    projectId: pick('VITE_FIREBASE_PROJECT_ID', 'projectId'),
    storageBucket: pick('VITE_FIREBASE_STORAGE_BUCKET', 'storageBucket'),
    messagingSenderId: pick('VITE_FIREBASE_MESSAGING_SENDER_ID', 'messagingSenderId'),
    appId: pick('VITE_FIREBASE_APP_ID', 'appId'),
    measurementId: pick('VITE_FIREBASE_MEASUREMENT_ID', 'measurementId'),
  };
}

function optionsForInit(m: FirebaseOptions): FirebaseOptions {
  const base: FirebaseOptions = {
    apiKey: m.apiKey,
    projectId: m.projectId,
  };
  if (m.authDomain) base.authDomain = m.authDomain;
  if (m.storageBucket) base.storageBucket = m.storageBucket;
  if (m.messagingSenderId) base.messagingSenderId = m.messagingSenderId;
  if (m.appId) base.appId = m.appId;
  if (m.measurementId) base.measurementId = m.measurementId;
  return base;
}

function tryInitFirebase(options: FirebaseOptions): FirebaseApp | null {
  if (getApps().length) {
    return getApps()[0]!;
  }
  if (!options.apiKey || !options.projectId) {
    return null;
  }
  try {
    return initializeApp(optionsForInit(options));
  } catch (e) {
    console.error('[Firebase] initializeApp failed', e);
    return null;
  }
}

function attachAnalytics(app: FirebaseApp, measurementId: string) {
  if (typeof window === 'undefined' || !measurementId.trim()) return;
  void isSupported().then((supported) => {
    if (supported) {
      try {
        getAnalytics(app);
      } catch (e) {
        console.warn('[Firebase] getAnalytics failed', e);
      }
    }
  });
}

let firebaseApp: FirebaseApp | null = null;

function applyFirebaseOptions(options: FirebaseOptions) {
  const app = tryInitFirebase(options);
  firebaseApp = app;
  if (app && options.measurementId) {
    attachAnalytics(app, options.measurementId);
  }
}

/** Env at build time (Vite); enough for many deploys. */
applyFirebaseOptions(mergeFirebaseConfig(null));

export async function ensureFirebaseApp(): Promise<void> {
  if (firebaseApp) return;

  let file: Record<string, unknown> | null = null;
  try {
    // Must respect Vite `base` (e.g. GitHub Pages: /repo-name/) — absolute `/firebase-config.json` 404s on subpaths.
    const res = await fetch(`${import.meta.env.BASE_URL}firebase-config.json`, { cache: 'default' });
    if (res.ok) {
      const data: unknown = await res.json();
      if (isPlainObject(data)) file = data;
    }
  } catch {
    /* offline / blocked */
  }

  const merged = mergeFirebaseConfig(file);
  applyFirebaseOptions(merged);

  if (!firebaseApp) {
    console.warn(
      '[Firebase] No config: set VITE_FIREBASE_* in .env and run npm run build, or deploy /firebase-config.json next to index.html (see public/firebase-config.json.example).'
    );
  }
}

export { firebaseApp };
