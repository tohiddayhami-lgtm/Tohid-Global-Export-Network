import type { LucideIcon } from 'lucide-react';
import type { CompanyJson, CountryJson, ExportNetworkJson } from './networkTypes.ts';
import { getIconByKey } from './iconRegistry.ts';

export interface Company extends CompanyJson {}

export interface Category {
  label: string;
  icon: LucideIcon;
  companies: Company[];
}

export interface Country {
  id: string;
  label: string;
  flag: string;
  anchor: { x: number; y: number };
  categories: { [key: string]: Category };
}

export type ExportDataMap = Record<string, Country>;

export function hydrateNetwork(json: ExportNetworkJson): ExportDataMap {
  const out: ExportDataMap = {};
  for (const [cid, c] of Object.entries(json)) {
    out[cid] = hydrateCountry(c);
  }
  return out;
}

function hydrateCountry(c: CountryJson): Country {
  const categories: Record<string, Category> = {};
  for (const [kid, cat] of Object.entries(c.categories ?? {})) {
    categories[kid] = {
      label: cat.label,
      icon: getIconByKey(cat.iconKey || 'CircleDot'),
      companies: (cat.companies ?? []).map((co) => ({ ...co })),
    };
  }
  return {
    id: c.id,
    label: c.label,
    flag: c.flag,
    anchor: { ...c.anchor },
    categories,
  };
}
