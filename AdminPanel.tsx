import { useCallback, useEffect, useMemo, useState, type ChangeEventHandler, type FormEvent } from 'react';
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
} from 'lucide-react';
import type { CategoryJson, CompanyJson, CountryJson } from './networkTypes.ts';
import { ICON_KEYS } from './iconRegistry.ts';
import {
  defaultNetworkClone,
  DEFAULT_FAVICON_HREF,
  DEFAULT_ROOT_NODE_LINES,
  useExportData,
  validateNetwork,
} from './networkContext.tsx';
import { useLocale } from './i18n/LocaleContext.tsx';
import { usePageContent, DEFAULT_PAGE_CONTENT, type PageContent } from './pageContentContext.tsx';

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

type AdminTab = 'network' | 'pages';

export default function AdminPanel() {
  const { t } = useLocale();
  const { adminOk, login, logout, networkJson, setNetworkJson, syncMode, rootNodeLines, setRootNodeLines, flushNetworkToCloudSoon } =
    useExportData();
  const { pageContent, updatePageContent } = usePageContent();
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('network');

  // Page content draft state
  const [pageDraft, setPageDraft] = useState<PageContent>(() => ({ ...pageContent }));
  useEffect(() => { setPageDraft({ ...pageContent }); }, [pageContent]);
  const savePageContent = () => updatePageContent(pageDraft);

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
            {([1, 2, 3, 4] as const).map((n) => (
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
                <button type="button" onClick={addCategory} className="text-sm inline-flex items-center gap-1 text-ink-soft hover:text-ink">
                  <Plus className="w-4 h-4" /> {t('add')}
                </button>
              </div>
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
                    <input
                      className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm"
                      value={activeCat.label}
                      onChange={(e) => updateCategory(selCat, { label: e.target.value })}
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
                    <table className="w-full text-sm min-w-[720px]">
                      <thead className="bg-hover text-start text-xs text-ink-soft">
                        <tr>
                          <th className="p-2">{t('thName')}</th>
                          <th className="p-2">{t('thTag')}</th>
                          <th className="p-2 w-12">{t('thInit')}</th>
                          <th className="p-2">{t('thUrl')}</th>
                          <th className="p-2 w-24 text-center" title={t('openUrlNewTabTitle')}>
                            {t('thOpen')}
                          </th>
                          <th className="p-2 w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {activeCat.companies.map((row, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="p-1">
                              <input
                                className="w-full rounded border border-transparent hover:border-border px-1 py-1"
                                value={row.name}
                                onChange={(e) => updateCompany(selCat, i, { name: e.target.value })}
                              />
                            </td>
                            <td className="p-1">
                              <input
                                className="w-full rounded border border-transparent hover:border-border px-1 py-1"
                                value={row.tag}
                                onChange={(e) => updateCompany(selCat, i, { tag: e.target.value })}
                              />
                            </td>
                            <td className="p-1">
                              <input
                                className="w-full rounded border border-transparent hover:border-border px-1 py-1 text-center"
                                maxLength={3}
                                value={row.initial}
                                onChange={(e) => updateCompany(selCat, i, { initial: e.target.value })}
                              />
                            </td>
                            <td className="p-1">
                              <input
                                className="w-full rounded border border-transparent hover:border-border px-1 py-1"
                                value={row.url}
                                onChange={(e) => updateCompany(selCat, i, { url: e.target.value })}
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
                        ))}
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
    </div>
  );
}
