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
import type { ExportNetworkJson, RootNodeLines } from './networkTypes.ts';
import { hydrateNetwork, type ExportDataMap } from './hydrateNetwork.ts';
import defaultNetworkJson from './default-network.json';
import { firebaseApp } from './firebase.ts';

const STORAGE_KEY = 'gen_export_network_v1';
const ROOT_UI_STORAGE_KEY = 'gen_export_network_ui_v1';

/** Default center-node title on the map (overridden from admin / Firestore). */
export const DEFAULT_ROOT_NODE_LINES: RootNodeLines = { line1: 'Global', line2: 'Export' };

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

function loadRootUiFromStorage(): RootNodeLines {
  try {
    const raw = localStorage.getItem(ROOT_UI_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_ROOT_NODE_LINES };
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return { ...DEFAULT_ROOT_NODE_LINES };
    const line1 = typeof parsed.line1 === 'string' ? parsed.line1.trim() : '';
    const line2 = typeof parsed.line2 === 'string' ? parsed.line2.trim() : '';
    return {
      line1: line1 || DEFAULT_ROOT_NODE_LINES.line1,
      line2: line2 || DEFAULT_ROOT_NODE_LINES.line2,
    };
  } catch {
    return { ...DEFAULT_ROOT_NODE_LINES };
  }
}

function readRootLinesFromFirestoreDoc(data: Record<string, unknown>): RootNodeLines | null {
  const hasR1 = Object.prototype.hasOwnProperty.call(data, 'rootLine1');
  const hasR2 = Object.prototype.hasOwnProperty.call(data, 'rootLine2');
  if (!hasR1 && !hasR2) return null;
  const line1 = typeof data.rootLine1 === 'string' ? data.rootLine1.trim() : '';
  const line2 = typeof data.rootLine2 === 'string' ? data.rootLine2.trim() : '';
  return {
    line1: line1 || DEFAULT_ROOT_NODE_LINES.line1,
    line2: line2 || DEFAULT_ROOT_NODE_LINES.line2,
  };
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

/** Last known good network JSON from this browser (used before Firebase first sync). */
function getInitialNetworkJson(): ExportNetworkJson {
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
  rootNodeLines: RootNodeLines;
  setRootNodeLines: Dispatch<SetStateAction<RootNodeLines>>;
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
  const [rootNodeLines, setRootNodeLines] = useState<RootNodeLines>(loadRootUiFromStorage);
  const rootNodeLinesRef = useRef(rootNodeLines);
  rootNodeLinesRef.current = rootNodeLines;
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
      const data = snap.data() as Record<string, unknown> & { payload?: unknown; rev?: unknown };
      const revRaw = data?.rev;
      const revNum = typeof revRaw === 'number' && Number.isFinite(revRaw) ? revRaw : null;
      if (revNum !== null && revNum <= lastAppliedRemoteRevRef.current) {
        setRemoteReady(true);
        return;
      }
      const rootFromDoc = readRootLinesFromFirestoreDoc(data);
      if (rootFromDoc) {
        const cur = rootNodeLinesRef.current;
        if (rootFromDoc.line1 !== cur.line1 || rootFromDoc.line2 !== cur.line2) {
          setRootNodeLines(rootFromDoc);
        }
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

    let cancelled = false;
    void getDocFromServer(ref)
      .then((snap) => {
        if (!cancelled) applyRemoteSnap(snap);
      })
      .catch(() => {
        void getDoc(ref)
          .then((snap) => {
            if (!cancelled) applyRemoteSnap(snap);
          })
          .catch(() => {
            if (!cancelled) setRemoteReady(true);
          });
      });

    const unsub = onSnapshot(ref, applyRemoteSnap, () => {
      setRemoteReady(true);
    });

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
      cancelled = true;
      unsub();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    try {
      if (firebaseApp && !remoteReady) return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(networkJson));
    } catch {
      /* quota */
    }
  }, [networkJson, firebaseApp, remoteReady]);

  useEffect(() => {
    try {
      if (firebaseApp && !remoteReady) return;
      localStorage.setItem(ROOT_UI_STORAGE_KEY, JSON.stringify(rootNodeLines));
    } catch {
      /* quota */
    }
  }, [rootNodeLines, firebaseApp, remoteReady]);

  useEffect(() => {
    if (!firebaseApp || !firebaseUser || !remoteReady) {
      flushPendingCloudSaveRef.current = () => {};
      return;
    }
    const db = getFirestore(firebaseApp);
    const ref = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_ID);

    const runSave = () => {
      const payload = JSON.stringify(networkJsonRef.current);
      const { line1, line2 } = rootNodeLinesRef.current;
      void setDoc(
        ref,
        {
          payload,
          rootLine1: line1,
          rootLine2: line2,
          updatedAt: serverTimestamp(),
          rev: increment(1),
        },
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
  }, [networkJson, rootNodeLines, firebaseUser, remoteReady]);

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
      rootNodeLines,
      setRootNodeLines,
      adminOk,
      login,
      logout,
      syncMode,
      remoteReady,
    }),
    [exportData, networkJson, rootNodeLines, adminOk, login, logout, syncMode, remoteReady]
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
