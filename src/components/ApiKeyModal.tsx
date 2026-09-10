import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Key,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  X,
  RefreshCw,
  Layers,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Info,
} from 'lucide-react';
import { ForecastStrategy, MultiModelSettings, WeatherProviderId } from '../types';
import { STRATEGY_DETAILS, WEATHER_PROVIDERS_META } from '../services/ensembleService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: MultiModelSettings;
  onSaveSettings: (newSettings: MultiModelSettings) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [localSettings, setLocalSettings] = useState<MultiModelSettings>(settings);
  const [testingProvider, setTestingProvider] = useState<WeatherProviderId | null>(null);
  const [testResults, setTestResults] = useState<
    Partial<Record<WeatherProviderId, { success: boolean; message: string }>>
  >({});

  // Sync state if modal opens & handle Escape/scroll lock
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
      setTestResults({});
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, settings, onClose]);

  if (!isOpen) return null;

  const handleToggleProvider = (id: WeatherProviderId) => {
    if (id === 'openmeteo') {
      // Don't allow disabling all providers
      const providerList = Object.entries(localSettings.providers) as [
        WeatherProviderId,
        { enabled: boolean; apiKey: string }
      ][];
      const otherEnabled = providerList.some(
        ([key, val]) => key !== 'openmeteo' && val.enabled
      );
      if (!otherEnabled) return; // keep at least one
    }

    setLocalSettings((prev) => ({
      ...prev,
      providers: {
        ...prev.providers,
        [id]: {
          ...prev.providers[id],
          enabled: !prev.providers[id].enabled,
        },
      },
    }));
  };

  const handleKeyChange = (id: WeatherProviderId, newKey: string) => {
    setLocalSettings((prev) => ({
      ...prev,
      providers: {
        ...prev.providers,
        [id]: {
          ...prev.providers[id],
          apiKey: newKey,
          // Auto-enable if key is entered
          enabled: newKey.trim().length > 0 ? true : prev.providers[id].enabled,
        },
      },
    }));
    // Clear test result on edit
    setTestResults((prev) => ({ ...prev, [id]: undefined }));
  };

  const handleTestKey = async (id: WeatherProviderId) => {
    const key = localSettings.providers[id].apiKey?.trim();
    if (!key && id !== 'openmeteo') {
      setTestResults((prev) => ({
        ...prev,
        [id]: {
          success: false,
          message: 'Introduce una clave antes de verificar.',
        },
      }));
      return;
    }

    setTestingProvider(id);
    setTestResults((prev) => ({ ...prev, [id]: undefined }));

    try {
      if (id === 'openmeteo') {
        const cleanKey = key?.trim();
        const testUrl = cleanKey
          ? `https://api.open-meteo.com/v1/forecast?latitude=40.4168&longitude=-3.7038&hourly=cloud_cover&apikey=${encodeURIComponent(cleanKey)}`
          : `https://api.open-meteo.com/v1/forecast?latitude=40.4168&longitude=-3.7038&hourly=cloud_cover`;

        const res = await fetch(testUrl);
        if (res.ok) {
          setTestResults((prev) => ({
            ...prev,
            [id]: {
              success: true,
              message: cleanKey
                ? '¡Clave y conexión con Open-Meteo verificadas con éxito!'
                : '¡Conexión con Open-Meteo verificada con éxito (Acceso gratuito activo)!',
            },
          }));
        } else {
          if (cleanKey) {
            // Check customer API domain if applicable
            try {
              const custRes = await fetch(
                `https://customer-api.open-meteo.com/v1/forecast?latitude=40.4168&longitude=-3.7038&hourly=cloud_cover&apikey=${encodeURIComponent(cleanKey)}`
              );
              if (custRes.ok) {
                setTestResults((prev) => ({
                  ...prev,
                  [id]: {
                    success: true,
                    message: '¡Clave comercial (Customer API) y conexión con Open-Meteo verificadas con éxito!',
                  },
                }));
                return;
              }
            } catch {}
          }
          const errData = await res.json().catch(() => ({}));
          setTestResults((prev) => ({
            ...prev,
            [id]: {
              success: false,
              message:
                errData.reason ||
                errData.message ||
                (cleanKey
                  ? 'La clave API de Open-Meteo no es válida o fue rechazada.'
                  : 'Error al contactar con el servidor de Open-Meteo.'),
            },
          }));
        }
      } else if (id === 'openweather') {
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=40.4168&lon=-3.7038&appid=${key}`
        );
        if (res.ok) {
          setTestResults((prev) => ({
            ...prev,
            [id]: { success: true, message: '¡Clave de OpenWeather verificada con éxito!' },
          }));
        } else {
          const errData = await res.json().catch(() => ({}));
          setTestResults((prev) => ({
            ...prev,
            [id]: {
              success: false,
              message: errData.message || 'Clave inválida o en proceso de activación en OpenWeather.',
            },
          }));
        }
      } else if (id === 'pirateweather') {
        const res = await fetch(
          `https://api.pirateweather.net/forecast/${key}/40.4168,-3.7038?units=si`
        );
        if (res.ok) {
          setTestResults((prev) => ({
            ...prev,
            [id]: { success: true, message: '¡Clave de PirateWeather conectada y lista!' },
          }));
        } else {
          setTestResults((prev) => ({
            ...prev,
            [id]: {
              success: false,
              message: 'La clave de PirateWeather devolvió un error. Revisa que sea correcta.',
            },
          }));
        }
      } else if (id === 'meteoblue') {
        const res = await fetch(
          `https://my.meteoblue.com/packages/basic-day?apikey=${key}&lat=40.4168&lon=-3.7038&format=json`
        );
        if (res.ok) {
          setTestResults((prev) => ({
            ...prev,
            [id]: { success: true, message: '¡Clave de Meteoblue validada correctamente!' },
          }));
        } else {
          setTestResults((prev) => ({
            ...prev,
            [id]: {
              success: false,
              message: 'Error al verificar con Meteoblue. Comprueba tu clave de API.',
            },
          }));
        }
      }
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [id]: {
          success: false,
          message:
            'Aviso de red o CORS en el navegador. Guardaremos tu clave y la utilizaremos en las consultas.',
        },
      }));
    } finally {
      setTestingProvider(null);
    }
  };

  const handleSaveAndApply = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  const activeCount = (
    Object.values(localSettings.providers) as { enabled: boolean; apiKey: string }[]
  ).filter((p) => p.enabled).length;

  const modalNode = (
    <div
      id="api-key-modal-overlay"
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 p-3 sm:p-5 backdrop-blur-md overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="api-key-modal-dialog"
        className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-[#0b101e] shadow-2xl text-slate-100 my-auto flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Fuentes Meteorológicas & Multi-Modelo
              </h2>
              <p className="text-xs text-slate-400">
                Configura Open-Meteo, Meteoblue, PirateWeather y OpenWeather
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            title="Cerrar ventana"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 space-y-6 overflow-y-auto flex-1">
          {/* Strategy explanation & selection */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">
                  Estrategia de Pronóstico Multimodelo
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  {activeCount} {activeCount === 1 ? 'modelo' : 'modelos activos'}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Cuando hay más de un modelo activo, elige cómo deseas que la app combine sus
              previsiones astronómicas:
            </p>

            {/* Strategy Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {(['worst', 'average', 'best'] as ForecastStrategy[]).map((strat) => {
                const meta = STRATEGY_DETAILS[strat];
                const isSelected = localSettings.strategy === strat;
                return (
                  <button
                    key={strat}
                    type="button"
                    onClick={() =>
                      setLocalSettings((prev) => ({ ...prev, strategy: strat }))
                    }
                    className={`flex flex-col text-left p-3 rounded-xl border transition ${
                      isSelected
                        ? `${meta.badgeColor} ring-1 ring-cyan-500/40 shadow-lg shadow-black/40`
                        : 'border-slate-800 bg-slate-900/80 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-lg">{meta.icon}</span>
                      <span className="text-xs font-bold text-white">{meta.title}</span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-300">
                      {meta.subtitle}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 leading-snug line-clamp-3">
                      {meta.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Providers List */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Proveedores Meteorológicos y Claves API
            </h3>

            {(['openmeteo', 'pirateweather', 'meteoblue', 'openweather'] as WeatherProviderId[]).map(
              (provId) => {
                const meta = WEATHER_PROVIDERS_META[provId];
                const state = localSettings.providers[provId];
                const test = testResults[provId];
                const isTesting = testingProvider === provId;

                return (
                  <div
                    key={provId}
                    className={`rounded-xl border transition-all p-4 ${
                      state.enabled
                        ? 'border-slate-700/80 bg-slate-900/90'
                        : 'border-slate-800/60 bg-slate-950/40 opacity-75'
                    }`}
                  >
                    {/* Header Row of Provider Card */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleToggleProvider(provId)}
                          className="focus:outline-none transition"
                          title={state.enabled ? 'Desactivar modelo' : 'Activar modelo'}
                        >
                          {state.enabled ? (
                            <ToggleRight className="h-6 w-6 text-cyan-400" />
                          ) : (
                            <ToggleLeft className="h-6 w-6 text-slate-600" />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white">{meta.name}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {meta.modelInfo}
                            </span>
                            {!meta.requiresKey && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                100% Libre / Clave Opcional
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{meta.description}</p>
                        </div>
                      </div>

                      {meta.signupUrl && (
                        <a
                          href={meta.signupUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition shrink-0"
                          title={`Obtener clave en ${meta.name}`}
                        >
                          <span>Obtener clave</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>

                    {/* Key Input & Verification Button for all providers (including Open-Meteo) */}
                    <div className="mt-3 pt-3 border-t border-slate-800/70 space-y-2">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="relative flex-1">
                          <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                          <input
                            type="password"
                            value={state.apiKey || ''}
                            onChange={(e) => handleKeyChange(provId, e.target.value)}
                            placeholder={
                              provId === 'openmeteo'
                                ? 'Clave API de Open-Meteo (opcional para plan comercial/pro)...'
                                : `Clave API de ${meta.name}...`
                            }
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 pl-9 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleTestKey(provId)}
                          disabled={isTesting || (provId !== 'openmeteo' && !state.apiKey?.trim())}
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition disabled:opacity-40 shrink-0"
                          title={
                            provId === 'openmeteo' && !state.apiKey?.trim()
                              ? 'Verificar conexión libre con Open-Meteo'
                              : 'Verificar clave API'
                          }
                        >
                          {isTesting ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              <span>Probando...</span>
                            </>
                          ) : (
                            <span>
                              {provId === 'openmeteo' && !state.apiKey?.trim()
                                ? 'Verificar conexión'
                                : 'Verificar clave'}
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Test Feedback */}
                      {test && (
                        <div
                          className={`flex items-start gap-2 rounded-lg p-2.5 text-xs ${
                            test.success
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                          }`}
                        >
                          {test.success ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          )}
                          <span>{test.message}</span>
                        </div>
                      )}

                      <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span>{meta.freeTierNote}</span>
                      </p>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-5 border-t border-slate-800/80 shrink-0">
          <div className="text-xs text-slate-400">
            <span className="font-semibold text-white">{activeCount}</span>{' '}
            {activeCount === 1 ? 'modelo seleccionado' : 'modelos seleccionados'}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveAndApply}
              className="flex items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-5 py-2 text-xs font-bold text-slate-950 transition shadow-lg shadow-cyan-500/20"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Guardar y Aplicar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalNode, document.body);
};

