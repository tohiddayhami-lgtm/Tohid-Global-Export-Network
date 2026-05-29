export interface CategoryPreset {
  label: string;
  iconKey: string;
  group: string;
}

export const CATEGORY_PRESETS: CategoryPreset[] = [
  // Food & Beverage
  { label: 'Food Products',               iconKey: 'UtensilsCrossed', group: 'Food & Beverage' },
  { label: 'Beverages',                   iconKey: 'Coffee',          group: 'Food & Beverage' },
  { label: 'Fresh Fruits & Vegetables',   iconKey: 'Apple',           group: 'Food & Beverage' },
  { label: 'Dried Fruits & Nuts',         iconKey: 'Nut',             group: 'Food & Beverage' },
  { label: 'Dairy Products',              iconKey: 'Droplet',         group: 'Food & Beverage' },
  { label: 'Seafood Products',            iconKey: 'Fish',            group: 'Food & Beverage' },
  { label: 'Meat & Poultry Products',     iconKey: 'Beef',            group: 'Food & Beverage' },
  { label: 'Confectionery & Snacks',      iconKey: 'Cookie',          group: 'Food & Beverage' },
  { label: 'Bakery Products',             iconKey: 'Wheat',           group: 'Food & Beverage' },

  // Agriculture
  { label: 'Agricultural Products',       iconKey: 'Leaf',            group: 'Agriculture' },

  // Building & Construction
  { label: 'Building Materials',          iconKey: 'Building2',       group: 'Building & Construction' },
  { label: 'Construction Materials',      iconKey: 'Hammer',          group: 'Building & Construction' },
  { label: 'Ceramics & Tiles',            iconKey: 'Grid3X3',         group: 'Building & Construction' },
  { label: 'Steel & Metal Products',      iconKey: 'Cog',             group: 'Building & Construction' },
  { label: 'Aluminum Products',           iconKey: 'Layers',          group: 'Building & Construction' },
  { label: 'Wood & Timber Products',      iconKey: 'TreePine',        group: 'Building & Construction' },
  { label: 'Sanitary Ware',               iconKey: 'Droplet',         group: 'Building & Construction' },
  { label: 'Paints & Coatings',           iconKey: 'Paintbrush',      group: 'Building & Construction' },

  // Home & Living
  { label: 'Home Appliances',             iconKey: 'Tv',              group: 'Home & Living' },
  { label: 'Kitchenware & Household',     iconKey: 'UtensilsCrossed', group: 'Home & Living' },
  { label: 'Cleaning Products',           iconKey: 'Sparkles',        group: 'Home & Living' },
  { label: 'Plastic Products',            iconKey: 'Package',         group: 'Home & Living' },
  { label: 'Furniture & Interior Design', iconKey: 'Armchair',        group: 'Home & Living' },

  // Health & Beauty
  { label: 'Cosmetics & Personal Care',   iconKey: 'Flower2',         group: 'Health & Beauty' },
  { label: 'Health & Wellness Products',  iconKey: 'Heart',           group: 'Health & Beauty' },
  { label: 'Medical Equipment & Supplies',iconKey: 'Stethoscope',     group: 'Health & Beauty' },
  { label: 'Pharmaceutical Products',     iconKey: 'Pill',            group: 'Health & Beauty' },

  // Fashion & Textiles
  { label: 'Textiles & Fabrics',          iconKey: 'Scissors',        group: 'Fashion & Textiles' },
  { label: 'Apparel & Fashion',           iconKey: 'Shirt',           group: 'Fashion & Textiles' },
  { label: 'Leather Products',            iconKey: 'ShoppingBag',     group: 'Fashion & Textiles' },
  { label: 'Footwear',                    iconKey: 'Footprints',      group: 'Fashion & Textiles' },
  { label: 'Jewelry & Accessories',       iconKey: 'Gem',             group: 'Fashion & Textiles' },

  // Industrial & Tech
  { label: 'Industrial Machinery',        iconKey: 'Cog',             group: 'Industrial & Tech' },
  { label: 'Automotive Parts & Accessories', iconKey: 'Car',          group: 'Industrial & Tech' },
  { label: 'Electrical & Electronics',    iconKey: 'Zap',             group: 'Industrial & Tech' },
  { label: 'Packaging Materials',         iconKey: 'Box',             group: 'Industrial & Tech' },
  { label: 'Petrochemical Products',      iconKey: 'FlaskConical',    group: 'Industrial & Tech' },
  { label: 'Chemical Products',           iconKey: 'FlaskConical',    group: 'Industrial & Tech' },
  { label: 'Renewable Energy Products',   iconKey: 'Sun',             group: 'Industrial & Tech' },
  { label: 'IT & Technology Products',    iconKey: 'Monitor',         group: 'Industrial & Tech' },

  // Consumer & Lifestyle
  { label: 'Toys & Educational Products', iconKey: 'Gamepad2',        group: 'Consumer & Lifestyle' },
  { label: 'Stationery & Office Supplies',iconKey: 'PenLine',         group: 'Consumer & Lifestyle' },
  { label: 'Sports Equipment',            iconKey: 'Dumbbell',        group: 'Consumer & Lifestyle' },
  { label: 'Pet Products',                iconKey: 'PawPrint',        group: 'Consumer & Lifestyle' },
  { label: 'Handicrafts & Gift Items',    iconKey: 'Gift',            group: 'Consumer & Lifestyle' },

  // Paper & Print
  { label: 'Paper Products',              iconKey: 'FileText',        group: 'Paper & Print' },
  { label: 'Printing & Packaging Solutions', iconKey: 'Printer',      group: 'Paper & Print' },

  // Logistics
  { label: 'Logistics & Supply Chain Services', iconKey: 'Truck',     group: 'Logistics' },
];

export const PRESET_GROUPS = [...new Set(CATEGORY_PRESETS.map((p) => p.group))];
