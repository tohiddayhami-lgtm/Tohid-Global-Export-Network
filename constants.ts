import { 
  Flower2, 
  Grid3X3, 
  Nut, 
  Droplet, 
  Coffee, 
  Fish, 
  Footprints, 
  Wheat, 
  Cpu, 
  Cog, 
  Shirt, 
  FlaskConical, 
  ShoppingBag, 
  Truck, 
  Gem, 
  Package, 
  Pill, 
  CircleDot,
  Car
} from 'lucide-react';

export interface Company {
  name: string;
  tag: string;
  initial: string;
  url: string;
}

export interface Category {
  label: string;
  icon: any; // Lucide component
  companies: Company[];
}

export interface Country {
  id: string;
  label: string;
  flag: string; // ID for my flag symbols
  anchor: { x: number; y: number };
  categories: { [key: string]: Category };
}

export const EXPORT_DATA: { [key: string]: Country } = {
  iran: {
    id: 'iran',
    label: 'Iran',
    flag: 'iran',
    anchor: { x: -260, y: -180 },
    categories: {
      saffron: {
        label: 'Saffron & Spices',
        icon: Flower2,
        companies: [
          { name: 'Novin Saffron', tag: 'Sargol grade premium', initial: 'N', url: 'https://novinsaffron.com' },
          { name: 'Bahraman', tag: 'Global saffron exporter', initial: 'B', url: 'https://bahraman.com' },
          { name: 'Saharkhiz', tag: 'Spice heritage', initial: 'S', url: 'https://saharkhizland.com' },
          { name: 'Esfedan', tag: 'Export quality saffron', initial: 'E', url: 'https://esfedan.com' }
        ]
      },
      carpets: {
        label: 'Handmade Carpets',
        icon: Grid3X3,
        companies: [
          { name: 'Persian Rug Co', tag: 'Traditional silk rugs', initial: 'P', url: 'https://example.com/persian-rug' },
          { name: 'Tabriz Carpets', tag: 'Museum quality pieces', initial: 'T', url: 'https://example.com/tabriz' },
          { name: 'Isfahan Looms', tag: 'Hand-knotted luxury', initial: 'I', url: 'https://example.com/isfahan' }
        ]
      },
      pistachios: {
        label: 'Pistachios',
        icon: Nut,
        companies: [
          { name: 'Rafsanjan Kernels', tag: 'Premium Fandoghi', initial: 'R', url: 'https://example.com/rafsanjan' },
          { name: 'Kerman Nuts', tag: 'Jumbo Akbari type', initial: 'K', url: 'https://example.com/kerman' },
          { name: 'Aria Nut', tag: 'Organic certification', initial: 'A', url: 'https://example.com/arianut' }
        ]
      },
      petro: {
        label: 'Petrochemicals',
        icon: Droplet,
        companies: [
          { name: 'NPC International', tag: 'Polymer solutions', initial: 'N', url: 'https://example.com/npc' },
          { name: 'Arvand Petro', tag: 'PVC & Chemicals', initial: 'A', url: 'https://example.com/arvand' }
        ]
      }
    }
  },
  india: {
    id: 'india',
    label: 'India',
    flag: 'india',
    anchor: { x: 260, y: -180 },
    categories: {
      tea: {
        label: 'Premium Tea',
        icon: Coffee,
        companies: [
          { name: 'Tata Tea', tag: 'Global market leader', initial: 'T', url: 'https://tatatea.com' },
          { name: 'Assam Gold', tag: 'Single origin black tea', initial: 'A', url: 'https://example.com/assam' },
          { name: 'Darjeeling Estate', tag: 'Champagne of teas', initial: 'D', url: 'https://example.com/darjeeling' }
        ]
      },
      textiles: {
        label: 'Textiles',
        icon: Shirt,
        companies: [
          { name: 'Reliance Ind', tag: 'Synthetic fibers', initial: 'R', url: 'https://example.com/reliance' },
          { name: 'FabIndia', tag: 'Organic handloom', initial: 'F', url: 'https://example.com/fabindia' },
          { name: 'Arvind Mills', tag: 'Denim manufacturing', initial: 'A', url: 'https://example.com/arvind' }
        ]
      },
      it: {
        label: 'IT Services',
        icon: Cpu,
        companies: [
          { name: 'TCS', tag: 'Global consulting', initial: 'T', url: 'https://example.com/tcs' },
          { name: 'Infosys', tag: 'Digital transformation', initial: 'I', url: 'https://example.com/infosys' },
          { name: 'Wipro', tag: 'Cloud engineering', initial: 'W', url: 'https://example.com/wipro' }
        ]
      },
      pharma: {
        label: 'Pharmaceuticals',
        icon: Pill,
        companies: [
          { name: 'Sun Pharma', tag: 'Generics leader', initial: 'S', url: 'https://example.com/sun' },
          { name: 'Dr Reddys', tag: 'Biologics & APIs', initial: 'D', url: 'https://example.com/reddy' }
        ]
      }
    }
  },
  turkey: {
    id: 'turkey',
    label: 'Turkey',
    flag: 'turkey',
    anchor: { x: 380, y: 0 },
    categories: {
      machinery: {
        label: 'Machinery',
        icon: Cog,
        companies: [
          { name: 'Durmazlar', tag: 'Metal working', initial: 'D', url: 'https://example.com/durmazlar' },
          { name: 'Ermaksan', tag: 'Laser technology', initial: 'E', url: 'https://example.com/ermaksan' }
        ]
      },
      food: {
        label: 'Confectionery',
        icon: Wheat,
        companies: [
          { name: 'Ulker', tag: 'Global snacks', initial: 'U', url: 'https://example.com/ulker' },
          { name: 'Eti Exports', tag: 'Premium biscuits', initial: 'E', url: 'https://example.com/eti' }
        ]
      },
      auto: {
        label: 'Automotive',
        icon: Car,
        companies: [
          { name: 'Tofas', tag: 'Vehicle assembly', initial: 'T', url: 'https://example.com/tofas' },
          { name: 'Ford Otosan', tag: 'Commercial lines', initial: 'F', url: 'https://example.com/ford' }
        ]
      }
    }
  },
  uae: {
    id: 'uae',
    label: 'UAE',
    flag: 'uae',
    anchor: { x: 260, y: 180 },
    categories: {
      logistics: {
        label: 'Logistics',
        icon: Truck,
        companies: [
          { name: 'DP World', tag: 'Global trade enabler', initial: 'D', url: 'https://example.com/dpworld' },
          { name: 'Aramex', tag: 'Logistics solutions', initial: 'A', url: 'https://example.com/aramex' }
        ]
      },
      gold: {
        label: 'Gold & Jewelry',
        icon: Gem,
        companies: [
          { name: 'Damas', tag: 'Luxury jewelry', initial: 'D', url: 'https://example.com/damas' },
          { name: 'Malabar Gold', tag: 'Precious metals', initial: 'M', url: 'https://example.com/malabar' }
        ]
      },
      petro: {
        label: 'Energy',
        icon: Droplet,
        companies: [
          { name: 'ADNOC', tag: 'Oil & Gas giant', initial: 'A', url: 'https://example.com/adnoc' }
        ]
      }
    }
  },
  china: {
    id: 'china',
    label: 'China',
    flag: 'china',
    anchor: { x: -260, y: 180 },
    categories: {
      electronics: {
        label: 'Electronics',
        icon: Cpu,
        companies: [
          { name: 'Huawei', tag: 'ICT infrastructure', initial: 'H', url: 'https://example.com/huawei' },
          { name: 'Xiaomi', tag: 'Consumer hardware', initial: 'X', url: 'https://example.com/xiaomi' },
          { name: 'DJI', tag: 'Drones & Imaging', initial: 'D', url: 'https://example.com/dji' }
        ]
      },
      machinery: {
        label: 'Industrial',
        icon: Cog,
        companies: [
          { name: 'Sany Group', tag: 'Heavy machinery', initial: 'S', url: 'https://example.com/sany' },
          { name: 'XCMG', tag: 'Construction tech', initial: 'X', url: 'https://example.com/xcmg' }
        ]
      },
      chemicals: {
        label: 'Chemicals',
        icon: FlaskConical,
        companies: [
          { name: 'Sinopec', tag: 'Energy & Chemicals', initial: 'S', url: 'https://example.com/sinopec' }
        ]
      },
      toys: {
        label: 'Consumer Goods',
        icon: ShoppingBag,
        companies: [
          { name: 'Pop Mart', tag: 'Designer toys', initial: 'P', url: 'https://example.com/popmart' }
        ]
      }
    }
  },
  vietnam: {
    id: 'vietnam',
    label: 'Vietnam',
    flag: 'vietnam',
    anchor: { x: -380, y: 0 },
    categories: {
      coffee: {
        label: 'Coffee',
        icon: Coffee,
        companies: [
          { name: 'Trung Nguyen', tag: 'King Coffee', initial: 'T', url: 'https://example.com/trungnguyen' },
          { name: 'Vinacafe', tag: 'Instant solutions', initial: 'V', url: 'https://example.com/vinacafe' }
        ]
      },
      seafood: {
        label: 'Seafood',
        icon: Fish,
        companies: [
          { name: 'Vinh Hoan', tag: 'Pangasius expert', initial: 'V', url: 'https://example.com/vinhhoan' },
          { name: 'Minh Phu', tag: 'Shrimp corporation', initial: 'M', url: 'https://example.com/minhphu' }
        ]
      },
      footwear: {
        label: 'Footwear',
        icon: Footprints,
        companies: [
          { name: 'Biti\'s', tag: 'Local heritage', initial: 'B', url: 'https://example.com/bitis' }
        ]
      },
      rice: {
        label: 'Rice',
        icon: Wheat,
        companies: [
          { name: 'Loc Troi', tag: 'Agricultural services', initial: 'L', url: 'https://example.com/loctroi' }
        ]
      }
    }
  }
};
