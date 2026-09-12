'use client';

import React, { useState } from 'react';
import {
  Terminal,
  X,
  Copy,
  Check,
  Sparkles,
  AlertTriangle,
  Clock,
  Key,
  ExternalLink,
  Code,
  Layers,
} from 'lucide-react';
import { ExecutionLogs } from '@/types/optimizer';
import { DataStore } from '@/lib/storage';

interface AILogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: ExecutionLogs | null | undefined;
  onApiKeySaved?: () => void;
}

export function AILogsModal({ isOpen, onClose, logs, onApiKeySaved }: AILogsModalProps) {
  const [activeTab, setActiveTab] = useState<'response' | 'prompt' | 'system' | 'payload'>('response');
  const [copied, setCopied] = useState(false);
  const [inputKey, setInputKey] = useState(() => DataStore.getGeminiApiKey());
  const [keySaved, setKeySaved] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen || !logs) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveKey = (keyVal?: string) => {
    const val = typeof keyVal === 'string' ? keyVal : inputKey;
    DataStore.saveGeminiApiKey(val);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2500);
    if (onApiKeySaved) onApiKeySaved();
  };

  const handleTestKey = async () => {
    const keyToTest = inputKey.trim();
    if (!keyToTest || keyToTest.length < 10) {
      setTestResult({
        success: false,
        message: 'Ingresa una clave válida antes de probar.',
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
        handleSaveKey(keyToTest);
      } else {
        setTestResult({
          success: false,
          message: data.hint || data.error || 'Error conectando con Gemini.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Error de red: ${err?.message || err}`,
      });
    } finally {
      setIsTestingKey(false);
    }
  };

  const isGemini = logs.provider === 'gemini-1.5-flash' || logs.provider === 'gemini';
  const stage = logs.stages[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl glass-panel border border-slate-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${
                isGemini
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
              }`}
            >
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white sm:text-lg">
                  Inspector de IA & Logs de Ejecución
                </h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                    isGemini
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                      : 'bg-amber-950 text-amber-300 border-amber-700/60'
                  }`}
                >
                  {isGemini ? `🟢 ${logs.model_name || 'Gemini'} Conectado` : '🟡 Modo Fallback Heurístico'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Latencia total: <span className="font-mono text-cyan-300 font-semibold">{logs.total_latency_ms}ms</span> • Clave: <span className="font-mono text-slate-300">{(logs.api_key_source === 'header' || logs.api_key_source === 'body') ? 'Guardada en App' : logs.api_key_source === 'env' ? 'Variable de Entorno' : 'No configurada'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Missing API Key or Error Banner */}
          {!isGemini && (
            <div className={`rounded-2xl p-4 border text-xs space-y-3 ${
              logs.error_details ? 'bg-rose-950/40 border-rose-500/40' : 'bg-amber-950/40 border-amber-500/40'
            }`}>
              <div className={`flex items-start gap-2.5 ${logs.error_details ? 'text-rose-200' : 'text-amber-200'}`}>
                <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${logs.error_details ? 'text-rose-400' : 'text-amber-400'}`} />
                <div>
                  <h4 className={`font-bold text-sm ${logs.error_details ? 'text-rose-300' : 'text-amber-300'}`}>
                    {logs.error_details ? 'Error en la conexión con Gemini 1.5 Flash' : 'No se detectó GEMINI_API_KEY activa'}
                  </h4>
                  <p className="text-slate-300 mt-1 leading-relaxed">
                    {logs.error_details ? (
                      <span className="font-mono text-[11px] bg-slate-950/80 p-1.5 rounded-lg block my-1 border border-rose-800/40 text-rose-300">
                        {logs.error_details}
                      </span>
                    ) : null}
                    {logs.error_details
                      ? 'La app cayó en el motor de prueba. Verifica o actualiza tu clave de Google AI Studio abajo:'
                      : 'La optimización se resolvió mediante el motor local. Ingresa tu clave de Google AI Studio abajo:'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                <div className="relative flex-1">
                  <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    value={inputKey}
                    onChange={(e) => {
                      setInputKey(e.target.value);
                      setTestResult(null);
                    }}
                    onBlur={() => handleSaveKey()}
                    placeholder="Pega tu GEMINI_API_KEY aquí (AIzaSy...)"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 pl-9 pr-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleTestKey}
                  disabled={isTestingKey}
                  className="rounded-xl bg-slate-800 hover:bg-slate-700 border border-cyan-500/40 px-3 py-2 text-xs font-bold text-cyan-300 hover:text-white transition-all shrink-0 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                  <span>{isTestingKey ? 'Probando...' : '🧪 Probar'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveKey()}
                  className="rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs font-bold text-white transition-all shrink-0 flex items-center justify-center gap-1.5"
                >
                  {keySaved ? <Check className="h-3.5 w-3.5" /> : null}
                  <span>{keySaved ? '¡Guardada!' : 'Guardar y Usar'}</span>
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

              {testResult && (
                <div className={`rounded-xl p-2.5 text-xs font-semibold border ${
                  testResult.success
                    ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                    : 'bg-rose-950/70 border-rose-500/50 text-rose-200'
                }`}>
                  {testResult.message}
                </div>
              )}
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('response')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'response'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Code className="h-3.5 w-3.5" />
              <span>Respuesta Cruda (Raw)</span>
            </button>
            <button
              onClick={() => setActiveTab('prompt')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'prompt'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>Prompt Enviado</span>
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'system'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>System Prompt</span>
            </button>
          </div>

          {/* Tab Contents */}
          <div className="relative rounded-2xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs overflow-x-auto max-h-[500px]">
            {/* Copy Button */}
            <button
              onClick={() => {
                const text =
                  activeTab === 'response'
                    ? stage?.raw_response || ''
                    : activeTab === 'prompt'
                    ? stage?.prompt_sent || ''
                    : logs.overall_system_prompt || '';
                handleCopy(text);
              }}
              className="absolute top-3 right-3 flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] text-slate-300 transition-all border border-slate-700"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>

            {activeTab === 'response' && (
              <pre className="text-emerald-300 leading-relaxed whitespace-pre-wrap">
                {stage?.raw_response || 'Sin respuesta registrada.'}
              </pre>
            )}

            {activeTab === 'prompt' && (
              <pre className="text-cyan-200 leading-relaxed whitespace-pre-wrap">
                {stage?.prompt_sent || 'Sin prompt registrado.'}
              </pre>
            )}

            {activeTab === 'system' && (
              <pre className="text-purple-200 leading-relaxed whitespace-pre-wrap">
                {logs.overall_system_prompt || 'Sin System Prompt registrado.'}
              </pre>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/90 px-6 py-3 text-xs text-slate-400">
          <span>
            Modelo: <strong className="text-white">{logs.model_name}</strong>
          </span>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-1.5 text-xs font-bold text-white transition-colors"
          >
            Cerrar Inspector
          </button>
        </div>
      </div>
    </div>
  );
}

