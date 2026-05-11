import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import type { ExportNetworkJson } from './networkTypes.ts';
import { hydrateNetwork, type ExportDataMap } from './hydrateNetwork.ts';
import defaultNetworkJson from './default-network.json';

const STORAGE_KEY = 'gen_export_network_v1';
const SESSION_KEY = 'gen_export_admin_session';

/** Used only when `VITE_ADMIN_*` are not set in `.env`. Override in production. */
const FALLBACK_ADMIN_USERNAME = 'tgen_export_operator';
const FALLBACK_ADMIN_PASSWORD = 'Tg7!kM9pL2@vN4#xQ8wR3hJ6zC1fB5dS0eA';

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

type Ctx = {
  exportData: ExportDataMap;
  networkJson: ExportNetworkJson;
  setNetworkJson: Dispatch<SetStateAction<ExportNetworkJson>>;
  adminOk: boolean;
  login: (user: string, pass: string) => boolean;
  logout: () => void;
};

const ExportDataContext = createContext<Ctx | null>(null);

export function ExportDataProvider({ children }: { children: ReactNode }) {
  const [networkJson, setNetworkJson] = useState<ExportNetworkJson>(loadFromStorage);
  const [adminOk, setAdminOk] = useState(
    () => typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_KEY) === '1'
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(networkJson));
    } catch {
      /* quota */
    }
  }, [networkJson]);

  const exportData = useMemo(() => hydrateNetwork(networkJson), [networkJson]);

  const login = useCallback((user: string, pass: string) => {
    const u = import.meta.env.VITE_ADMIN_USERNAME ?? FALLBACK_ADMIN_USERNAME;
    const p = import.meta.env.VITE_ADMIN_PASSWORD ?? FALLBACK_ADMIN_PASSWORD;
    if (user === u && pass === p) {
      sessionStorage.setItem(SESSION_KEY, '1');
      setAdminOk(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setAdminOk(false);
  }, []);

  const value = useMemo(
    () => ({ exportData, networkJson, setNetworkJson, adminOk, login, logout }),
    [exportData, networkJson, adminOk, login, logout]
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
