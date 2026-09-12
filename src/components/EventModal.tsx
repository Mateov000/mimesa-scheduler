'use client';

import React, { useState } from 'react';
import { Lock, Unlock, X, Trash2, MapPin, Calendar, Clock, Sparkles } from 'lucide-react';
import { Event, Contact, EventCategory, LocationType } from '@/types/database';

interface EventModalProps {
  isOpen: boolean;
  event: Event | null;
  defaultDate?: Date;
  contacts: Contact[];
  onSave: (event: Event) => Promise<void>;
  onDelete?: (eventId: string) => Promise<void>;
  onClose: () => void;
}

const CATEGORIES: { id: EventCategory; label: string }[] = [
  { id: 'facultad', label: 'Facultad / Estudio' },
  { id: 'trabajo', label: 'Trabajo Souvenirs' },
  { id: 'batch_cooking', label: 'Batch Cooking' },
  { id: 'sueno', label: 'Sueño / Descanso' },
  { id: 'social', label: 'Social / Amigos' },
  { id: 'citas', label: 'Citas' },
  { id: 'gym', label: 'Gimnasio / Entreno' },
  { id: 'ocio', label: 'Ocio / Relax' },
  { id: 'commute', label: 'Traslado (Commute)' },
];

const LOCATIONS: { id: LocationType; label: string }[] = [
  { id: 'casa', label: 'Casa (con padres)' },
  { id: 'exterior', label: 'Exterior (Playa, Rambla, Costa)' },
  { id: 'interior', label: 'Interior (Café Güemes, Aldrey)' },
  { id: 'depto_contacto', label: 'Depto de Contacto' },
  { id: 'facultad', label: 'Facultad (UFASTA)' },
  { id: 'trabajo_rambla', label: 'Trabajo: Rambla' },
  { id: 'trabajo_ferro', label: 'Trabajo: Ferro' },
];

export function EventModal({
  isOpen,
  event,
  defaultDate,
  contacts,
  onSave,
  onDelete,
  onClose,
}: EventModalProps) {
  const getInitialDates = () => {
    if (event) {
      const s = new Date(event.start_time);
      const e = new Date(event.end_time);
      return {
        dateStr: s.toISOString().slice(0, 10),
        startTimeStr: s.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }),
        endTimeStr: e.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }),
      };
    }
    const d = defaultDate || new Date();
    d.setMinutes(0, 0, 0);
    const end = new Date(d.getTime() + 2 * 3600 * 1000);
    return {
      dateStr: d.toISOString().slice(0, 10),
      startTimeStr: d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }),
      endTimeStr: end.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }),
    };
  };

  const initial = getInitialDates();

  const [title, setTitle] = useState(event?.title || '');
  const [category, setCategory] = useState<EventCategory>(event?.category || 'social');
  const [date, setDate] = useState(initial.dateStr);
  const [startTime, setStartTime] = useState(initial.startTimeStr);
  const [endTime, setEndTime] = useState(initial.endTimeStr);
  const [isLocked, setIsLocked] = useState(event?.is_locked ?? false);
  const [location, setLocation] = useState<LocationType>(event?.location || 'casa');
  const [locationDetail, setLocationDetail] = useState(event?.location_detail || '');
  const [contactId, setContactId] = useState<string | null>(event?.contact_id || null);
  const [cannabisConsumed, setCannabisConsumed] = useState(event?.cannabis_consumed ?? false);
  const [weatherDependent, setWeatherDependent] = useState(event?.weather_dependent ?? false);
  const [notes, setNotes] = useState(event?.notes || '');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const start = new Date(`${date}T${startTime}:00`);
    const end = new Date(`${date}T${endTime}:00`);
    if (endTime < startTime) {
      end.setDate(end.getDate() + 1); // Cruzar medianoche
    }

    const savedEvent: Event = {
      id: event ? event.id : `ev-${Date.now()}`,
      title: title.trim(),
      category,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      is_locked: isLocked,
      location,
      location_detail: locationDetail.trim() || null,
      contact_id: contactId || null,
      cannabis_consumed: cannabisConsumed,
      weather_dependent: weatherDependent,
      notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    await onSave(savedEvent);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl glass-panel p-6 border border-slate-700 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
              <Calendar className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">
              {event ? 'Editar Bloque de Calendario' : 'Nuevo Bloque'}
            </h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Title */}
          <div>
            <label className="font-semibold text-slate-300 block mb-1">Título del Evento</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Juntada con Juancito, Cursada Redes, Batch Cooking..."
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white"
              required
            />
          </div>

          {/* Category & Lock */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-300 block mb-1">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as EventCategory)}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-300 block mb-1">Candado (Inamovible)</label>
              <button
                type="button"
                onClick={() => setIsLocked(!isLocked)}
                className={`w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2 font-bold border transition-all ${
                  isLocked
                    ? 'bg-amber-950/70 border-amber-500/60 text-amber-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                <span>{isLocked ? 'Candado Activo 🔒' : 'Libre para Optimizar'}</span>
              </button>
            </div>
          </div>

          {/* Date and Times */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="font-semibold text-slate-300 block mb-1">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-2.5 py-2 text-xs text-white font-mono"
                required
              />
            </div>
            <div>
              <label className="font-semibold text-slate-300 block mb-1">Inicio</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-2.5 py-2 text-xs text-white font-mono"
                required
              />
            </div>
            <div>
              <label className="font-semibold text-slate-300 block mb-1">Fin</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-2.5 py-2 text-xs text-white font-mono"
                required
              />
            </div>
          </div>

          {/* Location & Detail */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-300 block mb-1">Tipo de Ubicación</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value as LocationType)}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
              >
                {LOCATIONS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-300 block mb-1">Detalle de Lugar</label>
              <input
                type="text"
                value={locationDetail}
                onChange={(e) => setLocationDetail(e.target.value)}
                placeholder="Ej: Café Güemes, Playa Grande, Aula 104..."
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          {/* Contact Associated */}
          <div>
            <label className="font-semibold text-slate-300 block mb-1">Contacto / Vínculo</label>
            <select
              value={contactId || ''}
              onChange={(e) => setContactId(e.target.value || null)}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
            >
              <option value="">Sin contacto específico</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.relationship || 'Vínculo'}) {c.has_own_apartment ? '🏢 Depto' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Special checkboxes: Cannabis & Weather */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div className="flex items-center gap-2.5 rounded-xl bg-slate-900/80 p-3 border border-slate-800">
              <input
                type="checkbox"
                id="cannabisCheck"
                checked={cannabisConsumed}
                onChange={(e) => setCannabisConsumed(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-500"
              />
              <label htmlFor="cannabisCheck" className="text-xs text-slate-200 cursor-pointer">
                <strong>🌿 Consumo Cannabis</strong>
                <span className="block text-[10px] text-slate-400">
                  Exige búfer de 4h fuera de casa.
                </span>
              </label>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl bg-slate-900/80 p-3 border border-slate-800">
              <input
                type="checkbox"
                id="weatherDepCheck"
                checked={weatherDependent}
                onChange={(e) => setWeatherDependent(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-cyan-500"
              />
              <label htmlFor="weatherDepCheck" className="text-xs text-slate-200 cursor-pointer">
                <strong>⛅ Dependiente de Clima</strong>
                <span className="block text-[10px] text-slate-400">
                  Se traslada si llueve o hay viento.
                </span>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="font-semibold text-slate-300 block mb-1">Notas Adicionales</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles sobre materiales, viandas o temas a tratar..."
              rows={2}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            {event && onDelete ? (
              <button
                type="button"
                onClick={async () => {
                  await onDelete(event.id);
                  onClose();
                }}
                className="flex items-center gap-1 text-rose-400 hover:text-rose-300 text-xs font-semibold"
              >
                <Trash2 className="h-4 w-4" /> Eliminar
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-xl bg-cyan-600 hover:bg-cyan-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-900/40"
              >
                Guardar Bloque
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

