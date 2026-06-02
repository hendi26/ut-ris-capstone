import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Modal from "@/components/common/Modal";
import { appointmentService, CreateAppointmentData } from "@/services/appointmentService";

const MODALITIES = ["CR", "DX", "CT", "MR", "US", "MG", "NM", "PT", "XA", "RF"];
const BODY_PARTS = [
  "Thorax", "Abdomen", "Kepala", "Leher", "Tulang Belakang",
  "Pelvis", "Ekstremitas Atas", "Ekstremitas Bawah", "Seluruh Tubuh",
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patientId?: number;
}

export default function AppointmentFormModal({ isOpen, onClose, patientId }: Props) {
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<CreateAppointmentData>({
      defaultValues: {
        patient_id: patientId,
        estimated_duration_minutes: 30,
        priority: "routine",
      },
    });

  const mutation = useMutation({
    mutationFn: appointmentService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      reset();
      onClose();
    },
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Buat Jadwal Pemeriksaan" size="lg">
      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
        {mutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {(mutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Terjadi kesalahan"}
          </div>
        )}

        {/* Patient ID (hidden jika sudah ada) */}
        {!patientId && (
          <div>
            <label className="label">ID Pasien <span className="text-red-500">*</span></label>
            <input
              type="number"
              className={`input ${errors.patient_id ? "border-red-400" : ""}`}
              placeholder="Masukkan ID pasien"
              {...register("patient_id", { required: "ID pasien wajib diisi", valueAsNumber: true })}
            />
            {errors.patient_id && <p className="mt-1 text-xs text-red-600">{errors.patient_id.message}</p>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Modalitas */}
          <div>
            <label className="label">Modalitas <span className="text-red-500">*</span></label>
            <select
              className={`input ${errors.requested_modality ? "border-red-400" : ""}`}
              {...register("requested_modality", { required: "Modalitas wajib dipilih" })}
            >
              <option value="">Pilih modalitas...</option>
              {MODALITIES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            {errors.requested_modality && <p className="mt-1 text-xs text-red-600">{errors.requested_modality.message}</p>}
          </div>

          {/* Bagian Tubuh */}
          <div>
            <label className="label">Bagian Tubuh <span className="text-red-500">*</span></label>
            <select
              className={`input ${errors.body_part ? "border-red-400" : ""}`}
              {...register("body_part", { required: "Bagian tubuh wajib dipilih" })}
            >
              <option value="">Pilih bagian tubuh...</option>
              {BODY_PARTS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            {errors.body_part && <p className="mt-1 text-xs text-red-600">{errors.body_part.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Jadwal */}
          <div>
            <label className="label">Tanggal & Waktu <span className="text-red-500">*</span></label>
            <input
              type="datetime-local"
              className={`input ${errors.scheduled_datetime ? "border-red-400" : ""}`}
              {...register("scheduled_datetime", { required: "Jadwal wajib diisi" })}
            />
            {errors.scheduled_datetime && <p className="mt-1 text-xs text-red-600">{errors.scheduled_datetime.message}</p>}
          </div>

          {/* Prioritas */}
          <div>
            <label className="label">Prioritas</label>
            <select className="input" {...register("priority")}>
              <option value="routine">Rutin</option>
              <option value="urgent">Urgent</option>
              <option value="emergency">Darurat</option>
            </select>
          </div>
        </div>

        {/* Indikasi Klinis */}
        <div>
          <label className="label">Indikasi Klinis</label>
          <textarea
            className="input resize-none"
            rows={2}
            placeholder="Deskripsi klinis / alasan pemeriksaan"
            {...register("clinical_indication")}
          />
        </div>

        {/* Instruksi Persiapan */}
        <div>
          <label className="label">Instruksi Persiapan</label>
          <input
            className="input"
            placeholder="Contoh: Puasa 6 jam sebelum pemeriksaan"
            {...register("preparation_instructions")}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Batal</button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? "Menyimpan..." : "Buat Jadwal"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
