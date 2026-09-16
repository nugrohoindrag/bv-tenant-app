// Ikon kategori laporan (Figma "Pilih Kategori": gradient teal) + ikon kategori tenant / menu. Berbasis lucide.
import { ArrowUpDown, BedDouble, Bug, Building2, ConciergeBell, CreditCard, DoorOpen, Hammer, Landmark, MoreHorizontal, Newspaper, PaintRoller, Plug, ShieldCheck, Siren, Snowflake, Sparkles, Sprout, Store, Tag, Utensils, Volume2, Wrench, Droplets, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const icons: Record<string, LucideIcon> = {
  gardening: Sprout,
  cleaning: Sparkles,
  hvac: Snowflake,
  electrical: Plug,
  renovation: PaintRoller,
  pest_control: Bug,
  repair: Wrench,
  plumbing: Droplets,
  security: ShieldCheck,
  other: MoreHorizontal,
  // kode/ikon kategori backend P1 (profile.DefaultCategories: nama Material Symbols → lucide)
  air_conditioning: Snowflake,
  ac_unit: Snowflake,
  electrical_services: Plug,
  cleanliness: Sparkles,
  cleaning_services: Sparkles,
  lift: ArrowUpDown,
  elevator: ArrowUpDown,
  meeting_room: Building2,
  noise: Volume2,
  volume_up: Volume2,
  pest: Bug,
  building_damage: Hammer,
  construction: Hammer,
  room_service: ConciergeBell,
  guest_amenities: BedDouble,
  spa: BedDouble,
  handyman: PaintRoller,
  yard: Sprout,
  access_card: CreditCard,
  badge: CreditCard,
  more_horiz: MoreHorizontal,
  door: DoorOpen,
  // fallback untuk kode kategori backend P0
  complaint: Siren,
  inquiry: Newspaper,
  maintenance: Wrench,
  facility: Building2,
  // kategori tenant
  office: Building2,
  banking: Landmark,
  commercial: Store,
  fnb: Utensils,
  listing: Tag,
};

export function categoryIcon(key: string): LucideIcon {
  return icons[key] ?? MoreHorizontal;
}

export function CategoryIcon({ icon, size = 48, className, color }: { icon: string; size?: number; className?: string; color?: string }) {
  const I = categoryIcon(icon);
  const id = "cg-" + icon + (color ? "-" + color.replace("#", "") : "");
  return (
    <span className={cn("inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={0} height={0} className="absolute">
        <defs>
          <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="24" y2="24">
            <stop offset="0" stopColor={color ?? "#5fd3c6"} />
            <stop offset="1" stopColor={color ?? "#1f9bb3"} />
          </linearGradient>
        </defs>
      </svg>
      <I size={size} strokeWidth={1.8} style={{ stroke: `url(#${id})` }} />
    </span>
  );
}
