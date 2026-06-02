import api from "./api";

export type StudyStatus = "scheduled" | "in_progress" | "completed" | "reported" | "cancelled";
export type Modality = "CR" | "DX" | "CT" | "MR" | "US" | "MG" | "NM" | "PT" | "XA" | "RF";

export interface Study {
  id: number;
  study_instance_uid: string;
  accession_number: string;
  patient_id: number;
  appointment_id: number | null;
  referring_doctor_id: number | null;
  performing_radiologist_id: number | null;
  modality: Modality;
  body_part: string;
  clinical_indication: string | null;
  procedure_description: string | null;
  status: StudyStatus;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  technician_notes: string | null;
  patient: { id: number; full_name: string; medical_record_number: string } | null;
  referring_doctor: { id: number; full_name: string; role: string } | null;
  performing_radiologist: { id: number; full_name: string; role: string } | null;
  created_at: string;
  updated_at: string;
}

export interface StudyListResponse {
  items: Study[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export const studyService = {
  async list(params?: { page?: number; size?: number; status?: string; modality?: string; patient_id?: number }): Promise<StudyListResponse> {
    const { data } = await api.get("/api/v1/studies", { params });
    return data;
  },
  async get(id: number): Promise<Study> {
    const { data } = await api.get(`/api/v1/studies/${id}`);
    return data;
  },
  async create(payload: Partial<Study>): Promise<Study> {
    const { data } = await api.post("/api/v1/studies", payload);
    return data;
  },
  async update(id: number, payload: Partial<Study>): Promise<Study> {
    const { data } = await api.patch(`/api/v1/studies/${id}`, payload);
    return data;
  },
};
