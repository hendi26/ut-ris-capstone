import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

const pageTitles: Record<string, string> = {
  "/dashboard":        "Dashboard",
  "/patients":         "Manajemen Pasien",
  "/appointments":     "Jadwal Pemeriksaan",
  "/examinations":     "Pemeriksaan Radiologi",
  "/reports":          "Laporan Radiologi",
  "/users":            "Manajemen Pengguna",
  "/patient/profile":  "Profil Saya",
  "/patient/studies":  "Pemeriksaan Saya",
  "/patient/reports":  "Laporan Saya",
};

export default function MainLayout() {
  const { pathname } = useLocation();
  const title = pageTitles[pathname] ?? "UT-RIS";

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} />

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
