import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { firebaseApp } from './firebase.ts';

export interface SeoContent {
  seoSiteTitle: string;
  seoSeparator: string;
  seoDescription: string;
  seoKeywords: string;
  seoAuthor: string;
  seoSiteUrl: string;
  // Open Graph
  seoOgTitle: string;
  seoOgDescription: string;
  seoOgImageUrl: string;
  // Twitter
  seoTwitterCard: string;
  seoTwitterSite: string;
  // Per-page meta
  seoAboutDescription: string;
  seoServicesDescription: string;
  seoContactDescription: string;
  // Google Analytics
  seoGaId: string;
}

export const DEFAULT_SEO: SeoContent = {
  seoSiteTitle: 'Tohid Dayhami Business Solutions Center',
  seoSeparator: '|',
  seoDescription:
    'Tohid Dayhami Business Solutions Center — Premier global trade facilitation hub connecting exporters with verified buyers and distributors across 20+ countries.',
  seoKeywords:
    'export consulting, global trade, international business, Iran trade, import export, trade network, logistics, business matchmaking',
  seoAuthor: 'Tohid Dayhami',
  seoSiteUrl: '',
  seoOgTitle: 'Tohid Dayhami Business Solutions Center',
  seoOgDescription:
    'Explore global export markets through our interactive Tohid Meta Port. Connect with trade partners across 20+ countries.',
  seoOgImageUrl: '',
  seoTwitterCard: 'summary_large_image',
  seoTwitterSite: '',
  seoAboutDescription:
    'Learn about Tohid Dayhami Business Solutions Center — over a decade of expertise in export consulting and global trade network management.',
  seoServicesDescription:
    'Explore our comprehensive trade services: export consulting, trade network access, logistics & freight, and B2B business matchmaking.',
  seoContactDescription:
    'Get in touch with the Tohid Dayhami Business Solutions Center team. We are ready to help you expand into global markets.',
  seoGaId: '',
};

export interface PageContent extends SeoContent {
  siteTagline: string;
  // About Us
  aboutTitle: string;
  aboutSubtitle: string;
  aboutBody1: string;
  aboutBody2: string;
  aboutStat1Value: string;
  aboutStat1Label: string;
  aboutStat2Value: string;
  aboutStat2Label: string;
  aboutStat3Value: string;
  aboutStat3Label: string;
  // Services
  servicesTitle: string;
  servicesSubtitle: string;
  service1Title: string;
  service1Desc: string;
  service2Title: string;
  service2Desc: string;
  service3Title: string;
  service3Desc: string;
  service4Title: string;
  service4Desc: string;
  // Contact
  contactTitle: string;
  contactSubtitle: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  contactHours: string;
}

export const DEFAULT_PAGE_CONTENT: PageContent = {
  ...DEFAULT_SEO,
  siteTagline: 'Global Trade. Local Expertise.',
  aboutTitle: 'About Us',
  aboutSubtitle: 'Connecting Global Markets Since 2010',
  aboutBody1:
    'Tohid Dayhami Business Solutions Center is a premier global trade facilitation hub, dedicated to bridging businesses across international markets. With over a decade of expertise in export consulting and trade network management, we empower companies to expand their reach into new markets with confidence.',
  aboutBody2:
    'Our team of seasoned professionals provides comprehensive solutions — from market entry strategy and regulatory compliance to logistics optimization and partnership development. We specialize in connecting exporters with verified buyers and distributors across key global trade corridors including Iran, India, Turkey, UAE, China, Germany, and the UK.',
  aboutStat1Value: '10+',
  aboutStat1Label: 'Years of Experience',
  aboutStat2Value: '500+',
  aboutStat2Label: 'Trade Partners',
  aboutStat3Value: '20+',
  aboutStat3Label: 'Countries Served',
  servicesTitle: 'Our Services',
  servicesSubtitle: 'Comprehensive trade solutions for global business success',
  service1Title: 'Export Consulting',
  service1Desc:
    'Strategic guidance for entering new international markets, including market research, regulatory compliance, and export documentation support.',
  service2Title: 'Trade Network Access',
  service2Desc:
    'Connect with our verified network of importers, distributors, and trade partners across 10+ countries through our interactive Meta Port.',
  service3Title: 'Logistics & Freight',
  service3Desc:
    'End-to-end freight solutions including customs clearance, warehousing, and last-mile delivery coordination for global shipments.',
  service4Title: 'Business Matchmaking',
  service4Desc:
    'Personalized B2B matchmaking services to connect you with the right partners for your specific business goals and target markets.',
  contactTitle: 'Contact Us',
  contactSubtitle: 'Get in touch with our team of global trade experts',
  contactEmail: 'info@tohid-business.com',
  contactPhone: '+98 21 1234 5678',
  contactAddress: 'Tehran, Iran',
  contactHours: 'Saturday – Thursday: 9:00 AM – 5:00 PM',
};

const STORAGE_KEY = 'tdbsc_page_content_v1';
const FS_COLLECTION = 'config';
const FS_DOC_ID = 'site_content';
const SAVE_DEBOUNCE_MS = 600;

function loadFromStorage(): PageContent {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PAGE_CONTENT };
    return { ...DEFAULT_PAGE_CONTENT, ...(JSON.parse(raw) as Partial<PageContent>) };
  } catch {
    return { ...DEFAULT_PAGE_CONTENT };
  }
}

function mergeFromFirestore(data: Record<string, unknown>): PageContent {
  const filtered: Partial<PageContent> = {};
  for (const key of Object.keys(DEFAULT_PAGE_CONTENT) as (keyof PageContent)[]) {
    if (key in data && typeof data[key] === 'string') {
      (filtered as Record<string, string>)[key] = data[key] as string;
    }
  }
  return { ...DEFAULT_PAGE_CONTENT, ...filtered };
}

type Ctx = {
  pageContent: PageContent;
  updatePageContent: (patch: Partial<PageContent>) => void;
  remoteReady: boolean;
};

const PageContentContext = createContext<Ctx | null>(null);

export function PageContentProvider({ children }: { children: ReactNode }) {
  const [pageContent, setPageContentState] = useState<PageContent>(loadFromStorage);
  const pageContentRef = useRef(pageContent);
  pageContentRef.current = pageContent;

  /** true once we've received (or attempted) the first Firestore fetch */
  const [remoteReady, setRemoteReady] = useState(() => !firebaseApp);

  // ── Firestore read (subscribe to live changes) ─────────────────────────
  useEffect(() => {
    if (!firebaseApp) return;
    let cancelled = false;
    let unsub: (() => void) | undefined;

    void import('firebase/firestore').then(({ getFirestore, doc, getDocFromServer, getDoc, onSnapshot }) => {
      if (cancelled || !firebaseApp) return;
      const db = getFirestore(firebaseApp);
      const ref = doc(db, FS_COLLECTION, FS_DOC_ID);

      const applySnap = (snap: { exists(): boolean; data(): Record<string, unknown> | undefined }) => {
        if (snap.exists()) {
          const merged = mergeFromFirestore(snap.data() ?? {});
          setPageContentState(merged);
        }
        setRemoteReady(true);
      };

      // Prefer server-fresh data on first load
      void getDocFromServer(ref)
        .then((snap) => { if (!cancelled) applySnap(snap); })
        .catch(() => {
          void getDoc(ref)
            .then((snap) => { if (!cancelled) applySnap(snap); })
            .catch(() => { if (!cancelled) setRemoteReady(true); });
        });

      // Live subscription for changes saved by admin from any device/domain
      unsub = onSnapshot(ref, applySnap, () => setRemoteReady(true));
    });

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  // ── localStorage cache (write-through) ────────────────────────────────
  useEffect(() => {
    if (firebaseApp && !remoteReady) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pageContent)); } catch { /* quota */ }
  }, [pageContent, remoteReady]);

  // ── Firestore write (debounced, only when admin is logged in) ──────────
  useEffect(() => {
    if (!firebaseApp || !remoteReady) return;
    let cancelled = false;
    let timer: number | null = null;

    const save = async () => {
      const [{ getAuth }, { getFirestore, doc, setDoc, serverTimestamp }] = await Promise.all([
        import('firebase/auth'),
        import('firebase/firestore'),
      ]);
      if (cancelled || !firebaseApp) return;
      const user = getAuth(firebaseApp).currentUser;
      if (!user) return; // Only admin writes to Firestore
      const db = getFirestore(firebaseApp);
      const ref = doc(db, FS_COLLECTION, FS_DOC_ID);
      void setDoc(ref, { ...pageContentRef.current, updatedAt: serverTimestamp() }, { merge: true })
        .catch((e) => console.error('[Firestore] Failed to save page content', e));
    };

    timer = window.setTimeout(save, SAVE_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [pageContent, remoteReady]);

  const updatePageContent = (patch: Partial<PageContent>) =>
    setPageContentState((prev) => ({ ...prev, ...patch }));

  return (
    <PageContentContext.Provider value={{ pageContent, updatePageContent, remoteReady }}>
      {children}
    </PageContentContext.Provider>
  );
}

export function usePageContent() {
  const c = useContext(PageContentContext);
  if (!c) throw new Error('usePageContent must be used inside PageContentProvider');
  return c;
}
