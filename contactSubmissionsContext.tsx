import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { firebaseApp } from './firebase.ts';

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  submittedAt: string; // ISO date string
  read: boolean;
}

const STORAGE_KEY = 'tdbsc_contact_submissions_v1';
const FS_COLLECTION = 'contact_submissions';

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadFromStorage(): ContactSubmission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ContactSubmission[];
  } catch {
    return [];
  }
}

function saveToStorage(items: ContactSubmission[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* quota */
  }
}

type Ctx = {
  submissions: ContactSubmission[];
  addSubmission: (data: Omit<ContactSubmission, 'id' | 'submittedAt' | 'read'>) => Promise<void>;
  markRead: (id: string) => void;
  deleteSubmission: (id: string) => void;
  unreadCount: number;
};

const SubmissionsContext = createContext<Ctx | null>(null);

export function ContactSubmissionsProvider({ children }: { children: ReactNode }) {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>(loadFromStorage);
  const submissionsRef = useRef(submissions);
  submissionsRef.current = submissions;

  // ── Persist to localStorage whenever submissions change ──────────────────
  useEffect(() => {
    saveToStorage(submissions);
  }, [submissions]);

  // ── Load from Firestore on mount (if configured) ─────────────────────────
  useEffect(() => {
    if (!firebaseApp) return;
    let cancelled = false;
    let unsub: (() => void) | undefined;

    void import('firebase/firestore').then(({ getFirestore, collection, onSnapshot, orderBy, query }) => {
      if (cancelled || !firebaseApp) return;
      const db = getFirestore(firebaseApp);
      const q = query(collection(db, FS_COLLECTION), orderBy('submittedAt', 'desc'));

      unsub = onSnapshot(q, (snap) => {
        if (cancelled) return;
        const items: ContactSubmission[] = snap.docs.map((d) => {
          const data = d.data() as Omit<ContactSubmission, 'id'>;
          return { ...data, id: d.id };
        });
        setSubmissions(items);
        saveToStorage(items);
      });
    });

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  // ── Add a new submission ─────────────────────────────────────────────────
  const addSubmission = useCallback(
    async (data: Omit<ContactSubmission, 'id' | 'submittedAt' | 'read'>) => {
      const submission: ContactSubmission = {
        ...data,
        id: newId(),
        submittedAt: new Date().toISOString(),
        read: false,
      };

      if (firebaseApp) {
        try {
          const { getFirestore, collection, doc, setDoc, serverTimestamp } = await import('firebase/firestore');
          const db = getFirestore(firebaseApp);
          const ref = doc(collection(db, FS_COLLECTION), submission.id);
          await setDoc(ref, {
            name: submission.name,
            email: submission.email,
            phone: submission.phone,
            subject: submission.subject,
            message: submission.message,
            submittedAt: submission.submittedAt,
            read: false,
            createdAt: serverTimestamp(),
          });
          // Firestore onSnapshot will update state
        } catch (e) {
          console.error('[Firestore] Failed to save submission', e);
          // Fallback: save locally
          setSubmissions((prev) => [submission, ...prev]);
        }
      } else {
        setSubmissions((prev) => [submission, ...prev]);
      }
    },
    [],
  );

  // ── Mark as read ─────────────────────────────────────────────────────────
  const markRead = useCallback((id: string) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, read: true } : s)),
    );
    if (firebaseApp) {
      void import('firebase/firestore').then(({ getFirestore, doc, updateDoc }) => {
        if (!firebaseApp) return;
        const db = getFirestore(firebaseApp);
        void updateDoc(doc(db, FS_COLLECTION, id), { read: true }).catch(() => {});
      });
    }
  }, []);

  // ── Delete submission ────────────────────────────────────────────────────
  const deleteSubmission = useCallback((id: string) => {
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
    if (firebaseApp) {
      void import('firebase/firestore').then(({ getFirestore, doc, deleteDoc }) => {
        if (!firebaseApp) return;
        const db = getFirestore(firebaseApp);
        void deleteDoc(doc(db, FS_COLLECTION, id)).catch(() => {});
      });
    }
  }, []);

  const unreadCount = submissions.filter((s) => !s.read).length;

  return (
    <SubmissionsContext.Provider value={{ submissions, addSubmission, markRead, deleteSubmission, unreadCount }}>
      {children}
    </SubmissionsContext.Provider>
  );
}

export function useContactSubmissions() {
  const c = useContext(SubmissionsContext);
  if (!c) throw new Error('useContactSubmissions must be used inside ContactSubmissionsProvider');
  return c;
}
