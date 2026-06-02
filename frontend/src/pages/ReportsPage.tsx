import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, FileText, Filter, CheckCircle, Download } from "lucide-react";
import { useForm } from "react-hook-form";
import { reportService, ReportStatus, ReportPriority } from "@/services/reportService";
import { PageLoader } from "@/components/common/LoadingSpinner";
import ProtectedContent from "@/components/common/ProtectedContent";
import { ReportStatusBadge, PriorityBadge } from "@/components/common/Badge";
import Modal from "@/components/common/Modal";

const STATUS_OPTIONS: { value: ReportStatus | ""; label: string }[] = [
  { value: "", label: "Semua Status" },
  { value: "draft", label: "Draft" },
  { value: "pending_review", label: "Menunggu Review" },
  { value: "finalized", label: "Final" },
  { value: "amended", label: "Amandemen" },
];

interface ReportFormData {
  study_id: number;
  findings: string;
  impression: string;
  technique?: string;
  recommendation?: string;
  priority: ReportPriority;
}

function ReportFormModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ReportFormData>({
    defaultValues: { priority: "routine" },
  });

  const mutation = useMutation({
    mutationFn: reportService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      reset();
      onClose();
    },
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Buat Laporan Radiologi" size="xl">
      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
        {mutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {(mutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Terjadi kesalahan"}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">ID Pemeriksaan (Study) <span className="text-red-500">*</span></label>
            <input type="number" className={`input ${errors.study_id ? "border-red-400" : ""}`}
              {...register("study_id", { required: "Wajib diisi", valueAsNumber: true })} />
            {errors.study_id && <p className="mt-1 text-xs text-red-600">{errors.study_id.message}</p>}
          </div>
          <div>
            <label className="label">Prioritas</label>
            <select className="input" {...register("priority")}>
              <option value="routine">Rutin (24-48 jam)</option>
              <option value="urgent">Urgent (4-8 jam)</option>
              <option value="stat">STAT ({"<"} 1 jam)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">Teknik Pemeriksaan</label>
          <input className="input" placeholder="Teknik yang digunakan" {...register("technique")} />
        </div>

        <div>
          <label className="label">Temuan (Findings) <span className="text-red-500">*</span></label>
          <textarea className={`input resize-none ${errors.findings ? "border-red-400" : ""}`} rows={4}
            placeholder="Deskripsi objektif temuan radiologi..."
            {...register("findings", { required: "Temuan wajib diisi" })} />
          {errors.findings && <p className="mt-1 text-xs text-red-600">{errors.findings.message}</p>}
        </div>

        <div>
          <label className="label">Kesan / Kesimpulan (Impression) <span className="text-red-500">*</span></label>
          <textarea className={`input resize-none ${errors.impression ? "border-red-400" : ""}`} rows={3}
            placeholder="Diagnosis / kesimpulan radiologi..."
            {...register("impression", { required: "Kesan wajib diisi" })} />
          {errors.impression && <p className="mt-1 text-xs text-red-600">{errors.impression.message}</p>}
        </div>

        <div>
          <label className="label">Rekomendasi</label>
          <textarea className="input resize-none" rows={2}
            placeholder="Saran tindak lanjut (opsional)"
            {...register("recommendation")} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Batal</button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? "Menyimpan..." : "Simpan Laporan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function ReportsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "">("");
  const [showForm, setShowForm] = useState(false);
  const [exportingId, setExportingId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["reports", page, statusFilter],
    queryFn: () => reportService.list({ page, size: 20, status: statusFilter || undefined }),
  });

  const finalizeMutation = useMutation({
    mutationFn: (id: number) => reportService.finalize(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  const handleExportPdf = async (id: number, reportNumber: string) => {
    setExportingId(id);
    try {
      await reportService.exportPdf(id, reportNumber);
    } catch (err) {
      console.error("Gagal export PDF:", err);
      alert("Gagal mengunduh PDF. Pastikan backend berjalan.");
    } finally {
      setExportingId(null);
    }
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as ReportStatus | ""); setPage(1); }} className="input w-52 py-1.5 text-sm">
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <ProtectedContent permission="reports:create">
          <button onClick={() => setShowForm(true)} className="btn-primary flex-shrink-0">
            <Plus className="w-4 h-4" />
            Buat Laporan
          </button>
        </ProtectedContent>
      </div>

      <div className="card overflow-hidden">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Laporan Radiologi</h3>
          <span className="text-sm text-gray-500">{data?.total ?? 0} laporan</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">No. Laporan</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Pemeriksaan</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kesan</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Radiolog</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Prioritas</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p>Belum ada laporan</p>
                  </td>
                </tr>
              ) : (
                data?.items.map(report => (
                  <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{report.report_number}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 text-xs">{report.study?.accession_number}</p>
                      <p className="text-xs text-gray-400">{report.study?.modality} — {report.study?.body_part}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs">
                      <p className="truncate text-xs">{report.impression}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{report.radiologist?.full_name ?? "-"}</td>
                    <td className="px-4 py-3"><PriorityBadge priority={report.priority} /></td>
                    <td className="px-4 py-3"><ReportStatusBadge status={report.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {/* Tombol Finalisasi */}
                        <ProtectedContent permission="reports:update">
                          {(report.status === "draft" || report.status === "pending_review") && (
                            <button
                              onClick={() => finalizeMutation.mutate(report.id)}
                              disabled={finalizeMutation.isPending}
                              className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Finalisasi
                            </button>
                          )}
                        </ProtectedContent>

                        {/* Tombol Export PDF */}
                        <ProtectedContent permission="reports:read">
                          <button
                            onClick={() => handleExportPdf(report.id, report.report_number)}
                            disabled={exportingId === report.id}
                            title="Unduh laporan PDF"
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                          >
                            <Download className="w-3.5 h-3.5" />
                            {exportingId === report.id ? "..." : "PDF"}
                          </button>
                        </ProtectedContent>
                      </div>
                    </td>
                  </tr>
                ))
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

      <ReportFormModal isOpen={showForm} onClose={() => setShowForm(false)} />
    </div>
  );
}
