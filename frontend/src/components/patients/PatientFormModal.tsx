import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Modal from "@/components/common/Modal";
import api from "@/services/api";

interface PatientFormData {
  full_name: string;
  date_of_birth: string;
  gender: "L" | "P";
  nik?: string;
  phone_number?: string;
  address?: string;
  blood_type?: string;
  allergies?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const BLOOD_TYPES = ["A", "B", "AB", "O", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function PatientFormModal({ isOpen, onClose }: Props) {
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<PatientFormData>();

  const mutation = useMutation({
    mutationFn: (data: PatientFormData) => api.post("/api/v1/patients", data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      reset();
      onClose();
    },
  });

  const onSubmit = (data: PatientFormData) => mutation.mutate(data);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Daftarkan Pasien Baru" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {mutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {(mutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Terjadi kesalahan"}
          </div>
        )}

        {/* Nama Lengkap */}
        <div>
          <label className="label">Nama Lengkap <span className="text-red-500">*</span></label>
          <input
            className={`input ${errors.full_name ? "border-red-400" : ""}`}
            placeholder="Nama lengkap pasien"
            {...register("full_name", { required: "Nama lengkap wajib diisi" })}
          />
          {errors.full_name && <p className="mt-1 text-xs text-red-600">{errors.full_name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Tanggal Lahir */}
          <div>
            <label className="label">Tanggal Lahir <span className="text-red-500">*</span></label>
            <input
              type="date"
              className={`input ${errors.date_of_birth ? "border-red-400" : ""}`}
              {...register("date_of_birth", { required: "Tanggal lahir wajib diisi" })}
            />
            {errors.date_of_birth && <p className="mt-1 text-xs text-red-600">{errors.date_of_birth.message}</p>}
          </div>

          {/* Jenis Kelamin */}
          <div>
            <label className="label">Jenis Kelamin <span className="text-red-500">*</span></label>
            <select
              className={`input ${errors.gender ? "border-red-400" : ""}`}
              {...register("gender", { required: "Jenis kelamin wajib dipilih" })}
            >
              <option value="">Pilih...</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
            {errors.gender && <p className="mt-1 text-xs text-red-600">{errors.gender.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* NIK */}
          <div>
            <label className="label">NIK</label>
            <input
              className="input"
              placeholder="16 digit NIK"
              maxLength={16}
              {...register("nik", {
                minLength: { value: 16, message: "NIK harus 16 digit" },
                maxLength: { value: 16, message: "NIK harus 16 digit" },
                pattern: { value: /^\d+$/, message: "NIK hanya angka" },
              })}
            />
            {errors.nik && <p className="mt-1 text-xs text-red-600">{errors.nik.message}</p>}
          </div>

          {/* No. Telepon */}
          <div>
            <label className="label">No. Telepon</label>
            <input
              className="input"
              placeholder="08xxxxxxxxxx"
              {...register("phone_number")}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Golongan Darah */}
          <div>
            <label className="label">Golongan Darah</label>
            <select className="input" {...register("blood_type")}>
              <option value="">Tidak diketahui</option>
              {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
            </select>
          </div>
        </div>

        {/* Alamat */}
        <div>
          <label className="label">Alamat</label>
          <textarea
            className="input resize-none"
            rows={2}
            placeholder="Alamat lengkap"
            {...register("address")}
          />
        </div>

        {/* Alergi */}
        <div>
          <label className="label">Alergi</label>
          <input
            className="input"
            placeholder="Contoh: Penisilin, Aspirin"
            {...register("allergies")}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Batal
          </button>
          <button type="submit" disabled={isSubmitting || mutation.isPending} className="btn-primary">
            {mutation.isPending ? "Menyimpan..." : "Daftarkan Pasien"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
