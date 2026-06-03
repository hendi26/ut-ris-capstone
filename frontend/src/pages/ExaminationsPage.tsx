import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Stethoscope, Filter, ExternalLink, Activity, Wifi, Images, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { studyService, StudyStatus, Modality, Study } from "@/services/studyService";
import { pacsService } from "@/services/pacsService";
import { PageLoader } from "@/components/common/LoadingSpinner";
import ProtectedContent from "@/components/common/ProtectedContent";
import { StudyStatusBadge } from "@/components/common/Badge";
import Modal from "@/components/common/Modal";

const ORTHANC_VIEWER_URL = import.meta.env.VITE_ORTHANC_URL ?? "http://localhost:8042";

const MODALITIES: Modality[] = ["CR", "DX", "CT", "MR", "US", "MG", "NM", "PT", "XA", "RF"];
const BODY_PARTS = [
  "Thorax", "Abdomen", "Kepala", "Leher", "Tulang Belakang",
  "Pelvis", "Ekstremitas Atas", "Ekstremitas Bawah",
];

const STATUS_OPTIONS: { value: StudyStatus | ""; label: string }[] = [
  { value: "", label: "Semua Status" },
  { value: "scheduled", label: "Terjadwal" },
  { value: "in_progress", label: "Berlangsung" },
  { value: "completed", label: "Selesai" },
  { value: "reported", label: "Dilaporkan" },
  { value: "cancelled", label: "Dibatalkan" },
];

const NEXT_STATUS: Partial<Record<StudyStatus, { label: string; value: StudyStatus }>> = {
  scheduled: { label: "Mulai", value: "in_progress" },
  in_progress: { label: "Selesai", value: "completed" },
};

/* ─── PACS Status Banner ────────────────────────────────────────────── */
function PacsStatusBanner() {
  const { data } = useQuery({
    queryKey: ["pacs-health"],
    queryFn: pacsService.checkHealth,
    refetchInterval: 60_000,
    retry: false,
  });

  if (!data) return null;

  const isLive = data.status === "connected";

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm ${
      isLive
        ? "bg-green-50 border-green-200 text-green-800"
        : "bg-blue-50 border-blue-200 text-blue-800"
    }`}>
      {isLive
        ? <Wifi className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-600" />
        : <Activity className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
      }
      <div>
        <span className="font-medium">
          {isLive ? "PACS Terhubung" : "PACS Mode Simulasi"}
        </span>
        {isLive ? (
          <span className="ml-2 text-green-700">
            Orthanc v{data.orthanc_version} · AET: {data.dicom_aet} · {data.count_studies} studies
          </span>
        ) : (
          <span className="ml-2 text-blue-700">
            Orthanc belum aktif. {data.count_studies} study simulasi tersedia.
            Klik tombol <strong>PACS</strong> untuk melihat detail DICOM.
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── PACS Detail Modal ─────────────────────────────────────────────── */
interface PacsDetailModalProps {
  study: Study | null;
  onClose: () => void;
}

function PacsDetailModal({ study, onClose }: PacsDetailModalProps) {
  const isOpen = !!study;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["pacs-by-accession", study?.accession_number],
    queryFn: () => pacsService.getByAccession(study!.accession_number),
    enabled: !!study,
  });

  const { data: seriesData, isLoading: seriesLoading } = useQuery({
    queryKey: ["pacs-series", study?.study_instance_uid],
    queryFn: () => pacsService.getSeries(study!.study_instance_uid),
    enabled: !!study,
  });

  // Helper: baca nilai dari tag DICOM
  const tag = (obj: Record<string, unknown> | undefined, t: string): string => {
    if (!obj) return "-";
    const entry = obj[t] as { Value?: unknown[] } | undefined;
    const val = entry?.Value?.[0];
    if (!val) return "-";
    if (typeof val === "object" && val !== null && "Alphabetic" in val) {
      return (val as { Alphabetic: string }).Alphabetic;
    }
    return String(val);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detail PACS" size="xl">
      {isLoading ? (
        <div className="py-8 text-center text-gray-500 text-sm">Memuat data PACS...</div>
      ) : isError ? (
        <div className="py-6 text-center text-red-500 text-sm">Gagal memuat data PACS.</div>
      ) : (
        <div className="space-y-5">
          {/* RIS Info */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Data RIS</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div><p className="text-xs text-gray-500">Accession No.</p><p className="font-mono font-medium">{study?.accession_number}</p></div>
              <div><p className="text-xs text-gray-500">Study UID</p><p className="font-mono text-xs truncate">{study?.study_instance_uid}</p></div>
              <div><p className="text-xs text-gray-500">Modalitas</p><p className="font-medium">{study?.modality}</p></div>
              <div><p className="text-xs text-gray-500">Bagian Tubuh</p><p>{study?.body_part}</p></div>
              <div><p className="text-xs text-gray-500">Status</p><p>{study?.status}</p></div>
              <div><p className="text-xs text-gray-500">Pasien</p><p>{study?.patient?.full_name ?? "-"}</p></div>
            </div>
          </div>

          {/* PACS data */}
          {data?.pacs_results?.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5" />
                Data DICOM dari PACS
              </p>
              {data.pacs_results.map((s: Record<string, unknown>, i: number) => (
                <div key={i} className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div><p className="text-xs text-blue-500">Study Date</p><p className="font-medium">{tag(s, "00080020")}</p></div>
                  <div><p className="text-xs text-blue-500">Modality</p><p className="font-medium">{tag(s, "00080060")}</p></div>
                  <div><p className="text-xs text-blue-500">Patient</p><p className="font-medium">{tag(s, "00100010")}</p></div>
                  <div><p className="text-xs text-blue-500">Study Desc.</p><p>{tag(s, "00081030")}</p></div>
                  <div><p className="text-xs text-blue-500">Series</p><p>{tag(s, "00201206")}</p></div>
                  <div><p className="text-xs text-blue-500">Instances</p><p>{tag(s, "00201208")}</p></div>
                </div>
              ))}
              {data.pacs_results[0]?.pacs_source === "mock" && (
                <p className="text-xs text-blue-500 mt-2 italic">* Data simulasi — jalankan Orthanc untuk data DICOM nyata</p>
              )}
            </div>
          )}

          {/* Series list */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Series ({seriesData?.series_count ?? 0})
            </p>
            {seriesLoading ? (
              <p className="text-sm text-gray-400">Memuat series...</p>
            ) : (
              <div className="space-y-1">
                {(seriesData?.series ?? []).map((s: Record<string, unknown>, i: number) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded border border-gray-200 text-xs">
                    <span className="font-medium text-gray-700">Series {tag(s, "00200011")}</span>
                    <span className="text-gray-500">{tag(s, "0008103E")}</span>
                    <span className="ml-auto text-gray-400">{tag(s, "00201209")} instances</span>
                  </div>
                ))}
                {(seriesData?.series ?? []).length === 0 && (
                  <p className="text-sm text-gray-400 italic">Tidak ada series.</p>
                )}
              </div>
            )}
          </div>

          {/* Open Viewer */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Viewer PACS menggunakan Orthanc Web Explorer
            </p>
            <a
              href={`${ORTHANC_VIEWER_URL}/app/explorer.html`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 btn-primary text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Buka PACS Viewer
            </a>
          </div>
        </div>
      )}
    </Modal>
  );
}


/* ─── Image Viewer Modal ────────────────────────────────────────────── */
const API_BASE = import.meta.env.VITE_API_URL ?? "https://hendiateng26-utris-backend.hf.space";

function ImageViewerModal({ studyId, studyName, onClose }: { studyId: number | null; studyName: string; onClose: () => void }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const isOpen = studyId !== null;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["study-images", studyId],
    queryFn: async () => {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/api/v1/studies/${studyId}/images`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Gagal memuat gambar");
      return res.json() as Promise<{ study_id: number; total_images: number; images: string[] }>;
    },
    enabled: isOpen,
  });

  const images = data?.images ?? [];
  const total = images.length;

  const prev = () => setCurrentIdx(i => (i - 1 + total) % total);
  const next = () => setCurrentIdx(i => (i + 1) % total);

  // Reset index saat study berubah
  useEffect(() => { setCurrentIdx(0); }, [studyId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div
        className="relative bg-gray-900 rounded-xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-800 border-b border-gray-700">
          <div>
            <h3 className="font-semibold text-white text-sm">{studyName}</h3>
            {total > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">{currentIdx + 1} / {total} gambar</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="relative flex items-center justify-center bg-black min-h-[400px]">
          {isLoading ? (
            <div className="text-gray-400 text-sm">Memuat gambar...</div>
          ) : isError || total === 0 ? (
            <div className="text-center text-gray-500 py-16">
              <Images className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Gambar tidak tersedia</p>
            </div>
          ) : (
            <>
              <img
                src={`${API_BASE}${images[currentIdx]}`}
                alt={`Image ${currentIdx + 1}`}
                className="max-h-[500px] max-w-full object-contain"
              />
              {total > 1 && (
                <>
                  <button
                    onClick={prev}
                    className="absolute left-3 bg-black/50 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={next}
                    className="absolute right-3 bg-black/50 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </>
          )}
        </div>

        {/* Thumbnail strip */}
        {total > 1 && (
          <div className="flex gap-2 px-4 py-3 bg-gray-800 overflow-x-auto">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setCurrentIdx(i)}
                className={`flex-shrink-0 w-14 h-14 rounded overflow-hidden border-2 transition-colors ${
                  i === currentIdx ? "border-blue-400" : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <img src={`${API_BASE}${img}`} alt={`thumb-${i}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Study Form Modal ──────────────────────────────────────────────── */
interface StudyFormData {
  patient_id: number;
  modality: Modality;
  body_part: string;
  clinical_indication?: string;
  procedure_description?: string;
  appointment_id?: number;
}

function StudyFormModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<StudyFormData>();

  const mutation = useMutation({
    mutationFn: studyService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studies"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      reset();
      onClose();
    },
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Buat Pemeriksaan Baru" size="lg">
      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
        {mutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {(mutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Terjadi kesalahan"}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">ID Pasien <span className="text-red-500">*</span></label>
            <input type="number" className={`input ${errors.patient_id ? "border-red-400" : ""}`}
              {...register("patient_id", { required: "Wajib diisi", valueAsNumber: true })} />
            {errors.patient_id && <p className="mt-1 text-xs text-red-600">{errors.patient_id.message}</p>}
          </div>
          <div>
            <label className="label">ID Jadwal (opsional)</label>
            <input type="number" className="input" placeholder="Dari appointment"
              {...register("appointment_id", {
                setValueAs: (v) => (v === "" || v === undefined ? undefined : Number(v)),
              })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Modalitas <span className="text-red-500">*</span></label>
            <select className={`input ${errors.modality ? "border-red-400" : ""}`}
              {...register("modality", { required: "Wajib dipilih" })}>
              <option value="">Pilih...</option>
              {MODALITIES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            {errors.modality && <p className="mt-1 text-xs text-red-600">{errors.modality.message}</p>}
          </div>
          <div>
            <label className="label">Bagian Tubuh <span className="text-red-500">*</span></label>
            <select className={`input ${errors.body_part ? "border-red-400" : ""}`}
              {...register("body_part", { required: "Wajib dipilih" })}>
              <option value="">Pilih...</option>
              {BODY_PARTS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            {errors.body_part && <p className="mt-1 text-xs text-red-600">{errors.body_part.message}</p>}
          </div>
        </div>
        <div>
          <label className="label">Prosedur</label>
          <input className="input" placeholder="Contoh: Thorax PA, CT Kepala tanpa kontras"
            {...register("procedure_description")} />
        </div>
        <div>
          <label className="label">Indikasi Klinis</label>
          <textarea className="input resize-none" rows={2} {...register("clinical_indication")} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Batal</button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? "Menyimpan..." : "Buat Pemeriksaan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────── */
export default function ExaminationsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StudyStatus | "">("");
  const [showForm, setShowForm] = useState(false);
  const [pacsStudy, setPacsStudy] = useState<Study | null>(null);
  const [imageStudyId, setImageStudyId] = useState<number | null>(null);
  const [imageStudyName, setImageStudyName] = useState<string>("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["studies", page, statusFilter],
    queryFn: () => studyService.list({ page, size: 20, status: statusFilter || undefined }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: StudyStatus }) =>
      studyService.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studies"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5">
      {/* PACS Status */}
      <PacsStatusBanner />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value as StudyStatus | ""); setPage(1); }}
            className="input w-48 py-1.5 text-sm"
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <ProtectedContent permission="studies:create">
          <button onClick={() => setShowForm(true)} className="btn-primary flex-shrink-0">
            <Plus className="w-4 h-4" />
            Buat Pemeriksaan
          </button>
        </ProtectedContent>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Pemeriksaan Radiologi</h3>
          <span className="text-sm text-gray-500">{data?.total ?? 0} pemeriksaan</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Accession No.</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Pasien</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Modalitas</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Prosedur</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Radiolog</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    <Stethoscope className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p>Belum ada pemeriksaan</p>
                  </td>
                </tr>
              ) : (
                data?.items.map(study => {
                  const nextAction = NEXT_STATUS[study.status];
                  return (
                    <tr key={study.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{study.accession_number}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{study.patient?.full_name ?? "-"}</p>
                        <p className="text-xs text-gray-400">{study.patient?.medical_record_number}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge-blue">{study.modality}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{study.procedure_description ?? study.body_part}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {study.performing_radiologist?.full_name ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        <StudyStatusBadge status={study.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ProtectedContent permission="studies:update">
                            {nextAction && (
                              <button
                                onClick={() => updateMutation.mutate({ id: study.id, status: nextAction.value })}
                                disabled={updateMutation.isPending}
                                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                              >
                                {nextAction.label}
                              </button>
                            )}
                          </ProtectedContent>
                          {/* Open PACS */}
                          <button
                            onClick={() => setPacsStudy(study)}
                            title="Lihat detail PACS / DICOM"
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            <Activity className="w-3.5 h-3.5" />
                            PACS
                          </button>
                          {/* Lihat Gambar */}
                          <button
                            onClick={() => { setImageStudyId(study.id); setImageStudyName(`${study.modality} — ${study.body_part}`); }}
                            title="Lihat gambar radiologi"
                            className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                          >
                            <Images className="w-3.5 h-3.5" />
                            Gambar
                          </button>
                        </div>
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

      <StudyFormModal isOpen={showForm} onClose={() => setShowForm(false)} />
      <PacsDetailModal study={pacsStudy} onClose={() => setPacsStudy(null)} />
      <ImageViewerModal studyId={imageStudyId} studyName={imageStudyName} onClose={() => setImageStudyId(null)} />
    </div>
  );
}
