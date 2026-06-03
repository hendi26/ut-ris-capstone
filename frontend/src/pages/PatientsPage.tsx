import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, UserCircle } from "lucide-react";
import api from "@/services/api";
import { PageLoader } from "@/components/common/LoadingSpinner";
import ProtectedContent from "@/components/common/ProtectedContent";
import PatientFormModal from "@/components/patients/PatientFormModal";
import { formatDate } from "@/lib/utils";

interface Patient {
  id: number;
  medical_record_number: string;
  full_name: string;
  date_of_birth: string;
  gender: "L" | "P";
  phone_number: string | null;
  address: string | null;
}

interface PatientListResponse {
  items: Patient[];
  total: number;
  page: number;
  pages: number;
}

async function fetchPatients(page: number, search: string): Promise<PatientListResponse> {
  const { data } = await api.get("/api/v1/patients", {
    params: {
      page,
      size: 20,
      ...(search ? { search: search } : {}),
    },
  });
  return data;
}

export default function PatientsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["patients", page, search],
    queryFn: () => fetchPatients(page, search),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            placeholder="Cari nama atau nomor rekam medis..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-9"
          />
        </div>
        <ProtectedContent permission="patients:create">
          <button onClick={() => setShowForm(true)} className="btn-primary flex-shrink-0">
            <Plus className="w-4 h-4" />
            Daftarkan Pasien
          </button>
        </ProtectedContent>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Daftar Pasien</h3>
          <span className="text-sm text-gray-500">{data?.total ?? 0} pasien terdaftar</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3 font-medium text-gray-600">No. Rekam Medis</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Nama Pasien</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Tgl. Lahir</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Jenis Kelamin</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Alamat</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">No. Telepon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    <UserCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p>Belum ada pasien terdaftar</p>
                  </td>
                </tr>
              ) : (
                data?.items.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">{patient.medical_record_number}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{patient.full_name}</td>
                    <td className="px-6 py-4 text-gray-600">{formatDate(patient.date_of_birth)}</td>
                    <td className="px-6 py-4">
                      <span className={patient.gender === "L" ? "badge-blue" : "badge bg-pink-100 text-pink-800"}>
                        {patient.gender === "L" ? "Laki-laki" : "Perempuan"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{patient.address ?? "-"}</td>
                    <td className="px-6 py-4 text-gray-600">{patient.phone_number ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">Halaman {data.page} dari {data.pages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Sebelumnya</button>
              <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Berikutnya</button>
            </div>
          </div>
        )}
      </div>

      <PatientFormModal isOpen={showForm} onClose={() => setShowForm(false)} />
    </div>
  );
}
