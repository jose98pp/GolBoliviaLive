import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Sparkles,
  ShieldCheck,
  Radio,
  Tv,
  Check,
  Send,
  Volume2
} from 'lucide-react';
import { NotificationItem } from '../types/football';

interface PushNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onTriggerSimulatedPush: (item: NotificationItem) => void;
  onClearNotifications: () => void;
}

export const PushNotificationModal: React.FC<PushNotificationModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onTriggerSimulatedPush,
  onClearNotifications,
}) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isEssentialOnly, setIsEssentialOnly] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestEssentialNotifications = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result === 'granted') {
          try {
            localStorage.setItem('golbolivia_essential_notifications', 'true');
          } catch {}

          // Send immediate confirmation push notification
          new Notification('⚽ ¡Notificaciones Esenciales Activadas!', {
            body: 'Solo recibirás goles en vivo, inicio del directo y decisiones clave de GolBolivia.',
            icon: '/pwa-192x192.png',
          });

          // Also trigger simulated in-app item
          onTriggerSimulatedPush({
            id: 'notif-welcome-' + Date.now(),
            title: '🔔 Alertas Esenciales Activadas',
            body: 'Estás suscrito únicamente a Goles en Vivo e Inicio de Transmisión Oficial.',
            timestamp: new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
            type: 'stream_start',
            read: false,
          });
        }
      } catch (e) {
        console.warn('Notification permission error', e);
      }
    } else {
      // Fallback for browsers that don't support Web Notifications API (e.g. some webviews)
      onTriggerSimulatedPush({
        id: 'notif-fallback-' + Date.now(),
        title: '🔔 Alertas en Pantalla Activadas',
        body: 'Recibirás avisos de goles y transmisiones en vivo directamente en pantalla.',
        timestamp: new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
        type: 'stream_start',
        read: false,
      });
    }
  };

  const handleSendTestGoal = () => {
    const item: NotificationItem = {
      id: 'notif-' + Date.now(),
      title: '⚽ ¡GOOOL DE BOLÍVAR! (78\')',
      body: 'Bruno Sávio anota el 2-1 desde el punto penal en el Hernando Siles.',
      timestamp: new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
      type: 'goal',
      clubId: 'bolivar',
      read: false,
    };

    onTriggerSimulatedPush(item);

    if (permission === 'granted' && typeof window !== 'undefined' && 'Notification' in window) {
      new Notification(item.title, {
        body: item.body,
        icon: '/pwa-192x192.png',
      });
    }
  };

  const handleSendTestStream = () => {
    const item: NotificationItem = {
      id: 'notif-' + Date.now(),
      title: '🔴 ¡EN VIVO: Partido de la Liga!',
      body: 'Bolívar vs The Strongest en vivo con relatores oficiales y chat.',
      timestamp: new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
      type: 'stream_start',
      clubId: 'strongest',
      read: false,
    };

    onTriggerSimulatedPush(item);

    if (permission === 'granted' && typeof window !== 'undefined' && 'Notification' in window) {
      new Notification(item.title, {
        body: item.body,
        icon: '/pwa-192x192.png',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#0b101e] border border-slate-700/80 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl text-slate-100 my-auto relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Bell className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg sm:text-xl text-white flex items-center gap-2">
              <span>Notificaciones Esenciales</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] uppercase font-bold tracking-wider">
                Sin Spam
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Solo lo importante del partido en tu celular o PC.
            </p>
          </div>
        </div>

        {/* Main Status & 1-Click Activation Card */}
        {permission === 'granted' ? (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 mb-4 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Alertas Esenciales Activas</div>
                  <div className="text-[11px] text-emerald-400">Recibirás goles en directo y avisos de streaming</div>
                </div>
              </div>
              <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                Activo
              </span>
            </div>

            <div className="pt-3 flex items-center justify-between text-xs">
              <span className="text-slate-300 text-[11px]">Probar alertas en tu dispositivo:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSendTestGoal}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-white rounded-lg border border-slate-700 font-semibold text-[11px] cursor-pointer"
                >
                  ⚽ Probar Gol
                </button>
                <button
                  onClick={handleSendTestStream}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-white rounded-lg border border-slate-700 font-semibold text-[11px] cursor-pointer"
                >
                  🔴 Probar Live
                </button>
              </div>
            </div>
          </div>
        ) : permission === 'denied' ? (
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 mb-4 text-xs">
            <div className="flex items-center gap-2 text-red-300 font-bold mb-1">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>Notificaciones Bloqueadas en tu Navegador</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Para recibir goles en vivo, toca el icono de candado 🔒 o configuración en la barra de tu navegador y cambia &quot;Notificaciones&quot; a <strong>Permitir</strong>.
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/50 mb-4 shadow-xl">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Activar Solo Alertas Esenciales</h4>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Te avisaremos únicamente cuando haya <strong>un gol</strong> o cuando <strong>arranque la transmisión en vivo</strong>. Sin publicidad ni spam.
                </p>
              </div>
            </div>

            <button
              onClick={handleRequestEssentialNotifications}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 cursor-pointer transition-all hover:scale-[1.01]"
            >
              <Bell className="w-4 h-4" />
              <span>Activar Notificaciones Esenciales (1 Clic)</span>
            </button>
          </div>
        )}

        {/* 4 Guaranteed Essential Items */}
        <div className="mb-4">
          <span className="text-xs font-semibold text-slate-300 block mb-2">
            ¿Qué incluye la modalidad esencial?
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0 font-bold">
                ⚽
              </div>
              <div>
                <div className="font-bold text-white text-[11px]">Goles al Instante</div>
                <div className="text-[10px] text-slate-400">Minuto, autor y marcador</div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-red-500/15 flex items-center justify-center text-red-400 shrink-0 font-bold">
                🔴
              </div>
              <div>
                <div className="font-bold text-white text-[11px]">Inicio de Transmisión</div>
                <div className="text-[10px] text-slate-400">Aviso cuando comience el live</div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400 shrink-0 font-bold">
                ⚖️
              </div>
              <div>
                <div className="font-bold text-white text-[11px]">VAR y Penales Clave</div>
                <div className="text-[10px] text-slate-400">Solo jugadas determinantes</div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-400 shrink-0 font-bold">
                ⏱️
              </div>
              <div>
                <div className="font-bold text-white text-[11px]">Resultado Final</div>
                <div className="text-[10px] text-slate-400">Pitazo final y marcador oficial</div>
              </div>
            </div>
          </div>
        </div>

        {/* Notification History Preview */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Historial Reciente de Alertas</span>
            {notifications.length > 0 && (
              <button
                onClick={onClearNotifications}
                className="text-[11px] text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                Limpiar historial
              </button>
            )}
          </div>

          <div className="max-h-28 overflow-y-auto space-y-1.5 text-xs pr-1">
            {notifications.length === 0 ? (
              <p className="text-[11px] text-slate-500 text-center py-2">
                Sin notificaciones recientes.
              </p>
            ) : (
              notifications.slice(-4).map((n) => (
                <div key={n.id} className="p-2 bg-[#080d18] rounded-lg border border-slate-800/80">
                  <div className="flex justify-between font-semibold text-slate-200 text-xs">
                    <span>{n.title}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{n.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{n.body}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[10px] text-slate-500">
            🔒 Puedes cancelar las alertas cuando quieras
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
