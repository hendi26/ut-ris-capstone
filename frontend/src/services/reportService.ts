import api from "./api";

export type ReportStatus = "draft" | "pending_review" | "finalized" | "amended";
export type ReportPriority = "routine" | "urgent" | "stat";

export interface Report {
  id: number;
  report_number: string;
  study_id: number;
  radiologist_id: number;
  verified_by_id: number | null;
  technique: string | null;
  findings: string;
  impression: string;
  recommendation: string | null;
  internal_notes: string | null;
  status: ReportStatus;
  priority: ReportPriority;
  drafted_at: string | null;
  finalized_at: string | null;
  verified_at: string | null;
  amended_at: string | null;
  amendment_reason: string | null;
  study: { id: number; accession_number: string; modality: string; body_part: string; status: string } | null;
  radiologist: { id: number; full_name: string; role: string } | null;
  verified_by: { id: number; full_name: string; role: string } | null;
  created_at: string;
  updated_at: string;
}

export interface ReportListResponse {
  items: Report[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export const reportService = {
  async list(params?: { page?: number; size?: number; status?: string; radiologist_id?: number }): Promise<ReportListResponse> {
    const { data } = await api.get("/api/v1/reports", { params });
    return data;
  },
  async get(id: number): Promise<Report> {
    const { data } = await api.get(`/api/v1/reports/${id}`);
    return data;
  },
  async create(payload: { study_id: number; findings: string; impression: string; technique?: string; recommendation?: string; priority?: ReportPriority }): Promise<Report> {
    const { data } = await api.post("/api/v1/reports", payload);
    return data;
  },
  async update(id: number, payload: Partial<Report>): Promise<Report> {
    const { data } = await api.patch(`/api/v1/reports/${id}`, payload);
    return data;
  },
  async finalize(id: number, verified_by_id?: number): Promise<Report> {
    const { data } = await api.post(`/api/v1/reports/${id}/finalize`, { verified_by_id });
    return data;
  },
  async amend(id: number, reason: string): Promise<Report> {
    const { data } = await api.post(`/api/v1/reports/${id}/amend`, { reason });
    return data;
  },
  /**
   * Export laporan ke PDF.
   * Menggunakan responseType blob agar binary PDF tidak di-parse sebagai JSON.
   * Trigger download otomatis di browser menggunakan URL.createObjectURL.
   */
  async exportPdf(id: number, reportNumber: string): Promise<void> {
    const response = await api.get(`/api/v1/reports/${id}/export`, {
      responseType: "blob",
    });
    const blob = new Blob([response.data], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filename = `laporan_${reportNumber.replace(/\//g, "-")}.pdf`;
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
