import { useQuery } from "@tanstack/react-query";
import { FileText, Download } from "lucide-react";
import { useState } from "react";

import { PageLoader } from "@/components/common/LoadingSpinner";
import { ReportStatusBadge, PriorityBadge } from "@/components/common/Badge";
import {
  patientPortalService,
  PatientReport,
} from "@/services/patientPortalService";
import api from "@/services/api";

export default function PatientReportsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["patient-reports"],
    queryFn: () => patientPortalService.getReports(),
  });

  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const handleDownloadPdf = async (report: PatientReport) => {
    setDownloadingId(report.id);
    try {
      const response = await api.get(`/api/v1/patient/my-reports/${report.id}/export`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `laporan_${report.report_number.replace(/\//g, "-")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Gagal download PDF:", err);
      alert("Gagal mengunduh PDF. Coba lagi.");
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) {
    return <PageLoader />;
  }

  if (isError) {
    return (
      <div className="p-6 text-sm text-red-500">
        Gagal memuat laporan.
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-500" />
            <h1 className="text-base font-medium text-gray-800">
              Laporan Saya
            </h1>
          </div>
          <span className="text-sm text-gray-500">
            {data?.items.length ?? 0} laporan
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Report Number
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Priority
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Impression
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Dibuat
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {data?.items.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p>Belum ada laporan</p>
                  </td>
                </tr>
              ) : (
                data?.items.map((report: PatientReport) => (
                  <tr
                    key={report.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {report.report_number}
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={report.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <ReportStatusBadge status={report.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-md">
                      {report.impression}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(report.created_at).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDownloadPdf(report)}
                        disabled={downloadingId === report.id}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Download className="w-3.5 h-3.5" />
                        {downloadingId === report.id ? "..." : "PDF"}
                      </button>
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