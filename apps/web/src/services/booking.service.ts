const API_BASE = '/api/v1/booking';

export interface SlotInfo {
  time: string;
  available: boolean;
}

export interface DoctorInfo {
  id: string;
  name: string;
  specialty: string;
  crm: string;
}

export interface BookingResult {
  id: string;
  scheduledAt: string;
  status: string;
}

export interface CreateBookingPayload {
  doctorId: string;
  date: string;
  time: string;
  patientName: string;
  patientCpf: string;
  patientPhone: string;
  insuranceProvider?: string;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro ao buscar dados: ${res.status} — ${text}`);
  }
  return res.json() as Promise<T>;
}

export function getSpecialties(tenantSlug: string): Promise<string[]> {
  return fetchJson<string[]>(`${API_BASE}/${tenantSlug}/specialties`);
}

export function getDoctors(
  tenantSlug: string,
  specialty?: string,
): Promise<DoctorInfo[]> {
  const params = specialty ? `?specialty=${encodeURIComponent(specialty)}` : '';
  return fetchJson<DoctorInfo[]>(
    `${API_BASE}/${tenantSlug}/doctors${params}`,
  );
}

export function getAvailableSlots(
  tenantSlug: string,
  doctorId: string,
  date: string,
): Promise<SlotInfo[]> {
  return fetchJson<SlotInfo[]>(
    `${API_BASE}/${tenantSlug}/slots?doctorId=${encodeURIComponent(doctorId)}&date=${encodeURIComponent(date)}`,
  );
}

export function createAppointment(
  tenantSlug: string,
  data: CreateBookingPayload,
): Promise<BookingResult> {
  return fetchJson<BookingResult>(
    `${API_BASE}/${tenantSlug}/appointments`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
}
