'use client';

import React, { useState } from 'react';
import { Lock, Unlock, Plus, MapPin, Sparkles, Clock, AlertTriangle, CloudRain, Wind, Trash2, Edit3 } from 'lucide-react';
import { Event, Contact, LocationType, EventCategory } from '@/types/database';
import { OptimizerResponse, ScheduleChange } from '@/types/optimizer';
import { HourlyWeatherSlot, findSlotForTime } from '@/lib/weather';

interface CalendarViewProps {
  selectedDate: Date;
  events: Event[];
  contacts: Contact[];
  weatherSlots: HourlyWeatherSlot[];
  ghostProposal: OptimizerResponse | null;
  selectedChangeIds: string[];
  onToggleLock: (eventId: string) => void;
  onEditEvent: (event: Event) => void;
  onDeleteEvent: (eventId: string) => void;
  onAddEvent: (defaultDate?: Date) => void;
}

const CATEGORY_STYLES: Record<
  EventCategory,
  { bg: string; border: string; text: string; label: string }
> = {
  facultad: { bg: 'bg-indigo-950/70', border: 'border-indigo-500/50', text: 'text-indigo-200', label: 'Universidad' },
  trabajo: { bg: 'bg-amber-950/70', border: 'border-amber-500/50', text: 'text-amber-200', label: 'Trabajo Souvenirs' },
  batch_cooking: { bg: 'bg-emerald-950/70', border: 'border-emerald-500/50', text: 'text-emerald-200', label: 'Batch Cooking' },
  sueno: { bg: 'bg-slate-900/80', border: 'border-slate-600/50', text: 'text-slate-300', label: 'Sueño Flotante' },
  social: { bg: 'bg-cyan-950/70', border: 'border-cyan-500/50', text: 'text-cyan-200', label: 'Social' },
  citas: { bg: 'bg-rose-950/70', border: 'border-rose-500/50', text: 'text-rose-200', label: 'Citas' },
  gym: { bg: 'bg-fuchsia-950/70', border: 'border-fuchsia-500/50', text: 'text-fuchsia-200', label: 'Gimnasio' },
  ocio: { bg: 'bg-teal-950/70', border: 'border-teal-500/50', text: 'text-teal-200', label: 'Ocio' },
  commute: { bg: 'bg-zinc-900/80', border: 'border-zinc-600/40', text: 'text-zinc-300', label: 'Commute (30m)' },
};

const LOCATION_ICONS: Record<LocationType, { icon: string; label: string }> = {
  casa: { icon: '🏠', label: 'Casa (Padres)' },
  exterior: { icon: '🌊', label: 'Exterior (Playa/Rambla)' },
  interior: { icon: '☕', label: 'Interior (Café/Güemes/Aldrey)' },
  depto_contacto: { icon: '🏢', label: 'Depto Contacto' },
  facultad: { icon: '🎓', label: 'Facultad' },
  trabajo_rambla: { icon: '🛍️', label: 'Rambla' },
  trabajo_ferro: { icon: '🛍️', label: 'Ferro' },
};

export function CalendarView({
  selectedDate,
  events,
  contacts,
  weatherSlots,
  ghostProposal,
  selectedChangeIds,
  onToggleLock,
  onEditEvent,
  onDeleteEvent,
  onAddEvent,
}: CalendarViewProps) {
  // Mobile day tab filter (0 = Mon, ..., 6 = Sun) or null for all
  const [mobileDayIdx, setMobileDayIdx] = useState<number>(0);

  // Compute Monday of the week
  const d = new Date(selectedDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i);
    return dayDate;
  });

  const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  // Helper to format time
  const formatTime = (iso: string) => {
    const dt = new Date(iso);
    return dt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Helper to get events for a given day
  const getEventsForDay = (date: Date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return events.filter((e) => {
      const evStart = new Date(e.start_time);
      return evStart >= startOfDay && evStart <= endOfDay;
    });
  };

  // Helper to extract active ghost changes for a specific day
  const getGhostChangesForDay = (date: Date): ScheduleChange[] => {
    if (!ghostProposal || !ghostProposal.changes) return [];
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return ghostProposal.changes
      .filter((ch) => selectedChangeIds.includes(ch.event_id))
      .filter((ch) => {
        const timeToTest = ch.after?.start_time || ch.before?.start_time;
        if (!timeToTest) return false;
        const dt = new Date(timeToTest);
        return dt >= startOfDay && dt <= endOfDay;
      });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Ghost View Alert Banner if active */}
      {ghostProposal && (
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-purple-950/60 to-cyan-950/60 p-3.5 border border-purple-500/40 text-xs shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300">
              <Sparkles className="h-4 w-4 animate-spin" />
            </div>
            <div>
              <p className="font-semibold text-purple-200">Modo Fantasma (Ghost View) Activo</p>
              <p className="text-[11px] text-slate-300">
                Los bloques translúcidos punteados representan los cambios sugeridos por Gemini Flash.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-purple-900/60 px-2 py-1 font-mono text-[11px] text-purple-200 border border-purple-700/50">
              {selectedChangeIds.length} cambios previsualizados
            </span>
          </div>
        </div>
      )}

      {/* Top Bar with Add Button and Mobile Day Switcher */}
      <div className="flex items-center justify-between">
        {/* Mobile day pills */}
        <div className="flex md:hidden items-center gap-1 overflow-x-auto pb-1 max-w-[calc(100vw-120px)]">
          {weekDays.map((date, idx) => (
            <button
              key={idx}
              onClick={() => setMobileDayIdx(idx)}
              className={`rounded-xl px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-all ${
                mobileDayIdx === idx
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}
            >
              {dayNames[idx].slice(0, 3)} {date.getDate()}
            </button>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
          <span>Leyenda:</span>
          <span className="flex items-center gap-1">🔒 Inamovible</span>
          <span className="flex items-center gap-1">🌿 Cannabis</span>
          <span className="flex items-center gap-1">🌧️ Clima adverso MDP</span>
        </div>

        <button
          onClick={() => onAddEvent()}
          className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition-all shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Bloque</span>
        </button>
      </div>

      {/* Week Calendar Grid (7 columns on desktop, 1 column on mobile) */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {weekDays.map((date, dayIdx) => {
          const isSelectedMobile = mobileDayIdx === dayIdx;
          const dayEvents = getEventsForDay(date);
          const dayGhosts = getGhostChangesForDay(date);
          const isToday =
            new Date().toDateString() === date.toDateString();

          return (
            <div
              key={dayIdx}
              className={`flex flex-col rounded-2xl bg-slate-900/40 p-2.5 border transition-all ${
                isToday
                  ? 'border-cyan-500/50 bg-cyan-950/10 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                  : 'border-slate-800/80'
              } ${!isSelectedMobile ? 'hidden md:flex' : 'flex'}`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2">
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    {dayNames[dayIdx]}
                    {isToday && (
                      <span className="rounded-full bg-cyan-500 h-1.5 w-1.5 inline-block" />
                    )}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <button
                  onClick={() => onAddEvent(date)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-cyan-300 transition-colors"
                  title="Agregar bloque a este día"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Day Events Container */}
              <div className="flex flex-col gap-2 flex-1 min-h-[360px]">
                {dayEvents.length === 0 && dayGhosts.length === 0 && (
                  <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-800/80 p-4 text-center">
                    <p className="text-[11px] text-slate-600">Sin bloques agendados</p>
                  </div>
                )}

                {/* Normal Events */}
                {dayEvents.map((ev) => {
                  const style = CATEGORY_STYLES[ev.category] || CATEGORY_STYLES.ocio;
                  const loc = LOCATION_ICONS[ev.location] || LOCATION_ICONS.casa;
                  const contact = contacts.find((c) => c.id === ev.contact_id);

                  // Weather check for outdoor events
                  const weatherSlot = findSlotForTime(weatherSlots, ev.start_time);
                  const isAdverse = ev.location === 'exterior' && weatherSlot && weatherSlot.is_adverse;

                  // Check if this event is proposed to be modified or deleted in active ghost view
                  const isModifiedByGhost = dayGhosts.some(
                    (g) => g.action === 'modify' && g.event_id === ev.id
                  );
                  const isDeletedByGhost = dayGhosts.some(
                    (g) => g.action === 'delete' && g.event_id === ev.id
                  );

                  return (
                    <div
                      key={ev.id}
                      className={`group relative flex flex-col rounded-xl p-2.5 border transition-all text-xs ${style.bg} ${style.border} ${
                        isDeletedByGhost
                          ? 'opacity-40 line-through border-rose-600'
                          : isModifiedByGhost
                          ? 'ring-1 ring-cyan-400/50'
                          : 'hover:border-cyan-400/60'
                      }`}
                    >
                      {/* Top row: Title and Lock Button */}
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white truncate text-[12px]">{ev.title}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
                            <span className="font-mono text-cyan-300">
                              {formatTime(ev.start_time)} – {formatTime(ev.end_time)}
                            </span>
                          </div>
                        </div>

                        {/* Interactive Lock Toggle */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleLock(ev.id);
                          }}
                          className={`rounded-md p-1 transition-all ${
                            ev.is_locked
                              ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                              : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
                          }`}
                          title={ev.is_locked ? 'Bloque congelado (Inamovible para IA)' : 'Hacer inamovible (Candado)'}
                        >
                          {ev.is_locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                        </button>
                      </div>

                      {/* Location & Contact detail */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px]">
                        <span className="rounded-md bg-slate-900/60 px-1.5 py-0.5 text-slate-300 flex items-center gap-1">
                          <span>{loc.icon}</span>
                          <span className="truncate max-w-[120px]">
                            {ev.location_detail || loc.label}
                          </span>
                        </span>

                        {contact && (
                          <span
                            className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                            style={{
                              backgroundColor: `${contact.color_code}25`,
                              color: contact.color_code,
                            }}
                          >
                            @{contact.name}
                          </span>
                        )}

                        {ev.cannabis_consumed && (
                          <span
                            className="rounded-md bg-emerald-950 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-700/50"
                            title="Regla de Sigilo: 4h de búfer fuera de casa requerido"
                          >
                            🌿 4h Búfer
                          </span>
                        )}

                        {isAdverse && (
                          <span
                            className="rounded-md bg-rose-950/80 px-1.5 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-700/60 flex items-center gap-0.5"
                            title="Lluvia > 30% o viento fuerte previsto en Mar del Plata"
                          >
                            <CloudRain className="h-3 w-3" /> Clima MDP
                          </span>
                        )}
                      </div>

                      {/* Hover action bar: Edit / Delete */}
                      <div className="mt-2 hidden group-hover:flex items-center justify-end gap-1.5 pt-1 border-t border-white/10">
                        <button
                          onClick={() => onEditEvent(ev)}
                          className="rounded p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80"
                          title="Editar"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                        {!ev.is_locked && (
                          <button
                            onClick={() => onDeleteEvent(ev.id)}
                            className="rounded p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80"
                            title="Eliminar"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Ghost View Overlay Blocks (Dashed animated previews) */}
                {dayGhosts.map((ghost, gIdx) => {
                  if (ghost.action === 'delete') return null; // handled via strikethrough above
                  const after = ghost.after;
                  if (!after) return null;

                  return (
                    <div
                      key={`ghost-${gIdx}`}
                      className="ghost-block-active relative flex flex-col rounded-xl p-2.5 border-2 border-dashed border-cyan-400/80 text-xs shadow-md"
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold text-cyan-300 mb-1">
                        <span className="flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-cyan-400" />
                          {ghost.action === 'create' ? '🟢 NUEVO (IA)' : '🟡 PROPUESTA IA'}
                        </span>
                        <span className="font-mono text-white">
                          {formatTime(after.start_time)} – {formatTime(after.end_time)}
                        </span>
                      </div>

                      <p className="font-semibold text-white text-[11px] truncate">{ghost.title}</p>

                      <div className="mt-1 flex items-center gap-1 text-[10px] text-cyan-200">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{after.location_detail || after.location}</span>
                      </div>

                      <p className="mt-1.5 text-[10px] italic text-slate-300 bg-slate-950/60 rounded p-1 border border-cyan-500/20">
                        💡 {ghost.reason}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

