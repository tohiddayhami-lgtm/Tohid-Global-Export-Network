import { useCallback, useEffect, useMemo, useState, type ChangeEventHandler, type FormEvent, type SetStateAction } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Image,
  Layers3,
  LogOut,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Trash2,
  Undo2,
  Upload,
} from 'lucide-react';
import type { CategoryJson, CompanyJson, CountryJson, ExportNetworkJson } from './networkTypes.ts';
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
const HISTORY_LIMIT = 50;

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
  return { label, iconKey: 'CircleDot', companies: [emptyCompany()], hidden: false, subcategories: {} };
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
  const [history, setHistory] = useState<{ past: ExportNetworkJson[]; future: ExportNetworkJson[] }>({
    past: [],
    future: [],
  });

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
  const [selSubCat, setSelSubCat] = useState<string>('');

  const country = selCountry && networkJson[selCountry] ? networkJson[selCountry] : undefined;
  const catKeys = useMemo(() => (country ? Object.keys(country.categories) : []), [country]);
  const activeCat = selCat && country ? country.categories[selCat] : undefined;
  const subCatKeys = useMemo(() => (activeCat?.subcategories ? Object.keys(activeCat.subcategories) : []), [activeCat]);
  const activeEditCat = selSubCat && activeCat?.subcategories?.[selSubCat] ? activeCat.subcategories[selSubCat] : activeCat;

  const applyNetworkChange = useCallback(
    (change: SetStateAction<ExportNetworkJson>) => {
      setNetworkJson((prev) => {
        const next = typeof change === 'function' ? (change as (current: ExportNetworkJson) => ExportNetworkJson)(prev) : change;
        if (next === prev || JSON.stringify(next) === JSON.stringify(prev)) return prev;
        setHistory((h) => ({
          past: [...h.past.slice(-(HISTORY_LIMIT - 1)), structuredClone(prev)],
          future: [],
        }));
        return next;
      });
    },
    [setNetworkJson]
  );

  const undoNetwork = useCallback(() => {
    const previous = history.past.at(-1);
    if (!previous) return;
    setHistory((h) => ({
      past: h.past.slice(0, -1),
      future: [structuredClone(networkJson), ...h.future].slice(0, HISTORY_LIMIT),
    }));
    setNetworkJson(structuredClone(previous));
    flushNetworkToCloudSoon();
  }, [flushNetworkToCloudSoon, history, networkJson, setNetworkJson]);

  const redoNetwork = useCallback(() => {
    const next = history.future[0];
    if (!next) return;
    setHistory((h) => ({
      past: [...h.past.slice(-(HISTORY_LIMIT - 1)), structuredClone(networkJson)],
      future: h.future.slice(1),
    }));
    setNetworkJson(structuredClone(next));
    flushNetworkToCloudSoon();
  }, [flushNetworkToCloudSoon, history, networkJson, setNetworkJson]);

  /** After refresh or when Firestore replaces data, keep selection aligned with real keys. */
  useEffect(() => {
    const ids = Object.keys(networkJson);
    if (ids.length === 0) {
      setSelCountry('');
      setSelCat('');
      setSelSubCat('');
      return;
    }
    if (!selCountry || !networkJson[selCountry]) {
      setSelCountry(ids[0]!);
      setSelCat('');
      setSelSubCat('');
      return;
    }
    if (selCat && !networkJson[selCountry].categories[selCat]) {
      setSelCat('');
      setSelSubCat('');
      return;
    }
    if (selCat && selSubCat && !networkJson[selCountry].categories[selCat]?.subcategories?.[selSubCat]) {
      setSelSubCat('');
    }
  }, [networkJson, selCountry, selCat, selSubCat]);

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    const result = await login(user, pass);
    if (!result.ok) setErr(result.message);
  };

  const updateCountry = useCallback(
    (patch: Partial<CountryJson>) => {
      if (!selCountry) return;
      applyNetworkChange((prev) => {
        const cur = prev[selCountry];
        if (!cur) return prev;
        return {
          ...prev,
          [selCountry]: { ...cur, ...patch },
        };
      });
    },
    [applyNetworkChange, selCountry]
  );

  const updateCategory = useCallback(
    (catId: string, patch: Partial<CategoryJson>) => {
      if (!selCountry) return;
      applyNetworkChange((prev) => {
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
    [applyNetworkChange, selCountry]
  );

  const moveCountry = useCallback(
    (countryId: string, direction: -1 | 1) => {
      applyNetworkChange((prev) => {
        if (!prev[countryId]) return prev;
        return moveKeyInRecord(prev, countryId, direction);
      });
      setSelCountry(countryId);
    },
    [applyNetworkChange]
  );

  const moveCategory = useCallback(
    (catId: string, direction: -1 | 1) => {
      if (!selCountry) return;
      applyNetworkChange((prev) => {
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
    [applyNetworkChange, selCountry]
  );

  const addCountry = () => {
    const id = window.prompt(t('promptCountryId'), 'new-country');
    if (!id) return;
    const slug = uniqueSlug(id, Object.keys(networkJson), 'country');
    applyNetworkChange((p) => ({ ...p, [slug]: emptyCountry(slug, t('defaultCategoryLabel')) }));
    setSelCountry(slug);
    setSelCat('');
    setSelSubCat('');
  };

  const removeCountry = () => {
    if (!selCountry) return;
    if (!window.confirm(t('confirmDeleteCountry', { id: selCountry }))) return;
    applyNetworkChange((p) => {
      if (!p[selCountry]) return p;
      const { [selCountry]: _, ...rest } = p;
      return rest;
    });
    const next = countryIds.filter((x) => x !== selCountry);
    setSelCountry(next[0] ?? '');
    setSelCat('');
    setSelSubCat('');
    flushNetworkToCloudSoon();
  };

  const addCategory = () => {
    if (!selCountry || !country) return;
    const id = window.prompt(t('promptCategoryId'), 'new-category');
    if (!id) return;
    const slug = uniqueSlug(id, Object.keys(country.categories), 'cat');
    applyNetworkChange((p) => {
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
    setSelSubCat('');
  };

  const removeCategory = (catId: string) => {
    if (!selCountry) return;
    if (!window.confirm(t('confirmDeleteCategory', { id: catId }))) return;
    applyNetworkChange((p) => {
      const c = p[selCountry];
      if (!c?.categories[catId]) return p;
      const { [catId]: _, ...cats } = c.categories;
      return { ...p, [selCountry]: { ...c, categories: cats } };
    });
    setSelCat('');
    setSelSubCat('');
    flushNetworkToCloudSoon();
  };

  const addSubCategory = () => {
    if (!selCountry || !selCat || !activeCat) return;
    const id = window.prompt(t('promptSubcategoryId'), 'new-subcategory');
    if (!id) return;
    const slug = uniqueSlug(id, Object.keys(activeCat.subcategories ?? {}), 'subcat');
    applyNetworkChange((p) => {
      const c = p[selCountry];
      const cat = c?.categories[selCat];
      if (!c || !cat) return p;
      return {
        ...p,
        [selCountry]: {
          ...c,
          categories: {
            ...c.categories,
            [selCat]: {
              ...cat,
              subcategories: { ...(cat.subcategories ?? {}), [slug]: emptyCategory(t('defaultCategoryLabel')) },
            },
          },
        },
      };
    });
    setSelSubCat(slug);
  };

  const updateSubCategory = useCallback(
    (subCatId: string, patch: Partial<CategoryJson>) => {
      if (!selCountry || !selCat) return;
      applyNetworkChange((prev) => {
        const c = prev[selCountry];
        const cat = c?.categories[selCat];
        const subcat = cat?.subcategories?.[subCatId];
        if (!c || !cat || !subcat) return prev;
        return {
          ...prev,
          [selCountry]: {
            ...c,
            categories: {
              ...c.categories,
              [selCat]: {
                ...cat,
                subcategories: { ...(cat.subcategories ?? {}), [subCatId]: { ...subcat, ...patch } },
              },
            },
          },
        };
      });
    },
    [applyNetworkChange, selCat, selCountry]
  );

  const moveSubCategory = useCallback(
    (subCatId: string, direction: -1 | 1) => {
      if (!selCountry || !selCat) return;
      applyNetworkChange((prev) => {
        const c = prev[selCountry];
        const cat = c?.categories[selCat];
        if (!c || !cat?.subcategories?.[subCatId]) return prev;
        return {
          ...prev,
          [selCountry]: {
            ...c,
            categories: {
              ...c.categories,
              [selCat]: {
                ...cat,
                subcategories: moveKeyInRecord(cat.subcategories, subCatId, direction),
              },
            },
          },
        };
      });
      setSelSubCat(subCatId);
    },
    [applyNetworkChange, selCat, selCountry]
  );

  const removeSubCategory = (subCatId: string) => {
    if (!selCountry || !selCat) return;
    if (!window.confirm(t('confirmDeleteSubcategory', { id: subCatId }))) return;
    applyNetworkChange((p) => {
      const c = p[selCountry];
      const cat = c?.categories[selCat];
      if (!c || !cat?.subcategories?.[subCatId]) return p;
      const { [subCatId]: _, ...subcategories } = cat.subcategories;
      return {
        ...p,
        [selCountry]: {
          ...c,
          categories: {
            ...c.categories,
            [selCat]: { ...cat, subcategories },
          },
        },
      };
    });
    setSelSubCat('');
    flushNetworkToCloudSoon();
  };

  const addCompany = () => {
    if (!selCountry || !selCat) return;
    applyNetworkChange((p) => {
      const c = p[selCountry];
      const cat = c?.categories[selCat];
      if (!c || !cat) return p;
      if (selSubCat) {
        const subcat = cat.subcategories?.[selSubCat];
        if (!subcat) return p;
        return {
          ...p,
          [selCountry]: {
            ...c,
            categories: {
              ...c.categories,
              [selCat]: {
                ...cat,
                subcategories: {
                  ...(cat.subcategories ?? {}),
                  [selSubCat]: { ...subcat, companies: [...subcat.companies, emptyCompany()] },
                },
              },
            },
          },
        };
      }
      return {
        ...p,
        [selCountry]: {
          ...c,
          categories: {
            ...c.categories,
            [selCat]: { ...cat, companies: [...cat.companies, emptyCompany()] },
          },
        },
      };
    });
  };

  const updateCompany = (index: number, patch: Partial<CompanyJson>) => {
    if (!selCountry || !selCat) return;
    applyNetworkChange((p) => {
      const c = p[selCountry];
      const cat = c?.categories[selCat];
      if (!c || !cat) return p;
      if (selSubCat) {
        const subcat = cat.subcategories?.[selSubCat];
        if (!subcat) return p;
        const companies = subcat.companies.map((row, i) => (i === index ? { ...row, ...patch } : row));
        return {
          ...p,
          [selCountry]: {
            ...c,
            categories: {
              ...c.categories,
              [selCat]: {
                ...cat,
                subcategories: {
                  ...(cat.subcategories ?? {}),
                  [selSubCat]: { ...subcat, companies },
                },
              },
            },
          },
        };
      }
      const companies = cat.companies.map((row, i) => (i === index ? { ...row, ...patch } : row));
      return {
        ...p,
        [selCountry]: {
          ...c,
          categories: {
            ...c.categories,
            [selCat]: { ...cat, companies },
          },
        },
      };
    });
  };

  const removeCompany = (index: number) => {
    if (!selCountry || !selCat) return;
    applyNetworkChange((p) => {
      const c = p[selCountry];
      const cat = c?.categories[selCat];
      if (!c || !cat) return p;
      if (selSubCat) {
        const subcat = cat.subcategories?.[selSubCat];
        if (!subcat) return p;
        const companies = subcat.companies.filter((_, i) => i !== index);
        return {
          ...p,
          [selCountry]: {
            ...c,
            categories: {
              ...c.categories,
              [selCat]: {
                ...cat,
                subcategories: {
                  ...(cat.subcategories ?? {}),
                  [selSubCat]: { ...subcat, companies: companies.length ? companies : [emptyCompany()] },
                },
              },
            },
          },
        };
      }
      const companies = cat.companies.filter((_, i) => i !== index);
      return {
        ...p,
        [selCountry]: {
          ...c,
          categories: {
            ...c.categories,
            [selCat]: { ...cat, companies: companies.length ? companies : [emptyCompany()] },
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
        applyNetworkChange(data);
        const ids = Object.keys(data);
        setSelCountry(ids[0] ?? '');
        setSelCat('');
        setSelSubCat('');
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
    applyNetworkChange(d);
    setRootNodeLines({ ...DEFAULT_ROOT_NODE_LINES });
    setDraftLine1(DEFAULT_ROOT_NODE_LINES.line1);
    setDraftLine2(DEFAULT_ROOT_NODE_LINES.line2);
    setSelCountry(Object.keys(d)[0] ?? '');
    setSelCat('');
    setSelSubCat('');
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

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-10 border-b border-border bg-white/90 backdrop-blur px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="font-serif text-lg truncate">{t('adminHeader')}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={undoNetwork}
            disabled={history.past.length === 0}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-hover disabled:opacity-40 disabled:pointer-events-none"
          >
            <Undo2 className="w-3.5 h-3.5" />
            {t('undo')}
          </button>
          <button
            type="button"
            onClick={redoNetwork}
            disabled={history.future.length === 0}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-hover disabled:opacity-40 disabled:pointer-events-none"
          >
            <Redo2 className="w-3.5 h-3.5" />
            {t('redo')}
          </button>
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
            {countryIds.map((id, index) => (
              <li key={id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelCountry(id);
                    setSelCat('');
                    setSelSubCat('');
                  }}
                  className={`min-w-0 flex-1 text-start rounded-lg px-3 py-2 text-sm ${
                    selCountry === id ? 'bg-ink text-white' : 'hover:bg-hover'
                  }`}
                >
                  <span className="block truncate">{networkJson[id].label}</span>
                </button>
                <div className="flex shrink-0">
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
                      onClick={() => {
                        setSelCat(cid);
                        setSelSubCat('');
                      }}
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

            {activeCat && activeEditCat && selCat && (
              <section className="rounded-xl border border-border bg-white p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="font-medium">
                    {selSubCat ? t('subcategoryHeading', { id: selSubCat }) : t('categoryHeading', { id: selCat })}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (selSubCat) updateSubCategory(selSubCat, { hidden: !activeEditCat.hidden });
                        else updateCategory(selCat, { hidden: !activeEditCat.hidden });
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                        activeEditCat.hidden
                          ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {activeEditCat.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {activeEditCat.hidden ? t('hiddenOnSite') : t('visibleOnSite')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (selSubCat) removeSubCategory(selSubCat);
                        else removeCategory(selCat);
                      }}
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
                      onClick={() => {
                        if (selSubCat) updateSubCategory(selSubCat, { hidden: !activeEditCat.hidden });
                        else updateCategory(selCat, { hidden: !activeEditCat.hidden });
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white border border-border px-3 py-1 text-xs text-ink hover:bg-hover"
                    >
                      {activeEditCat.hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      {activeEditCat.hidden ? t('showCategory') : t('hideCategory')}
                    </button>
                  </div>
                  <label className="text-xs sm:col-span-2">
                    <span className="text-ink-soft">{t('label')}</span>
                    <input
                      className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm"
                      value={activeEditCat.label}
                      onChange={(e) => {
                        if (selSubCat) updateSubCategory(selSubCat, { label: e.target.value });
                        else updateCategory(selCat, { label: e.target.value });
                      }}
                    />
                  </label>
                  <label className="text-xs sm:col-span-2">
                    <span className="text-ink-soft">{t('iconLucide')}</span>
                    <select
                      className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm"
                      value={activeEditCat.iconKey}
                      onChange={(e) => {
                        if (selSubCat) updateSubCategory(selSubCat, { iconKey: e.target.value });
                        else updateCategory(selCat, { iconKey: e.target.value });
                      }}
                    >
                      {ICON_KEYS.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="rounded-lg border border-border bg-hover/60 p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                      <Layers3 className="w-4 h-4 text-ink-soft" />
                      {t('subcategoriesSection')}
                    </span>
                    <button
                      type="button"
                      onClick={addSubCategory}
                      className="text-xs inline-flex items-center gap-1 text-ink-soft hover:text-ink"
                    >
                      <Plus className="w-3.5 h-3.5" /> {t('addSubcategory')}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelSubCat('')}
                      className={`rounded-full px-3 py-1 text-sm border ${
                        !selSubCat ? 'border-ink bg-ink text-white' : 'border-border bg-white hover:bg-hover'
                      }`}
                    >
                      {t('parentCategory')}
                    </button>
                    {subCatKeys.map((sid, index) => {
                      const subcat = activeCat.subcategories?.[sid];
                      if (!subcat) return null;
                      return (
                        <div
                          key={sid}
                          className={`inline-flex items-center rounded-full text-sm border overflow-hidden ${
                            selSubCat === sid
                              ? 'border-ink bg-ink text-white'
                              : subcat.hidden
                                ? 'border-border bg-white text-ink-soft'
                                : 'border-border bg-white hover:bg-hover'
                          }`}
                        >
                          <button type="button" onClick={() => setSelSubCat(sid)} className="px-3 py-1">
                            <span className="inline-flex items-center gap-1.5">
                              {subcat.hidden && <EyeOff className="w-3 h-3" />}
                              {sid}
                            </span>
                          </button>
                          <span className={`h-4 w-px ${selSubCat === sid ? 'bg-white/30' : 'bg-border'}`} />
                          <button
                            type="button"
                            onClick={() => moveSubCategory(sid, -1)}
                            disabled={index === 0}
                            title={t('moveUp')}
                            aria-label={t('moveUp')}
                            className="px-1.5 py-1 hover:bg-black/5 disabled:opacity-30 disabled:pointer-events-none"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSubCategory(sid, 1)}
                            disabled={index === subCatKeys.length - 1}
                            title={t('moveDown')}
                            aria-label={t('moveDown')}
                            className="px-1.5 py-1 hover:bg-black/5 disabled:opacity-30 disabled:pointer-events-none"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-ink-soft leading-snug">{t('subcategoriesHint')}</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {t('companies')} {selSubCat ? `· ${selSubCat}` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={addCompany}
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
                        {activeEditCat.companies.map((row, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="p-1">
                              <input
                                className="w-full rounded border border-transparent hover:border-border px-1 py-1"
                                value={row.name}
                                onChange={(e) => updateCompany(i, { name: e.target.value })}
                              />
                            </td>
                            <td className="p-1">
                              <input
                                className="w-full rounded border border-transparent hover:border-border px-1 py-1"
                                value={row.tag}
                                onChange={(e) => updateCompany(i, { tag: e.target.value })}
                              />
                            </td>
                            <td className="p-1">
                              <input
                                className="w-full rounded border border-transparent hover:border-border px-1 py-1 text-center"
                                maxLength={3}
                                value={row.initial}
                                onChange={(e) => updateCompany(i, { initial: e.target.value })}
                              />
                            </td>
                            <td className="p-1">
                              <input
                                className="w-full rounded border border-transparent hover:border-border px-1 py-1"
                                value={row.url}
                                onChange={(e) => updateCompany(i, { url: e.target.value })}
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
                                onClick={() => removeCompany(i)}
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
