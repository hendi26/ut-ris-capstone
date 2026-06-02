/**
 * PACS Service (Frontend)
 * 
 * Client untuk mengakses endpoint integrasi PACS di backend.
 * Backend meneruskan permintaan ke Orthanc via DICOMweb (QIDO-RS / WADO-RS).
 * 
 * Catatan: Orthanc digunakan sebagai PACS simulasi selama fase capstone.
 * Koneksi ke PACS produksi RSI Bogor direncanakan setelah validasi sistem.
 */

import api from "./api";

export interface PacsHealthStatus {
  status: "connected" | "disconnected" | "error";
  orthanc_version?: string;
  dicom_aet?: string;
  storage_size_mb?: number;
  count_studies?: number;
  detail?: string;
}

export interface PacsStudySearchResult {
  total: number;
  offset: number;
  studies: Record<string, unknown>[];
}

export const pacsService = {
  /**
   * Cek konektivitas ke Orthanc PACS.
   */
  async checkHealth(): Promise<PacsHealthStatus> {
    const { data } = await api.get("/api/v1/pacs/health");
    return data;
  },

  /**
   * QIDO-RS: Cari studies di PACS berdasarkan filter.
   */
  async searchStudies(params?: {
    patient_id?: string;
    accession_number?: string;
    study_date?: string;
    modality?: string;
    limit?: number;
    offset?: number;
  }): Promise<PacsStudySearchResult> {
    const { data } = await api.get("/api/v1/pacs/studies", { params });
    return data;
  },

  /**
   * Cari study PACS berdasarkan accession number RIS.
   * Menghubungkan data RIS dengan data PACS.
   */
  async getByAccession(accessionNumber: string) {
    const { data } = await api.get(`/api/v1/pacs/studies/by-accession/${accessionNumber}`);
    return data;
  },

  /**
   * QIDO-RS: Ambil daftar series dalam sebuah study.
   */
  async getSeries(studyInstanceUid: string) {
    const { data } = await api.get(`/api/v1/pacs/studies/${studyInstanceUid}/series`);
    return data;
  },

  /**
   * WADO-RS: Ambil metadata lengkap sebuah study (tanpa pixel data).
   */
  async getStudyMetadata(studyInstanceUid: string) {
    const { data } = await api.get(`/api/v1/pacs/studies/${studyInstanceUid}/metadata`);
    return data;
  },
};
