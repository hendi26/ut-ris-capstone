import { Bell } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const user = useAuthStore((s) => s.user);

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold">
            {user?.full_name?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <span className="text-sm font-medium text-gray-700 hidden sm:block">
            {user?.full_name}
          </span>
        </div>
      </div>
    </header>
  );
}
