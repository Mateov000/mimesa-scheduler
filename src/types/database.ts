export type EventCategory =
  | 'facultad'
  | 'trabajo'
  | 'batch_cooking'
  | 'sueno'
  | 'social'
  | 'citas'
  | 'gym'
  | 'ocio'
  | 'commute';

export type LocationType =
  | 'casa'
  | 'exterior'
  | 'interior'
  | 'depto_contacto'
  | 'facultad'
  | 'trabajo_rambla'
  | 'trabajo_ferro';

export interface Contact {
  id: string;
  name: string;
  relationship?: string; // 'ex' | 'amigo' | 'cita' | 'familia' | string
  target_hours_week: number;
  max_weekly_occurrences: number;
  has_own_apartment: boolean;
  color_code: string;
  notes?: string;
  created_at?: string;
}

export interface ContactBusySlot {
  id: string;
  contact_id: string;
  day_of_week: number; // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  start_time: string; // 'HH:mm' o 'HH:mm:ss'
  end_time: string; // 'HH:mm' o 'HH:mm:ss'
  description?: string;
  created_at?: string;
}

export interface Event {
  id: string;
  title: string;
  category: EventCategory;
  start_time: string; // ISO 8601
  end_time: string; // ISO 8601
  is_locked: boolean;
  location: LocationType;
  location_detail?: string | null;
  notes?: string | null;
  contact_id?: string | null;
  cannabis_consumed: boolean;
  weather_dependent: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WorkShift {
  id: string;
  branch: 'Rambla' | 'Ferro';
  start_time: string; // ISO 8601
  end_time: string; // ISO 8601
  is_confirmed: boolean;
  notes?: string | null;
  created_at?: string;
}

export interface UserPreferences {
  id: number;
  weight_sleep: number; // 0 - 10
  weight_study: number; // 0 - 10
  weight_social: number; // 0 - 10
  weight_gym: number; // 0 - 10
  cannabis_buffer_hours: number; // default 4.0
  commute_duration_minutes: number; // default 30
  target_sleep_hours: number; // default 8.0
  updated_at?: string;
}

