import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Calendar, Filter } from "lucide-react";
import { appointmentService, AppointmentStatus } from "@/services/appointmentService";
import { PageLoader } from "@/components/common/LoadingSpinner";
import ProtectedContent from "@/components/common/ProtectedContent";
import { AppointmentStatusBadge, PriorityBadge } from "@/components/common/Badge";
import AppointmentFormModal from "@/components/appointments/AppointmentFormModal";

const STATUS_OPTIONS: { value: AppointmentStatus | ""; label: string }[] = [
  { value: "", label: "Semua Status" },
  { value: "pending", label: "Menunggu" },
  { value: "confirmed", label: "Dikonfirmasi" },
  { value: "checked_in", label: "Hadir" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
  { value: "no_show", label: "Tidak Hadir" },
];

const NEXT_STATUS: Partial<Record<AppointmentStatus, { label: string; value: AppointmentStatus }>> = {
  pending:    { label: "Konfirmasi",  value: "confirmed" },
  confirmed:  { label: "Check-in",   value: "checked_in" },
};

export default function AppointmentsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "">("");
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["appointments", page, statusFilter],
    queryFn: () => appointmentService.list({
      page, size: 20,
      status: statusFilter || undefined,
    }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: AppointmentStatus }) =>
      appointmentService.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appointments"] }),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value as AppointmentStatus | ""); setPage(1); }}
            className="input w-48 py-1.5 text-sm"
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <ProtectedContent permission="appointments:create">
          <button onClick={() => setShowForm(true)} className="btn-primary flex-shrink-0">
            <Plus className="w-4 h-4" />
            Buat Jadwal
          </button>
        </ProtectedContent>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Jadwal Pemeriksaan</h3>
          <span className="text-sm text-gray-500">{data?.total ?? 0} jadwal</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">No. Jadwal</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Pasien</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Modalitas</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Jadwal</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Prioritas</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p>Belum ada jadwal pemeriksaan</p>
                  </td>
                </tr>
              ) : (
                data?.items.map(appt => {
                  const nextAction = NEXT_STATUS[appt.status];
                  return (
                    <tr key={appt.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{appt.appointment_number}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{appt.patient?.full_name ?? "-"}</p>
                        <p className="text-xs text-gray-400">{appt.patient?.medical_record_number}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge-blue">{appt.requested_modality}</span>
                        <p className="text-xs text-gray-500 mt-0.5">{appt.body_part}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {new Date(appt.scheduled_datetime).toLocaleString("id-ID", {
                          day: "numeric", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3"><PriorityBadge priority={appt.priority} /></td>
                      <td className="px-4 py-3"><AppointmentStatusBadge status={appt.status} /></td>
                      <td className="px-4 py-3">
                        <ProtectedContent permission="appointments:update">
                          {nextAction && (
                            <button
                              onClick={() => updateMutation.mutate({ id: appt.id, status: nextAction.value })}
                              disabled={updateMutation.isPending}
                              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                            >
                              {nextAction.label}
                            </button>
                          )}
                        </ProtectedContent>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

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

      <AppointmentFormModal isOpen={showForm} onClose={() => setShowForm(false)} />
    </div>
  );
}
