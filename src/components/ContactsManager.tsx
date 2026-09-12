'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Edit3, Home, Clock, Users, Check, X, ShieldAlert } from 'lucide-react';
import { Contact, ContactBusySlot } from '@/types/database';

interface ContactsManagerProps {
  contacts: Contact[];
  busySlots: ContactBusySlot[];
  onSaveContact: (contact: Contact) => Promise<void>;
  onDeleteContact: (contactId: string) => Promise<void>;
  onSaveBusySlot: (slot: ContactBusySlot) => Promise<void>;
  onDeleteBusySlot: (slotId: string) => Promise<void>;
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const DEFAULT_COLORS = ['#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EF4444'];

export function ContactsManager({
  contacts,
  busySlots,
  onSaveContact,
  onDeleteContact,
  onSaveBusySlot,
  onDeleteBusySlot,
}: ContactsManagerProps) {
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isCreatingContact, setIsCreatingContact] = useState(false);

  // New Contact Form State
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('amigo');
  const [targetHours, setTargetHours] = useState(4.0);
  const [maxOccurrences, setMaxOccurrences] = useState(3);
  const [hasApartment, setHasApartment] = useState(false);
  const [colorCode, setColorCode] = useState('#3B82F6');
  const [notes, setNotes] = useState('');

  // New Busy Slot State for currently selected contact
  const [selectedContactForSlots, setSelectedContactForSlots] = useState<string | null>(
    contacts[0]?.id || null
  );
  const [slotDay, setSlotDay] = useState(1);
  const [slotStart, setSlotStart] = useState('09:00');
  const [slotEnd, setSlotEnd] = useState('18:00');
  const [slotDesc, setSlotDesc] = useState('Trabajo');

  const startCreate = () => {
    setName('');
    setRelationship('amigo');
    setTargetHours(4.0);
    setMaxOccurrences(3);
    setHasApartment(false);
    setColorCode('#3B82F6');
    setNotes('');
    setEditingContact(null);
    setIsCreatingContact(true);
  };

  const startEdit = (c: Contact) => {
    setEditingContact(c);
    setName(c.name);
    setRelationship(c.relationship || 'amigo');
    setTargetHours(c.target_hours_week);
    setMaxOccurrences(c.max_weekly_occurrences);
    setHasApartment(c.has_own_apartment);
    setColorCode(c.color_code || '#3B82F6');
    setNotes(c.notes || '');
    setIsCreatingContact(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const contactData: Contact = {
      id: editingContact ? editingContact.id : `c-${Date.now()}`,
      name: name.trim(),
      relationship,
      target_hours_week: Number(targetHours),
      max_weekly_occurrences: Number(maxOccurrences),
      has_own_apartment: hasApartment,
      color_code: colorCode,
      notes: notes.trim(),
    };

    await onSaveContact(contactData);
    setIsCreatingContact(false);
    setEditingContact(null);
    if (!selectedContactForSlots) {
      setSelectedContactForSlots(contactData.id);
    }
  };

  const handleAddBusySlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContactForSlots) return;

    const newSlot: ContactBusySlot = {
      id: `bs-${Date.now()}`,
      contact_id: selectedContactForSlots,
      day_of_week: Number(slotDay),
      start_time: slotStart,
      end_time: slotEnd,
      description: slotDesc.trim() || 'Ocupado',
    };

    await onSaveBusySlot(newSlot);
  };

  const activeContactSlots = busySlots.filter(
    (s) => s.contact_id === selectedContactForSlots
  );
  const currentContact = contacts.find((c) => c.id === selectedContactForSlots);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl glass-panel p-5 border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-cyan-400" />
            <span>Gestión Dinámica de Contactos y Vínculos</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Los vínculos no tienen reglas fijas: la IA lee directamente de la base de datos sus metas de horas, disponibilidad y si tienen depto bajo techo.
          </p>
        </div>

        <button
          onClick={startCreate}
          className="flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs font-bold text-white transition-all shadow-lg shadow-cyan-900/30 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Contacto</span>
        </button>
      </div>

      {/* Main Grid: Contacts List + Busy Slots Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Contacts List */}
        <div className="lg:col-span-6 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Contactos ({contacts.length})
          </h3>

          <div className="space-y-2.5">
            {contacts.map((contact) => {
              const isSelected = selectedContactForSlots === contact.id;
              const slotsCount = busySlots.filter((s) => s.contact_id === contact.id).length;

              return (
                <div
                  key={contact.id}
                  onClick={() => setSelectedContactForSlots(contact.id)}
                  className={`flex items-center justify-between rounded-2xl p-4 border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900/90 border-cyan-500/60 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/40'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-white text-sm shrink-0"
                      style={{ backgroundColor: contact.color_code }}
                    >
                      {contact.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-sm">{contact.name}</h4>
                        <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 capitalize">
                          {contact.relationship || 'Vínculo'}
                        </span>
                        {contact.has_own_apartment && (
                          <span
                            className="rounded-md bg-emerald-950/70 border border-emerald-500/40 px-1.5 py-0.5 text-[10px] text-emerald-300 flex items-center gap-1 font-semibold"
                            title="Tiene departamento propio (disponible en lluvia)"
                          >
                            <Home className="h-3 w-3" /> Depto
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        <span>🎯 {contact.target_hours_week}h/sem</span>
                        <span>•</span>
                        <span>{slotsCount} franjas ocupadas</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => startEdit(contact)}
                      className="rounded-xl p-2 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                      title="Editar contacto"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDeleteContact(contact.id)}
                      className="rounded-xl p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title="Eliminar contacto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Dynamic Busy Slots for Selected Contact */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-2xl glass-panel p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-cyan-400" />
                  <span>
                    Franjas Ocupadas de {currentContact ? currentContact.name : 'Contacto'}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  La IA jamás agendará actividades sociales durante estas horas.
                </p>
              </div>
              {currentContact?.has_own_apartment && (
                <span className="rounded-xl bg-emerald-950 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 border border-emerald-700/50 flex items-center gap-1">
                  <Home className="h-3.5 w-3.5" /> Depto Propio Disponible
                </span>
              )}
            </div>

            {/* Add Busy Slot Form */}
            <form onSubmit={handleAddBusySlot} className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">Día</label>
                <select
                  value={slotDay}
                  onChange={(e) => setSlotDay(Number(e.target.value))}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-xs text-white"
                >
                  {DAY_NAMES.map((name, i) => (
                    <option key={i} value={i}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">Desde</label>
                <input
                  type="time"
                  value={slotStart}
                  onChange={(e) => setSlotStart(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-xs text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">Hasta</label>
                <input
                  type="time"
                  value={slotEnd}
                  onChange={(e) => setSlotEnd(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-xs text-white font-mono"
                  required
                />
              </div>

              <div className="flex flex-col justify-end">
                <button
                  type="submit"
                  className="rounded-xl bg-slate-800 hover:bg-cyan-600 hover:text-white border border-slate-700 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition-all"
                >
                  + Agregar
                </button>
              </div>
            </form>

            {/* List of busy slots */}
            <div className="space-y-2 pt-2">
              {activeContactSlots.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">
                  No hay restricciones horarias registradas. El contacto está disponible toda la semana.
                </div>
              ) : (
                activeContactSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between rounded-xl bg-slate-900/60 px-3 py-2 border border-slate-800/80 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white w-20">
                        {DAY_NAMES[slot.day_of_week]}
                      </span>
                      <span className="font-mono text-cyan-300">
                        {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                      </span>
                      {slot.description && (
                        <span className="text-slate-400 text-[11px]">({slot.description})</span>
                      )}
                    </div>

                    <button
                      onClick={() => onDeleteBusySlot(slot.id)}
                      className="rounded p-1 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Quitar franja ocupada"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Create or Edit Contact */}
      {isCreatingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-3xl glass-panel p-6 border border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingContact ? 'Editar Contacto' : 'Nuevo Contacto'}
              </h3>
              <button
                onClick={() => setIsCreatingContact(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Nombre / Apodo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Juancito, Sofi, Nico..."
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Relación</label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white"
                  >
                    <option value="amigo">Amigo/a</option>
                    <option value="ex">Ex</option>
                    <option value="cita">Cita</option>
                    <option value="familia">Familia</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Color Distintivo</label>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {DEFAULT_COLORS.map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setColorCode(col)}
                        className={`h-6 w-6 rounded-full transition-transform ${
                          colorCode === col ? 'scale-125 ring-2 ring-white' : 'opacity-70'
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Meta de Horas/Semana
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="40"
                    value={targetHours}
                    onChange={(e) => setTargetHours(Number(e.target.value))}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Max Juntadas/Semana
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="14"
                    value={maxOccurrences}
                    onChange={(e) => setMaxOccurrences(Number(e.target.value))}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-slate-900/80 p-3 border border-slate-800">
                <input
                  type="checkbox"
                  id="hasApartmentCheck"
                  checked={hasApartment}
                  onChange={(e) => setHasApartment(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                />
                <label htmlFor="hasApartmentCheck" className="text-xs text-slate-200 cursor-pointer">
                  <strong>Tiene Departamento Propio</strong>
                  <span className="block text-[11px] text-slate-400">
                    Permite a la IA planificar actividades en su depto como resguardo de lluvia (máx 1x por semana).
                  </span>
                </label>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Notas / Preferencias</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Solo disponible fines de semana, le gusta ir a Playa Grande..."
                  rows={2}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreatingContact(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-cyan-600 hover:bg-cyan-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-900/30"
                >
                  Guardar Contacto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

