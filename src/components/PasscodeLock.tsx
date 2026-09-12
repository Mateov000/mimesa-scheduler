'use client';

import React, { useState } from 'react';
import { Lock, Unlock, ShieldCheck, Sparkles } from 'lucide-react';
import { DataStore } from '@/lib/storage';

interface PasscodeLockProps {
  onUnlock: () => void;
}

export function PasscodeLock({ onUnlock }: PasscodeLockProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const correctPasscode = process.env.NEXT_PUBLIC_APP_PASSCODE || '1234';

  const handleDigit = (digit: string) => {
    if (pin.length < 8) {
      const next = pin + digit;
      setPin(next);
      setError(false);
      if (next === correctPasscode) {
        DataStore.setAuthenticated(true);
        onUnlock();
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin === correctPasscode) {
      DataStore.setAuthenticated(true);
      onUnlock();
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4">
      <div className="w-full max-w-sm rounded-3xl glass-panel p-8 text-center shadow-2xl border border-cyan-500/20">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
          <Lock className="h-8 w-8 animate-pulse" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white">MiMesa Scheduler</h1>
        <p className="mt-1 text-sm text-slate-400">Optimizador de Vida Cotidiana MDP</p>

        <div className="my-6">
          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-4 w-4 rounded-full border transition-all duration-200 ${
                  pin.length > i
                    ? 'bg-cyan-400 border-cyan-400 shadow-[0_0_8px_#22d3ee]'
                    : 'border-slate-600 bg-slate-800/50'
                } ${error ? 'border-rose-500 bg-rose-500/20' : ''}`}
              />
            ))}
          </div>
          {error && <p className="mt-2 text-xs text-rose-400 font-medium">PIN incorrecto. Intenta nuevamente.</p>}
          {!error && (
            <p className="mt-2 text-xs text-slate-500">
              PIN por defecto: <span className="text-cyan-400 font-mono font-semibold">{correctPasscode}</span>
            </p>
          )}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-14 rounded-2xl bg-slate-900/80 hover:bg-slate-800 active:bg-cyan-600/30 border border-slate-700/60 text-xl font-semibold text-white transition-all duration-150"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 rounded-2xl bg-slate-900/50 hover:bg-slate-800 border border-slate-700/60 text-sm font-medium text-slate-400"
          >
            Borrar
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-xl font-semibold text-white"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            className="h-14 rounded-2xl bg-cyan-600 hover:bg-cyan-500 active:scale-95 border border-cyan-400/40 text-sm font-semibold text-white flex items-center justify-center gap-1 shadow-lg shadow-cyan-900/30"
          >
            <Unlock className="h-4 w-4" /> Entrar
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Acceso personal seguro</span>
        </div>
      </div>
    </div>
  );
}

