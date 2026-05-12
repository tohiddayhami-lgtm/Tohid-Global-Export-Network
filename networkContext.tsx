import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  increment,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type DocumentSnapshot,
} from 'firebase/firestore';
import type { ExportNetworkJson } from './networkTypes.ts';
import { hydrateNetwork, type ExportDataMap } from './hydrateNetwork.ts';
import defaultNetworkJson from './default-network.json';
import { firebaseApp } from './firebase.ts';

const STORAGE_KEY = 'gen_export_network_v1';

const FIRESTORE_COLLECTION = 'config';
const FIRESTORE_DOC_ID = 'export_network';
const CLOUD_SAVE_DEBOUNCE_MS = 500;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function validateNetwork(data: unknown): data is ExportNetworkJson {
  if (!isRecord(data)) return false;
  for (const [, c] of Object.entries(data)) {
    if (!isRecord(c)) return false;
    if (typeof c.id !== 'string' || typeof c.label !== 'string' || typeof c.flag !== 'string') return false;
    if (!isRecord(c.anchor) || typeof c.anchor.x !== 'number' || typeof c.anchor.y !== 'number') return false;
    if (!isRecord(c.categories)) return false;
    for (const [, cat] of Object.entries(c.categories)) {
      if (!isRecord(cat)) return false;
      if (typeof cat.label !== 'string' || typeof cat.iconKey !== 'string') return false;
      if (!Array.isArray(cat.companies)) return false;
      for (const co of cat.companies) {
        if (!isRecord(co)) return false;
        if (typeof co.name !== 'string' || typeof co.tag !== 'string') return false;
        if (typeof co.initial !== 'string' || typeof co.url !== 'string') return false;
      }
    }
  }
  return true;
}

function loadFromStorage(): ExportNetworkJson {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultNetworkJson as ExportNetworkJson);
    const parsed: unknown = JSON.parse(raw);
    if (validateNetwork(parsed)) return parsed;
  } catch {
    /* ignore */
  }
  return structuredClone(defaultNetworkJson as ExportNetworkJson);
}

/** With Firebase, start from built-in default until Firestore snapshot arrives so every visitor follows the same cloud document, not a stale localStorage copy. */
function getInitialNetworkJson(): ExportNetworkJson {
  if (firebaseApp) return structuredClone(defaultNetworkJson as ExportNetworkJson);
  return loadFromStorage();
}

/** `firebase` = SDK initialized; `unconfigured` = missing web config (no admin sign-in). */
type SyncMode = 'firebase' | 'unconfigured';

export type AdminLoginResult = { ok: true } | { ok: false; message: string };

function firebaseLoginErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'Invalid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled in Firebase.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Wrong email or password (or the user was not created in Firebase Authentication).';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again in a few minutes.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection.';
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is not enabled. In Firebase Console: Authentication → Sign-in method → Email/Password.';
    case 'auth/unauthorized-domain':
      return 'This site domain is not authorized. Firebase Console → Authentication → Settings → Authorized domains.';
    default:
      return code ? `Sign-in failed: ${code}` : 'Sign-in failed.';
  }
}

type Ctx = {
  exportData: ExportDataMap;
  networkJson: ExportNetworkJson;
  setNetworkJson: Dispatch<SetStateAction<ExportNetworkJson>>;
  adminOk: boolean;
  login: (user: string, pass: string) => Promise<AdminLoginResult>;
  logout: () => void;
  syncMode: SyncMode;
  remoteReady: boolean;
};

const ExportDataContext = createContext<Ctx | null>(null);

export function ExportDataProvider({ children }: { children: ReactNode }) {
  const syncMode: SyncMode = firebaseApp ? 'firebase' : 'unconfigured';
  const [networkJson, setNetworkJson] = useState<ExportNetworkJson>(getInitialNetworkJson);
  const networkJsonRef = useRef(networkJson);
  networkJsonRef.current = networkJson;
  /** Monotonic Firestore `rev` last applied; -1 = none yet; 0 = legacy docs without `rev`. */
  const lastAppliedRemoteRevRef = useRef(-1);
  const cloudSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushPendingCloudSaveRef = useRef<() => void>(() => {});

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [remoteReady, setRemoteReady] = useState(() => !firebaseApp);

  const adminOk = !!firebaseUser;

  useEffect(() => {
    if (!firebaseApp) return;
    const auth = getAuth(firebaseApp);
    return onAuthStateChanged(auth, setFirebaseUser);
  }, []);

  useEffect(() => {
    if (!firebaseApp) return;
    const db = getFirestore(firebaseApp);
    const ref = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_ID);

    const applyRemoteSnap = (snap: DocumentSnapshot) => {
      if (!snap.exists()) {
        setRemoteReady(true);
        return;
      }
      const data = snap.data() as { payload?: unknown; rev?: unknown };
      const revRaw = data?.rev;
      const revNum = typeof revRaw === 'number' && Number.isFinite(revRaw) ? revRaw : null;
      if (revNum !== null && revNum <= lastAppliedRemoteRevRef.current) {
        setRemoteReady(true);
        return;
      }
      const payload = data?.payload;
      if (typeof payload !== 'string') {
        setRemoteReady(true);
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(payload);
      } catch {
        setRemoteReady(true);
        return;
      }
      if (!validateNetwork(parsed)) {
        setRemoteReady(true);
        return;
      }
      if (revNum === null) {
        const incoming = JSON.stringify(parsed);
        if (incoming === JSON.stringify(networkJsonRef.current)) {
          setRemoteReady(true);
          return;
        }
        lastAppliedRemoteRevRef.current = 0;
        setNetworkJson(structuredClone(parsed));
        setRemoteReady(true);
        return;
      }
      lastAppliedRemoteRevRef.current = revNum;
      if (JSON.stringify(parsed) !== JSON.stringify(networkJsonRef.current)) {
        setNetworkJson(structuredClone(parsed));
      }
      setRemoteReady(true);
    };

    const unsub = onSnapshot(
      ref,
      applyRemoteSnap,
      () => {
        setRemoteReady(true);
      }
    );

    let lastVisibilityFetchMs = 0;
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastVisibilityFetchMs < 2500) return;
      lastVisibilityFetchMs = now;
      void getDocFromServer(ref)
        .then(applyRemoteSnap)
        .catch(() => {
          void getDoc(ref).then(applyRemoteSnap);
        });
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      unsub();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(networkJson));
    } catch {
      /* quota */
    }
  }, [networkJson]);

  useEffect(() => {
    if (!firebaseApp || !firebaseUser || !remoteReady) {
      flushPendingCloudSaveRef.current = () => {};
      return;
    }
    const db = getFirestore(firebaseApp);
    const ref = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_ID);

    const runSave = () => {
      const payload = JSON.stringify(networkJsonRef.current);
      void setDoc(
        ref,
        { payload, updatedAt: serverTimestamp(), rev: increment(1) },
        { merge: true }
      ).catch((e) => {
        console.error('[Firestore] Failed to save network', e);
      });
    };

    cloudSaveTimerRef.current = window.setTimeout(() => {
      cloudSaveTimerRef.current = null;
      runSave();
    }, CLOUD_SAVE_DEBOUNCE_MS);

    const flushIfPending = () => {
      if (cloudSaveTimerRef.current === null) return;
      window.clearTimeout(cloudSaveTimerRef.current);
      cloudSaveTimerRef.current = null;
      runSave();
    };
    flushPendingCloudSaveRef.current = flushIfPending;

    const onPageHide = () => {
      flushIfPending();
    };
    window.addEventListener('pagehide', onPageHide);

    return () => {
      window.removeEventListener('pagehide', onPageHide);
      flushIfPending();
      flushPendingCloudSaveRef.current = () => {};
    };
  }, [networkJson, firebaseUser, remoteReady]);

  const exportData = useMemo(() => hydrateNetwork(networkJson), [networkJson]);

  const login = useCallback(async (user: string, pass: string): Promise<AdminLoginResult> => {
    if (!firebaseApp) {
      return {
        ok: false,
        message:
          'Firebase is not configured. Add VITE_FIREBASE_* to `.env` and run `npm run build`, or deploy `firebase-config.json` next to `index.html` (see `public/firebase-config.json.example`).',
      };
    }
    const auth = getAuth(firebaseApp);
    try {
      await signInWithEmailAndPassword(auth, user.trim(), pass);
      return { ok: true };
    } catch (e: unknown) {
      const code =
        typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: string }).code) : '';
      return { ok: false, message: firebaseLoginErrorMessage(code) };
    }
  }, []);

  const logout = useCallback(() => {
    if (firebaseApp) {
      void signOut(getAuth(firebaseApp));
    }
  }, []);

  const value = useMemo(
    () => ({
      exportData,
      networkJson,
      setNetworkJson,
      adminOk,
      login,
      logout,
      syncMode,
      remoteReady,
    }),
    [exportData, networkJson, adminOk, login, logout, syncMode, remoteReady]
  );

  return <ExportDataContext.Provider value={value}>{children}</ExportDataContext.Provider>;
}

export function useExportData() {
  const c = useContext(ExportDataContext);
  if (!c) throw new Error('useExportData must be used inside ExportDataProvider');
  return c;
}

export function defaultNetworkClone(): ExportNetworkJson {
  return structuredClone(defaultNetworkJson as ExportNetworkJson);
}
