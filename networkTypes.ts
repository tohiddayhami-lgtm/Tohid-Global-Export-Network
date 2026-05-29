/** Two-line label on the root node + editable hero texts (synced to Firestore when configured). */
export interface RootNodeLines {
  line1: string;
  line2: string;
  badge?: string;
  subtitle?: string;
  stat1?: string;
  stat2?: string;
  stat3?: string;
  faviconHref?: string;
}

export interface CompanyJson {
  name: string;
  tag: string;
  initial: string;
  url: string;
  /** Category IDs (siblings in the same country) where this company also appears */
  sharedCategories?: string[];
}

export interface CategoryJson {
  label: string;
  iconKey: string;
  companies: CompanyJson[];
  hidden?: boolean;
  description?: string;
}

export interface CountryJson {
  id: string;
  label: string;
  flag: string;
  anchor: { x: number; y: number };
  categories: Record<string, CategoryJson>;
  hidden?: boolean;
}

/** Serializable map: countryId → country */
export type ExportNetworkJson = Record<string, CountryJson>;
