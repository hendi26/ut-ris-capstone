import { useQuery } from "@tanstack/react-query";
import { UserCircle } from "lucide-react";

import { PageLoader } from "@/components/common/LoadingSpinner";
import {
  patientPortalService,
  PatientProfile,
} from "@/services/patientPortalService";

function ProfileItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </p>

      <p className="mt-1 text-sm text-gray-900">
        {value || "-"}
      </p>
    </div>
  );
}

export default function PatientProfilePage() {
  const {
    data,
    isLoading,
    isError,
  } = useQuery<PatientProfile>({
    queryKey: ["patient-profile"],
    queryFn: () =>
      patientPortalService.getProfile(),
  });

  if (isLoading) {
    return <PageLoader />;
  }

  if (isError || !data) {
    return (
      <div className="card p-6">
        <p className="text-red-600">
          Gagal memuat profil pasien.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-gray-900">
            Profil Pasien
          </h2>
        </div>

        <div className="p-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
            <UserCircle className="w-10 h-10 text-primary-600" />
          </div>

          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              {data.full_name}
            </h3>

            <p className="text-sm text-gray-500">
              {data.medical_record_number}
            </p>
          </div>
        </div>
      </div>

      {/* Detail */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">
            Informasi Pasien
          </h3>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ProfileItem
            label="Nomor Rekam Medis"
            value={data.medical_record_number}
          />

          <ProfileItem
            label="Nama Lengkap"
            value={data.full_name}
          />

          <ProfileItem
            label="NIK"
            value={data.nik}
          />

          <ProfileItem
            label="Tanggal Lahir"
            value={data.date_of_birth}
          />

          <ProfileItem
            label="Jenis Kelamin"
            value={
              data.gender === "L"
                ? "Laki-laki"
                : "Perempuan"
            }
          />

          <ProfileItem
            label="Nomor Telepon"
            value={data.phone_number}
          />

          <ProfileItem
            label="Golongan Darah"
            value={data.blood_type}
          />

          <ProfileItem
            label="Alergi"
            value={data.allergies}
          />

          <div className="md:col-span-2 lg:col-span-3">
            <ProfileItem
              label="Alamat"
              value={data.address}
            />
          </div>
        </div>
      </div>
    </div>
  );
}