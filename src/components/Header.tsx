'use client';

import React from 'react';
import { Sparkles, Calendar, Users, Briefcase, Sliders, RefreshCw, ChevronLeft, ChevronRight, Lock, Database } from 'lucide-react';
import { WeatherWidget } from './WeatherWidget';
import { HourlyWeatherSlot } from '@/lib/weather';

interface HeaderProps {
  activeTab: 'calendar' | 'contacts' | 'shifts' | 'preferences';
  setActiveTab: (tab: 'calendar' | 'contacts' | 'shifts' | 'preferences') => void;
  selectedDate: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onReconsider: () => void;
  isOptimizing: boolean;
  weatherSlots: HourlyWeatherSlot[];
  isSupabaseLive: boolean;
  onLockApp: () => void;
  hasGhostProposal: boolean;
}

export function Header({
  activeTab,
  setActiveTab,
  selectedDate,
  onPrevWeek,
  onNextWeek,
  onToday,
  onReconsider,
  isOptimizing,
  weatherSlots,
  isSupabaseLive,
  onLockApp,
  hasGhostProposal,
}: HeaderProps) {
  // Format week range label
  const d = new Date(selectedDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d.setDate(diff));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);

  const formatShort = (date: Date) =>
    date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left branding & week navigator */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-950/50">
              <span className="text-xl font-black tracking-tighter">M</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white sm:text-lg">MiMesa</h1>
                <span className="rounded-md bg-cyan-950 px-1.5 py-0.5 text-[10px] font-medium text-cyan-400 border border-cyan-800/60">
                  MDP Kernel
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Optimizador de Vida Cotidiana</p>
            </div>
          </div>

          {/* Week switcher */}
          <div className="flex items-center gap-1 rounded-2xl bg-slate-900/80 p-1 border border-slate-800">
            <button
              onClick={onPrevWeek}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              title="Semana anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={onToday}
              className="px-2 py-1 text-xs font-medium text-slate-300 hover:text-cyan-400 transition-colors"
              title="Ir a hoy"
            >
              {formatShort(mon)} – {formatShort(sun)}
            </button>
            <button
              onClick={onNextWeek}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              title="Semana siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto rounded-2xl bg-slate-900/60 p-1 border border-slate-800/80">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'calendar'
                ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Calendario</span>
            {hasGhostProposal && (
              <span className="h-2 w-2 rounded-full bg-purple-400 animate-ping" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'contacts'
                ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Contactos</span>
          </button>
          <button
            onClick={() => setActiveTab('shifts')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'shifts'
                ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" />
            <span>Turnos Trabajo</span>
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'preferences'
                ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Preferencias</span>
          </button>
        </nav>

        {/* Right side actions: Weather, Sync badge, Reconsider button, Lock */}
        <div className="flex items-center gap-2 justify-end">
          <WeatherWidget slots={weatherSlots} selectedDate={selectedDate} />

          {/* Sync badge */}
          <div
            className={`hidden md:flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-medium border ${
              isSupabaseLive
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
            title={isSupabaseLive ? 'Sincronización en tiempo real activa' : 'Almacenamiento local'}
          >
            <Database className="h-3 w-3" />
            <span>{isSupabaseLive ? 'Realtime' : 'Local'}</span>
          </div>

          {/* Primary Action Button: ⚡ Reconsiderar */}
          <button
            onClick={onReconsider}
            disabled={isOptimizing}
            className="group relative flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-900/40 transition-all hover:scale-[1.02] hover:shadow-cyan-700/50 active:scale-95 disabled:opacity-70"
          >
            {isOptimizing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-cyan-200" />
                <span>Optimizando...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-cyan-200 group-hover:rotate-12 transition-transform" />
                <span>⚡ Reconsiderar</span>
              </>
            )}
          </button>

          {/* Lock session button */}
          <button
            onClick={onLockApp}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent hover:border-slate-800 transition-colors"
            title="Bloquear con PIN"
          >
            <Lock className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

