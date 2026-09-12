'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Camera,
  Upload,
  Image as ImageIcon,
  X,
  Check,
  CheckCircle2,
  Clock,
  MapPin,
  Lock,
  AlertCircle,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { ParsedScheduleItem, ParseScheduleResponse } from '@/types/parser';
import { DataStore } from '@/lib/storage';

interface SmartScheduleImporterProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  onImportEvents: (items: ParsedScheduleItem[]) => Promise<void>;
}

export function SmartScheduleImporter({
  isOpen,
  onClose,
  selectedDate,
  onImportEvents,
}: SmartScheduleImporterProps) {
  const [prompt, setPrompt] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseScheduleResponse | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clipboard paste listener (Ctrl+V anywhere in modal to paste image)
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            readImageFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  if (!isOpen) return null;

  const readImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagePreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readImageFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      readImageFile(file);
    }
  };

  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && !imagePreview) return;

    setIsParsing(true);
    setParseResult(null);

    try {
      const apiKey = DataStore.getGeminiApiKey();
      const res = await fetch('/api/parse-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-gemini-api-key': apiKey } : {}),
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          image: imagePreview,
          reference_date: selectedDate.toISOString(),
        }),
      });

      if (!res.ok) {
        throw new Error(`Error en API ${res.status}`);
      }

      const data: ParseScheduleResponse = await res.json();
      setParseResult(data);
      setSelectedItemIds(data.items.map((it) => it.id));
    } catch (err) {
      console.error('Error parsing schedule with AI:', err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!parseResult) return;
    const itemsToImport = parseResult.items.filter((it) => selectedItemIds.includes(it.id));
    if (itemsToImport.length === 0) return;

    setIsSaving(true);
    try {
      await onImportEvents(itemsToImport);
      onClose();
      // Reset state
      setPrompt('');
      setImagePreview(null);
      setParseResult(null);
    } catch (err) {
      console.error('Error saving imported events:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const formatTimeRange = (startIso: string, endIso: string) => {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const day = s.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
    const t1 = s.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
    const t2 = e.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
    const crossesMidnight = e.getDate() !== s.getDate();

    return {
      day: day.toUpperCase(),
      time: `${t1} – ${t2}${crossesMidnight ? ' (+1 día)' : ''}`,
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-3xl glass-panel border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white sm:text-lg">
                Importador de Horarios Multimodal
              </h2>
              <p className="text-xs text-slate-400">
                Escribe o adjunta una foto/captura de pantalla (WhatsApp, planilla o foto de turnos)
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {!parseResult ? (
            <form onSubmit={handleProcess} className="space-y-4">
              {/* Text Input */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Mensaje o Instrucción (Texto Libre)</span>
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ej: 'Estos son mis horarios de trabajo de esta semana, agregalos: miércoles de 10 a 16 en Rambla y viernes de 17 a 01 en Ferro' o simplemente escribe lo que necesites agendar..."
                  rows={3}
                  className="w-full rounded-2xl bg-slate-900/80 border border-slate-700 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Image Upload / Drag & Drop / Paste */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Imagen o Captura con Horarios (Opcional)</span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Soporta pegar directo con <kbd className="font-mono bg-slate-800 px-1 rounded">Ctrl+V</kbd>
                  </span>
                </label>

                {imagePreview ? (
                  <div className="relative rounded-2xl border border-cyan-500/40 bg-slate-900/90 p-2 overflow-hidden flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={imagePreview}
                        alt="Horarios adjuntos"
                        className="h-16 w-16 object-cover rounded-xl border border-slate-700"
                      />
                      <div>
                        <p className="text-xs font-semibold text-white">Imagen adjunta lista</p>
                        <p className="text-[11px] text-cyan-400">
                          Gemini 1.5 Flash leerá los horarios mediante OCR visual
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImagePreview(null)}
                      className="rounded-xl p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors mr-2"
                      title="Quitar imagen"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-cyan-400 bg-cyan-950/20'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-cyan-400 mb-2">
                      <Camera className="h-6 w-6" />
                    </div>
                    <p className="text-xs font-semibold text-white">
                      Arrastra una foto o haz clic para subir
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Foto de planilla, captura de WhatsApp o anotación de turnos (PNG, JPG, WebP)
                    </p>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isParsing || (!prompt.trim() && !imagePreview)}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-xl shadow-cyan-900/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {isParsing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-cyan-200" />
                      <span>Analizando con Gemini 1.5 Flash...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-cyan-200" />
                      <span>Interpretar y Extraer Horarios 🪄</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Results Step */
            <div className="space-y-4">
              <div className="rounded-2xl bg-cyan-950/40 p-4 border border-cyan-500/40 text-xs">
                <div className="flex items-center gap-2 font-bold text-cyan-300">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Resultado del Reconocimiento:</span>
                </div>
                <p className="mt-1 text-slate-200 font-medium">{parseResult.summary}</p>
              </div>

              {parseResult.warnings && parseResult.warnings.length > 0 && (
                <div className="rounded-xl bg-amber-950/40 p-3 border border-amber-500/30 text-xs text-amber-200 space-y-1">
                  {parseResult.warnings.map((w, idx) => (
                    <div key={idx} className="flex items-start gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Items List */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Bloques Identificados ({selectedItemIds.length}/{parseResult.items.length}{' '}
                  seleccionados)
                </h4>

                {parseResult.items.map((item) => {
                  const isChecked = selectedItemIds.includes(item.id);
                  const { day, time } = formatTimeRange(item.start_time, item.end_time);

                  return (
                    <div
                      key={item.id}
                      onClick={() =>
                        setSelectedItemIds((prev) =>
                          prev.includes(item.id)
                            ? prev.filter((id) => id !== item.id)
                            : [...prev, item.id]
                        )
                      }
                      className={`flex items-center justify-between rounded-2xl p-3.5 border transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-slate-900/90 border-cyan-500/50 shadow-md'
                          : 'bg-slate-900/40 border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition-all ${
                            isChecked
                              ? 'bg-cyan-500 border-cyan-400 text-slate-950 font-bold'
                              : 'border-slate-600 bg-slate-800'
                          }`}
                        >
                          {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-white text-xs">{item.title}</h5>
                            {item.branch && (
                              <span
                                className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                  item.branch === 'Ferro'
                                    ? 'bg-amber-950 text-amber-300 border border-amber-700/50'
                                    : 'bg-blue-950 text-blue-300 border border-blue-700/50'
                                }`}
                              >
                                {item.branch}
                              </span>
                            )}
                            {item.is_locked && (
                              <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                                <Lock className="h-3 w-3" /> Candado
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-300 mt-1">
                            <span className="font-semibold text-white">{day}</span>
                            <span className="font-mono text-cyan-300">{time}</span>
                            <span className="text-slate-400 text-[11px]">
                              • {item.location_detail || item.location}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setParseResult(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Volver a Editar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={isSaving || selectedItemIds.length === 0}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-2.5 text-xs font-bold text-white shadow-xl shadow-emerald-950/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSaving ? (
                    <span>Guardando en Calendario...</span>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Agregar {selectedItemIds.length} Bloques al Calendario</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

