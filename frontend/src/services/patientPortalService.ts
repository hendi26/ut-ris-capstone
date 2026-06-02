import api from "./api";

/* =====================================================
 * PROFILE
 * ===================================================== */

export interface PatientProfile {
  id: number;
  medical_record_number: string;
  full_name: string;
  nik: string | null;
  date_of_birth: string;
  gender: string;
  phone_number: string | null;
  address: string | null;
  blood_type: string | null;
  allergies: string | null;
}

/* =====================================================
 * STUDIES
 * ===================================================== */

export interface PatientStudy {
  id: number;
  accession_number: string;
  modality: string;
  body_part: string;
  status: string;
  clinical_indication: string | null;
  procedure_description: string | null;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientStudyListResponse {
  items: PatientStudy[];
}

/* =====================================================
 * REPORTS
 * ===================================================== */

export interface PatientReport {
  id: number;
  report_number: string;
  study_id: number;
  status: string;
  priority: string;
  findings: string;
  impression: string;
  recommendation: string | null;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientReportListResponse {
  items: PatientReport[];
}

/* =====================================================
 * SERVICE
 * ===================================================== */

export const patientPortalService = {
  async getProfile(): Promise<PatientProfile> {
    const { data } = await api.get(
      "/api/v1/patient/me"
    );

    return data;
  },

  async getStudies(): Promise<PatientStudyListResponse> {
    const { data } = await api.get(
      "/api/v1/patient/my-studies"
    );

    return data;
  },

  async getStudy(
    studyId: number
  ): Promise<PatientStudy> {
    const { data } = await api.get(
      `/api/v1/patient/my-studies/${studyId}`
    );

    return data;
  },

  async getReports(): Promise<PatientReportListResponse> {
    const { data } = await api.get(
      "/api/v1/patient/my-reports"
    );

    return data;
  },

  async getReport(
    reportId: number
  ): Promise<PatientReport> {
    const { data } = await api.get(
      `/api/v1/patient/my-reports/${reportId}`
    );

    return data;
  },
};