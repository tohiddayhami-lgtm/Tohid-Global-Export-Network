import { useCallback, useMemo, useState, type ChangeEventHandler, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Plus, Save, Trash2, Upload, Download, RotateCcw, ExternalLink } from 'lucide-react';
import type { CategoryJson, CompanyJson, CountryJson } from './networkTypes.ts';
import { ICON_KEYS } from './iconRegistry.ts';
import { defaultNetworkClone, useExportData, validateNetwork } from './networkContext.tsx';

function openCompanyUrlInNewTab(raw: string) {
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
    window.alert('آدرس معتبر نیست.');
  }
}

function slugify(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 48);
}

function emptyCompany(): CompanyJson {
  return { name: '', tag: '', initial: '?', url: 'https://' };
}

function emptyCategory(): CategoryJson {
  return { label: 'New category', iconKey: 'CircleDot', companies: [emptyCompany()] };
}

function emptyCountry(id: string): CountryJson {
  return {
    id,
    label: id,
    flag: 'iran',
    anchor: { x: 0, y: -160 },
    categories: { new_cat: emptyCategory() },
  };
}

export default function AdminPanel() {
  const { adminOk, login, logout, networkJson, setNetworkJson, syncMode, remoteReady } = useExportData();
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const countryIds = useMemo(() => Object.keys(networkJson), [networkJson]);
  const [selCountry, setSelCountry] = useState<string>(() => countryIds[0] ?? '');
  const [selCat, setSelCat] = useState<string>('');

  const country = selCountry ? networkJson[selCountry] : undefined;
  const catKeys = useMemo(() => (country ? Object.keys(country.categories) : []), [country]);

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    const result = await login(user, pass);
    if (!result.ok) setErr(result.message);
  };

  const updateCountry = useCallback(
    (patch: Partial<CountryJson>) => {
      if (!selCountry) return;
      setNetworkJson((prev) => ({
        ...prev,
        [selCountry]: { ...prev[selCountry], ...patch },
      }));
    },
    [selCountry, setNetworkJson]
  );

  const updateCategory = useCallback(
    (catId: string, patch: Partial<CategoryJson>) => {
      if (!selCountry) return;
      setNetworkJson((prev) => {
        const c = prev[selCountry];
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
    const id = window.prompt('Country id (slug, e.g. brazil):', 'new-country');
    if (!id) return;
    const slug = slugify(id);
    if (!slug || networkJson[slug]) {
      window.alert('Invalid or duplicate id.');
      return;
    }
    setNetworkJson((p) => ({ ...p, [slug]: emptyCountry(slug) }));
    setSelCountry(slug);
    setSelCat('');
  };

  const removeCountry = () => {
    if (!selCountry) return;
    if (!window.confirm(`Delete country "${selCountry}"?`)) return;
    setNetworkJson((p) => {
      const { [selCountry]: _, ...rest } = p;
      return rest;
    });
    const next = countryIds.filter((x) => x !== selCountry);
    setSelCountry(next[0] ?? '');
    setSelCat('');
  };

  const addCategory = () => {
    if (!selCountry) return;
    const id = window.prompt('Category id (slug):', 'new-category');
    if (!id) return;
    const slug = slugify(id);
    if (!slug || country!.categories[slug]) {
      window.alert('Invalid or duplicate category id.');
      return;
    }
    setNetworkJson((p) => ({
      ...p,
      [selCountry]: {
        ...p[selCountry],
        categories: { ...p[selCountry].categories, [slug]: emptyCategory() },
      },
    }));
    setSelCat(slug);
  };

  const removeCategory = (catId: string) => {
    if (!selCountry) return;
    if (!window.confirm(`Delete category "${catId}"?`)) return;
    setNetworkJson((p) => {
      const { [catId]: _, ...cats } = p[selCountry].categories;
      return { ...p, [selCountry]: { ...p[selCountry], categories: cats } };
    });
    setSelCat('');
  };

  const addCompany = (catId: string) => {
    if (!selCountry) return;
    setNetworkJson((p) => {
      const cat = p[selCountry].categories[catId];
      return {
        ...p,
        [selCountry]: {
          ...p[selCountry],
          categories: {
            ...p[selCountry].categories,
            [catId]: { ...cat, companies: [...cat.companies, emptyCompany()] },
          },
        },
      };
    });
  };

  const updateCompany = (catId: string, index: number, patch: Partial<CompanyJson>) => {
    if (!selCountry) return;
    setNetworkJson((p) => {
      const cat = p[selCountry].categories[catId];
      const companies = cat.companies.map((row, i) => (i === index ? { ...row, ...patch } : row));
      return {
        ...p,
        [selCountry]: {
          ...p[selCountry],
          categories: {
            ...p[selCountry].categories,
            [catId]: { ...cat, companies },
          },
        },
      };
    });
  };

  const removeCompany = (catId: string, index: number) => {
    if (!selCountry) return;
    setNetworkJson((p) => {
      const cat = p[selCountry].categories[catId];
      const companies = cat.companies.filter((_, i) => i !== index);
      return {
        ...p,
        [selCountry]: {
          ...p[selCountry],
          categories: {
            ...p[selCountry].categories,
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
        window.alert('Imported.');
      } catch {
        window.alert('Invalid JSON file.');
      }
    };
    reader.readAsText(f);
    e.target.value = '';
  };

  const resetDefault = () => {
    if (!window.confirm('Reset all data to built-in default?')) return;
    const d = defaultNetworkClone();
    setNetworkJson(d);
    setSelCountry(Object.keys(d)[0] ?? '');
    setSelCat('');
  };

  if (!adminOk) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-8 shadow-sm">
          <h1 className="font-serif text-2xl text-ink mb-1">Admin</h1>
          <p className="text-sm text-ink-soft mb-6">
            {syncMode === 'firebase'
              ? 'با همان ایمیل و رمزی که در Firebase → Authentication → Users ساخته‌اید وارد شوید؛ تغییرات برای همه اعمال می‌شود.'
              : 'Sign in to edit the export network map.'}
          </p>
          {syncMode === 'local' && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-950 leading-relaxed">
              <strong className="font-medium">حالت محلی فعال است.</strong> این build کلیدهای Firebase ندارد؛ فقط نام کاربری/رمز
              محلی (یا پیش‌فرض کد) اینجا کار می‌کند، نه حساب Firebase. برای ابری شدن:{' '}
              <code className="rounded bg-amber-100/80 px-1">VITE_FIREBASE_*</code> را در .env پر کنید، دوباره{' '}
              <code className="rounded bg-amber-100/80 px-1">npm run build</code> و deploy کنید.
            </div>
          )}
          <form onSubmit={onLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1">
                {syncMode === 'firebase' ? 'ایمیل (Firebase)' : 'Username'}
              </label>
              <input
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                autoComplete="username"
                type={syncMode === 'firebase' ? 'email' : 'text'}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1">Password</label>
              <input
                type="password"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button
              type="submit"
              className="w-full rounded-full bg-ink text-white py-2.5 text-sm font-medium hover:opacity-90"
            >
              Sign in
            </button>
          </form>
          <Link to="/" className="mt-6 block text-center text-sm text-ink-soft hover:text-ink">
            ← Back to map
          </Link>
        </div>
      </div>
    );
  }

  const activeCat = selCat && country ? country.categories[selCat] : undefined;

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-10 border-b border-border bg-white/90 backdrop-blur px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-lg">Export network — Admin</h1>
          <span className="text-xs text-ink-soft">
            {syncMode === 'firebase'
              ? remoteReady
                ? 'همگام‌سازی ابری فعال — تغییرات برای همه اعمال می‌شود'
                : 'در حال اتصال به سرور…'
              : 'فقط در این مرورگر ذخیره می‌شود'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-hover">
            <Upload className="w-3.5 h-3.5" />
            Import
            <input type="file" accept="application/json,.json" className="hidden" onChange={importFile} />
          </label>
          <button
            type="button"
            onClick={exportFile}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-hover"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button
            type="button"
            onClick={resetDefault}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-hover"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <Link
            to="/"
            className="inline-flex items-center gap-1 rounded-full bg-ink text-white px-3 py-1.5 text-xs font-medium"
          >
            <Save className="w-3.5 h-3.5" />
            Map
          </Link>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-hover"
          >
            <LogOut className="w-3.5 h-3.5" />
            Log out
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        <aside className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Countries</span>
            <button type="button" onClick={addCountry} className="p-1 rounded-lg hover:bg-hover" title="Add country">
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
                  className={`w-full text-left rounded-lg px-3 py-2 text-sm ${
                    selCountry === id ? 'bg-ink text-white' : 'hover:bg-hover'
                  }`}
                >
                  {networkJson[id].label}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {country && (
          <div className="space-y-6 min-w-0">
            <section className="rounded-xl border border-border bg-white p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="font-medium">Country</h2>
                <button type="button" onClick={removeCountry} className="text-red-600 p-1 rounded hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="text-xs">
                  <span className="text-ink-soft">Id (key)</span>
                  <input
                    className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm bg-hover"
                    value={country.id}
                    readOnly
                  />
                </label>
                <label className="text-xs">
                  <span className="text-ink-soft">Label</span>
                  <input
                    className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm"
                    value={country.label}
                    onChange={(e) => updateCountry({ label: e.target.value })}
                  />
                </label>
                <label className="text-xs">
                  <span className="text-ink-soft">Flag id</span>
                  <input
                    className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm"
                    value={country.flag}
                    onChange={(e) => updateCountry({ flag: e.target.value })}
                  />
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label>
                    <span className="text-ink-soft">Anchor X</span>
                    <input
                      type="number"
                      className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm"
                      value={country.anchor.x}
                      onChange={(e) => updateCountry({ anchor: { ...country.anchor, x: Number(e.target.value) } })}
                    />
                  </label>
                  <label>
                    <span className="text-ink-soft">Anchor Y</span>
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
                <h2 className="font-medium">Categories</h2>
                <button type="button" onClick={addCategory} className="text-sm inline-flex items-center gap-1 text-ink-soft hover:text-ink">
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {catKeys.map((cid) => (
                  <button
                    key={cid}
                    type="button"
                    onClick={() => setSelCat(cid)}
                    className={`rounded-full px-3 py-1 text-sm border ${
                      selCat === cid ? 'border-ink bg-ink text-white' : 'border-border hover:bg-hover'
                    }`}
                  >
                    {cid}
                  </button>
                ))}
              </div>
            </section>

            {activeCat && selCat && (
              <section className="rounded-xl border border-border bg-white p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="font-medium">Category: {selCat}</h2>
                  <button
                    type="button"
                    onClick={() => removeCategory(selCat)}
                    className="text-red-600 p-1 rounded hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="text-xs sm:col-span-2">
                    <span className="text-ink-soft">Label</span>
                    <input
                      className="mt-1 w-full rounded border border-border px-2 py-1.5 text-sm"
                      value={activeCat.label}
                      onChange={(e) => updateCategory(selCat, { label: e.target.value })}
                    />
                  </label>
                  <label className="text-xs sm:col-span-2">
                    <span className="text-ink-soft">Icon (Lucide name)</span>
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
                    <span className="text-sm font-medium">Companies</span>
                    <button
                      type="button"
                      onClick={() => addCompany(selCat)}
                      className="text-xs inline-flex items-center gap-1 text-ink-soft hover:text-ink"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add company
                    </button>
                  </div>
                  <div className="overflow-x-auto border border-border rounded-lg">
                    <table className="w-full text-sm min-w-[720px]">
                      <thead className="bg-hover text-left text-xs text-ink-soft">
                        <tr>
                          <th className="p-2">Name</th>
                          <th className="p-2">Tag</th>
                          <th className="p-2 w-12">Init</th>
                          <th className="p-2">URL</th>
                          <th className="p-2 w-24 text-center" title="باز کردن در تب جدید">
                            Open
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
                                title="لینک در پنجره / تب جدید"
                                aria-label="Open company URL in new tab"
                                onClick={() => openCompanyUrlInNewTab(row.url)}
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
          </div>
        )}
      </div>
    </div>
  );
}
