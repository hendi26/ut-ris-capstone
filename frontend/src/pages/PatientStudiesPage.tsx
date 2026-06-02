import { useQuery } from "@tanstack/react-query";
import { Stethoscope } from "lucide-react";

import { PageLoader } from "@/components/common/LoadingSpinner";
import { StudyStatusBadge } from "@/components/common/Badge";
import {
  patientPortalService,
  PatientStudy,
} from "@/services/patientPortalService";

export default function PatientStudiesPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["patient-studies"],
    queryFn: () => patientPortalService.getStudies(),
  });

  if (isLoading) {
    return <PageLoader />;
  }

  if (isError) {
    return (
      <div className="p-6 text-sm text-red-500">
        Gagal memuat data pemeriksaan.
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-gray-500" />
            <h1 className="text-base font-medium text-gray-800">
              Pemeriksaan Saya
            </h1>
          </div>
          <span className="text-sm text-gray-500">
            {data?.items.length ?? 0} pemeriksaan
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Accession No.
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Modalitas
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Bagian Tubuh
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Jadwal
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {data?.items.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    <Stethoscope className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p>Belum ada pemeriksaan</p>
                  </td>
                </tr>
              ) : (
                data?.items.map((study: PatientStudy) => (
                  <tr
                    key={study.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {study.accession_number}
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge-blue">{study.modality}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {study.body_part}
                    </td>
                    <td className="px-4 py-3">
                      <StudyStatusBadge status={study.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {study.scheduled_at
                        ? new Date(study.scheduled_at).toLocaleString("id-ID")
                        : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}