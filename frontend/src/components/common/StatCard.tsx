import { LucideIcon } from "lucide-react";
import { clsx } from "clsx";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: "blue" | "green" | "amber" | "red";
  description?: string;
}

const colorMap = {
  blue:  { bg: "bg-blue-50",  icon: "text-blue-600",  border: "border-blue-100" },
  green: { bg: "bg-green-50", icon: "text-green-600", border: "border-green-100" },
  amber: { bg: "bg-amber-50", icon: "text-amber-600", border: "border-amber-100" },
  red:   { bg: "bg-red-50",   icon: "text-red-600",   border: "border-red-100" },
};

export default function StatCard({ title, value, icon: Icon, color = "blue", description }: StatCardProps) {
  const colors = colorMap[color];

  return (
    <div className={clsx("card p-6 border", colors.border)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {description && (
            <p className="text-xs text-gray-400 mt-1">{description}</p>
          )}
        </div>
        <div className={clsx("p-3 rounded-xl", colors.bg)}>
          <Icon className={clsx("w-6 h-6", colors.icon)} />
        </div>
      </div>
    </div>
  );
}
