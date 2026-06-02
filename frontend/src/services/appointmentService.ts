import api from "./api";

export type AppointmentStatus = "pending" | "confirmed" | "checked_in" | "completed" | "cancelled" | "no_show";
export type AppointmentPriority = "routine" | "urgent" | "emergency";

export interface Appointment {
  id: number;
  appointment_number: string;
  patient_id: number;
  referring_doctor_id: number | null;
  created_by_id: number | null;
  requested_modality: string;
  body_part: string;
  clinical_indication: string | null;
  preparation_instructions: string | null;
  scheduled_datetime: string;
  estimated_duration_minutes: number;
  status: AppointmentStatus;
  priority: AppointmentPriority;
  notes: string | null;
  cancellation_reason: string | null;
  checked_in_at: string | null;
  patient: { id: number; full_name: string; medical_record_number: string } | null;
  referring_doctor: { id: number; full_name: string; role: string } | null;
  created_at: string;
  updated_at: string;
}

export interface AppointmentListResponse {
  items: Appointment[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface CreateAppointmentData {
  patient_id: number;
  requested_modality: string;
  body_part: string;
  scheduled_datetime: string;
  clinical_indication?: string;
  preparation_instructions?: string;
  estimated_duration_minutes?: number;
  priority?: AppointmentPriority;
  notes?: string;
  referring_doctor_id?: number;
}

export const appointmentService = {
  async list(params?: { page?: number; size?: number; status?: string; patient_id?: number }): Promise<AppointmentListResponse> {
    const { data } = await api.get("/api/v1/appointments", { params });
    return data;
  },
  async get(id: number): Promise<Appointment> {
    const { data } = await api.get(`/api/v1/appointments/${id}`);
    return data;
  },
  async create(payload: CreateAppointmentData): Promise<Appointment> {
    const { data } = await api.post("/api/v1/appointments", payload);
    return data;
  },
  async update(id: number, payload: Partial<Appointment>): Promise<Appointment> {
    const { data } = await api.patch(`/api/v1/appointments/${id}`, payload);
    return data;
  },
  async cancel(id: number, reason?: string): Promise<Appointment> {
    const { data } = await api.post(`/api/v1/appointments/${id}/cancel`, null, {
      params: reason ? { reason } : undefined,
    });
    return data;
  },
};
