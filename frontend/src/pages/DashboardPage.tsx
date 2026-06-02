import { useQuery } from "@tanstack/react-query";
import {
  Users, Stethoscope, FileText, CheckCircle,
  Clock, AlertCircle, Calendar, Activity,
  ClipboardList, UserCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { dashboardService } from "@/services/dashboardService";
import StatCard from "@/components/common/StatCard";
import { PageLoader } from "@/components/common/LoadingSpinner";

/* ─── Role-based stat grids ─────────────────────────────────────────── */

function AdminStats({ stats }: { stats: ReturnType<typeof dashboardService.getStats> extends Promise<infer T> ? T : never }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      <StatCard title="Total Pasien"         value={stats.total_patients}           icon={Users}          color="blue"  description="Terdaftar dalam sistem" />
      <StatCard title="Jadwal Hari Ini"      value={stats.appointments_today}       icon={Calendar}       color="blue"  description="Appointment aktif" />
      <StatCard title="Pemeriksaan Hari Ini" value={stats.total_examinations_today} icon={Stethoscope}    color="green" description="Study dibuat hari ini" />
      <StatCard title="Laporan Pending"      value={stats.pending_reports}          icon={Clock}          color="amber" description="Draft & menunggu review" />
      <StatCard title="Selesai Hari Ini"     value={stats.completed_today}          icon={CheckCircle}    color="green" description="Pemeriksaan selesai" />
    </div>
  );
}

function RadiologStats({ stats }: { stats: ReturnType<typeof dashboardService.getStats> extends Promise<infer T> ? T : never }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard title="Pemeriksaan Hari Ini" value={stats.total_examinations_today} icon={Stethoscope}    color="blue"  description="Study masuk hari ini" />
      <StatCard title="Laporan Pending"      value={stats.pending_reports}          icon={ClipboardList}  color="amber" description="Draft & menunggu review" />
      <StatCard title="Selesai Hari Ini"     value={stats.completed_today}          icon={CheckCircle}    color="green" description="Pemeriksaan dilaporkan" />
    </div>
  );
}

function DokterStats({ stats }: { stats: ReturnType<typeof dashboardService.getStats> extends Promise<infer T> ? T : never }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard title="Total Pasien"    value={stats.total_patients}      icon={Users}       color="blue"  description="Terdaftar dalam sistem" />
      <StatCard title="Jadwal Hari Ini" value={stats.appointments_today}  icon={Calendar}    color="blue"  description="Appointment aktif" />
      <StatCard title="Selesai Hari Ini"value={stats.completed_today}     icon={CheckCircle} color="green" description="Pemeriksaan selesai" />
    </div>
  );
}

function ResepsionisStats({ stats }: { stats: ReturnType<typeof dashboardService.getStats> extends Promise<infer T> ? T : never }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard title="Total Pasien"    value={stats.total_patients}      icon={Users}     color="blue"  description="Terdaftar dalam sistem" />
      <StatCard title="Jadwal Hari Ini" value={stats.appointments_today}  icon={Calendar}  color="blue"  description="Appointment aktif" />
      <StatCard title="Pemeriksaan Hari Ini" value={stats.total_examinations_today} icon={Stethoscope} color="green" description="Study hari ini" />
    </div>
  );
}

/* ─── Quick actions per role ─────────────────────────────────────────── */

interface QuickAction { label: string; icon: React.ElementType; color: string; to: string; }

const quickActionsByRole: Record<string, QuickAction[]> = {
  admin: [
    { label: "Daftarkan Pasien",  icon: Users,        color: "text-blue-600 bg-blue-50",    to: "/patients" },
    { label: "Buat Jadwal",       icon: Calendar,     color: "text-purple-600 bg-purple-50", to: "/appointments" },
    { label: "Buat Pemeriksaan",  icon: Stethoscope,  color: "text-green-600 bg-green-50",   to: "/examinations" },
    { label: "Lihat Laporan",     icon: FileText,     color: "text-amber-600 bg-amber-50",   to: "/reports" },
  ],
  radiolog: [
    { label: "Buat Pemeriksaan",  icon: Stethoscope,  color: "text-green-600 bg-green-50",   to: "/examinations" },
    { label: "Buat Laporan",      icon: FileText,     color: "text-amber-600 bg-amber-50",   to: "/reports" },
    { label: "Lihat Pasien",      icon: Users,        color: "text-blue-600 bg-blue-50",     to: "/patients" },
    { label: "Lihat Jadwal",      icon: Calendar,     color: "text-purple-600 bg-purple-50", to: "/appointments" },
  ],
  dokter: [
    { label: "Lihat Pasien",      icon: Users,        color: "text-blue-600 bg-blue-50",     to: "/patients" },
    { label: "Buat Jadwal",       icon: Calendar,     color: "text-purple-600 bg-purple-50", to: "/appointments" },
    { label: "Lihat Pemeriksaan", icon: Stethoscope,  color: "text-green-600 bg-green-50",   to: "/examinations" },
    { label: "Lihat Laporan",     icon: FileText,     color: "text-amber-600 bg-amber-50",   to: "/reports" },
  ],
  resepsionis: [
    { label: "Daftarkan Pasien",  icon: Users,        color: "text-blue-600 bg-blue-50",     to: "/patients" },
    { label: "Buat Jadwal",       icon: Calendar,     color: "text-purple-600 bg-purple-50", to: "/appointments" },
    { label: "Lihat Pemeriksaan", icon: Stethoscope,  color: "text-green-600 bg-green-50",   to: "/examinations" },
    { label: "Lihat Pasien",      icon: UserCircle,   color: "text-gray-600 bg-gray-50",     to: "/patients" },
  ],
};

/* ─── Patient dashboard ──────────────────────────────────────────────── */

function PatientDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white">
        <h2 className="text-xl font-bold">Selamat datang, {user?.full_name ?? "Pasien"} 👋</h2>
        <p className="text-primary-200 text-sm mt-1">Portal Pasien — UT-RIS Radiology Information System</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => navigate("/patient/studies")}
          className="card p-6 border border-blue-100 text-left hover:shadow-md hover:border-blue-300 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-xl"><Stethoscope className="w-6 h-6 text-blue-600" /></div>
            <div>
              <p className="font-semibold text-gray-900">Pemeriksaan Saya</p>
              <p className="text-sm text-gray-500">Lihat riwayat pemeriksaan radiologi Anda</p>
            </div>
          </div>
        </button>
        <button
          onClick={() => navigate("/patient/reports")}
          className="card p-6 border border-green-100 text-left hover:shadow-md hover:border-green-300 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-xl"><FileText className="w-6 h-6 text-green-600" /></div>
            <div>
              <p className="font-semibold text-gray-900">Laporan Saya</p>
              <p className="text-sm text-gray-500">Lihat laporan radiologi yang sudah final</p>
            </div>
          </div>
        </button>
      </div>
      <div className="card p-6 border border-amber-100">
        <div className="flex items-start gap-3">
          <Activity className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-gray-900 text-sm">Informasi PACS</p>
            <p className="text-sm text-gray-600 mt-1">
              Integrasi PACS menggunakan Orthanc sebagai server DICOM development.
              Viewer PACS dapat diakses dari halaman Pemeriksaan melalui tombol <strong>Open PACS</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Dashboard ─────────────────────────────────────────────────── */

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const role = user?.role ?? "resepsionis";

  // Patient has no stats endpoint access
  if (role === "patient") {
    return <PatientDashboard />;
  }

  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: dashboardService.getStats,
    refetchInterval: 30_000,
  });

  if (isLoading) return <PageLoader />;

  const actions = quickActionsByRole[role] ?? quickActionsByRole.resepsionis;

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white">
        <h2 className="text-xl font-bold">
          Selamat datang, {user?.full_name ?? "Pengguna"} 👋
        </h2>
        <p className="text-primary-200 text-sm mt-1">
          Berikut ringkasan aktivitas sistem hari ini.
        </p>
      </div>

      {/* Error state */}
      {isError && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Gagal memuat statistik. Pastikan backend berjalan.
        </div>
      )}

      {/* Stats — role-based */}
      {stats && (
        <>
          {role === "admin"       && <AdminStats stats={stats} />}
          {role === "radiolog"    && <RadiologStats stats={stats} />}
          {role === "dokter"      && <DokterStats stats={stats} />}
          {role === "resepsionis" && <ResepsionisStats stats={stats} />}
        </>
      )}

      {/* PACS info banner */}
      <div className="card p-4 border border-blue-100 bg-blue-50/50">
        <div className="flex items-start gap-3">
          <Activity className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-blue-900 text-sm">Integrasi PACS Aktif</p>
            <p className="text-sm text-blue-700 mt-0.5">
              Orthanc DICOM Server digunakan sebagai PACS development.
              Akses viewer melalui tombol <strong>PACS</strong> di halaman Pemeriksaan.
            </p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="card card-body">
        <h3 className="font-semibold text-gray-900 mb-4">Aksi Cepat</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {actions.map(({ label, icon: Icon, color, to }) => (
            <button
              key={label}
              onClick={() => navigate(to)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
            >
              <div className={`p-2.5 rounded-lg ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-gray-700 text-center">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
