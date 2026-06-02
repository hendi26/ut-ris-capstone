import { clsx } from "clsx";

type Color = "blue" | "green" | "amber" | "red" | "purple" | "gray" | "pink";

interface BadgeProps {
  label: string;
  color?: Color;
  className?: string;
}

const colorMap: Record<Color, string> = {
  blue:   "bg-blue-100 text-blue-800",
  green:  "bg-green-100 text-green-800",
  amber:  "bg-amber-100 text-amber-800",
  red:    "bg-red-100 text-red-800",
  purple: "bg-purple-100 text-purple-800",
  gray:   "bg-gray-100 text-gray-700",
  pink:   "bg-pink-100 text-pink-800",
};

export default function Badge({ label, color = "gray", className }: BadgeProps) {
  return (
    <span className={clsx("badge", colorMap[color], className)}>{label}</span>
  );
}

// ─── Status badge helpers ──────────────────────────────────────────────

export function AppointmentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: Color }> = {
    pending:    { label: "Menunggu",   color: "amber" },
    confirmed:  { label: "Dikonfirmasi", color: "blue" },
    checked_in: { label: "Hadir",      color: "purple" },
    completed:  { label: "Selesai",    color: "green" },
    cancelled:  { label: "Dibatalkan", color: "red" },
    no_show:    { label: "Tidak Hadir",color: "gray" },
  };
  const cfg = map[status] ?? { label: status, color: "gray" as Color };
  return <Badge label={cfg.label} color={cfg.color} />;
}

export function StudyStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: Color }> = {
    scheduled:   { label: "Terjadwal",  color: "blue" },
    in_progress: { label: "Berlangsung",color: "amber" },
    completed:   { label: "Selesai",    color: "green" },
    reported:    { label: "Dilaporkan", color: "purple" },
    cancelled:   { label: "Dibatalkan", color: "red" },
  };
  const cfg = map[status] ?? { label: status, color: "gray" as Color };
  return <Badge label={cfg.label} color={cfg.color} />;
}

export function ReportStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: Color }> = {
    draft:          { label: "Draft",       color: "gray" },
    pending_review: { label: "Review",      color: "amber" },
    finalized:      { label: "Final",       color: "green" },
    amended:        { label: "Amandemen",   color: "blue" },
  };
  const cfg = map[status] ?? { label: status, color: "gray" as Color };
  return <Badge label={cfg.label} color={cfg.color} />;
}

export function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { label: string; color: Color }> = {
    routine:   { label: "Rutin",   color: "gray" },
    urgent:    { label: "Urgent",  color: "amber" },
    emergency: { label: "Darurat", color: "red" },
    stat:      { label: "STAT",    color: "red" },
  };
  const cfg = map[priority] ?? { label: priority, color: "gray" as Color };
  return <Badge label={cfg.label} color={cfg.color} />;
}
export function UserRoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; color: Color }> = {
    admin: {
      label: "Admin",
      color: "purple",
    },

    radiolog: {
      label: "Radiolog",
      color: "blue",
    },

    dokter: {
      label: "Dokter",
      color: "green",
    },

    resepsionis: {
      label: "Resepsionis",
      color: "amber",
    },

    patient: {
      label: "Pasien",
      color: "pink",
    },
  };

  const cfg = map[role] ?? {
    label: role,
    color: "gray" as Color,
  };

  return (
    <Badge
      label={cfg.label}
      color={cfg.color}
    />
  );
}