'use client';

import React, { useState, useEffect } from 'react';
import { Sliders, Moon, BookOpen, Users, Dumbbell, Shield, Car, Save, Check, Key, ExternalLink, Eye, EyeOff, Sparkles, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { UserPreferences } from '@/types/database';
import { DataStore } from '@/lib/storage';

interface PreferencesModalProps {
  preferences: UserPreferences;
  onSave: (prefs: UserPreferences) => Promise<void>;
  onApiKeySaved?: () => void;
}

export function PreferencesModal({ preferences, onSave, onApiKeySaved }: PreferencesModalProps) {
  const [weightSleep, setWeightSleep] = useState(preferences.weight_sleep);
  const [weightStudy, setWeightStudy] = useState(preferences.weight_study);
  const [weightSocial, setWeightSocial] = useState(preferences.weight_social);
  const [weightGym, setWeightGym] = useState(preferences.weight_gym);
  const [cannabisBuffer, setCannabisBuffer] = useState(preferences.cannabis_buffer_hours);
  const [commuteMinutes, setCommuteMinutes] = useState(preferences.commute_duration_minutes);
  const [targetSleep, setTargetSleep] = useState(preferences.target_sleep_hours);
  const [geminiKey, setGeminiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setGeminiKey(DataStore.getGeminiApiKey());
  }, []);

  const handleSaveKey = (keyToSave?: string) => {
    const val = typeof keyToSave === 'string' ? keyToSave : geminiKey;
    DataStore.saveGeminiApiKey(val);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2500);
    if (onApiKeySaved) onApiKeySaved();
  };

  const handleTestKey = async () => {
    const keyToTest = geminiKey.trim();
    if (!keyToTest || keyToTest.length < 10) {
      setTestResult({
        success: false,
        message: 'Por favor ingresa una clave válida de Google AI Studio antes de probar.',
      });
      return;
    }

    setIsTestingKey(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/gemini/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: keyToTest }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: `¡Conexión exitosa con ${data.model}! Latencia: ${data.latency_ms} ms.`,
        });
        // Auto-guardar la clave probada exitosamente
        handleSaveKey(keyToTest);
      } else {
        setTestResult({
          success: false,
          message: data.hint || data.error || 'Error al conectar con Gemini.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Error de red al conectar: ${err?.message || err}`,
      });
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Guardar clave de Gemini siempre que se guarde el formulario
    handleSaveKey();

    const updated: UserPreferences = {
      ...preferences,
      weight_sleep: Number(weightSleep),
      weight_study: Number(weightStudy),
      weight_social: Number(weightSocial),
      weight_gym: Number(weightGym),
      cannabis_buffer_hours: Number(cannabisBuffer),
      commute_duration_minutes: Number(commuteMinutes),
      target_sleep_hours: Number(targetSleep),
      updated_at: new Date().toISOString(),
    };

    await onSave(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="rounded-2xl glass-panel p-5 border border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Sliders className="h-5 w-5 text-cyan-400" />
          <span>Ponderaciones de Prioridad & Preferencias Globales</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Ajusta los sliders (0 a 10) para definir cómo debe resolver la IA los conflictos de agenda entre descanso, estudio, amistades y entrenamiento.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sliders 0-10 */}
        <div className="rounded-2xl glass-panel p-6 border border-slate-800 space-y-5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Prioridades Relativas (0 = Mínima, 10 = Vital)
          </h3>

          {/* Sueño */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-2">
                <Moon className="h-4 w-4 text-indigo-400" />
                <span>Sueño & Descanso Flotante</span>
              </span>
              <span className="font-mono text-base font-black text-cyan-400">{weightSleep}/10</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              value={weightSleep}
              onChange={(e) => setWeightSleep(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <p className="text-[11px] text-slate-400">
              Garantiza 8h continuas tras salidas nocturnas de trabajo (ej. Ferro a la 01:00 AM).
            </p>
          </div>

          {/* Estudio */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-400" />
                <span>Estudio Universitario (Foco Continuo)</span>
              </span>
              <span className="font-mono text-base font-black text-blue-400">{weightStudy}/10</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              value={weightStudy}
              onChange={(e) => setWeightStudy(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-400"
            />
            <p className="text-[11px] text-slate-400">
              Protege bloques indivisibles de 1.5h a 2.5h para Redes, Análisis y Calidad.
            </p>
          </div>

          {/* Vida Social */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-cyan-400" />
                <span>Vida Social & Vínculos</span>
              </span>
              <span className="font-mono text-base font-black text-cyan-400">{weightSocial}/10</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              value={weightSocial}
              onChange={(e) => setWeightSocial(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <p className="text-[11px] text-slate-400">
              Prioriza alcanzar las metas de horas semanales con amigos y salidas.
            </p>
          </div>

          {/* Gym */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-fuchsia-400" />
                <span>Entrenamiento / Gimnasio</span>
              </span>
              <span className="font-mono text-base font-black text-fuchsia-400">{weightGym}/10</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              value={weightGym}
              onChange={(e) => setWeightGym(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-400"
            />
            <p className="text-[11px] text-slate-400">
              Programa sesiones respetando intervalos de recuperación muscular.
            </p>
          </div>
        </div>

        {/* Parámetros Operativos */}
        <div className="rounded-2xl glass-panel p-6 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Reglas Operativas y Biológicas
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5 rounded-xl bg-slate-900/60 p-3.5 border border-slate-800">
              <label className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <Shield className="h-4 w-4" /> Búfer Cannabis (horas)
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="8"
                value={cannabisBuffer}
                onChange={(e) => setCannabisBuffer(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white font-mono"
                required
              />
              <p className="text-[10px] text-slate-400">
                Mínimo 4.0h obligatorias fuera de casa antes de volver con los padres.
              </p>
            </div>

            <div className="space-y-1.5 rounded-xl bg-slate-900/60 p-3.5 border border-slate-800">
              <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Car className="h-4 w-4" /> Traslado / Commute (min)
              </label>
              <input
                type="number"
                step="5"
                min="10"
                max="90"
                value={commuteMinutes}
                onChange={(e) => setCommuteMinutes(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white font-mono"
                required
              />
              <p className="text-[10px] text-slate-400">
                Tiempo de desconexión (música/podcasts, sin forzar estudio).
              </p>
            </div>

            <div className="space-y-1.5 rounded-xl bg-slate-900/60 p-3.5 border border-slate-800">
              <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Moon className="h-4 w-4" /> Meta Sueño Diario (h)
              </label>
              <input
                type="number"
                step="0.5"
                min="6"
                max="10"
                value={targetSleep}
                onChange={(e) => setTargetSleep(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white font-mono"
                required
              />
              <p className="text-[10px] text-slate-400">
                Meta biológica de descanso diario continuo.
              </p>
            </div>
          </div>
        </div>

        {/* Gemini 1.5 Flash API Key */}
        <div className="rounded-2xl glass-panel p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <span>Conexión con Google Gemini 1.5 Flash (Gratuito)</span>
            </h3>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                geminiKey.trim().length > 10
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                  : 'bg-amber-950 text-amber-300 border-amber-700/60'
              }`}
            >
              {geminiKey.trim().length > 10 ? '🟢 Clave Configurada' : '🟡 Sin Clave (Modo Fallback)'}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Para habilitar el razonamiento profundo y evitar el motor de prueba, ingresa tu API Key de <strong>Google AI Studio</strong>. Es 100% gratuita (15 solicitudes por minuto y 1,500 por día).
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type={showKey ? 'text' : 'password'}
                value={geminiKey}
                onChange={(e) => {
                  setGeminiKey(e.target.value);
                  setTestResult(null);
                }}
                onBlur={() => handleSaveKey()}
                placeholder="AIzaSy..."
                className="w-full rounded-xl bg-slate-950 border border-slate-700 pl-9 pr-10 py-2 text-xs text-white font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Botón Probar Conexión */}
            <button
              type="button"
              onClick={handleTestKey}
              disabled={isTestingKey}
              className="rounded-xl bg-slate-800 hover:bg-slate-700 border border-cyan-500/40 px-3.5 py-2 text-xs font-bold text-cyan-300 hover:text-white transition-all shrink-0 flex items-center justify-center gap-1.5 disabled:opacity-50"
              title="Realiza una prueba real de conexión con Gemini 1.5 Flash"
            >
              {isTestingKey ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              )}
              <span>{isTestingKey ? 'Probando...' : '🧪 Probar Conexión'}</span>
            </button>

            {/* Botón Guardar */}
            <button
              type="button"
              onClick={() => handleSaveKey()}
              className="rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs font-bold text-white transition-all shrink-0 flex items-center justify-center gap-1.5"
            >
              {keySaved ? <Check className="h-3.5 w-3.5" /> : null}
              <span>{keySaved ? '¡Guardada!' : 'Guardar Clave'}</span>
            </button>

            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1 shrink-0"
            >
              <span>Obtener Gratis</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Banner de resultado de prueba */}
          {testResult && (
            <div
              className={`rounded-xl p-3 text-xs flex items-start gap-2.5 border animate-fade-in ${
                testResult.success
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                  : 'bg-rose-950/60 border-rose-500/50 text-rose-200'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">{testResult.message}</p>
                {testResult.success && (
                  <p className="text-[11px] text-emerald-300/80 mt-0.5">
                    Clave verificada y guardada localmente. Ahora las optimizaciones usarán Google Gemini.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 animate-fade-in">
              <Check className="h-4 w-4" /> ¡Preferencias guardadas exitosamente!
            </span>
          )}
          <button
            type="submit"
            className="flex items-center gap-2 rounded-2xl bg-cyan-600 hover:bg-cyan-500 px-6 py-2.5 text-xs font-bold text-white shadow-xl shadow-cyan-900/40 transition-all active:scale-95"
          >
            <Save className="h-4 w-4" />
            <span>Guardar Configuración</span>
          </button>
        </div>
      </form>
    </div>
  );
}

