import { Contact, ContactBusySlot, Event, UserPreferences, WorkShift } from '@/types/database';
import { INITIAL_BUSY_SLOTS, INITIAL_CONTACTS, INITIAL_PREFERENCES, getInitialEvents, getInitialWorkShifts } from './sampleData';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

const STORAGE_KEYS = {
  EVENTS: 'mimesa_events_v1',
  CONTACTS: 'mimesa_contacts_v1',
  BUSY_SLOTS: 'mimesa_busy_slots_v1',
  WORK_SHIFTS: 'mimesa_work_shifts_v1',
  PREFERENCES: 'mimesa_preferences_v1',
  PASSCODE_AUTH: 'mimesa_authenticated_v1',
};

export class DataStore {
  // --- Events ---
  static async getEvents(baseDate: Date = new Date()): Promise<Event[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('events').select('*').order('start_time', { ascending: true });
        if (!error && data && data.length > 0) {
          return data as Event[];
        }
      } catch (e) {
        console.warn('Error reading events from Supabase, falling back to local cache:', e);
      }
    }

    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(STORAGE_KEYS.EVENTS);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          // parse error
        }
      }
      const initial = getInitialEvents(baseDate);
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(initial));
      return initial;
    }
    return getInitialEvents(baseDate);
  }

  static async saveEvents(events: Event[]): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        // Upsert events
        await supabase.from('events').upsert(events);
      } catch (e) {
        console.error('Error saving events to Supabase:', e);
      }
    }
  }

  static async deleteEvent(id: string): Promise<void> {
    if (typeof window !== 'undefined') {
      const current = await this.getEvents();
      const updated = current.filter((e) => e.id !== id);
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(updated));
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('events').delete().eq('id', id);
      } catch (e) {
        console.error('Error deleting event from Supabase:', e);
      }
    }
  }

  // --- Contacts ---
  static async getContacts(): Promise<Contact[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('contacts').select('*').order('name', { ascending: true });
        if (!error && data && data.length > 0) {
          return data as Contact[];
        }
      } catch (e) {
        console.warn('Error reading contacts from Supabase:', e);
      }
    }

    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(STORAGE_KEYS.CONTACTS);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {}
      }
      localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(INITIAL_CONTACTS));
      return INITIAL_CONTACTS;
    }
    return INITIAL_CONTACTS;
  }

  static async saveContact(contact: Contact): Promise<void> {
    if (typeof window !== 'undefined') {
      const contacts = await this.getContacts();
      const idx = contacts.findIndex((c) => c.id === contact.id);
      let updated: Contact[];
      if (idx >= 0) {
        updated = [...contacts];
        updated[idx] = contact;
      } else {
        updated = [...contacts, contact];
      }
      localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(updated));
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('contacts').upsert(contact);
      } catch (e) {
        console.error('Error saving contact to Supabase:', e);
      }
    }
  }

  static async deleteContact(id: string): Promise<void> {
    if (typeof window !== 'undefined') {
      const contacts = await this.getContacts();
      const updated = contacts.filter((c) => c.id !== id);
      localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(updated));
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('contacts').delete().eq('id', id);
      } catch (e) {
        console.error('Error deleting contact from Supabase:', e);
      }
    }
  }

  // --- Busy Slots ---
  static async getBusySlots(): Promise<ContactBusySlot[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('contact_busy_slots').select('*');
        if (!error && data && data.length > 0) {
          return data as ContactBusySlot[];
        }
      } catch (e) {
        console.warn('Error reading busy slots from Supabase:', e);
      }
    }

    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(STORAGE_KEYS.BUSY_SLOTS);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {}
      }
      localStorage.setItem(STORAGE_KEYS.BUSY_SLOTS, JSON.stringify(INITIAL_BUSY_SLOTS));
      return INITIAL_BUSY_SLOTS;
    }
    return INITIAL_BUSY_SLOTS;
  }

  static async saveBusySlot(slot: ContactBusySlot): Promise<void> {
    if (typeof window !== 'undefined') {
      const slots = await this.getBusySlots();
      const idx = slots.findIndex((s) => s.id === slot.id);
      let updated: ContactBusySlot[];
      if (idx >= 0) {
        updated = [...slots];
        updated[idx] = slot;
      } else {
        updated = [...slots, slot];
      }
      localStorage.setItem(STORAGE_KEYS.BUSY_SLOTS, JSON.stringify(updated));
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('contact_busy_slots').upsert(slot);
      } catch (e) {
        console.error('Error saving busy slot to Supabase:', e);
      }
    }
  }

  static async deleteBusySlot(id: string): Promise<void> {
    if (typeof window !== 'undefined') {
      const slots = await this.getBusySlots();
      const updated = slots.filter((s) => s.id !== id);
      localStorage.setItem(STORAGE_KEYS.BUSY_SLOTS, JSON.stringify(updated));
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('contact_busy_slots').delete().eq('id', id);
      } catch (e) {
        console.error('Error deleting busy slot from Supabase:', e);
      }
    }
  }

  // --- Work Shifts ---
  static async getWorkShifts(baseDate: Date = new Date()): Promise<WorkShift[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('work_shifts').select('*').order('start_time', { ascending: true });
        if (!error && data && data.length > 0) {
          return data as WorkShift[];
        }
      } catch (e) {
        console.warn('Error reading work shifts from Supabase:', e);
      }
    }

    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(STORAGE_KEYS.WORK_SHIFTS);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {}
      }
      const initial = getInitialWorkShifts(baseDate);
      localStorage.setItem(STORAGE_KEYS.WORK_SHIFTS, JSON.stringify(initial));
      return initial;
    }
    return getInitialWorkShifts(baseDate);
  }

  static async saveWorkShift(shift: WorkShift): Promise<void> {
    if (typeof window !== 'undefined') {
      const shifts = await this.getWorkShifts();
      const idx = shifts.findIndex((s) => s.id === shift.id);
      let updated: WorkShift[];
      if (idx >= 0) {
        updated = [...shifts];
        updated[idx] = shift;
      } else {
        updated = [...shifts, shift];
      }
      localStorage.setItem(STORAGE_KEYS.WORK_SHIFTS, JSON.stringify(updated));
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('work_shifts').upsert(shift);
      } catch (e) {
        console.error('Error saving work shift to Supabase:', e);
      }
    }
  }

  static async deleteWorkShift(id: string): Promise<void> {
    if (typeof window !== 'undefined') {
      const shifts = await this.getWorkShifts();
      const updated = shifts.filter((s) => s.id !== id);
      localStorage.setItem(STORAGE_KEYS.WORK_SHIFTS, JSON.stringify(updated));
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('work_shifts').delete().eq('id', id);
      } catch (e) {
        console.error('Error deleting work shift from Supabase:', e);
      }
    }
  }

  // --- Preferences ---
  static async getPreferences(): Promise<UserPreferences> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('user_preferences').select('*').eq('id', 1).single();
        if (!error && data) {
          return data as UserPreferences;
        }
      } catch (e) {
        console.warn('Error reading preferences from Supabase:', e);
      }
    }

    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {}
      }
      localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(INITIAL_PREFERENCES));
      return INITIAL_PREFERENCES;
    }
    return INITIAL_PREFERENCES;
  }

  static async savePreferences(prefs: UserPreferences): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(prefs));
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('user_preferences').upsert({ ...prefs, id: 1 });
      } catch (e) {
        console.error('Error saving preferences to Supabase:', e);
      }
    }
  }

  // --- Auth Session ---
  static isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    const requiredPasscode = process.env.NEXT_PUBLIC_APP_PASSCODE || '1234';
    if (!requiredPasscode) return true;
    return sessionStorage.getItem(STORAGE_KEYS.PASSCODE_AUTH) === 'true';
  }

  static setAuthenticated(authenticated: boolean): void {
    if (typeof window !== 'undefined') {
      if (authenticated) {
        sessionStorage.setItem(STORAGE_KEYS.PASSCODE_AUTH, 'true');
      } else {
        sessionStorage.removeItem(STORAGE_KEYS.PASSCODE_AUTH);
      }
    }
  }

  static isConfiguredWithSupabase(): boolean {
    return isSupabaseConfigured();
  }
}

