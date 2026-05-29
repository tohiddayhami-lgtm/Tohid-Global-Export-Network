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
import type { User } from 'firebase/auth';
import type { DocumentSnapshot } from 'firebase/firestore';
import type { ExportNetworkJson, RootNodeLines } from './networkTypes.ts';
import { hydrateNetwork, type ExportDataMap } from './hydrateNetwork.ts';
import defaultNetworkJson from './default-network.json';
import { firebaseApp } from './firebase.ts';

const STORAGE_KEY = 'gen_export_network_v1';
const ROOT_UI_STORAGE_KEY = 'gen_export_network_ui_v1';
export const DEFAULT_FAVICON_HREF = '/favicon.svg?v=container-1';

/** Default center-node title + hero texts (overridden from admin / Firestore). */
export const DEFAULT_ROOT_NODE_LINES: RootNodeLines = {
  line1: 'Global',
  line2: 'Export',
  badge: 'Virtual Trade Hub',
  subtitle: 'Explore global export markets through interactive port terminals',
  stat1: 'Terminals',
  stat2: 'Booths',
  stat3: 'Vendors',
  faviconHref: DEFAULT_FAVICON_HREF,
};

const FIRESTORE_COLLECTION = 'config';
const FIRESTORE_DOC_ID = 'export_network';
const CLOUD_SAVE_DEBOUNCE_MS = 500;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function readServerUpdatedAtMs(data: Record<string, unknown>): number {
  const ua = data.updatedAt;
  if (ua && typeof ua === 'object' && 'toMillis' in ua && typeof (ua as { toMillis: () => number }).toMillis === 'function') {
    return (ua as { toMillis: () => number }).toMillis();
  }
  return 0;
}

/** Firestore may return rev as number, string, or long-like value. */
function normalizeFirestoreRev(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'bigint') return Number(v);
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v.trim());
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function validateNetwork(data: unknown): data is ExportNetworkJson {
  if (!isRecord(data)) return false;
  for (const [, c] of Object.entries(data)) {
    if (!isRecord(c)) return false;
    if (typeof c.id !== 'string' || typeof c.label !== 'string' || typeof c.flag !== 'string') return false;
    if (!isRecord(c.anchor) || typeof c.anchor.x !== 'number' || typeof c.anchor.y !== 'number') return false;
    if ('hidden' in c && typeof c.hidden !== 'boolean') return false;
    if (!isRecord(c.categories)) return false;
    for (const [, cat] of Object.entries(c.categories)) {
      if (!isRecord(cat)) return false;
      if (typeof cat.label !== 'string' || typeof cat.iconKey !== 'string') return false;
      if ('hidden' in cat && typeof cat.hidden !== 'boolean') return false;
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
      badge:    typeof parsed.badge    === 'string' ? parsed.badge    : undefined,
      subtitle: typeof parsed.subtitle === 'string' ? parsed.subtitle : undefined,
      stat1:    typeof parsed.stat1    === 'string' ? parsed.stat1    : undefined,
      stat2:    typeof parsed.stat2    === 'string' ? parsed.stat2    : undefined,
      stat3:    typeof parsed.stat3    === 'string' ? parsed.stat3    : undefined,
      faviconHref:
        typeof parsed.faviconHref === 'string' && parsed.faviconHref.trim() !== ''
          ? parsed.faviconHref
          : DEFAULT_FAVICON_HREF,
    };
  } catch {
    return { ...DEFAULT_ROOT_NODE_LINES };
  }
}

function readRootLinesFromFirestoreDoc(data: Record<string, unknown>): RootNodeLines | null {
  const hasR1 = Object.prototype.hasOwnProperty.call(data, 'rootLine1');
  const hasR2 = Object.prototype.hasOwnProperty.call(data, 'rootLine2');
  const hasFavicon = Object.prototype.hasOwnProperty.call(data, 'rootFaviconHref');
  if (!hasR1 && !hasR2 && !hasFavicon) return null;
  const line1 = typeof data.rootLine1 === 'string' ? data.rootLine1.trim() : '';
  const line2 = typeof data.rootLine2 === 'string' ? data.rootLine2.trim() : '';
  return {
    line1: line1 || DEFAULT_ROOT_NODE_LINES.line1,
    line2: line2 || DEFAULT_ROOT_NODE_LINES.line2,
    badge:    typeof data.rootBadge    === 'string' ? data.rootBadge    : undefined,
    subtitle: typeof data.rootSubtitle === 'string' ? data.rootSubtitle : undefined,
    stat1:    typeof data.rootStat1    === 'string' ? data.rootStat1    : undefined,
    stat2:    typeof data.rootStat2    === 'string' ? data.rootStat2    : undefined,
    stat3:    typeof data.rootStat3    === 'string' ? data.rootStat3    : undefined,
    faviconHref:
      typeof data.rootFaviconHref === 'string' && data.rootFaviconHref.trim() !== ''
        ? data.rootFaviconHref
        : DEFAULT_FAVICON_HREF,
  };
}

/** Add any countries present in the default JSON but missing from `current`. */
function mergeDefaultCountries(current: ExportNetworkJson): ExportNetworkJson {
  const defaults = defaultNetworkJson as ExportNetworkJson;
  let merged = current;
  for (const [id, country] of Object.entries(defaults)) {
    if (!(id in merged)) {
      merged = { ...merged, [id]: country };
    }
  }
  return merged;
}

function loadFromStorage(): ExportNetworkJson {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultNetworkJson as ExportNetworkJson);
    const parsed: unknown = JSON.parse(raw);
    if (validateNetwork(parsed)) return mergeDefaultCountries(parsed);
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
  /** Push debounced Firestore save ASAP (e.g. after delete) so stale snapshots cannot win. */
  flushNetworkToCloudSoon: () => void;
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
  /** Monotonic Firestore `rev` last applied; -1 = none yet; 0 = legacy docs without numeric rev. */
  const lastAppliedRemoteRevRef = useRef(-1);
  /** When `rev` is missing, use `updatedAt` so old cached snapshots cannot re-apply deleted categories. */
  const lastAppliedServerUpdatedAtMsRef = useRef(0);
  const flushPendingCloudSaveRef = useRef<() => void>(() => {});

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [remoteReady, setRemoteReady] = useState(() => !firebaseApp);

  const adminOk = !!firebaseUser;

  const flushNetworkToCloudSoon = useCallback(() => {
    queueMicrotask(() => {
      flushPendingCloudSaveRef.current();
    });
  }, []);

  // Auth state — firebase/auth is loaded lazily so it doesn't block initial render
  useEffect(() => {
    if (!firebaseApp) return;
    let unsub: (() => void) | undefined;
    let cancelled = false;

    void import('firebase/auth').then(({ getAuth, onAuthStateChanged }) => {
      if (cancelled || !firebaseApp) return;
      unsub = onAuthStateChanged(getAuth(firebaseApp), setFirebaseUser);
    });

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  // Firestore sync — firebase/firestore is loaded lazily so it doesn't block initial render
  useEffect(() => {
    if (!firebaseApp) return;

    let cancelled = false;
    let unsub: (() => void) | undefined;
    let removeVisibility: (() => void) | undefined;

    void import('firebase/firestore').then(({
      getFirestore, doc, getDoc, getDocFromServer, onSnapshot,
    }) => {
      if (cancelled || !firebaseApp) return;

      const db = getFirestore(firebaseApp);
      const ref = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_ID);

      const applyRemoteSnap = (snap: DocumentSnapshot) => {
        if (!snap.exists()) {
          setRemoteReady(true);
          return;
        }
        const data = snap.data() as Record<string, unknown> & { payload?: unknown; rev?: unknown };
        const revNum = normalizeFirestoreRev(data?.rev);
        const updMs = readServerUpdatedAtMs(data);

        if (revNum !== null && revNum <= lastAppliedRemoteRevRef.current) {
          setRemoteReady(true);
          return;
        }
        if (revNum === null && updMs > 0 && updMs <= lastAppliedServerUpdatedAtMsRef.current) {
          setRemoteReady(true);
          return;
        }

        const rootFromDoc = readRootLinesFromFirestoreDoc(data);
        if (rootFromDoc) {
          const cur = rootNodeLinesRef.current;
          if (
            rootFromDoc.line1    !== cur.line1    || rootFromDoc.line2    !== cur.line2    ||
            rootFromDoc.badge    !== cur.badge    || rootFromDoc.subtitle !== cur.subtitle ||
            rootFromDoc.stat1    !== cur.stat1    || rootFromDoc.stat2    !== cur.stat2    ||
            rootFromDoc.stat3    !== cur.stat3    || rootFromDoc.faviconHref !== cur.faviconHref
          ) {
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

        const parsedMerged = mergeDefaultCountries(parsed as ExportNetworkJson);
        const incoming = JSON.stringify(parsedMerged);
        const samePayload = incoming === JSON.stringify(networkJsonRef.current);

        if (revNum === null) {
          if (samePayload) {
            if (updMs > 0) {
              lastAppliedServerUpdatedAtMsRef.current = Math.max(lastAppliedServerUpdatedAtMsRef.current, updMs);
            }
            setRemoteReady(true);
            return;
          }
          lastAppliedRemoteRevRef.current = 0;
        } else {
          lastAppliedRemoteRevRef.current = revNum;
        }
        if (updMs > 0) {
          lastAppliedServerUpdatedAtMsRef.current = Math.max(lastAppliedServerUpdatedAtMsRef.current, updMs);
        }
        if (!samePayload) {
          setNetworkJson(structuredClone(parsedMerged));
        }
        setRemoteReady(true);
      };

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

      unsub = onSnapshot(ref, applyRemoteSnap, () => {
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
      removeVisibility = () => document.removeEventListener('visibilitychange', onVisibility);
    });

    return () => {
      cancelled = true;
      unsub?.();
      removeVisibility?.();
    };
  }, []);

  useEffect(() => {
    try {
      if (firebaseApp && !remoteReady) return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(networkJson));
    } catch {
      /* quota */
    }
  }, [networkJson, remoteReady]);

  useEffect(() => {
    try {
      if (firebaseApp && !remoteReady) return;
      localStorage.setItem(ROOT_UI_STORAGE_KEY, JSON.stringify(rootNodeLines));
    } catch {
      /* quota */
    }
  }, [rootNodeLines, remoteReady]);

  useEffect(() => {
    const href = rootNodeLines.faviconHref?.trim() || DEFAULT_FAVICON_HREF;
    let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    const dataType = href.match(/^data:([^;,]+)/)?.[1];
    link.type = dataType || 'image/svg+xml';
    link.href = href;
  }, [rootNodeLines.faviconHref]);

  // Cloud save — firebase/firestore loaded lazily; timer tracked via closure vars
  useEffect(() => {
    if (!firebaseApp || !firebaseUser || !remoteReady) {
      flushPendingCloudSaveRef.current = () => {};
      return;
    }

    let cancelled = false;
    let timer: number | null = null;
    let pendingSave: (() => void) | null = null;
    let removePageHide: (() => void) | null = null;

    void import('firebase/firestore').then(({ getFirestore, doc, setDoc, serverTimestamp, increment }) => {
      if (cancelled || !firebaseApp || !firebaseUser) return;

      const db = getFirestore(firebaseApp);
      const ref = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_ID);

      const runSave = () => {
        const payload = JSON.stringify(networkJsonRef.current);
        const { line1, line2, badge, subtitle, stat1, stat2, stat3, faviconHref } = rootNodeLinesRef.current;
        void setDoc(
          ref,
          {
            payload,
            rootLine1:    line1,
            rootLine2:    line2,
            rootBadge:    badge    ?? DEFAULT_ROOT_NODE_LINES.badge,
            rootSubtitle: subtitle ?? DEFAULT_ROOT_NODE_LINES.subtitle,
            rootStat1:    stat1    ?? DEFAULT_ROOT_NODE_LINES.stat1,
            rootStat2:    stat2    ?? DEFAULT_ROOT_NODE_LINES.stat2,
            rootStat3:    stat3    ?? DEFAULT_ROOT_NODE_LINES.stat3,
            rootFaviconHref: faviconHref ?? DEFAULT_FAVICON_HREF,
            updatedAt: serverTimestamp(),
            rev: increment(1),
          },
          { merge: true }
        ).catch((e) => {
          console.error('[Firestore] Failed to save network', e);
        });
      };

      pendingSave = runSave;
      timer = window.setTimeout(() => {
        timer = null;
        runSave();
      }, CLOUD_SAVE_DEBOUNCE_MS);

      const flushIfPending = () => {
        if (timer === null) return;
        window.clearTimeout(timer);
        timer = null;
        runSave();
      };
      flushPendingCloudSaveRef.current = flushIfPending;

      const onPageHide = () => flushIfPending();
      window.addEventListener('pagehide', onPageHide);
      removePageHide = () => window.removeEventListener('pagehide', onPageHide);
    });

    return () => {
      cancelled = true;
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
        pendingSave?.();
      }
      removePageHide?.();
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
    try {
      const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
      const auth = getAuth(firebaseApp);
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
      void import('firebase/auth').then(({ getAuth, signOut }) => {
        void signOut(getAuth(firebaseApp!));
      });
    }
  }, []);

  const value = useMemo(
    () => ({
      exportData,
      networkJson,
      setNetworkJson,
      rootNodeLines,
      setRootNodeLines,
      flushNetworkToCloudSoon,
      adminOk,
      login,
      logout,
      syncMode,
      remoteReady,
    }),
    [exportData, networkJson, rootNodeLines, flushNetworkToCloudSoon, adminOk, login, logout, syncMode, remoteReady]
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
