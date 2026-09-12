import { EventCategory, LocationType } from './database';

export interface ParsedScheduleItem {
  id: string;
  title: string;
  category: EventCategory;
  start_time: string; // ISO 8601
  end_time: string; // ISO 8601
  location: LocationType;
  location_detail?: string;
  is_locked: boolean;
  is_work_shift: boolean;
  branch?: 'Rambla' | 'Ferro';
  notes?: string;
}

export interface ParseScheduleResponse {
  summary: string;
  items: ParsedScheduleItem[];
  warnings?: string[];
}

