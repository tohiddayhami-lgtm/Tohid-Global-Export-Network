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
const SESSION_KEY = 'gen_export_admin_session';

const FIRESTORE_COLLECTION = 'config';
const FIRESTORE_DOC_ID = 'export_network';
const CLOUD_SAVE_DEBOUNCE_MS = 1500;

/** Used only when `VITE_ADMIN_*` are not set in `.env`. Override in production. */
const FALLBACK_ADMIN_USERNAME = 'tgen_export_operator';
const FALLBACK_ADMIN_PASSWORD = 'Tg7!kM9pL2@vN4#xQ8wR3hJ6zC1fB5dS0eA';

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

type SyncMode = 'local' | 'firebase';

export type AdminLoginResult = { ok: true } | { ok: false; message: string };

function firebaseLoginErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'ایمیل نامعتبر است.';
    case 'auth/user-disabled':
      return 'این حساب در Firebase غیرفعال است.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'ایمیل یا رمز اشتباه است (یا کاربر در Authentication ساخته نشده).';
    case 'auth/too-many-requests':
      return 'تلاش زیاد بود؛ چند دقیقه بعد دوباره امتحان کنید.';
    case 'auth/network-request-failed':
      return 'خطای شبکه؛ اتصال اینترنت را چک کنید.';
    case 'auth/operation-not-allowed':
      return 'ورود با ایمیل/رمز در Firebase فعال نیست (Authentication → Sign-in method → Email/Password).';
    case 'auth/unauthorized-domain':
      return 'این آدرس سایت در Firebase مجاز نیست: Console → Authentication → Settings → Authorized domains.';
    default:
      return code ? `ورود ناموفق: ${code}` : 'ورود ناموفق.';
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
  const syncMode: SyncMode = firebaseApp ? 'firebase' : 'local';
  const [networkJson, setNetworkJson] = useState<ExportNetworkJson>(getInitialNetworkJson);
  const networkJsonRef = useRef(networkJson);
  /** Monotonic Firestore `rev` last applied; -1 = none yet; 0 = legacy docs without `rev`. */
  const lastAppliedRemoteRevRef = useRef(-1);
  useEffect(() => {
    networkJsonRef.current = networkJson;
  }, [networkJson]);

  const [legacyAdminOk, setLegacyAdminOk] = useState(
    () => typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_KEY) === '1'
  );
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [remoteReady, setRemoteReady] = useState(() => !firebaseApp);

  const adminOk = syncMode === 'firebase' ? !!firebaseUser : legacyAdminOk;

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
        setNetworkJson(parsed);
        setRemoteReady(true);
        return;
      }
      lastAppliedRemoteRevRef.current = revNum;
      if (JSON.stringify(parsed) !== JSON.stringify(networkJsonRef.current)) {
        setNetworkJson(parsed);
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
    if (!firebaseApp || !firebaseUser || !remoteReady) return;
    const db = getFirestore(firebaseApp);
    const ref = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_ID);
    const jsonStr = JSON.stringify(networkJson);
    const t = window.setTimeout(() => {
      void setDoc(
        ref,
        { payload: jsonStr, updatedAt: serverTimestamp(), rev: increment(1) },
        { merge: true }
      ).catch((e) => {
        console.error('[Firestore] Failed to save network', e);
      });
    }, CLOUD_SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [networkJson, firebaseUser, remoteReady]);

  const exportData = useMemo(() => hydrateNetwork(networkJson), [networkJson]);

  const login = useCallback(async (user: string, pass: string): Promise<AdminLoginResult> => {
    if (firebaseApp) {
      const auth = getAuth(firebaseApp);
      try {
        await signInWithEmailAndPassword(auth, user.trim(), pass);
        return { ok: true };
      } catch (e: unknown) {
        const code =
          typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: string }).code) : '';
        return { ok: false, message: firebaseLoginErrorMessage(code) };
      }
    }
    const u = import.meta.env.VITE_ADMIN_USERNAME ?? FALLBACK_ADMIN_USERNAME;
    const p = import.meta.env.VITE_ADMIN_PASSWORD ?? FALLBACK_ADMIN_PASSWORD;
    if (user === u && pass === p) {
      sessionStorage.setItem(SESSION_KEY, '1');
      setLegacyAdminOk(true);
      return { ok: true };
    }
    return {
      ok: false,
      message:
        'نام کاربری یا رمز محلی اشتباه است. برای ورود با حساب Firebase، همهٔ متغیرهای VITE_FIREBASE_* را در .env بگذارید، npm run build بزنید و همین نسخه را منتشر کنید؛ در غیر این صورت اپ فقط حالت «محلی» است و حساب Firebase استفاده نمی‌شود.',
    };
  }, []);

  const logout = useCallback(() => {
    if (firebaseApp) {
      void signOut(getAuth(firebaseApp));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
      setLegacyAdminOk(false);
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
