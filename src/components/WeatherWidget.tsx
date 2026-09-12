'use client';

import React, { useState } from 'react';
import { Cloud, CloudRain, Sun, Wind, CloudLightning, Thermometer, ChevronDown, ChevronUp, Umbrella } from 'lucide-react';
import { HourlyWeatherSlot } from '@/lib/weather';

interface WeatherWidgetProps {
  slots: HourlyWeatherSlot[];
  selectedDate: Date;
}

export function WeatherWidget({ slots, selectedDate }: WeatherWidgetProps) {
  const [expanded, setExpanded] = useState(false);

  if (!slots.length) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400 border border-slate-800">
        <Cloud className="h-4 w-4 animate-spin text-cyan-400" />
        <span>Cargando clima MDP...</span>
      </div>
    );
  }

  // Find slot closest to current hour or selected date midday
  const nowHour = new Date().getHours();
  const currentSlot = slots[nowHour] || slots[0];

  const hasRainAlert = slots.slice(0, 24).some((s) => s.precipitation_probability > 30);
  const hasWindAlert = slots.slice(0, 24).some((s) => s.windspeed > 35);

  const renderIcon = (iconName: string, className: string = 'h-4 w-4') => {
    switch (iconName) {
      case 'cloud-rain':
        return <CloudRain className={`${className} text-blue-400`} />;
      case 'wind':
        return <Wind className={`${className} text-cyan-300`} />;
      case 'cloud-lightning':
        return <CloudLightning className={`${className} text-amber-400`} />;
      case 'sun':
        return <Sun className={`${className} text-amber-400`} />;
      case 'cloud-sun':
        return <Cloud className={`${className} text-cyan-200`} />;
      default:
        return <Cloud className={`${className} text-slate-300`} />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-2 rounded-2xl px-3 py-1.5 text-xs font-medium border transition-all duration-200 ${
          hasRainAlert
            ? 'bg-blue-950/50 border-blue-500/40 text-blue-200 hover:bg-blue-900/50 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
            : hasWindAlert
            ? 'bg-amber-950/50 border-amber-500/40 text-amber-200 hover:bg-amber-900/50'
            : 'bg-slate-900/70 border-slate-700/60 text-slate-200 hover:bg-slate-800/80'
        }`}
      >
        <span className="flex items-center gap-1.5">
          {renderIcon(currentSlot.icon, 'h-4 w-4')}
          <span className="font-semibold">{Math.round(currentSlot.temperature)}°C</span>
          <span className="text-slate-400">MDP</span>
        </span>

        {currentSlot.precipitation_probability > 0 && (
          <span className="flex items-center gap-0.5 text-blue-400 text-[11px]">
            <CloudRain className="h-3 w-3" />
            {currentSlot.precipitation_probability}%
          </span>
        )}

        {currentSlot.windspeed > 25 && (
          <span className="flex items-center gap-0.5 text-cyan-300 text-[11px]">
            <Wind className="h-3 w-3" />
            {Math.round(currentSlot.windspeed)}k
          </span>
        )}

        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
      </button>

      {/* Expanded Forecast Dropdown */}
      {expanded && (
        <div className="absolute right-0 top-full mt-2 z-40 w-80 rounded-2xl glass-panel p-4 shadow-2xl border border-slate-700/70">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <div>
              <h4 className="text-sm font-semibold text-white">Mar del Plata - Open-Meteo</h4>
              <p className="text-[11px] text-slate-400">Pronóstico horario para optimización</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-cyan-400">{currentSlot.condition}</span>
            </div>
          </div>

          {(hasRainAlert || hasWindAlert) && (
            <div className="mb-3 rounded-xl bg-amber-500/10 border border-amber-500/30 p-2 text-xs text-amber-300 flex items-start gap-2">
              <Umbrella className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                <strong>Regla de Clima MDP Activa:</strong>{' '}
                {hasRainAlert ? 'Lluvia > 30% prevista.' : 'Viento fuerte > 35km/h.'} Las actividades recreativas serán sugeridas bajo techo (Güemes, Paseo Aldrey o Depto).
              </span>
            </div>
          )}

          {/* Próximas 12 horas */}
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {slots.slice(0, 16).map((slot, idx) => {
              const timeStr = slot.time.split('T')[1]?.slice(0, 5) || slot.time;
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs ${
                    slot.is_adverse ? 'bg-rose-950/30 border border-rose-800/40 text-rose-200' : 'bg-slate-900/40 text-slate-300'
                  }`}
                >
                  <span className="font-mono text-slate-400 w-12">{timeStr}</span>
                  <div className="flex items-center gap-1.5">
                    {renderIcon(slot.icon, 'h-3.5 w-3.5')}
                    <span className="font-semibold text-white">{Math.round(slot.temperature)}°C</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className={slot.precipitation_probability > 30 ? 'text-blue-400 font-bold' : 'text-slate-400'}>
                      💧 {slot.precipitation_probability}%
                    </span>
                    <span className={slot.windspeed > 35 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                      💨 {Math.round(slot.windspeed)} km/h
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

