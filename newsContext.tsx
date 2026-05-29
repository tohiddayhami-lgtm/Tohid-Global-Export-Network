import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { firebaseApp } from './firebase.ts';

export interface NewsArticle {
  id: string;
  title: string;
  titleFa?: string;
  excerpt: string;
  excerptFa?: string;
  content: string;
  contentFa?: string;
  category: string;
  imageUrl: string;
  publishedAt: string;
  author: string;
  published: boolean;
  featured: boolean;
  tags: string;
}

/** Returns the best available title/excerpt/content, preferring the requested lang */
export function pickLang(
  en: string | undefined,
  fa: string | undefined,
  lang: 'en' | 'fa',
): { text: string; dir: 'ltr' | 'rtl' } {
  if (lang === 'fa') {
    if (fa?.trim()) return { text: fa, dir: 'rtl' };
    if (en?.trim()) return { text: en, dir: 'ltr' };
  } else {
    if (en?.trim()) return { text: en, dir: 'ltr' };
    if (fa?.trim()) return { text: fa, dir: 'rtl' };
  }
  return { text: '', dir: 'ltr' };
}

export function hasFa(a: NewsArticle) {
  return !!(a.titleFa?.trim() || a.excerptFa?.trim() || a.contentFa?.trim());
}
export function hasEn(a: NewsArticle) {
  return !!(a.title?.trim() || a.excerpt?.trim() || a.content?.trim());
}

export const NEWS_CATEGORIES = [
  'Trade & Commerce',
  'Economy & Finance',
  'Policy & Regulation',
  'Market Trends',
  'Company News',
  'Logistics & Supply Chain',
  'Technology & Innovation',
  'General',
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  'Trade & Commerce':       'text-port-gold   bg-port-gold-bg   border-port-gold/25',
  'Economy & Finance':      'text-port-accent  bg-port-accent-bg border-port-accent/25',
  'Policy & Regulation':    'text-emerald-400  bg-emerald-400/10 border-emerald-400/25',
  'Market Trends':          'text-violet-400   bg-violet-400/10  border-violet-400/25',
  'Company News':           'text-sky-400      bg-sky-400/10     border-sky-400/25',
  'Logistics & Supply Chain':'text-orange-400  bg-orange-400/10  border-orange-400/25',
  'Technology & Innovation':'text-indigo-400   bg-indigo-400/10  border-indigo-400/25',
  'General':                'text-port-soft    bg-port-surface   border-port-border',
};

function categoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? CATEGORY_COLORS['General'];
}

export { categoryColor };

const SAMPLE_ARTICLES: NewsArticle[] = [
  {
    id: 'news-1',
    title: 'Iran Expands Trade Corridors with 5 New Partner Nations',
    excerpt: 'The Ministry of Commerce has signed bilateral trade agreements with five emerging economies, opening new export channels for Iranian manufacturers and agricultural producers.',
    content: `The Ministry of Commerce announced today the signing of comprehensive bilateral trade agreements with five emerging economies across Asia and Africa. These agreements are expected to open significant new export channels for Iranian manufacturers, agricultural producers, and service providers.\n\nThe new trade partnerships include preferential tariff arrangements for key export categories including food products, construction materials, and petrochemicals. Iranian exporters will benefit from reduced customs duties and streamlined border procedures.\n\n"This marks a historic step in diversifying our trade relationships," said the Minister of Commerce at the signing ceremony. "We are creating a resilient, multi-directional trade network that will benefit thousands of Iranian businesses."\n\nThe agreements are expected to take effect within the next six months, with implementation support provided through the National Trade Facilitation Center.`,
    category: 'Trade & Commerce',
    imageUrl: '',
    publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    author: 'Tohid Dayhami',
    published: true,
    featured: true,
    tags: 'trade, iran, export, bilateral',
  },
  {
    id: 'news-2',
    title: 'Global Freight Rates Stabilize After 18-Month Volatility',
    excerpt: 'Container shipping costs have returned to pre-surge levels, offering relief to exporters and importers worldwide. Analysts predict stable rates through Q3.',
    content: `After 18 months of unprecedented volatility, global container freight rates have stabilized, providing much-needed relief to exporters and importers worldwide. Industry analysts are projecting stable rates through at least the third quarter.\n\nThe normalization follows a significant increase in shipping capacity as major carriers commissioned new vessels and streamlined port operations. The Baltic Freight Index, a key benchmark, has returned to its five-year average.\n\nFor Iranian exporters, this development is particularly welcome. Lower shipping costs directly improve competitiveness in target markets, allowing for more competitive pricing of export goods.\n\nLogistics experts recommend that businesses take advantage of this period to lock in favorable long-term shipping contracts and optimize their supply chain configurations.`,
    category: 'Logistics & Supply Chain',
    imageUrl: '',
    publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    author: 'Tohid Dayhami',
    published: true,
    featured: false,
    tags: 'shipping, freight, logistics, supply chain',
  },
  {
    id: 'news-3',
    title: 'Saffron & Pistachio Exports Hit Record High in Q1',
    excerpt: 'Iranian agricultural exports recorded their strongest first quarter performance in over a decade, led by saffron, pistachios, and premium dried fruits.',
    content: `Iranian agricultural exports have recorded their strongest first-quarter performance in over a decade, with the sector posting a 34% year-on-year increase in export value. Saffron, pistachios, and premium dried fruits led the surge.\n\nSaffron exports alone surpassed $280 million in the quarter, maintaining Iran's dominant 90% share of global saffron supply. Pistachio shipments to key markets in Europe, Asia, and the Gulf exceeded 85,000 tonnes.\n\nThe boom is attributed to improved quality certification processes, expanded cold-chain logistics infrastructure, and effective branding campaigns in key consumer markets.\n\nSmall and medium enterprises accounted for 65% of total agricultural export volume, demonstrating the broad-based nature of the sector's success.`,
    category: 'Market Trends',
    imageUrl: '',
    publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    author: 'Tohid Dayhami',
    published: true,
    featured: false,
    tags: 'agriculture, saffron, pistachio, exports',
  },
  {
    id: 'news-4',
    title: 'New Digital Platform Streamlines Export Documentation',
    excerpt: 'A next-generation export documentation platform has launched, reducing paperwork processing time from 5 days to under 4 hours for registered exporters.',
    content: `A next-generation digital platform for export documentation has officially launched, promising to transform the administrative burden facing Iranian exporters. The platform reduces processing time for key export documents from an average of five business days to under four hours.\n\nThe system integrates with customs authorities, chambers of commerce, and banking institutions to provide a seamless, single-window experience for exporters. Certificate of origin, phytosanitary certificates, and commercial invoices can all be processed through one portal.\n\nEarly adopters report significant cost savings, with one major food exporter estimating annual savings of $120,000 in administrative costs alone. The platform is currently free for registered exporters during its launch phase.`,
    category: 'Technology & Innovation',
    imageUrl: '',
    publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    author: 'Tohid Dayhami',
    published: true,
    featured: false,
    tags: 'technology, digital, documentation, export',
  },
  {
    id: 'news-5',
    title: 'Construction Materials Sector Eyes $2B Export Target',
    excerpt: 'Iran\'s construction materials industry has set an ambitious $2 billion export target for the current fiscal year, backed by record production capacity.',
    content: `Iran's construction materials sector has set an ambitious $2 billion export target for the current fiscal year, backed by record production capacity in ceramics, tiles, steel, and cement. The target represents a 45% increase over the previous year's performance.\n\nThe sector benefits from competitive energy costs, abundant raw materials, and a growing reputation for quality among buyers in Iraq, Afghanistan, Central Asia, and East Africa.\n\nMajor producers have invested heavily in modern kiln technology and quality control systems to meet international standards. Several companies have recently obtained European CE certification, opening doors to premium markets.\n\nThe Iran Trade Promotion Organization is coordinating a series of international trade fairs to showcase the sector's capabilities to global buyers.`,
    category: 'Trade & Commerce',
    imageUrl: '',
    publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    author: 'Tohid Dayhami',
    published: true,
    featured: false,
    tags: 'construction, ceramics, tiles, steel',
  },
];

const STORAGE_KEY = 'tdbsc_news_v1';
const FS_COLLECTION = 'config';
const FS_DOC_ID = 'news_feed';
const SAVE_DEBOUNCE_MS = 700;

function loadFromStorage(): NewsArticle[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SAMPLE_ARTICLES;
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as NewsArticle[];
    return SAMPLE_ARTICLES;
  } catch {
    return SAMPLE_ARTICLES;
  }
}

function parseArticles(data: unknown): NewsArticle[] | null {
  if (!Array.isArray(data)) return null;
  return data as NewsArticle[];
}

type Ctx = {
  articles: NewsArticle[];
  publishedArticles: NewsArticle[];
  addArticle: (a: Omit<NewsArticle, 'id'>) => void;
  updateArticle: (id: string, patch: Partial<NewsArticle>) => void;
  removeArticle: (id: string) => void;
  remoteReady: boolean;
};

const NewsContext = createContext<Ctx | null>(null);

export function NewsProvider({ children }: { children: ReactNode }) {
  const [articles, setArticles] = useState<NewsArticle[]>(loadFromStorage);
  const articlesRef = useRef(articles);
  articlesRef.current = articles;
  const [remoteReady, setRemoteReady] = useState(() => !firebaseApp);

  // ── Firestore read ────────────────────────────────────────────────────
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
          const payload = snap.data()?.payload;
          if (typeof payload === 'string') {
            try {
              const parsed = parseArticles(JSON.parse(payload));
              if (parsed) setArticles(parsed);
            } catch { /* ignore */ }
          }
        }
        setRemoteReady(true);
      };

      void getDocFromServer(ref)
        .then((s) => { if (!cancelled) applySnap(s); })
        .catch(() => void getDoc(ref).then((s) => { if (!cancelled) applySnap(s); }).catch(() => { if (!cancelled) setRemoteReady(true); }));

      unsub = onSnapshot(ref, applySnap, () => setRemoteReady(true));
    });

    return () => { cancelled = true; unsub?.(); };
  }, []);

  // ── localStorage cache ────────────────────────────────────────────────
  useEffect(() => {
    if (firebaseApp && !remoteReady) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(articles)); } catch { /* quota */ }
  }, [articles, remoteReady]);

  // ── Firestore write (debounced, admin only) ───────────────────────────
  useEffect(() => {
    if (!firebaseApp || !remoteReady) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const [{ getAuth }, { getFirestore, doc, setDoc, serverTimestamp }] = await Promise.all([
        import('firebase/auth'),
        import('firebase/firestore'),
      ]);
      if (cancelled || !firebaseApp) return;
      if (!getAuth(firebaseApp).currentUser) return;
      const db = getFirestore(firebaseApp);
      const ref = doc(db, FS_COLLECTION, FS_DOC_ID);
      void setDoc(ref, { payload: JSON.stringify(articlesRef.current), updatedAt: serverTimestamp() }, { merge: true });
    }, SAVE_DEBOUNCE_MS);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [articles, remoteReady]);

  const addArticle = useCallback((a: Omit<NewsArticle, 'id'>) => {
    const id = `news-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    setArticles((prev) => [{ ...a, id }, ...prev]);
  }, []);

  const updateArticle = useCallback((id: string, patch: Partial<NewsArticle>) => {
    setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }, []);

  const removeArticle = useCallback((id: string) => {
    setArticles((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const publishedArticles = articles.filter((a) => a.published);

  return (
    <NewsContext.Provider value={{ articles, publishedArticles, addArticle, updateArticle, removeArticle, remoteReady }}>
      {children}
    </NewsContext.Provider>
  );
}

export function useNews() {
  const c = useContext(NewsContext);
  if (!c) throw new Error('useNews must be used inside NewsProvider');
  return c;
}
