'use client';

import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Moon,
  BookOpen,
  Users,
  Dumbbell,
  Utensils,
  Eye,
  Check,
  X,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { OptimizerResponse, ScheduleChange } from '@/types/optimizer';

interface DiffViewerModalProps {
  proposal: OptimizerResponse;
  selectedChangeIds: string[];
  onToggleChangeSelection: (eventId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onApplyChanges: () => void;
  onDiscard: () => void;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  isApplying: boolean;
}

export function DiffViewerModal({
  proposal,
  selectedChangeIds,
  onToggleChangeSelection,
  onSelectAll,
  onDeselectAll,
  onApplyChanges,
  onDiscard,
  isMinimized,
  onToggleMinimize,
  isApplying,
}: DiffViewerModalProps) {
  const { summary, scorecards, safety_checks, changes = [], warnings = [] } = proposal;

  const formatTimeRange = (start?: string, end?: string) => {
    if (!start || !end) return '';
    const d1 = new Date(start);
    const d2 = new Date(end);
    const dayName = d1.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' });
    const t1 = d1.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
    const t2 = d2.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${dayName.toUpperCase()} ${t1} – ${t2}`;
  };

  const getActionBadge = (action: ScheduleChange['action']) => {
    switch (action) {
      case 'create':
        return (
          <span className="rounded-full bg-emerald-950 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-700/50 flex items-center gap-1">
            🟢 NUEVO
          </span>
        );
      case 'modify':
        return (
          <span className="rounded-full bg-amber-950 px-2.5 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-700/50 flex items-center gap-1">
            🟡 MODIFICADO
          </span>
        );
      case 'delete':
        return (
          <span className="rounded-full bg-rose-950 px-2.5 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-700/50 flex items-center gap-1">
            🔴 ELIMINAR
          </span>
        );
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl glass-panel p-3 shadow-2xl border border-cyan-500/40 animate-bounce">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-cyan-400" />
          <span className="text-xs font-semibold text-white">
            Propuesta Activa ({selectedChangeIds.length}/{changes.length} seleccionados)
          </span>
        </div>
        <button
          onClick={onToggleMinimize}
          className="rounded-xl bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-cyan-500 transition-all shadow-md"
        >
          Abrir Modal Diff
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl glass-panel border border-slate-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Propuesta de Optimización de Rutina</h2>
              <p className="text-xs text-slate-400">Motor Gemini 1.5 Flash + Open-Meteo Mar del Plata</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleMinimize}
              className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition-all border border-slate-700"
              title="Minimizar para ver los bloques en el calendario"
            >
              <Eye className="h-3.5 w-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Ver Calendario (Fantasma)</span>
            </button>
            <button
              onClick={onDiscard}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* 1. Resumen Ejecutivo */}
          <div className="rounded-2xl bg-slate-900/90 p-4 border border-cyan-500/30">
            <div className="flex items-start gap-3">
              <span className="text-xl">🧠</span>
              <div>
                <h4 className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">
                  Criterio de la IA
                </h4>
                <p className="mt-1 text-sm text-slate-200 leading-relaxed font-medium">
                  {summary}
                </p>
              </div>
            </div>
          </div>

          {/* 2. Auditoría de Reglas (Safety Checks) */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Auditoría de Restricciones Duras</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div
                className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-semibold border ${
                  safety_checks.locked_blocks_respected
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                }`}
              >
                {safety_checks.locked_blocks_respected ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-rose-400" />
                )}
                <span>Candados 100% Respetados</span>
              </div>

              <div
                className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-semibold border ${
                  safety_checks.cannabis_buffer_respected
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                }`}
              >
                {safety_checks.cannabis_buffer_respected ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-rose-400" />
                )}
                <span>Búfer Cannabis (4h)</span>
              </div>

              <div
                className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-semibold border ${
                  safety_checks.friend_availability_respected
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                }`}
              >
                {safety_checks.friend_availability_respected ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-rose-400" />
                )}
                <span>Horarios Contactos</span>
              </div>

              <div
                className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-semibold border ${
                  safety_checks.all_shifts_covered
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                }`}
              >
                {safety_checks.all_shifts_covered ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-rose-400" />
                )}
                <span>Turnos Cubiertos</span>
              </div>
            </div>
          </div>

          {/* 3. Estadísticas de la Semana (Scorecards) */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Métricas Semanales Estimadas
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div className="flex flex-col rounded-xl bg-slate-900/80 p-3 border border-slate-800 text-center">
                <span className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
                  <Moon className="h-3.5 w-3.5 text-indigo-400" /> Sueño Total
                </span>
                <span className="mt-1 text-base font-bold text-white">
                  {scorecards.total_sleep_hours.toFixed(1)}h
                </span>
                <span className="text-[10px] text-slate-500">
                  ~{(scorecards.total_sleep_hours / 7).toFixed(1)}h / noche
                </span>
              </div>

              <div className="flex flex-col rounded-xl bg-slate-900/80 p-3 border border-slate-800 text-center">
                <span className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
                  <BookOpen className="h-3.5 w-3.5 text-blue-400" /> Estudio
                </span>
                <span className="mt-1 text-base font-bold text-white">
                  {scorecards.total_study_hours.toFixed(1)}h
                </span>
                <span className="text-[10px] text-slate-500">Bloques continuos</span>
              </div>

              <div className="flex flex-col rounded-xl bg-slate-900/80 p-3 border border-slate-800 text-center">
                <span className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
                  <Users className="h-3.5 w-3.5 text-cyan-400" /> Social
                </span>
                <span className="mt-1 text-base font-bold text-white">
                  {scorecards.total_social_hours.toFixed(1)}h
                </span>
                <span className="text-[10px] text-slate-500">Vínculos activos</span>
              </div>

              <div className="flex flex-col rounded-xl bg-slate-900/80 p-3 border border-slate-800 text-center">
                <span className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
                  <Dumbbell className="h-3.5 w-3.5 text-fuchsia-400" /> Gimnasio
                </span>
                <span className="mt-1 text-base font-bold text-white">
                  {scorecards.gym_sessions_count}x
                </span>
                <span className="text-[10px] text-slate-500">Sesiones/sem</span>
              </div>

              <div className="flex flex-col rounded-xl bg-slate-900/80 p-3 border border-slate-800 text-center">
                <span className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
                  <Utensils className="h-3.5 w-3.5 text-emerald-400" /> Batch Cooking
                </span>
                <span className="mt-1 text-base font-bold text-white">
                  {scorecards.batch_cooking_sessions}x
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold">Viandas listas</span>
              </div>
            </div>
          </div>

          {/* 4. Lista de Cambios Propuestos (Tarjetas Interactivas con Check individual) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Cambios Propuestos ({selectedChangeIds.length} seleccionados de {changes.length})
              </h4>
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={onSelectAll}
                  className="text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  Seleccionar todos
                </button>
                <span className="text-slate-600">|</span>
                <button
                  onClick={onDeselectAll}
                  className="text-slate-400 hover:text-slate-300"
                >
                  Deseleccionar
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {changes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 p-6 text-center text-slate-400 text-sm">
                  No hay cambios requeridos. Tu agenda actual ya cumple con todas las restricciones óptimas.
                </div>
              ) : (
                changes.map((change, idx) => {
                  const isChecked = selectedChangeIds.includes(change.event_id);

                  return (
                    <div
                      key={change.event_id || idx}
                      onClick={() => onToggleChangeSelection(change.event_id)}
                      className={`relative flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl p-4 border transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-slate-900/90 border-cyan-500/50 shadow-md'
                          : 'bg-slate-900/40 border-slate-800 opacity-60'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-all ${
                            isChecked
                              ? 'bg-cyan-500 border-cyan-400 text-slate-950 font-bold'
                              : 'border-slate-600 bg-slate-800'
                          }`}
                        >
                          {isChecked && <Check className="h-4 w-4 stroke-[3]" />}
                        </div>
                        <div className="sm:hidden flex items-center gap-2">
                          {getActionBadge(change.action)}
                          <span className="font-bold text-white text-sm">{change.title}</span>
                        </div>
                      </div>

                      {/* Content details */}
                      <div className="flex-1 space-y-2">
                        <div className="hidden sm:flex items-center gap-2.5">
                          {getActionBadge(change.action)}
                          <h5 className="font-bold text-white text-sm">{change.title}</h5>
                          {change.contact_name && (
                            <span className="text-xs text-cyan-400 font-medium">
                              @{change.contact_name}
                            </span>
                          )}
                        </div>

                        {/* Before vs After comparison */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs">
                          {change.before && (
                            <div className="flex items-center gap-2 rounded-xl bg-slate-950/60 px-3 py-1.5 border border-slate-800 text-slate-400">
                              <span className="text-[10px] uppercase font-bold text-slate-500">Antes:</span>
                              <span className="font-mono text-slate-300">
                                {formatTimeRange(change.before.start_time, change.before.end_time)}
                              </span>
                              <span className="text-slate-400">({change.before.location_detail || change.before.location})</span>
                            </div>
                          )}

                          {change.before && change.after && (
                            <ArrowRight className="hidden sm:block h-4 w-4 text-slate-500 shrink-0" />
                          )}

                          {change.after && (
                            <div className="flex items-center gap-2 rounded-xl bg-cyan-950/40 px-3 py-1.5 border border-cyan-500/40 text-cyan-200">
                              <span className="text-[10px] uppercase font-bold text-cyan-400">Ahora:</span>
                              <span className="font-mono font-semibold text-white">
                                {formatTimeRange(change.after.start_time, change.after.end_time)}
                              </span>
                              <span className="text-cyan-300">({change.after.location_detail || change.after.location})</span>
                            </div>
                          )}
                        </div>

                        {/* Motivo de la IA */}
                        <p className="text-xs text-slate-300 flex items-start gap-1.5">
                          <span className="shrink-0 text-amber-400">💡</span>
                          <span>
                            <strong>Motivo:</strong> {change.reason}
                          </span>
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Warnings si hubiera */}
          {warnings && warnings.length > 0 && (
            <div className="rounded-2xl bg-amber-500/10 p-3.5 border border-amber-500/30 text-xs text-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <AlertCircle className="h-4 w-4" />
                <span>Advertencias del Optimizador:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-300 pl-1">
                {warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/90 px-6 py-4">
          <button
            onClick={onDiscard}
            disabled={isApplying}
            className="rounded-2xl px-5 py-2.5 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Descartar Propuesta
          </button>

          <button
            onClick={onApplyChanges}
            disabled={isApplying || selectedChangeIds.length === 0}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-xl shadow-cyan-900/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            {isApplying ? (
              <span>Aplicando en Supabase...</span>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>Aplicar Cambios Seleccionados ({selectedChangeIds.length})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

