import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  CheckCircle,
  AlertTriangle,
  Smartphone,
  Send,
  Shield,
  Volume2,
  Settings,
  Sparkles
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
  const [prefGoals, setPrefGoals] = useState(true);
  const [prefStreamStart, setPrefStreamStart] = useState(true);
  const [prefLineups, setPrefLineups] = useState(true);
  const [prefVip, setPrefVip] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result === 'granted') {
          // Send a welcome native push notification
          new Notification('GolBolivia Live 🇧🇴', {
            body: '¡Notificaciones activadas! Recibirás goles en vivo y transmisiones oficiales.',
            icon: '/favicon.ico',
          });
        }
      } catch (e) {
        console.warn('Notification permission error', e);
      }
    }
  };

  const handleSendTestGoal = () => {
    const item: NotificationItem = {
      id: 'notif-' + Date.now(),
      title: '⚽ ¡GOOOOL DE BOLÍVAR! (78\')',
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
      });
    }
  };

  const handleSendTestStream = () => {
    const item: NotificationItem = {
      id: 'notif-' + Date.now(),
      title: '🔴 ¡EN VIVO: Rueda de Prensa!',
      body: 'Ismael Rescalvo y Flavio Robatto en vivo por OBS Studio desde vestuarios.',
      timestamp: new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
      type: 'stream_start',
      clubId: 'strongest',
      read: false,
    };

    onTriggerSimulatedPush(item);

    if (permission === 'granted' && typeof window !== 'undefined' && 'Notification' in window) {
      new Notification(item.title, {
        body: item.body,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#0b101e] border border-slate-700/80 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl text-slate-100 my-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg sm:text-xl text-white">
              Notificaciones Push para Suscriptores
            </h2>
            <p className="text-xs text-slate-400">
              Mantén a tu hinchada al día con alertas directas en sus teléfonos y computadoras.
            </p>
          </div>
        </div>

        {/* Browser Permission Status Banner */}
        <div className="p-3.5 rounded-xl bg-[#070b14] border border-slate-800 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-xs font-semibold text-white">
                Permiso del Navegador Web
              </div>
              <div className="text-[11px] text-slate-400">
                Estado: {permission === 'granted' ? (
                  <span className="text-emerald-400 font-bold">Activado (Recibiendo alertas)</span>
                ) : permission === 'denied' ? (
                  <span className="text-red-400 font-bold">Bloqueado en el navegador</span>
                ) : (
                  <span className="text-yellow-400 font-bold">Pendiente de autorización</span>
                )}
              </div>
            </div>
          </div>

          {permission !== 'granted' && (
            <button
              onClick={handleRequestPermission}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Habilitar
            </button>
          )}
        </div>

        {/* Notification Preferences */}
        <div className="mb-5 space-y-2">
          <span className="text-xs font-semibold text-slate-300 block mb-1">
            Preferencias de Alertas para Hinchas:
          </span>

          <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#090e1c] border border-slate-800 cursor-pointer">
            <div className="text-xs">
              <span className="text-white font-medium">⚽ Goles y Tarjetas Rojas en Vivo</span>
              <p className="text-[11px] text-slate-400">Alerta inmediata cuando se mueve el marcador.</p>
            </div>
            <input
              type="checkbox"
              checked={prefGoals}
              onChange={(e) => setPrefGoals(e.target.checked)}
              className="w-4 h-4 accent-emerald-500 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#090e1c] border border-slate-800 cursor-pointer">
            <div className="text-xs">
              <span className="text-white font-medium">🔴 Inicio de Transmisión del Club</span>
              <p className="text-[11px] text-slate-400">Aviso cuando el equipo inicia el streaming con OBS.</p>
            </div>
            <input
              type="checkbox"
              checked={prefStreamStart}
              onChange={(e) => setPrefStreamStart(e.target.checked)}
              className="w-4 h-4 accent-emerald-500 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#090e1c] border border-slate-800 cursor-pointer">
            <div className="text-xs">
              <span className="text-white font-medium">📋 Alineaciones Confirmadas</span>
              <p className="text-[11px] text-slate-400">Notificación 1 hora antes del pitazo inicial.</p>
            </div>
            <input
              type="checkbox"
              checked={prefLineups}
              onChange={(e) => setPrefLineups(e.target.checked)}
              className="w-4 h-4 accent-emerald-500 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#090e1c] border border-slate-800 cursor-pointer">
            <div className="text-xs">
              <span className="text-white font-medium">🎙️ Contenido Exclusivo de Camerinos</span>
              <p className="text-[11px] text-slate-400">Acceso a entrevistas y detrás de escena VIP.</p>
            </div>
            <input
              type="checkbox"
              checked={prefVip}
              onChange={(e) => setPrefVip(e.target.checked)}
              className="w-4 h-4 accent-emerald-500 cursor-pointer"
            />
          </label>
        </div>

        {/* Live Simulation / Test push triggers */}
        <div className="p-3 bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/30 rounded-xl mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Probar Envío de Notificación Push
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleSendTestGoal}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-white font-medium text-xs rounded-lg border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>⚽ Test Gol 2-1</span>
            </button>
            <button
              onClick={handleSendTestStream}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-white font-medium text-xs rounded-lg border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>🔴 Test En Vivo OBS</span>
            </button>
          </div>
        </div>

        {/* Notification History Preview */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Historial Reciente de Alertas</span>
            {notifications.length > 0 && (
              <button
                onClick={onClearNotifications}
                className="text-[11px] text-slate-500 hover:text-slate-300"
              >
                Limpiar historial
              </button>
            )}
          </div>

          <div className="max-h-36 overflow-y-auto space-y-1.5 text-xs">
            {notifications.length === 0 ? (
              <p className="text-[11px] text-slate-500 text-center py-3">
                No hay notificaciones recientes. Haz clic en &quot;Probar Envío&quot; para simular una.
              </p>
            ) : (
              notifications.map((n) => (
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

        <div className="mt-4 pt-3 border-t border-slate-800 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
