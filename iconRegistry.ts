import type { LucideIcon } from 'lucide-react';
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
  Car,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
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
  Car,
};

export const ICON_KEYS = Object.keys(ICONS).sort();

export function getIconByKey(key: string): LucideIcon {
  return ICONS[key] ?? CircleDot;
}
