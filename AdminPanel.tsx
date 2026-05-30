import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEventHandler, type FormEvent, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Image,
  LogOut,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  FileText,
  Globe,
  Search,
  Share2,
  Star,
  Pencil,
  X,
  Inbox,
  RefreshCw,
  MessageCircle,
  Mail,
  Phone,
} from 'lucide-react';
import type { CategoryJson, CompanyJson, CountryJson } from './networkTypes.ts';
import { ICON_KEYS, getIconByKey } from './iconRegistry.ts';
import { CATEGORY_PRESETS, PRESET_GROUPS } from './categoryPresets.ts';
import {
  defaultNetworkClone,
  DEFAULT_FAVICON_HREF,
  DEFAULT_ROOT_NODE_LINES,
  useExportData,
  validateNetwork,
} from './networkContext.tsx';
import { useLocale } from './i18n/LocaleContext.tsx';
import { usePageContent, DEFAULT_PAGE_CONTENT, DEFAULT_SEO, type PageContent, type SeoContent } from './pageContentContext.tsx';
import { useNews, NEWS_CATEGORIES, type NewsArticle } from './newsContext.tsx';

const MAX_FAVICON_BYTES = 256 * 1024;

function openCompanyUrlInNewTab(raw: string, invalidMessage: string) {
  const t = raw.trim();
  if (!t) return;
  let href = t;
  if (!/^https?:\/\//i.test(href)) {
    href = `https://${href}`;
  }
  try {
    const u = new URL(href);
    window.open(u.href, '_blank', 'noopener,noreferrer');
  } catch {
    window.alert(invalidMessage);
  }
}

/** Slug for object keys: letters in any script, numbers, underscore, hyphen (Unicode-aware). */
function makeSlugBase(raw: string, fallbackPrefix: string): string {
  const t = raw
    .trim()
    .normalize('NFKC')
    .replace(/\s+/g, '-')
    .toLowerCase();
  const cleaned = t
    .replace(/[^\p{L}\p{N}_-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 64);
  return cleaned || `${fallbackPrefix}-${Date.now().toString(36)}`;
}

function uniqueSlug(raw: string, existingKeys: readonly string[], fallbackPrefix: string): string {
  const existing = new Set(existingKeys);
  const base = makeSlugBase(raw, fallbackPrefix);
  let slug = base;
  let n = 0;
  while (existing.has(slug)) {
    n += 1;
    slug = `${base}-${n}`;
    if (slug.length > 96) {
      slug = `${fallbackPrefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }
  }
  return slug;
}

function moveKeyInRecord<T>(record: Record<string, T>, key: string, direction: -1 | 1): Record<string, T> {
  const entries = Object.entries(record);
  const index = entries.findIndex(([id]) => id === key);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= entries.length) return record;
  [entries[index], entries[nextIndex]] = [entries[nextIndex], entries[index]];
  return Object.fromEntries(entries) as Record<string, T>;
}

function emptyCompany(): CompanyJson {
  return { name: '', tag: '', initial: '?', url: 'https://' };
}

function emptyCategory(label: string): CategoryJson {
  return { label, iconKey: 'CircleDot', companies: [emptyCompany()], hidden: false };
}

function emptyCountry(id: string, defaultCategoryLabel: string): CountryJson {
  return {
    id,
    label: id,
    flag: 'iran',
    anchor: { x: 0, y: -160 },
    categories: { new_cat: emptyCategory(defaultCategoryLabel) },
  };
}

// ── Stable draft inputs ────────────────────────────────────────────────────
// These keep their own local state so rapid typing is never interrupted by
// Firestore round-trips. The global state is updated only on blur.
function DraftInput({ value, onCommit, ...rest }: { value: string; onCommit: (v: string) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onBlur' | 'onFocus'>) {
  const [local, setLocal] = useState(value);
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setLocal(value); }, [value]);
  return (
    <input
      {...rest}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onFocus={() => { focused.current = true; }}
      onBlur={() => { focused.current = false; onCommit(local); }}
    />
  );
}

function DraftTextarea({ value, onCommit, ...rest }: { value: string; onCommit: (v: string) => void } & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange' | 'onBlur' | 'onFocus'>) {
  const [local, setLocal] = useState(value);
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setLocal(value); }, [value]);
  return (
    <textarea
      {...rest}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onFocus={() => { focused.current = true; }}
      onBlur={() => { focused.current = false; onCommit(local); }}
    />
  );
}

type AdminTab = 'network' | 'pages' | 'seo' | 'news' | 'messages';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  subject: string;
  message: string;
  submittedAt: string;
  read: boolean;
}

export default function AdminPanel() {
  const { t } = useLocale();
  const { adminOk, login, logout, networkJson, setNetworkJson, syncMode, rootNodeLines, setRootNodeLines, flushNetworkToCloudSoon } =
    useExportData();
  const { pageContent, updatePageContent } = usePageContent();
  const { articles, addArticle, updateArticle, removeArticle } = useNews();

  // News editor state
  const emptyDraft = (): Omit<NewsArticle, 'id'> => ({
    title: '', excerpt: '', content: '', category: 'Trade & Commerce',
    imageUrl: '', publishedAt: new Date().toISOString().slice(0, 10),
    author: 'Tohid Dayhami', published: false, featured: false, tags: '',
  });
  const [newsDraft, setNewsDraft] = useState<Omit<NewsArticle, 'id'> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('network');
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState('');
  const [sharedCatPanel, setSharedCatPanel] = useState<{ catId: string; idx: number } | null>(null);
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [presetSearch, setPresetSearch] = useState('');

  // Page content draft state
  const [pageDraft, setPageDraft] = useState<PageContent>(() => ({ ...pageContent }));
  useEffect(() => { setPageDraft({ ...pageContent }); }, [pageContent]);
  const savePageContent = () => updatePageContent(pageDraft);

  // Load contact messages from Firestore
  const loadContactMessages = useCallback(async () => {
    const { firebaseApp: fb } = await import('./firebase.ts');
    if (!fb) {
      // Fallback: read from localStorage
      try {
        const stored = JSON.parse(localStorage.getItem('contact_messages') || '[]') as ContactMessage[];
        setContactMessages(stored.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)));
      } catch { setContactMessages([]); }
      return;
    }
    setMessagesLoading(true);
    setMessagesError('');
    try {
      const { getFirestore, collection, getDocs, orderBy, query } = await import('firebase/firestore');
      const db = getFirestore(fb);
      const q = query(collection(db, 'contact_messages'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const msgs: ContactMessage[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ContactMessage, 'id'>) }));
      setContactMessages(msgs);
    } catch (e) {
      console.error('[Admin] Failed to load contact messages:', e);
      setMessagesError('Failed to load messages. Check Firestore rules or connection.');
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (adminOk && activeTab === 'messages') {
      void loadContactMessages();
    }
  }, [adminOk, activeTab, loadContactMessages]);

  const exportMessagesCSV = () => {
    if (contactMessages.length === 0) return;
    const headers = ['Name', 'Email', 'WhatsApp', 'Subject', 'Message', 'Submitted At'];
    const rows = contactMessages.map((m) => [
      m.name, m.email, m.whatsapp ?? '', m.subject ?? '', m.message, m.submittedAt,
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const bom = '﻿';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contact-messages-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Local draft — completely isolated from context/Firestore until user clicks Save
  const [draftLine1, setDraftLine1] = useState(rootNodeLines.line1);
  const [draftLine2, setDraftLine2] = useState(rootNodeLines.line2);

  const saveRootTitle = () => {
    setRootNodeLines((prev) => ({
      ...prev,
      line1: draftLine1.trim() || DEFAULT_ROOT_NODE_LINES.line1,
      line2: draftLine2.trim() || DEFAULT_ROOT_NODE_LINES.line2,
    }));
  };

  const countryIds = useMemo(() => Object.keys(networkJson), [networkJson]);
  const [selCountry, setSelCountry] = useState<string>(() => countryIds[0] ?? '');
  const [selCat, setSelCat] = useState<string>('');

  const country = selCountry && networkJson[selCountry] ? networkJson[selCountry] : undefined;
  const catKeys = useMemo(() => (country ? Object.keys(country.categories) : []), [country]);

  /** After refresh or when Firestore replaces data, keep selection aligned with real keys. */
  useEffect(() => {
    const ids = Object.keys(networkJson);
    if (ids.length === 0) {
      setSelCountry('');
      setSelCat('');
      return;
    }
    if (!selCountry || !networkJson[selCountry]) {
      setSelCountry(ids[0]!);
      setSelCat('');
      return;
    }
    if (selCat && !networkJson[selCountry].categories[selCat]) {
      setSelCat('');
    }
  }, [networkJson, selCountry, selCat]);

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    const result = await login(user, pass);
    if (!result.ok) setErr(result.message);
  };

  const updateCountry = useCallback(
    (patch: Partial<CountryJson>) => {
      if (!selCountry) return;
      setNetworkJson((prev) => {
        const cur = prev[selCountry];
        if (!cur) return prev;
        return {
          ...prev,
          [selCountry]: { ...cur, ...patch },
        };
      });
    },
    [selCountry, setNetworkJson]
  );

  const updateCategory = useCallback(
    (catId: string, patch: Partial<CategoryJson>) => {
      if (!selCountry) return;
      setNetworkJson((prev) => {
        const c = prev[selCountry];
        if (!c?.categories[catId]) return prev;
        const next = { ...c.categories[catId], ...patch };
        return {
          ...prev,
          [selCountry]: {
            ...c,
            categories: { ...c.categories, [catId]: next },
          },
        };
      });
    },
    [selCountry, setNetworkJson]
  );

  const moveCountry = useCallback(
    (countryId: string, direction: -1 | 1) => {
      setNetworkJson((prev) => {
        if (!prev[countryId]) return prev;
        return moveKeyInRecord(prev, countryId, direction);
      });
      setSelCountry(countryId);
    },
    [setNetworkJson]
  );

  const toggleCountryVisibility = useCallback(
    (countryId: string) => {
      setNetworkJson((prev) => {
        const c = prev[countryId];
        if (!c) return prev;
        return { ...prev, [countryId]: { ...c, hidden: !c.hidden } };
      });
    },
    [setNetworkJson]
  );

  const moveCategory = useCallback(
    (catId: string, direction: -1 | 1) => {
      if (!selCountry) return;
      setNetworkJson((prev) => {
        const c = prev[selCountry];
        if (!c?.categories[catId]) return prev;
        return {
          ...prev,
          [selCountry]: {
            ...c,
            categories: moveKeyInRecord(c.categories, catId, direction),
          },
        };
      });
      setSelCat(catId);
    },
    [selCountry, setNetworkJson]
  );

  const addCountry = () => {
    const id = window.prompt(t('promptCountryId'), 'new-country');
    if (!id) return;
    const slug = uniqueSlug(id, Object.keys(networkJson), 'country');
    setNetworkJson((p) => ({ ...p, [slug]: emptyCountry(slug, t('defaultCategoryLabel')) }));
    setSelCountry(slug);
    setSelCat('');
  };

  const removeCountry = () => {
    if (!selCountry) return;
    if (!window.confirm(t('confirmDeleteCountry', { id: selCountry }))) return;
    setNetworkJson((p) => {
      if (!p[selCountry]) return p;
      const { [selCountry]: _, ...rest } = p;
      return rest;
    });
    const next = countryIds.filter((x) => x !== selCountry);
    setSelCountry(next[0] ?? '');
    setSelCat('');
    flushNetworkToCloudSoon();
  };

  const addCategory = () => {
    if (!selCountry || !country) return;
    const id = window.prompt(t('promptCategoryId'), 'new-category');
    if (!id) return;
    const slug = uniqueSlug(id, Object.keys(country.categories), 'cat');
    setNetworkJson((p) => {
      const c = p[selCountry];
      if (!c) return p;
      return {
        ...p,
        [selCountry]: {
          ...c,
          categories: { ...c.categories, [slug]: emptyCategory(t('defaultCategoryLabel')) },
        },
      };
    });
    setSelCat(slug);
  };

  const addCategoryFromPreset = (label: string, iconKey: string) => {
    if (!selCountry || !country) return;
    const slug = uniqueSlug(label, Object.keys(country.categories), 'cat');
    setNetworkJson((p) => {
      const c = p[selCountry];
      if (!c) return p;
      return {
        ...p,
        [selCountry]: {
          ...c,
          categories: {
            ...c.categories,
            [slug]: { label, iconKey, companies: [emptyCompany()], hidden: false },
          },
        },
      };
    });
    setSelCat(slug);
    setShowPresetPicker(false);
    setPresetSearch('');
  };

  const removeCategory = (catId: string) => {
    if (!selCountry) return;
    if (!window.confirm(t('confirmDeleteCategory', { id: catId }))) return;
    setNetworkJson((p) => {
      const c = p[selCountry];
      if (!c?.categories[catId]) return p;
      const { [catId]: _, ...cats } = c.categories;
      return { ...p, [selCountry]: { ...c, categories: cats } };
    });
    setSelCat('');
    flushNetworkToCloudSoon();
  };

  const addCompany = (catId: string) => {
    if (!selCountry) return;
    setNetworkJson((p) => {
      const c = p[selCountry];
      const cat = c?.categories[catId];
      if (!c || !cat) return p;
      return {
        ...p,
        [selCountry]: {
          ...c,
          categories: {
            ...c.categories,
            [catId]: { ...cat, companies: [...cat.companies, emptyCompany()] },
          },
        },
      };
    });
  };

  const updateCompany = (catId: string, index: number, patch: Partial<CompanyJson>) => {
    if (!selCountry) return;
    setNetworkJson((p) => {
      const c = p[selCountry];
      const cat = c?.categories[catId];
      if (!c || !cat) return p;
      const companies = cat.companies.map((row, i) => (i === index ? { ...row, ...patch } : row));
      return {
        ...p,
        [selCountry]: {
          ...c,
          categories: {
            ...c.categories,
            [catId]: { ...cat, companies },
          },
        },
      };
    });
  };

  const removeCompany = (catId: string, index: number) => {
    if (!selCountry) return;
    setNetworkJson((p) => {
      const c = p[selCountry];
      const cat = c?.categories[catId];
      if (!c || !cat) return p;
      const companies = cat.companies.filter((_, i) => i !== index);
      return {
        ...p,
        [selCountry]: {
          ...c,
          categories: {
            ...c.categories,
            [catId]: { ...cat, companies: companies.length ? companies : [emptyCompany()] },
          },
        },
      };
    });
  };

  const exportFile = () => {
    const blob = new Blob([JSON.stringify(networkJson, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'export-network.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importFile: ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data: unknown = JSON.parse(String(reader.result));
        if (!validateNetwork(data)) throw new Error('Invalid shape');
        setNetworkJson(data);
        const ids = Object.keys(data);
        setSelCountry(ids[0] ?? '');
        setSelCat('');
        window.alert(t('importOk'));
      } catch {
        window.alert(t('invalidJsonFile'));
      }
    };
    reader.readAsText(f);
    e.target.value = '';
  };

  const uploadFavicon: ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const isImage = f.type.startsWith('image/') || /\.ico$/i.test(f.name);
    if (!isImage || f.size > MAX_FAVICON_BYTES) {
      window.alert(t('faviconInvalidFile'));
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      setRootNodeLines((prev) => ({ ...prev, faviconHref: reader.result as string }));
    };
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  const resetDefault = () => {
    if (!window.confirm(t('confirmReset'))) return;
    const d = defaultNetworkClone();
    setNetworkJson(d);
    setRootNodeLines({ ...DEFAULT_ROOT_NODE_LINES });
    setDraftLine1(DEFAULT_ROOT_NODE_LINES.line1);
    setDraftLine2(DEFAULT_ROOT_NODE_LINES.line2);
    setSelCountry(Object.keys(d)[0] ?? '');
    setSelCat('');
  };

  if (!adminOk) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-8 shadow-sm">
          <h1 className="font-serif text-2xl text-ink mb-6">{t('loginTitle')}</h1>
          <form onSubmit={onLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1">{t('user')}</label>
              <input
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                autoComplete="username"
                type="text"
                disabled={syncMode === 'unconfigured'}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1">{t('password')}</label>
              <input
                type="password"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                autoComplete="current-password"
                disabled={syncMode === 'unconfigured'}
              />
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button
              type="submit"
              disabled={syncMode === 'unconfigured'}
              className="w-full rounded-full bg-ink text-white py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none"
            >
              {t('signIn')}
            </button>
          </form>
          <Link to="/" className="mt-6 block text-center text-sm text-ink-soft hover:text-ink">
            ← {t('backToMap')}
          </Link>
        </div>
      </div>
    );
  }

  const activeCat = selCat && country ? country.categories[selCat] : undefined;

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-10 border-b border-border bg-white/90 backdrop-blur px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="font-serif text-lg truncate">Tohid Dayhami Business Solutions Center — Admin</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-hover">
            <Upload className="w-3.5 h-3.5" />
            {t('import')}
            <input type="file" accept="application/json,.json" className="hidden" onChange={importFile} />
          </label>
          <button
            type="button"
            onClick={exportFile}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-hover"
          >
            <Download className="w-3.5 h-3.5" />
            {t('exportJson')}
          </button>
          <button
            type="button"
            onClick={resetDefault}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-hover"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t('reset')}
          </button>
          <Link
            to="/"
            className="inline-flex items-center gap-1 rounded-full bg-ink text-white px-3 py-1.5 text-xs font-medium"
          >
            <Save className="w-3.5 h-3.5" />
            {t('map')}
          </Link>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-hover"
          >
            <LogOut className="w-3.5 h-3.5" />
            {t('logOut')}
          </button>
        </div>
      </header>

      {/* Tab navigation */}
      <div className="border-b border-border bg-white px-4 flex gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('network')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'network'
              ? 'border-ink text-ink'
              : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          Network Data
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pages')}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'pages'
              ? 'border-ink text-ink'
              : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Pages Content
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('seo')}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'seo'
              ? 'border-ink text-ink'
              : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          SEO Settings
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('news'); setNewsDraft(null); setEditingId(null); }}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'news'
              ? 'border-ink text-ink'
              : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Business News
          {articles.length > 0 && (
            <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-ink text-white text-[9px] font-bold">
              {articles.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('messages')}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'messages'
              ? 'border-ink text-ink'
              : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          <Inbox className="w-3.5 h-3.5" />
          Contact Messages
          {contactMessages.length > 0 && (
            <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-bold">
              {contactMessages.length}
            </span>
          )}
        </button>
      </div>

      {/* Pages Content Tab */}
      {activeTab === 'pages' && (
        <div className="max-w-4xl mx-auto p-4 space-y-6">

          {/* About Us */}
          <section className="rounded-xl border border-border bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-base">About Us Page</h2>
              <button
                type="button"
                onClick={savePageContent}
                className="inline-flex items-center gap-1.5 rounded-full bg-ink text-white px-4 py-1.5 text-xs font-medium hover:opacity-90"
              >
                <Save className="w-3 h-3" />
                Save All Pages
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {([
                ['aboutTitle', 'Title'],
                ['aboutSubtitle', 'Subtitle'],
                ['aboutStat1Value', 'Stat 1 Value'],
                ['aboutStat1Label', 'Stat 1 Label'],
                ['aboutStat2Value', 'Stat 2 Value'],
                ['aboutStat2Label', 'Stat 2 Label'],
                ['aboutStat3Value', 'Stat 3 Value'],
                ['aboutStat3Label', 'Stat 3 Label'],
              ] as [keyof PageContent, string][]).map(([key, label]) => (
                <label key={key} className="block text-xs">
                  <span className="text-ink-soft">{label}</span>
                  <input
                    className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm"
                    value={pageDraft[key] as string}
                    onChange={(e) => setPageDraft((d) => ({ ...d, [key]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
            <div className="space-y-3">
              {([
                ['aboutBody1', 'Body Paragraph 1'],
                ['aboutBody2', 'Body Paragraph 2'],
              ] as [keyof PageContent, string][]).map(([key, label]) => (
                <label key={key} className="block text-xs">
                  <span className="text-ink-soft">{label}</span>
                  <textarea
                    rows={3}
                    className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm resize-y"
                    value={pageDraft[key] as string}
                    onChange={(e) => setPageDraft((d) => ({ ...d, [key]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
          </section>

          {/* Services */}
          <section className="rounded-xl border border-border bg-white p-5 space-y-4">
            <h2 className="font-medium text-base">Services Page</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {([
                ['servicesTitle', 'Title'],
                ['servicesSubtitle', 'Subtitle'],
              ] as [keyof PageContent, string][]).map(([key, label]) => (
                <label key={key} className="block text-xs">
                  <span className="text-ink-soft">{label}</span>
                  <input
                    className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm"
                    value={pageDraft[key] as string}
                    onChange={(e) => setPageDraft((d) => ({ ...d, [key]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
            {([1, 2, 3, 4, 5, 6] as const).map((n) => (
              <div key={n} className="rounded-lg border border-border p-3 space-y-2">
                <p className="text-xs font-medium text-ink-soft">Service {n}</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="block text-xs">
                    <span className="text-ink-soft">Title</span>
                    <input
                      className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm"
                      value={pageDraft[`service${n}Title` as keyof PageContent] as string}
                      onChange={(e) => setPageDraft((d) => ({ ...d, [`service${n}Title`]: e.target.value }))}
                    />
                  </label>
                  <label className="block text-xs">
                    <span className="text-ink-soft">Description</span>
                    <input
                      className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm"
                      value={pageDraft[`service${n}Desc` as keyof PageContent] as string}
                      onChange={(e) => setPageDraft((d) => ({ ...d, [`service${n}Desc`]: e.target.value }))}
                    />
                  </label>
                </div>
              </div>
            ))}
          </section>

          {/* Contact */}
          <section className="rounded-xl border border-border bg-white p-5 space-y-4">
            <h2 className="font-medium text-base">Contact Us Page</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {([
                ['contactTitle', 'Title'],
                ['contactSubtitle', 'Subtitle'],
                ['contactEmail', 'Email'],
                ['contactPhone', 'Phone'],
                ['contactAddress', 'Address'],
                ['contactHours', 'Business Hours'],
                ['siteTagline', 'Site Tagline'],
              ] as [keyof PageContent, string][]).map(([key, label]) => (
                <label key={key} className="block text-xs">
                  <span className="text-ink-soft">{label}</span>
                  <input
                    className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm"
                    value={pageDraft[key] as string}
                    onChange={(e) => setPageDraft((d) => ({ ...d, [key]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={savePageContent}
                className="inline-flex items-center gap-1.5 rounded-full bg-ink text-white px-5 py-2 text-sm font-medium hover:opacity-90"
              >
                <Save className="w-3.5 h-3.5" />
                Save All Pages
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ── News Tab ── */}
      {activeTab === 'news' && (
        <div className="max-w-4xl mx-auto p-4 space-y-4">

          {/* Add / Edit form */}
          {newsDraft !== null ? (
            <section className="rounded-xl border border-border bg-white p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-medium text-base">{editingId ? 'Edit Article' : 'New Article'}</h2>
                <button type="button" onClick={() => { setNewsDraft(null); setEditingId(null); }}
                  className="p-1.5 rounded-lg hover:bg-hover text-ink-soft">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block text-xs sm:col-span-2">
                  <span className="text-ink-soft">Title (English)</span>
                  <input className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm"
                    value={newsDraft.title}
                    onChange={(e) => setNewsDraft((d) => d && ({ ...d, title: e.target.value }))}
                    placeholder="English headline..." />
                </label>
                <label className="block text-xs">
                  <span className="text-ink-soft">عنوان — Title (Persian)</span>
                  <input className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm text-right" dir="rtl"
                    value={newsDraft.titleFa ?? ''}
                    onChange={(e) => setNewsDraft((d) => d && ({ ...d, titleFa: e.target.value || undefined }))}
                    placeholder="عنوان فارسی..." />
                </label>
                <label className="block text-xs">
                  <span className="text-ink-soft">Category</span>
                  <select className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm"
                    value={newsDraft.category}
                    onChange={(e) => setNewsDraft((d) => d && ({ ...d, category: e.target.value }))}>
                    {NEWS_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="block text-xs">
                  <span className="text-ink-soft">Author</span>
                  <input className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm"
                    value={newsDraft.author}
                    onChange={(e) => setNewsDraft((d) => d && ({ ...d, author: e.target.value }))} />
                </label>
                <label className="block text-xs">
                  <span className="text-ink-soft">Publish Date</span>
                  <input type="date" className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm"
                    value={newsDraft.publishedAt.slice(0, 10)}
                    onChange={(e) => setNewsDraft((d) => d && ({ ...d, publishedAt: e.target.value }))} />
                </label>
                <label className="block text-xs">
                  <span className="text-ink-soft">Image URL (optional)</span>
                  <input className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm"
                    value={newsDraft.imageUrl}
                    onChange={(e) => setNewsDraft((d) => d && ({ ...d, imageUrl: e.target.value }))}
                    placeholder="https://..." />
                </label>
                <label className="block text-xs sm:col-span-2">
                  <span className="text-ink-soft">Excerpt — English (shown on card)</span>
                  <textarea rows={2} className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm resize-y"
                    value={newsDraft.excerpt}
                    onChange={(e) => setNewsDraft((d) => d && ({ ...d, excerpt: e.target.value }))}
                    placeholder="Short English summary..." />
                </label>
                <label className="block text-xs sm:col-span-2">
                  <span className="text-ink-soft">خلاصه — Excerpt Persian</span>
                  <textarea rows={2} className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm resize-y text-right" dir="rtl"
                    value={newsDraft.excerptFa ?? ''}
                    onChange={(e) => setNewsDraft((d) => d && ({ ...d, excerptFa: e.target.value || undefined }))}
                    placeholder="خلاصه کوتاه فارسی..." />
                </label>
                <label className="block text-xs sm:col-span-2">
                  <span className="text-ink-soft">Full Content — English</span>
                  <textarea rows={6} className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm resize-y font-mono text-xs"
                    value={newsDraft.content}
                    onChange={(e) => setNewsDraft((d) => d && ({ ...d, content: e.target.value }))}
                    placeholder="Full English article. Use blank lines to separate paragraphs." />
                </label>
                <label className="block text-xs sm:col-span-2">
                  <span className="text-ink-soft">متن کامل — Full Content Persian</span>
                  <textarea rows={6} className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm resize-y font-mono text-xs text-right" dir="rtl"
                    value={newsDraft.contentFa ?? ''}
                    onChange={(e) => setNewsDraft((d) => d && ({ ...d, contentFa: e.target.value || undefined }))}
                    placeholder="متن کامل مقاله به فارسی. برای جداکردن پاراگراف‌ها یک خط خالی بگذارید." />
                </label>
                <label className="block text-xs sm:col-span-2">
                  <span className="text-ink-soft">Tags (comma separated)</span>
                  <input className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm"
                    value={newsDraft.tags}
                    onChange={(e) => setNewsDraft((d) => d && ({ ...d, tags: e.target.value }))}
                    placeholder="trade, export, iran, ..." />
                </label>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-sm select-none">
                  <input type="checkbox" className="w-4 h-4 rounded accent-ink"
                    checked={newsDraft.published}
                    onChange={(e) => setNewsDraft((d) => d && ({ ...d, published: e.target.checked }))} />
                  <span className="text-ink-soft">Published (visible on site)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm select-none">
                  <input type="checkbox" className="w-4 h-4 rounded accent-ink"
                    checked={newsDraft.featured}
                    onChange={(e) => setNewsDraft((d) => d && ({ ...d, featured: e.target.checked }))} />
                  <span className="text-ink-soft">Featured (shown in hero spotlight)</span>
                </label>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button type="button"
                  disabled={!newsDraft.title.trim() || !newsDraft.excerpt.trim() || !newsDraft.content.trim()}
                  onClick={() => {
                    if (!newsDraft.title.trim()) return;
                    if (editingId) {
                      updateArticle(editingId, newsDraft);
                    } else {
                      addArticle(newsDraft);
                    }
                    setNewsDraft(null); setEditingId(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-ink text-white px-5 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none">
                  <Save className="w-3.5 h-3.5" />
                  {editingId ? 'Save Changes' : 'Publish Article'}
                </button>
                <button type="button" onClick={() => { setNewsDraft(null); setEditingId(null); }}
                  className="text-sm text-ink-soft hover:text-ink">
                  Cancel
                </button>
              </div>
            </section>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-medium text-base">
                {articles.length} article{articles.length !== 1 ? 's' : ''} total
                <span className="ml-2 text-xs text-ink-soft font-normal">
                  ({articles.filter((a) => a.published).length} published)
                </span>
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                {/* Download sample */}
                <a href="/news-import-sample.json" download="news-import-sample.json"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-hover"
                  title="Download sample JSON to fill with AI">
                  <Download className="w-3.5 h-3.5" />
                  Sample JSON
                </a>
                {/* Import JSON */}
                <label className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-hover" title="Import articles from JSON">
                  <Upload className="w-3.5 h-3.5" />
                  Import JSON
                  <input type="file" accept="application/json,.json" className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        try {
                          const raw = JSON.parse(String(reader.result)) as Record<string, unknown>;
                          const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.articles) ? (raw.articles as unknown[]) : null;
                          if (!arr) { window.alert('Invalid format. Expected { "articles": [...] }'); return; }
                          let added = 0;
                          for (const item of arr) {
                            if (!item || typeof item !== 'object') continue;
                            const a = item as Record<string, unknown>;
                            if (String(a._example ?? '').length > 0) continue; // skip sample rows
                            const title = String(a.title ?? '').trim();
                            const titleFa = String(a.titleFa ?? '').trim();
                            if (!title && !titleFa) continue;
                            addArticle({
                              title,
                              titleFa: titleFa || undefined,
                              excerpt: String(a.excerpt ?? ''),
                              excerptFa: String(a.excerptFa ?? '') || undefined,
                              content: String(a.content ?? ''),
                              contentFa: String(a.contentFa ?? '') || undefined,
                              category: String(a.category ?? 'General'),
                              imageUrl: String(a.imageUrl ?? ''),
                              publishedAt: String(a.publishedAt ?? new Date().toISOString().slice(0, 10)),
                              author: String(a.author ?? 'Tohid Dayhami'),
                              published: Boolean(a.published ?? false),
                              featured: Boolean(a.featured ?? false),
                              tags: String(a.tags ?? ''),
                            });
                            added++;
                          }
                          window.alert(`${added} article${added !== 1 ? 's' : ''} imported.`);
                        } catch { window.alert('Could not parse JSON. Check the file format.'); }
                      };
                      reader.readAsText(f);
                      e.target.value = '';
                    }}
                  />
                </label>
                <button type="button" onClick={() => setNewsDraft(emptyDraft())}
                  className="inline-flex items-center gap-1.5 rounded-full bg-ink text-white px-4 py-1.5 text-sm font-medium hover:opacity-90">
                  <Plus className="w-3.5 h-3.5" />
                  New Article
                </button>
              </div>
            </div>
          )}

          {/* Articles list */}
          {newsDraft === null && (
            <div className="space-y-2">
              {articles.length === 0 && (
                <p className="text-center text-ink-soft text-sm py-10 rounded-xl border border-border bg-white">
                  No articles yet. Click "New Article" to create your first one.
                </p>
              )}
              {articles.map((article) => (
                <div key={article.id}
                  className={`rounded-xl border bg-white p-4 flex flex-wrap items-start gap-3 transition-colors ${
                    article.published ? 'border-border' : 'border-border bg-hover/50'
                  }`}>
                  {/* Status dot */}
                  <div className="flex flex-col items-center gap-1 pt-0.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${article.published ? 'bg-emerald-500' : 'bg-ink-faint'}`} title={article.published ? 'Published' : 'Draft'} />
                    {article.featured && <div className="w-2.5 h-2.5 rounded-full bg-amber-400" title="Featured" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft border border-border rounded px-1.5 py-0.5">
                        {article.category}
                      </span>
                      {article.featured && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 border border-amber-200 bg-amber-50 rounded px-1.5 py-0.5">
                          Featured
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-ink truncate">{article.title || '(untitled)'}</p>
                    <p className="text-xs text-ink-soft truncate mt-0.5">{article.excerpt}</p>
                    <p className="text-[10px] text-ink-faint mt-1">
                      {article.author} · {new Date(article.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button"
                      onClick={() => updateArticle(article.id, { published: !article.published })}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                        article.published
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'border-border text-ink-soft hover:bg-hover'
                      }`}>
                      {article.published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {article.published ? 'Live' : 'Draft'}
                    </button>
                    <button type="button"
                      onClick={() => updateArticle(article.id, { featured: !article.featured })}
                      title={article.featured ? 'Remove from featured' : 'Set as featured'}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        article.featured
                          ? 'border-amber-200 bg-amber-50 text-amber-600'
                          : 'border-border text-ink-soft hover:bg-hover'
                      }`}>
                      <Star className="w-3.5 h-3.5" />
                    </button>
                    <button type="button"
                      onClick={() => { setEditingId(article.id); setNewsDraft({ ...article }); }}
                      className="p-1.5 rounded-lg border border-border text-ink-soft hover:bg-hover hover:text-ink transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button type="button"
                      onClick={() => { if (window.confirm(`Delete "${article.title}"?`)) removeArticle(article.id); }}
                      className="p-1.5 rounded-lg border border-border text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SEO Settings Tab ── */}
      {activeTab === 'seo' && (
        <div className="max-w-4xl mx-auto p-4 space-y-6">

          {/* Basic SEO */}
          <section className="rounded-xl border border-border bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-medium text-base">Basic SEO</h2>
                <p className="text-[11px] text-ink-soft mt-0.5">Controls page title, description, and keywords seen by search engines.</p>
              </div>
              <button
                type="button"
                onClick={savePageContent}
                className="inline-flex items-center gap-1.5 rounded-full bg-ink text-white px-4 py-1.5 text-xs font-medium hover:opacity-90"
              >
                <Save className="w-3 h-3" />
                Save SEO
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {([
                ['seoSiteTitle', 'Site Title', 'Shown in browser tabs and search results'],
                ['seoSeparator', 'Title Separator', 'Character between page name and site title (e.g. |)'],
                ['seoAuthor', 'Author', 'meta author tag'],
                ['seoSiteUrl', 'Site URL', 'Base URL for canonical links (e.g. https://yourdomain.com)'],
              ] as [keyof SeoContent, string, string][]).map(([key, label, hint]) => (
                <label key={key} className="block text-xs">
                  <span className="text-ink-soft">{label}</span>
                  <input
                    className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm"
                    value={pageDraft[key] as string}
                    onChange={(e) => setPageDraft((d) => ({ ...d, [key]: e.target.value }))}
                  />
                  <span className="text-[10px] text-ink-faint">{hint}</span>
                </label>
              ))}
            </div>
            <label className="block text-xs">
              <span className="text-ink-soft">Meta Description (homepage)</span>
              <textarea
                rows={3}
                className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm resize-y"
                value={pageDraft.seoDescription}
                onChange={(e) => setPageDraft((d) => ({ ...d, seoDescription: e.target.value }))}
              />
              <span className="text-[10px] text-ink-faint">Recommended: 150–160 characters. Currently: {pageDraft.seoDescription.length}</span>
            </label>
            <label className="block text-xs">
              <span className="text-ink-soft">Meta Keywords</span>
              <input
                className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm"
                value={pageDraft.seoKeywords}
                onChange={(e) => setPageDraft((d) => ({ ...d, seoKeywords: e.target.value }))}
                placeholder="export, trade, logistics, ..."
              />
              <span className="text-[10px] text-ink-faint">Comma-separated keywords</span>
            </label>
          </section>

          {/* Per-page descriptions */}
          <section className="rounded-xl border border-border bg-white p-5 space-y-4">
            <h2 className="font-medium text-base">Per-Page Descriptions</h2>
            <p className="text-[11px] text-ink-soft">Each page shows its own description in search results.</p>
            <div className="space-y-3">
              {([
                ['seoAboutDescription', 'About Us page description'],
                ['seoServicesDescription', 'Services page description'],
                ['seoContactDescription', 'Contact Us page description'],
              ] as [keyof SeoContent, string][]).map(([key, label]) => (
                <label key={key} className="block text-xs">
                  <span className="text-ink-soft">{label}</span>
                  <textarea
                    rows={2}
                    className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm resize-y"
                    value={pageDraft[key] as string}
                    onChange={(e) => setPageDraft((d) => ({ ...d, [key]: e.target.value }))}
                  />
                  <span className="text-[10px] text-ink-faint">{(pageDraft[key] as string).length} chars</span>
                </label>
              ))}
            </div>
          </section>

          {/* Open Graph / Social */}
          <section className="rounded-xl border border-border bg-white p-5 space-y-4">
            <div>
              <h2 className="font-medium text-base">Open Graph & Social Sharing</h2>
              <p className="text-[11px] text-ink-soft mt-0.5">Controls how the site appears when shared on WhatsApp, Telegram, LinkedIn, Facebook, etc.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block text-xs sm:col-span-2">
                <span className="text-ink-soft">OG Title (social share title)</span>
                <input
                  className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm"
                  value={pageDraft.seoOgTitle}
                  onChange={(e) => setPageDraft((d) => ({ ...d, seoOgTitle: e.target.value }))}
                  placeholder="Leave empty to use Site Title"
                />
              </label>
              <label className="block text-xs sm:col-span-2">
                <span className="text-ink-soft">OG Description (social share description)</span>
                <textarea
                  rows={2}
                  className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm resize-y"
                  value={pageDraft.seoOgDescription}
                  onChange={(e) => setPageDraft((d) => ({ ...d, seoOgDescription: e.target.value }))}
                />
              </label>
              <label className="block text-xs sm:col-span-2">
                <span className="text-ink-soft">OG Image URL (social share thumbnail)</span>
                <input
                  className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm"
                  value={pageDraft.seoOgImageUrl}
                  onChange={(e) => setPageDraft((d) => ({ ...d, seoOgImageUrl: e.target.value }))}
                  placeholder="https://yourdomain.com/og-image.jpg (recommended: 1200×630)"
                />
              </label>
              <label className="block text-xs">
                <span className="text-ink-soft">Twitter Card Type</span>
                <select
                  className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm"
                  value={pageDraft.seoTwitterCard}
                  onChange={(e) => setPageDraft((d) => ({ ...d, seoTwitterCard: e.target.value }))}
                >
                  <option value="summary_large_image">summary_large_image (large image)</option>
                  <option value="summary">summary (small image)</option>
                </select>
              </label>
              <label className="block text-xs">
                <span className="text-ink-soft">Twitter / X Handle</span>
                <input
                  className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm"
                  value={pageDraft.seoTwitterSite}
                  onChange={(e) => setPageDraft((d) => ({ ...d, seoTwitterSite: e.target.value }))}
                  placeholder="@yourhandle"
                />
              </label>
            </div>
          </section>

          {/* Google Analytics */}
          <section className="rounded-xl border border-border bg-white p-5 space-y-4">
            <div>
              <h2 className="font-medium text-base">Google Analytics</h2>
              <p className="text-[11px] text-ink-soft mt-0.5">Tracking ID is injected once and active on all pages.</p>
            </div>
            <label className="block text-xs">
              <span className="text-ink-soft">Google Analytics Measurement ID</span>
              <input
                className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm"
                value={pageDraft.seoGaId}
                onChange={(e) => setPageDraft((d) => ({ ...d, seoGaId: e.target.value }))}
                placeholder="G-XXXXXXXXXX"
              />
            </label>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={savePageContent}
                className="inline-flex items-center gap-1.5 rounded-full bg-ink text-white px-5 py-2 text-sm font-medium hover:opacity-90"
              >
                <Save className="w-3.5 h-3.5" />
                Save SEO Settings
              </button>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'network' && (
      <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        <aside className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{t('countries')}</span>
            <button type="button" onClick={addCountry} className="p-1 rounded-lg hover:bg-hover" title={t('addCountryTitle')}>
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <ul className="space-y-1">
            {countryIds.map((id, index) => {
              const isHidden = !!networkJson[id].hidden;
              return (
                <li key={id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => { setSelCountry(id); setSelCat(''); }}
                    className={`min-w-0 flex-1 text-start rounded-lg px-3 py-2 text-sm ${
                      selCountry === id
                        ? 'bg-ink text-white'
                        : isHidden
                          ? 'text-ink-soft hover:bg-hover'
                          : 'hover:bg-hover'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {isHidden && <EyeOff className="w-3 h-3 shrink-0 opacity-60" />}
                      <span className="truncate">{networkJson[id].label}</span>
                    </span>
                  </button>
                  <div className="flex shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleCountryVisibility(id)}
                      title={isHidden ? 'Show on map' : 'Hide from map'}
                      aria-label={isHidden ? 'Show country' : 'Hide country'}
                      className="p-1 rounded text-ink-soft hover:text-ink hover:bg-hover"
                    >
                      {isHidden
                        ? <Eye className="w-3.5 h-3.5" />
                        : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => moveCountry(id, -1)}
                      disabled={index === 0}
                      title={t('moveUp')}
                      aria-label={t('moveUp')}
                      className="p-1 rounded text-ink-soft hover:text-ink hover:bg-hover disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveCountry(id, 1)}
                      disabled={index === countryIds.length - 1}
                      title={t('moveDown')}
                      aria-label={t('moveDown')}
                      className="p-1 rounded text-ink-soft hover:text-ink hover:bg-hover disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="space-y-6 min-w-0">
          <section className="rounded-xl border border-border bg-white p-4 space-y-3">
            <h2 className="font-medium">{t('rootMapTitleSection')}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-xs">
                <span className="text-ink-soft">{t('rootMapTitleLine1')}</span>
                <input
                  className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm"
                  value={draftLine1}
                  onChange={(e) => setDraftLine1(e.target.value)}
                  maxLength={80}
                />
              </label>
              <label className="text-xs">
                <span className="text-ink-soft">{t('rootMapTitleLine2')}</span>
                <input
                  className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm"
                  value={draftLine2}
                  onChange={(e) => setDraftLine2(e.target.value)}
                  maxLength={80}
                />
              </label>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-ink-soft leading-snug">{t('rootMapTitleHint')}</p>
              <button
                type="button"
                onClick={saveRootTitle}
                className="inline-flex items-center gap-1.5 rounded-full bg-ink text-white px-4 py-1.5 text-xs font-medium hover:opacity-90"
              >
                <Save className="w-3 h-3" />
                {t('mapCenterTitleSave')}
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-white p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-medium">{t('faviconSection')}</h2>
              <div className="w-12 h-12 rounded-xl border border-border bg-hover flex items-center justify-center overflow-hidden">
                <img
                  src={rootNodeLines.faviconHref || DEFAULT_FAVICON_HREF}
                  alt=""
                  className="w-9 h-9 object-contain"
                />
              </div>
            </div>
            <p className="text-[11px] text-ink-soft leading-snug">{t('faviconHint')}</p>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-hover">
                <Image className="w-3.5 h-3.5" />
                {t('faviconUpload')}
                <input
                  type="file"
                  accept="image/svg+xml,image/png,image/jpeg,image/webp,image/x-icon,.ico"
                  className="hidden"
                  onChange={uploadFavicon}
                />
              </label>
              <button
                type="button"
                onClick={() => setRootNodeLines((prev) => ({ ...prev, faviconHref: DEFAULT_FAVICON_HREF }))}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-hover"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t('faviconReset')}
              </button>
            </div>
          </section>

          {country && (
            <>
            <section className="rounded-xl border border-border bg-white p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="font-medium">{t('countrySection')}</h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateCountry({ hidden: !country.hidden })}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                      country.hidden
                        ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {country.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {country.hidden ? t('hiddenOnSite') : t('visibleOnSite')}
                  </button>
                  <button type="button" onClick={removeCountry} className="text-red-600 p-1 rounded hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="sm:col-span-2 rounded-lg border border-border bg-hover px-3 py-2 text-xs text-ink-soft flex flex-wrap items-center justify-between gap-2">
                <span>Hidden countries are saved but do not appear on the public map.</span>
                <button
                  type="button"
                  onClick={() => updateCountry({ hidden: !country.hidden })}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white border border-border px-3 py-1 text-xs text-ink hover:bg-hover"
                >
                  {country.hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  {country.hidden ? 'Show on map' : 'Hide from map'}
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="text-xs">
                  <span className="text-ink-soft">{t('idKey')}</span>
                  <input
                    className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm bg-hover"
                    value={country.id}
                    readOnly
                  />
                </label>
                <label className="text-xs">
                  <span className="text-ink-soft">{t('label')}</span>
                  <input
                    className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm"
                    value={country.label}
                    onChange={(e) => updateCountry({ label: e.target.value })}
                  />
                </label>
                <label className="text-xs">
                  <span className="text-ink-soft">{t('flagId')}</span>
                  <input
                    className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm"
                    value={country.flag}
                    onChange={(e) => updateCountry({ flag: e.target.value })}
                  />
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label>
                    <span className="text-ink-soft">{t('anchorX')}</span>
                    <input
                      type="number"
                      className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm"
                      value={country.anchor.x}
                      onChange={(e) => updateCountry({ anchor: { ...country.anchor, x: Number(e.target.value) } })}
                    />
                  </label>
                  <label>
                    <span className="text-ink-soft">{t('anchorY')}</span>
                    <input
                      type="number"
                      className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm"
                      value={country.anchor.y}
                      onChange={(e) => updateCountry({ anchor: { ...country.anchor, y: Number(e.target.value) } })}
                    />
                  </label>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-medium">{t('categoriesSection')}</h2>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => { setShowPresetPicker((v) => !v); setPresetSearch(''); }}
                    className={`text-sm inline-flex items-center gap-1 rounded-full px-3 py-1 border transition-colors ${
                      showPresetPicker
                        ? 'bg-ink text-white border-ink'
                        : 'border-border text-ink-soft hover:text-ink hover:bg-hover'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Quick Add
                  </button>
                  <button
                    type="button"
                    onClick={addCategory}
                    className="text-sm inline-flex items-center gap-1 text-ink-soft hover:text-ink"
                    title="Add with custom name"
                  >
                    Custom
                  </button>
                </div>
              </div>

              {/* Preset Picker Panel */}
              {showPresetPicker && (
                <div className="rounded-xl border border-border bg-hover/50 p-3 space-y-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-soft pointer-events-none" />
                    <input
                      autoFocus
                      placeholder="Search categories..."
                      value={presetSearch}
                      onChange={(e) => setPresetSearch(e.target.value)}
                      className="w-full rounded-lg border border-border bg-white pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:border-ink"
                    />
                  </div>

                  {/* Category chips grouped */}
                  <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
                    {(() => {
                      const q = presetSearch.toLowerCase();
                      const filtered = CATEGORY_PRESETS.filter((p) =>
                        !q || p.label.toLowerCase().includes(q) || p.group.toLowerCase().includes(q)
                      );
                      if (filtered.length === 0) {
                        return (
                          <p className="text-xs text-ink-faint text-center py-4">
                            No match. Use "Custom" to add a new name.
                          </p>
                        );
                      }
                      const groups = q
                        ? ['Results']
                        : PRESET_GROUPS;
                      return groups.map((group) => {
                        const items = q
                          ? filtered
                          : filtered.filter((p) => p.group === group);
                        if (!items.length) return null;
                        return (
                          <div key={group}>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint mb-1.5 px-0.5">
                              {group}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {items.map((preset) => {
                                const Icon = getIconByKey(preset.iconKey);
                                const alreadyAdded = country
                                  ? Object.values(country.categories as Record<string, CategoryJson>).some(
                                      (cat) => cat.label.toLowerCase() === preset.label.toLowerCase()
                                    )
                                  : false;
                                return (
                                  <button
                                    key={preset.label}
                                    type="button"
                                    disabled={alreadyAdded}
                                    onClick={() => addCategoryFromPreset(preset.label, preset.iconKey)}
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                                      alreadyAdded
                                        ? 'border-border text-ink-faint bg-hover cursor-not-allowed opacity-50'
                                        : 'border-border bg-white text-ink hover:border-ink hover:bg-ink hover:text-white'
                                    }`}
                                    title={alreadyAdded ? 'Already added' : `Add "${preset.label}"`}
                                  >
                                    <Icon className="w-3 h-3 shrink-0" strokeWidth={1.5} />
                                    {preset.label}
                                    {alreadyAdded && <span className="ml-0.5 opacity-60">✓</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {catKeys.map((cid, index) => (
                  <div
                    key={cid}
                    className={`inline-flex items-center rounded-full text-sm border overflow-hidden ${
                      selCat === cid
                        ? 'border-ink bg-ink text-white'
                        : country.categories[cid].hidden
                          ? 'border-border bg-hover text-ink-soft'
                          : 'border-border hover:bg-hover'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelCat(cid)}
                      className="px-3 py-1"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {country.categories[cid].hidden && <EyeOff className="w-3 h-3" />}
                        {cid}
                      </span>
                    </button>
                    <span className={`h-4 w-px ${selCat === cid ? 'bg-white/30' : 'bg-border'}`} />
                    <button
                      type="button"
                      onClick={() => moveCategory(cid, -1)}
                      disabled={index === 0}
                      title={t('moveUp')}
                      aria-label={t('moveUp')}
                      className="px-1.5 py-1 hover:bg-black/5 disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveCategory(cid, 1)}
                      disabled={index === catKeys.length - 1}
                      title={t('moveDown')}
                      aria-label={t('moveDown')}
                      className="px-1.5 py-1 hover:bg-black/5 disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {activeCat && selCat && (
              <section className="rounded-xl border border-border bg-white p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="font-medium">{t('categoryHeading', { id: selCat })}</h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateCategory(selCat, { hidden: !activeCat.hidden })}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                        activeCat.hidden
                          ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {activeCat.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {activeCat.hidden ? t('hiddenOnSite') : t('visibleOnSite')}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCategory(selCat)}
                      className="text-red-600 p-1 rounded hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2 rounded-lg border border-border bg-hover px-3 py-2 text-xs text-ink-soft flex flex-wrap items-center justify-between gap-2">
                    <span>{t('categoryVisibility')}</span>
                    <button
                      type="button"
                      onClick={() => updateCategory(selCat, { hidden: !activeCat.hidden })}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white border border-border px-3 py-1 text-xs text-ink hover:bg-hover"
                    >
                      {activeCat.hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      {activeCat.hidden ? t('showCategory') : t('hideCategory')}
                    </button>
                  </div>
                  <label className="text-xs sm:col-span-2">
                    <span className="text-ink-soft">{t('label')}</span>
                    <DraftInput
                      className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm"
                      value={activeCat.label}
                      onCommit={(v) => updateCategory(selCat, { label: v })}
                    />
                  </label>
                  <label className="text-xs sm:col-span-2">
                    <span className="text-ink-soft">Description</span>
                    <span className="ml-1.5 text-[10px] text-ink-faint">(shown on cards & search results)</span>
                    <DraftTextarea
                      className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm resize-none"
                      rows={2}
                      placeholder="Short description of what this trade booth covers…"
                      value={activeCat.description ?? ''}
                      onCommit={(v) => updateCategory(selCat, { description: v || undefined })}
                    />
                  </label>
                  <label className="text-xs sm:col-span-2">
                    <span className="text-ink-soft">{t('iconLucide')}</span>
                    <select
                      className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm"
                      value={activeCat.iconKey}
                      onChange={(e) => updateCategory(selCat, { iconKey: e.target.value })}
                    >
                      {ICON_KEYS.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{t('companies')}</span>
                    <button
                      type="button"
                      onClick={() => addCompany(selCat)}
                      className="text-xs inline-flex items-center gap-1 text-ink-soft hover:text-ink"
                    >
                      <Plus className="w-3.5 h-3.5" /> {t('addCompany')}
                    </button>
                  </div>
                  <div className="overflow-x-auto border border-border rounded-lg">
                    <table className="w-full text-sm min-w-[760px]">
                      <thead className="bg-hover text-start text-xs text-ink-soft">
                        <tr>
                          <th className="p-2">{t('thName')}</th>
                          <th className="p-2">{t('thTag')}</th>
                          <th className="p-2 w-12">{t('thInit')}</th>
                          <th className="p-2">{t('thUrl')}</th>
                          <th className="p-2 w-24 text-center" title={t('openUrlNewTabTitle')}>
                            {t('thOpen')}
                          </th>
                          <th className="p-2 w-20 text-center" title="Also show in other categories">
                            Also In
                          </th>
                          <th className="p-2 w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {activeCat.companies.map((row, i) => {
                          const panelOpen = sharedCatPanel?.catId === selCat && sharedCatPanel.idx === i;
                          const sharedCount = row.sharedCategories?.length ?? 0;
                          const otherCats = catKeys.filter((cid) => cid !== selCat);
                          return (
                            <>
                              <tr key={i} className="border-t border-border">
                                <td className="p-1">
                                  <DraftInput
                                    className="w-full rounded border border-transparent hover:border-border px-1 py-1"
                                    value={row.name}
                                    onCommit={(v) => updateCompany(selCat, i, { name: v })}
                                  />
                                </td>
                                <td className="p-1">
                                  <DraftInput
                                    className="w-full rounded border border-transparent hover:border-border px-1 py-1"
                                    value={row.tag}
                                    onCommit={(v) => updateCompany(selCat, i, { tag: v })}
                                  />
                                </td>
                                <td className="p-1">
                                  <DraftInput
                                    className="w-full rounded border border-transparent hover:border-border px-1 py-1 text-center"
                                    maxLength={3}
                                    value={row.initial}
                                    onCommit={(v) => updateCompany(selCat, i, { initial: v })}
                                  />
                                </td>
                                <td className="p-1">
                                  <DraftInput
                                    className="w-full rounded border border-transparent hover:border-border px-1 py-1"
                                    value={row.url}
                                    onCommit={(v) => updateCompany(selCat, i, { url: v })}
                                    placeholder="https://..."
                                  />
                                </td>
                                <td className="p-1 text-center">
                                  <button
                                    type="button"
                                    disabled={!row.url.trim()}
                                    title={t('openUrlNewTabTitle')}
                                    aria-label={t('openUrlAria')}
                                    onClick={() => openCompanyUrlInNewTab(row.url, t('invalidUrl'))}
                                    className="inline-flex items-center justify-center rounded-lg border border-border p-2 text-ink hover:bg-hover disabled:opacity-40 disabled:pointer-events-none"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </button>
                                </td>
                                <td className="p-1 text-center">
                                  <button
                                    type="button"
                                    title="Show in multiple categories"
                                    onClick={() =>
                                      setSharedCatPanel(panelOpen ? null : { catId: selCat, idx: i })
                                    }
                                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium transition-colors ${
                                      panelOpen
                                        ? 'border-ink bg-ink text-white'
                                        : sharedCount > 0
                                          ? 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
                                          : 'border-border text-ink-soft hover:bg-hover'
                                    }`}
                                  >
                                    <Share2 className="w-3 h-3" />
                                    {sharedCount > 0 && <span>{sharedCount}</span>}
                                  </button>
                                </td>
                                <td className="p-1">
                                  <button
                                    type="button"
                                    className="p-1 rounded text-red-600 hover:bg-red-50"
                                    onClick={() => removeCompany(selCat, i)}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                              <tr key={`desc-${i}`} className="bg-hover/40">
                                <td colSpan={7} className="px-2 pb-1.5 pt-0.5">
                                  <DraftInput
                                    className="w-full rounded border border-transparent hover:border-border focus:border-border px-2 py-1 text-xs text-ink-soft placeholder:text-ink-faint bg-transparent focus:bg-white transition-colors outline-none"
                                    placeholder="Description (optional)…"
                                    value={row.description ?? ''}
                                    onCommit={(v) => updateCompany(selCat, i, { description: v || undefined })}
                                  />
                                </td>
                              </tr>
                              {panelOpen && (
                                <tr key={`shared-${i}`} className="border-t border-blue-100 bg-blue-50/60">
                                  <td colSpan={7} className="px-4 py-3">
                                    <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide mb-2">
                                      Also show "{row.name || 'this brand'}" in:
                                    </p>
                                    {otherCats.length === 0 ? (
                                      <p className="text-xs text-ink-faint italic">
                                        No other categories in this country yet. Add more categories first.
                                      </p>
                                    ) : (
                                      <div className="flex flex-wrap gap-3">
                                        {otherCats.map((cid) => {
                                          const checked = (row.sharedCategories ?? []).includes(cid);
                                          const catLabel = country?.categories[cid]?.label ?? cid;
                                          const isHidden = country?.categories[cid]?.hidden;
                                          return (
                                            <label
                                              key={cid}
                                              className="flex items-center gap-2 cursor-pointer group select-none"
                                            >
                                              <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={(e) => {
                                                  const cur = row.sharedCategories ?? [];
                                                  const next = e.target.checked
                                                    ? [...cur.filter((id) => id !== cid), cid]
                                                    : cur.filter((id) => id !== cid);
                                                  updateCompany(selCat, i, { sharedCategories: next.length ? next : undefined });
                                                }}
                                                className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                                              />
                                              <span className={`text-sm ${checked ? 'text-ink font-medium' : 'text-ink-soft'} ${isHidden ? 'line-through opacity-50' : ''}`}>
                                                {catLabel}
                                                {isHidden && <span className="ml-1 text-[10px] text-ink-faint">(hidden)</span>}
                                              </span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}
            </>
          )}
        </div>
      </div>
      )}

      {/* Contact Messages Tab */}
      {activeTab === 'messages' && (
        <div className="max-w-5xl mx-auto p-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-serif text-lg">Contact Form Messages</h2>
              <p className="text-ink-soft text-sm mt-0.5">{contactMessages.length} message{contactMessages.length !== 1 ? 's' : ''} received</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void loadContactMessages()}
                disabled={messagesLoading}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-hover disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${messagesLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={exportMessagesCSV}
                disabled={contactMessages.length === 0}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 text-white px-4 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="w-3.5 h-3.5" />
                Export Excel (CSV)
              </button>
            </div>
          </div>

          {messagesError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {messagesError}
            </div>
          )}

          {messagesLoading ? (
            <div className="flex items-center justify-center py-16 text-ink-soft gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Loading messages...
            </div>
          ) : contactMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <Inbox className="w-10 h-10 text-ink-faint" strokeWidth={1} />
              <p className="text-ink-soft text-sm">No messages yet.</p>
              <p className="text-ink-faint text-xs">When visitors submit the contact form, messages will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-hover text-xs text-ink-soft uppercase tracking-wide">
                    <th className="px-4 py-3 text-left font-medium">#</th>
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">
                      <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />Email</span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      <span className="inline-flex items-center gap-1"><MessageCircle className="w-3 h-3 text-[#25D366]" />WhatsApp</span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Subject</th>
                    <th className="px-4 py-3 text-left font-medium">Message</th>
                    <th className="px-4 py-3 text-left font-medium">
                      <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />Date</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {contactMessages.map((msg, i) => (
                    <tr key={msg.id} className="hover:bg-hover/50 transition-colors">
                      <td className="px-4 py-3 text-ink-faint text-xs">{i + 1}</td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{msg.name}</td>
                      <td className="px-4 py-3">
                        <a href={`mailto:${msg.email}`} className="text-blue-600 hover:underline text-xs">{msg.email}</a>
                      </td>
                      <td className="px-4 py-3">
                        {msg.whatsapp ? (
                          <a
                            href={`https://wa.me/${msg.whatsapp.replace(/[^\d+]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#25D366] hover:underline text-xs font-medium"
                          >
                            <MessageCircle className="w-3 h-3" />
                            {msg.whatsapp}
                          </a>
                        ) : (
                          <span className="text-ink-faint text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-soft text-xs max-w-[140px] truncate">{msg.subject || '—'}</td>
                      <td className="px-4 py-3 text-xs text-ink max-w-[260px]">
                        <p className="line-clamp-2 leading-relaxed">{msg.message}</p>
                      </td>
                      <td className="px-4 py-3 text-ink-faint text-xs whitespace-nowrap">
                        {msg.submittedAt ? new Date(msg.submittedAt).toLocaleString('en-GB', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
