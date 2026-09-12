'use client';

import React, { useState } from 'react';
import { Briefcase, Plus, Trash2, Clock, MapPin, CheckCircle, Calendar, Sparkles } from 'lucide-react';
import { WorkShift } from '@/types/database';

interface WorkShiftsManagerProps {
  shifts: WorkShift[];
  onSaveShift: (shift: WorkShift) => Promise<void>;
  onDeleteShift: (shiftId: string) => Promise<void>;
}

export function WorkShiftsManager({ shifts, onSaveShift, onDeleteShift }: WorkShiftsManagerProps) {
  const [branch, setBranch] = useState<'Rambla' | 'Ferro'>('Ferro');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [startTime, setStartTime] = useState('17:00');
  const [endTime, setEndTime] = useState('01:00'); // 01:00 AM next day
  const [isNextDay, setIsNextDay] = useState(true);
  const [isConfirmed, setIsConfirmed] = useState(true);
  const [notes, setNotes] = useState('');

  // Quick preset apply
  const applyPreset = (preset: 'ferro_night' | 'rambla_morning' | 'rambla_afternoon') => {
    if (preset === 'ferro_night') {
      setBranch('Ferro');
      setStartTime('17:00');
      setEndTime('01:00');
      setIsNextDay(true);
      setNotes('Turno nocturno Ferro (dispara sueño flotante 8h)');
    } else if (preset === 'rambla_morning') {
      setBranch('Rambla');
      setStartTime('10:00');
      setEndTime('16:00');
      setIsNextDay(false);
      setNotes('Turno diurno Rambla');
    } else if (preset === 'rambla_afternoon') {
      setBranch('Rambla');
      setStartTime('14:00');
      setEndTime('20:00');
      setIsNextDay(false);
      setNotes('Turno tarde Rambla');
    }
  };

  const handleAddShift = async (e: React.FormEvent) => {
    e.preventDefault();

    const start = new Date(`${startDate}T${startTime}:00`);
    const end = new Date(`${startDate}T${endTime}:00`);
    if (isNextDay || endTime < startTime) {
      end.setDate(end.getDate() + 1);
    }

    const newShift: WorkShift = {
      id: `ws-${Date.now()}`,
      branch,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      is_confirmed: isConfirmed,
      notes: notes.trim() || undefined,
    };

    await onSaveShift(newShift);
    setNotes('');
  };

  const formatShiftTime = (startIso: string, endIso: string) => {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const day = s.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
    const t1 = s.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
    const t2 = e.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
    const crossesMidnight = e.getDate() !== s.getDate();

    return {
      day,
      time: `${t1} – ${t2}${crossesMidnight ? ' (+1 día)' : ''}`,
    };
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl glass-panel p-5 border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-amber-400" />
            <span>Turnos Laborales de Souvenirs (Rambla y Ferro)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Previsibilidad rotativa de 2 semanas. Los turnos confirmados son inamovibles y exigen 30 min de commute antes/después y adaptación de sueño continuo de 8h.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-amber-950/60 border border-amber-500/40 px-3 py-1.5 text-xs font-semibold text-amber-300">
            {shifts.length} turnos cargados
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl glass-panel p-5 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus className="h-4 w-4 text-cyan-400" />
              <span>Cargar Nuevo Turno</span>
            </h3>

            {/* Presets */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                Plantillas Rápidas:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('ferro_night')}
                  className="rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-600/40 p-2 text-[11px] font-bold text-amber-200 text-center transition-all"
                >
                  🌙 Ferro Nocturno
                  <span className="block text-[9px] text-slate-400 font-normal">17:00 a 01:00</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('rambla_morning')}
                  className="rounded-xl bg-blue-950/40 hover:bg-blue-900/60 border border-blue-600/40 p-2 text-[11px] font-bold text-blue-200 text-center transition-all"
                >
                  ☀️ Rambla Mañ.
                  <span className="block text-[9px] text-slate-400 font-normal">10:00 a 16:00</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('rambla_afternoon')}
                  className="rounded-xl bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-600/40 p-2 text-[11px] font-bold text-cyan-200 text-center transition-all"
                >
                  🌤️ Rambla Tarde
                  <span className="block text-[9px] text-slate-400 font-normal">14:00 a 20:00</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleAddShift} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Local / Sucursal</label>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value as 'Rambla' | 'Ferro')}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white font-semibold"
                  >
                    <option value="Ferro">Ferro (San Juan)</option>
                    <option value="Rambla">Rambla (Casino)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Fecha</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Hora Inicio</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Hora Fin</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="nextDayCheck"
                  checked={isNextDay}
                  onChange={(e) => setIsNextDay(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-cyan-500"
                />
                <label htmlFor="nextDayCheck" className="text-xs text-slate-300 cursor-pointer">
                  Finaliza en la madrugada del día siguiente (+1)
                </label>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Notas / Compañero cubierto</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Cubriendo a Martín, alta demanda..."
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-amber-950/40 transition-all"
              >
                Guardar Turno Laboral
              </button>
            </form>
          </div>
        </div>

        {/* Shift List Column */}
        <div className="lg:col-span-7 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Turnos Confirmados Próximos
          </h3>

          <div className="space-y-2.5">
            {shifts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-500">
                No hay turnos registrados para las próximas 2 semanas.
              </div>
            ) : (
              shifts.map((shift) => {
                const { day, time } = formatShiftTime(shift.start_time, shift.end_time);
                const isFerro = shift.branch === 'Ferro';

                return (
                  <div
                    key={shift.id}
                    className={`flex items-center justify-between rounded-2xl p-4 border transition-all ${
                      isFerro
                        ? 'bg-amber-950/20 border-amber-600/40'
                        : 'bg-blue-950/20 border-blue-600/40'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`h-11 w-11 rounded-2xl flex items-center justify-center font-bold text-lg ${
                          isFerro ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'
                        }`}
                      >
                        🛍️
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-sm">
                            Sucursal {shift.branch}
                          </h4>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                              isFerro
                                ? 'bg-amber-900/60 text-amber-300'
                                : 'bg-blue-900/60 text-blue-300'
                            }`}
                          >
                            {isFerro ? 'Turno Rotativo Ferro' : 'Turno Rambla'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-300 mt-1">
                          <span className="font-semibold text-white capitalize">{day}</span>
                          <span className="font-mono text-cyan-300">{time}</span>
                        </div>

                        {shift.notes && (
                          <p className="text-[11px] text-slate-400 mt-1 italic">{shift.notes}</p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => onDeleteShift(shift.id)}
                      className="rounded-xl p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title="Eliminar turno"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

