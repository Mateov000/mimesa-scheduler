'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { CalendarView } from '@/components/CalendarView';
import { ContactsManager } from '@/components/ContactsManager';
import { WorkShiftsManager } from '@/components/WorkShiftsManager';
import { PreferencesModal } from '@/components/PreferencesModal';
import { DiffViewerModal } from '@/components/DiffViewerModal';
import { EventModal } from '@/components/EventModal';
import { SmartScheduleImporter } from '@/components/SmartScheduleImporter';
import { PasscodeLock } from '@/components/PasscodeLock';
import { DataStore } from '@/lib/storage';
import { getSupabaseClient } from '@/lib/supabase';
import { Event, Contact, ContactBusySlot, WorkShift, UserPreferences, EventCategory, LocationType } from '@/types/database';
import { OptimizerResponse } from '@/types/optimizer';
import { ParsedScheduleItem } from '@/types/parser';
import { HourlyWeatherSlot } from '@/lib/weather';
import { RefreshCw } from 'lucide-react';

export default function Home() {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'contacts' | 'shifts' | 'preferences'>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  // Data state
  const [events, setEvents] = useState<Event[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [busySlots, setBusySlots] = useState<ContactBusySlot[]>([]);
  const [workShifts, setWorkShifts] = useState<WorkShift[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>(() => ({
    id: 1,
    weight_sleep: 9,
    weight_study: 8,
    weight_social: 7,
    weight_gym: 6,
    cannabis_buffer_hours: 4.0,
    commute_duration_minutes: 30,
    target_sleep_hours: 8.0,
  }));
  const [weatherSlots, setWeatherSlots] = useState<HourlyWeatherSlot[]>([]);
  const [isSupabaseLive, setIsSupabaseLive] = useState<boolean>(false);

  // Modals & Optimization State
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [ghostProposal, setGhostProposal] = useState<OptimizerResponse | null>(null);
  const [selectedChangeIds, setSelectedChangeIds] = useState<string[]>([]);
  const [isDiffMinimized, setIsDiffMinimized] = useState<boolean>(false);
  const [isApplyingChanges, setIsApplyingChanges] = useState<boolean>(false);

  // Event Edit Modal
  const [isEventModalOpen, setIsEventModalOpen] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [defaultEventDate, setDefaultEventDate] = useState<Date | undefined>(undefined);

  // Smart Schedule Importer Modal
  const [isImporterOpen, setIsImporterOpen] = useState<boolean>(false);

  // Success Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Initial Mount & Auth Check
  useEffect(() => {
    setIsMounted(true);
    const isAuth = DataStore.isAuthenticated();
    setIsAuthenticated(isAuth);
  }, []);

  // 2. Load Data from Storage / Supabase
  const loadData = useCallback(async () => {
    try {
      const [evts, conts, slots, shifts, prefs] = await Promise.all([
        DataStore.getEvents(selectedDate),
        DataStore.getContacts(),
        DataStore.getBusySlots(),
        DataStore.getWorkShifts(selectedDate),
        DataStore.getPreferences(),
      ]);

      setEvents(evts);
      setContacts(conts);
      setBusySlots(slots);
      setWorkShifts(shifts);
      setPreferences(prefs);
      setIsSupabaseLive(DataStore.isConfiguredWithSupabase());
    } catch (e) {
      console.error('Error loading data:', e);
    }
  }, [selectedDate]);

  // 3. Fetch MDP Weather
  const loadWeather = useCallback(async () => {
    try {
      const res = await fetch('/api/weather');
      if (res.ok) {
        const json = await res.json();
        if (json.slots) {
          setWeatherSlots(json.slots);
        }
      }
    } catch (e) {
      console.warn('Weather fetch failed, will use fallback:', e);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadWeather();
  }, [loadData, loadWeather]);

  // 4. Supabase Realtime Listener on `events`
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel('public:events')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Date Navigators
  const handlePrevWeek = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 7);
    setSelectedDate(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 7);
    setSelectedDate(next);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  // Toggle Lock
  const handleToggleLock = async (eventId: string) => {
    const updated = events.map((e) => {
      if (e.id === eventId) {
        return { ...e, is_locked: !e.is_locked, updated_at: new Date().toISOString() };
      }
      return e;
    });
    setEvents(updated);
    await DataStore.saveEvents(updated);
    const target = updated.find((e) => e.id === eventId);
    showToast(target?.is_locked ? '🔒 Bloque congelado (Inamovible)' : '🔓 Bloque desbloqueado');
  };

  // Save Event from Modal
  const handleSaveEvent = async (savedEvent: Event) => {
    const idx = events.findIndex((e) => e.id === savedEvent.id);
    let updated: Event[];
    if (idx >= 0) {
      updated = [...events];
      updated[idx] = savedEvent;
    } else {
      updated = [...events, savedEvent];
    }
    setEvents(updated);
    await DataStore.saveEvents(updated);
    showToast('Bloque guardado exitosamente');
  };

  // Delete Event
  const handleDeleteEvent = async (eventId: string) => {
    const updated = events.filter((e) => e.id !== eventId);
    setEvents(updated);
    await DataStore.deleteEvent(eventId);
    showToast('Bloque eliminado');
  };

  // Contacts Handlers
  const handleSaveContact = async (contact: Contact) => {
    await DataStore.saveContact(contact);
    const updated = await DataStore.getContacts();
    setContacts(updated);
    showToast('Contacto guardado');
  };

  const handleDeleteContact = async (contactId: string) => {
    await DataStore.deleteContact(contactId);
    const updated = await DataStore.getContacts();
    setContacts(updated);
    showToast('Contacto eliminado');
  };

  const handleSaveBusySlot = async (slot: ContactBusySlot) => {
    await DataStore.saveBusySlot(slot);
    const updated = await DataStore.getBusySlots();
    setBusySlots(updated);
    showToast('Franja ocupada agregada');
  };

  const handleDeleteBusySlot = async (slotId: string) => {
    await DataStore.deleteBusySlot(slotId);
    const updated = await DataStore.getBusySlots();
    setBusySlots(updated);
    showToast('Franja ocupada eliminada');
  };

  // Work Shifts Handlers
  const handleSaveShift = async (shift: WorkShift) => {
    await DataStore.saveWorkShift(shift);
    const updated = await DataStore.getWorkShifts(selectedDate);
    setWorkShifts(updated);
    showToast('Turno laboral guardado');
  };

  const handleDeleteShift = async (shiftId: string) => {
    await DataStore.deleteWorkShift(shiftId);
    const updated = await DataStore.getWorkShifts(selectedDate);
    setWorkShifts(updated);
    showToast('Turno eliminado');
  };

  // Preferences Handler
  const handleSavePreferences = async (prefs: UserPreferences) => {
    await DataStore.savePreferences(prefs);
    setPreferences(prefs);
    showToast('Preferencias actualizadas');
  };

  // Optimization Trigger: ⚡ Reconsiderar
  const handleReconsider = async () => {
    setIsOptimizing(true);
    try {
      const payload = {
        events,
        contacts,
        busy_slots: busySlots,
        work_shifts: workShifts,
        preferences,
        date_range: {
          start: selectedDate.toISOString(),
        },
      };

      const res = await fetch('/api/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Error en API ${res.status}`);
      }

      const proposal: OptimizerResponse = await res.json();
      setGhostProposal(proposal);
      // Select all proposed changes by default
      setSelectedChangeIds(proposal.changes.map((c) => c.event_id));
      setIsDiffMinimized(false);
      setActiveTab('calendar');
    } catch (e) {
      console.error('Error reconsidering routine:', e);
      showToast('Error al procesar optimización');
    } finally {
      setIsOptimizing(false);
    }
  };

  // Apply Changes from Diff Viewer
  const handleApplyChanges = async () => {
    if (!ghostProposal) return;
    setIsApplyingChanges(true);

    try {
      let currentEvents = [...events];

      const changesToApply = ghostProposal.changes.filter((ch) =>
        selectedChangeIds.includes(ch.event_id)
      );

      for (const ch of changesToApply) {
        if (ch.action === 'modify' && ch.after) {
          const idx = currentEvents.findIndex((e) => e.id === ch.event_id);
          if (idx >= 0) {
            currentEvents[idx] = {
              ...currentEvents[idx],
              start_time: ch.after.start_time,
              end_time: ch.after.end_time,
              location: ch.after.location as LocationType,
              location_detail: ch.after.location_detail || currentEvents[idx].location_detail,
              updated_at: new Date().toISOString(),
            };
          }
        } else if (ch.action === 'create' && ch.after) {
          const newEvent: Event = {
            id: `ev-opt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            title: ch.title,
            category: (ch.category as EventCategory) || 'social',
            start_time: ch.after.start_time,
            end_time: ch.after.end_time,
            is_locked: false,
            location: (ch.after.location as LocationType) || 'casa',
            location_detail: ch.after.location_detail || null,
            contact_id: null,
            cannabis_consumed: false,
            weather_dependent: false,
            notes: ch.reason,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          currentEvents.push(newEvent);
        } else if (ch.action === 'delete') {
          currentEvents = currentEvents.filter((e) => e.id !== ch.event_id);
        }
      }

      setEvents(currentEvents);
      await DataStore.saveEvents(currentEvents);
      setGhostProposal(null);
      setSelectedChangeIds([]);
      showToast(`¡Se aplicaron ${changesToApply.length} cambios exitosamente!`);
    } catch (e) {
      console.error('Error applying changes:', e);
      showToast('Error al persistir cambios');
    } finally {
      setIsApplyingChanges(false);
    }
  };

  const handleDiscardProposal = () => {
    setGhostProposal(null);
    setSelectedChangeIds([]);
    setIsDiffMinimized(false);
    showToast('Propuesta de optimización descartada');
  };

  const handleToggleChangeSelection = (eventId: string) => {
    setSelectedChangeIds((prev) =>
      prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId]
    );
  };

  // Import Parsed Events from Text or Image
  const handleImportParsedEvents = async (items: ParsedScheduleItem[]) => {
    let currentEvents = [...events];
    let currentShifts = [...workShifts];

    for (const it of items) {
      const newEvent: Event = {
        id: `ev-imp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: it.title,
        category: it.category,
        start_time: it.start_time,
        end_time: it.end_time,
        is_locked: it.is_locked,
        location: it.location,
        location_detail: it.location_detail || null,
        contact_id: null,
        cannabis_consumed: false,
        weather_dependent: false,
        notes: it.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      currentEvents.push(newEvent);

      if (it.is_work_shift && it.branch) {
        const newShift: WorkShift = {
          id: `ws-imp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          branch: it.branch,
          start_time: it.start_time,
          end_time: it.end_time,
          is_confirmed: true,
          notes: it.notes || `Turno ${it.branch} importado con IA`,
          created_at: new Date().toISOString(),
        };
        currentShifts.push(newShift);
        await DataStore.saveWorkShift(newShift);
      }
    }

    setEvents(currentEvents);
    setWorkShifts(currentShifts);
    await DataStore.saveEvents(currentEvents);
    showToast(`¡Se importaron ${items.length} bloques al calendario con éxito!`);
  };

  // Lock session
  const handleLockApp = () => {
    DataStore.setAuthenticated(false);
    setIsAuthenticated(false);
  };

  // Wait until mounted to prevent SSR hydration mismatches
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center" suppressHydrationWarning>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-black text-2xl shadow-lg shadow-cyan-950 animate-pulse">
          M
        </div>
      </div>
    );
  }

  // If not authenticated, render PIN lock screen
  if (!isAuthenticated) {
    return <PasscodeLock onUnlock={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 rounded-2xl bg-cyan-950/90 border border-cyan-500/50 px-4 py-2.5 text-xs font-semibold text-cyan-200 shadow-2xl backdrop-blur-xl animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Optimizing Overlay Modal */}
      {isOptimizing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="rounded-3xl glass-panel p-8 text-center border border-cyan-500/30 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">MiMesa Kernel</h3>
              <p className="text-xs text-slate-300 mt-1">
                Analizando clima de Mar del Plata, turnos laborales y disponibilidad de contactos...
              </p>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-400 to-blue-600 h-full w-2/3 animate-pulse" />
            </div>
          </div>
        </div>
      )}

      {/* Main Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedDate={selectedDate}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        onToday={handleToday}
        onReconsider={handleReconsider}
        onOpenImporter={() => setIsImporterOpen(true)}
        isOptimizing={isOptimizing}
        weatherSlots={weatherSlots}
        isSupabaseLive={isSupabaseLive}
        onLockApp={handleLockApp}
        hasGhostProposal={Boolean(ghostProposal)}
      />

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6">
        {activeTab === 'calendar' && (
          <CalendarView
            selectedDate={selectedDate}
            events={events}
            contacts={contacts}
            weatherSlots={weatherSlots}
            ghostProposal={ghostProposal}
            selectedChangeIds={selectedChangeIds}
            onToggleLock={handleToggleLock}
            onEditEvent={(ev) => {
              setEditingEvent(ev);
              setIsEventModalOpen(true);
            }}
            onDeleteEvent={handleDeleteEvent}
            onAddEvent={(defDate) => {
              setEditingEvent(null);
              setDefaultEventDate(defDate);
              setIsEventModalOpen(true);
            }}
          />
        )}

        {activeTab === 'contacts' && (
          <ContactsManager
            contacts={contacts}
            busySlots={busySlots}
            onSaveContact={handleSaveContact}
            onDeleteContact={handleDeleteContact}
            onSaveBusySlot={handleSaveBusySlot}
            onDeleteBusySlot={handleDeleteBusySlot}
          />
        )}

        {activeTab === 'shifts' && (
          <WorkShiftsManager
            shifts={workShifts}
            onSaveShift={handleSaveShift}
            onDeleteShift={handleDeleteShift}
          />
        )}

        {activeTab === 'preferences' && (
          <PreferencesModal
            preferences={preferences}
            onSave={handleSavePreferences}
          />
        )}
      </main>

      {/* Diff Viewer Modal */}
      {ghostProposal && (
        <DiffViewerModal
          proposal={ghostProposal}
          selectedChangeIds={selectedChangeIds}
          onToggleChangeSelection={handleToggleChangeSelection}
          onSelectAll={() => setSelectedChangeIds(ghostProposal.changes.map((c) => c.event_id))}
          onDeselectAll={() => setSelectedChangeIds([])}
          onApplyChanges={handleApplyChanges}
          onDiscard={handleDiscardProposal}
          isMinimized={isDiffMinimized}
          onToggleMinimize={() => setIsDiffMinimized(!isDiffMinimized)}
          isApplying={isApplyingChanges}
        />
      )}

      {/* Event Add/Edit Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        event={editingEvent}
        defaultDate={defaultEventDate}
        contacts={contacts}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        onClose={() => setIsEventModalOpen(false)}
      />

      {/* Smart Multimodal Schedule Importer (Text + Image) */}
      <SmartScheduleImporter
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        selectedDate={selectedDate}
        onImportEvents={handleImportParsedEvents}
      />
    </div>
  );
}
