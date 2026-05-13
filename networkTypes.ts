/** Two-line label on the root node of the map (editable in admin, synced to Firestore when configured). */
export interface RootNodeLines {
  line1: string;
  line2: string;
}

export interface CompanyJson {
  name: string;
  tag: string;
  initial: string;
  url: string;
}

export interface CategoryJson {
  label: string;
  iconKey: string;
  companies: CompanyJson[];
}

export interface CountryJson {
  id: string;
  label: string;
  flag: string;
  anchor: { x: number; y: number };
  categories: Record<string, CategoryJson>;
}

/** Serializable map: countryId → country */
export type ExportNetworkJson = Record<string, CountryJson>;
