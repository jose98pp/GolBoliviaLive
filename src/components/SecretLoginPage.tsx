import React, { useState, useEffect } from 'react';
import { Lock, Shield, Eye, EyeOff, ArrowLeft, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { AdminPanel } from './AdminPanel';
import { StreamSettings, MatchEvent, LivePoll, NotificationItem } from '../types/football';

interface SecretLoginPageProps {
  streamSettings: StreamSettings;
  onUpdateStreamSettings: (newSettings: Partial<StreamSettings>) => void;
  homeScore: number;
  awayScore: number;
  matchMinute: number;
  onUpdateScore: (home: number, away: number) => void;
  onUpdateMinute: (minute: number) => void;
  onAddMatchEvent: (event: Omit<MatchEvent, 'id'>) => void;
  onDispatchPushNotification: (notification: NotificationItem) => void;
  onPostOfficialMessage: (text: string) => void;
  onUpdatePoll: (poll: LivePoll) => void;
  onClearChat: () => void;
  onReturnToPublic: () => void;
}

export const SecretLoginPage: React.FC<SecretLoginPageProps> = ({
  streamSettings,
  onUpdateStreamSettings,
  homeScore,
  awayScore,
  matchMinute,
  onUpdateScore,
  onUpdateMinute,
  onAddMatchEvent,
  onDispatchPushNotification,
  onPostOfficialMessage,
  onUpdatePoll,
  onClearChat,
  onReturnToPublic,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('golbolivia_secret_auth') === 'true';
  });
  const [emailInput, setEmailInput] = useState('00loslobos00@gmail.com');
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Read configured PIN from localStorage or fallback to default '1925'
  const getStoredPin = () => {
    return localStorage.getItem('golbolivia_admin_pin') || '1925';
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const validPin = getStoredPin();

    if (pinInput.trim() === validPin) {
      setIsAuthenticated(true);
      sessionStorage.setItem('golbolivia_secret_auth', 'true');
      setErrorMsg(null);
      setPinInput('');
    } else {
      setErrorMsg('PIN o clave de seguridad incorrecta. Acceso restringido.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('golbolivia_secret_auth');
    onReturnToPublic();
  };

  // If authenticated, render Admin Panel wrapped with secret top bar
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col">
        {/* Secret Master Top Bar */}
        <header className="sticky top-0 z-40 bg-[#0a0f1d]/95 backdrop-blur-md border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white font-display">CONSOLA PRIVADA DE TRANSMISIÓN</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-semibold">
                  RUTA /login
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Sesión activa como: <strong className="text-amber-300">00loslobos00@gmail.com</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onReturnToPublic}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              title="Ver el sitio tal como lo ven los hinchas"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ver Web Pública</span>
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 text-xs font-medium flex items-center gap-1.5 border border-red-800/60 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </header>

        {/* Admin Panel Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
          <AdminPanel
            streamSettings={streamSettings}
            onUpdateStreamSettings={onUpdateStreamSettings}
            homeScore={homeScore}
            awayScore={awayScore}
            matchMinute={matchMinute}
            onUpdateScore={onUpdateScore}
            onUpdateMinute={onUpdateMinute}
            onAddMatchEvent={onAddMatchEvent}
            onDispatchPushNotification={onDispatchPushNotification}
            onPostOfficialMessage={onPostOfficialMessage}
            onUpdatePoll={onUpdatePoll}
            onClearChat={onClearChat}
          />
        </main>
      </div>
    );
  }

  // Not authenticated: render clean Login Box at /login
  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 flex flex-col justify-center items-center p-4">
      {/* Back button */}
      <div className="w-full max-w-md mb-4 flex justify-between items-center">
        <button
          onClick={onReturnToPublic}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-400" />
          <span>Volver al streaming de partidos</span>
        </button>
        <span className="text-[10px] text-slate-600 font-mono">Acceso Restringido</span>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-[#0a0f1d] border border-amber-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80 relative">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-4 mx-auto">
          <Lock className="w-6 h-6" />
        </div>

        <div className="text-center mb-6">
          <h1 className="text-xl font-bold font-display text-white">Consola Maestra del Transmisor</h1>
          <p className="text-xs text-slate-400 mt-1">
            Ruta exclusiva para el administrador. Ingresa tu clave para configurar el partido y la transmisión de OBS.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Correo Autorizado
            </label>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              placeholder="00loslobos00@gmail.com"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                PIN Maestro de Seguridad
              </label>
              <span className="text-[10px] text-slate-500">PIN por defecto: 1925</span>
            </div>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                maxLength={10}
                className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono tracking-widest text-slate-100 focus:outline-none focus:border-amber-500"
                placeholder="••••"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-950/70 border border-red-800/80 rounded-xl text-xs text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-bold text-xs rounded-xl shadow-lg shadow-amber-950/50 transition-all cursor-pointer"
          >
            Ingresar a la Configuración
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-500">
            Esta ruta no es pública ni visible para los espectadores en general.
          </p>
        </div>
      </div>
    </div>
  );
};
