import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  FileText,
  LogOut,
  Activity,
  UserCog,
  Calendar,
  User,
} from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "@/hooks/useAuth";
import { AuthUser } from "@/store/authStore";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  roles?: AuthUser["role"][];
  permission?: string;
}

const navItems: NavItem[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "radiolog", "dokter", "resepsionis"],
  },

  // Patient Portal
  {
    to: "/patient/profile",
    label: "Profil Saya",
    icon: User,
    roles: ["patient"],
  },
  {
    to: "/patient/studies",
    label: "Pemeriksaan Saya",
    icon: Stethoscope,
    roles: ["patient"],
  },
  {
    to: "/patient/reports",
    label: "Laporan Saya",
    icon: FileText,
    roles: ["patient"],
  },

  // Staff
  {
    to: "/patients",
    label: "Pasien",
    icon: Users,
    permission: "patients:read",
  },
  {
    to: "/appointments",
    label: "Jadwal",
    icon: Calendar,
    permission: "appointments:read",
  },
  {
    to: "/examinations",
    label: "Pemeriksaan",
    icon: Stethoscope,
    permission: "studies:read",
  },
  {
    to: "/reports",
    label: "Laporan",
    icon: FileText,
    permission: "reports:read",
  },
  {
    to: "/users",
    label: "Pengguna",
    icon: UserCog,
    roles: ["admin"],
  },
];

const roleLabels: Record<AuthUser["role"], string> = {
  admin: "Administrator",
  radiolog: "Radiolog",
  dokter: "Dokter",
  resepsionis: "Resepsionis",
  patient: "Pasien",
};

const roleBadgeColors: Record<AuthUser["role"], string> = {
  admin: "bg-red-500/20 text-red-300",
  radiolog: "bg-blue-500/20 text-blue-300",
  dokter: "bg-green-500/20 text-green-300",
  resepsionis: "bg-amber-500/20 text-amber-300",
  patient: "bg-cyan-500/20 text-cyan-300",
};

export default function Sidebar() {
  const { user, can, hasRole, logout } = useAuth();

  const visibleItems = navItems.filter((item) => {
    if (item.roles) {
      return hasRole(...item.roles);
    }

    if (item.permission) {
      return can(item.permission);
    }

    return true;
  });

  return (
    <aside className="w-64 bg-primary-900 text-white flex flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-primary-800">
        <div className="flex items-center justify-center w-9 h-9 bg-primary-600 rounded-lg">
          <Activity className="w-5 h-5" />
        </div>

        <div>
          <p className="font-bold text-sm leading-tight">UT-RIS</p>
          <p className="text-primary-400 text-xs">Radiology IS</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary-700 text-white"
                  : "text-primary-300 hover:bg-primary-800 hover:text-white"
              )
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User Info */}
      <div className="px-3 py-4 border-t border-primary-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {user?.full_name?.charAt(0).toUpperCase() ?? "U"}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.full_name ?? "Pengguna"}
            </p>

            {user?.role && (
              <span
                className={clsx(
                  "inline-block text-xs px-1.5 py-0.5 rounded font-medium mt-0.5",
                  roleBadgeColors[user.role]
                )}
              >
                {roleLabels[user.role]}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-primary-300 hover:bg-primary-800 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Keluar
        </button>
      </div>
    </aside>
  );
}
