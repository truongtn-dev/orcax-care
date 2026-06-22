import {
  AlertTriangle,
  ArrowDownToLine,
  Bell,
  Building2,
  Calendar,
  CalendarCheck,
  Clock3,
  Heart,
  Layers,
  LayoutGrid,
  List,
  Package,
  Pill,
  Search,
  Sparkles,
  Stethoscope,
  UserPlus,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

const ICON_MAP = {
  pill: Pill,
  package: Package,
  "package-plus": ArrowDownToLine,
  "alert-triangle": AlertTriangle,
  stethoscope: Stethoscope,
  doctor: Stethoscope,
  "calendar-check": CalendarCheck,
  calendar: Calendar,
  clock: Clock3,
  users: Users,
  "user-round": UserRound,
  user: UserRound,
  staff: UserPlus,
  wallet: Wallet,
  bell: Bell,
  search: Search,
  heart: Heart,
  grid: LayoutGrid,
  building: Building2,
  layers: Layers,
  list: List,
  sparkles: Sparkles,
};

export default function AppIcon({
  name,
  size = 20,
  strokeWidth = 2,
  className = "",
  ...rest
}) {
  const Icon = ICON_MAP[name];
  if (!Icon) return null;

  return (
    <Icon
      size={size}
      strokeWidth={strokeWidth}
      absoluteStrokeWidth
      className={`app-icon ${className}`.trim()}
      aria-hidden={rest["aria-hidden"] ?? true}
      {...rest}
    />
  );
}

export { ICON_MAP };
