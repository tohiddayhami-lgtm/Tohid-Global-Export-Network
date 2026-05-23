import { useCallback, useEffect, useMemo, useState, type ChangeEventHandler, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Download, ExternalLink, Eye, EyeOff, Image, LogOut, Plus, RotateCcw, Save, Trash2, Upload } from 'lucide-react';
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

export default function AdminPanel() {
  const { t } = useLocale();
  const { adminOk, login, logout, networkJson, setNetworkJson, syncMode, rootNodeLines, setRootNodeLines, flushNetworkToCloudSoon } =
    useExportData();
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');

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
          <h1 className="font-serif text-lg truncate">{t('adminHeader')}</h1>
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

      <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        <aside className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{t('countries')}</span>
            <button type="button" onClick={addCountry} className="p-1 rounded-lg hover:bg-hover" title={t('addCountryTitle')}>
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <ul className="space-y-1">
            {countryIds.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelCountry(id);
                    setSelCat('');
                  }}
                  className={`w-full text-start rounded-lg px-3 py-2 text-sm ${
                    selCountry === id ? 'bg-ink text-white' : 'hover:bg-hover'
                  }`}
                >
                  {networkJson[id].label}
                </button>
              </li>
            ))}
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
                <button type="button" onClick={removeCountry} className="text-red-600 p-1 rounded hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
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
                {catKeys.map((cid) => (
                  <button
                    key={cid}
                    type="button"
                    onClick={() => setSelCat(cid)}
                    className={`rounded-full px-3 py-1 text-sm border ${
                      selCat === cid
                        ? 'border-ink bg-ink text-white'
                        : country.categories[cid].hidden
                          ? 'border-border bg-hover text-ink-soft'
                          : 'border-border hover:bg-hover'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {country.categories[cid].hidden && <EyeOff className="w-3 h-3" />}
                      {cid}
                    </span>
                  </button>
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
    </div>
  );
}
