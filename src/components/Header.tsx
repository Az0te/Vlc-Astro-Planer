import React from 'react';
import {
  MapPin,
  Key,
  RefreshCw,
} from 'lucide-react';
import { LocationData, WeatherDataSource } from '../types';

interface HeaderProps {
  location: LocationData;
  onOpenLocationModal: () => void;
  onOpenKeyModal: () => void;
  apiKey: string;
  source: WeatherDataSource;
  onRefresh: () => void;
  isRefreshing: boolean;
  isRedVision: boolean;
  onToggleRedVision: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  location,
  onOpenLocationModal,
  onOpenKeyModal,
  apiKey,
  source,
  onRefresh,
  isRefreshing,
  isRedVision,
  onToggleRedVision,
}) => {
  const getSourceBadge = () => {
    switch (source) {
      case 'ensemble_worst':
        return { label: '🍷 Vaso Vacío (Pesimista)', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30' };
      case 'ensemble_average':
        return { label: '⚖️ Vaso a Mitad (Media)', color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' };
      case 'ensemble_best':
        return { label: '🥂 Vaso Lleno (Optimista)', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
      case 'pirateweather':
        return { label: 'PirateWeather', color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' };
      case 'meteoblue':
        return { label: 'Meteoblue', color: 'bg-sky-500/15 text-sky-300 border-sky-500/30' };
      case 'openweather_onecall':
        return { label: 'OpenWeather 3.0', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
      case 'openweather_standard':
        return { label: 'OpenWeather 2.5', color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' };
      case 'openmeteo':
        return { label: 'Open-Meteo Astro', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30' };
      case 'demo':
      default:
        return { label: 'Simulador Astro', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
    }
  };

  const sourceBadge = getSourceBadge();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-[#070a12]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand without logo as requested */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-wider text-white">Vlc AstroPlaner</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              Astro Weather
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Previsión y planificación para astrofotografía</p>
        </div>

        {/* Location and API status chips */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Location Selector Button */}
          <button
            onClick={onOpenLocationModal}
            className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/80 hover:bg-slate-800/90 px-3 py-1.5 text-xs font-medium text-slate-200 transition group"
            title="Cambiar ubicación"
          >
            <MapPin className="h-3.5 w-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="max-w-[140px] sm:max-w-[200px] truncate font-semibold text-white">
              {location.name}
            </span>
            {location.bortleClass && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                B{location.bortleClass}
              </span>
            )}
          </button>

          {/* OpenWeather API Key button */}
          <button
            onClick={onOpenKeyModal}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/80 hover:bg-slate-800/90 px-3 py-1.5 text-xs font-medium text-slate-200 transition"
            title="Configurar clave API OpenWeather"
          >
            <Key className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden sm:inline">API:</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${sourceBadge.color}`}>
              {sourceBadge.label}
            </span>
          </button>

          {/* Red Vision Mode Toggle (Astro Red Light) */}
          <button
            onClick={onToggleRedVision}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              isRedVision
                ? 'bg-red-600 text-white border-red-500 ring-2 ring-red-500/50 shadow-lg shadow-red-600/30'
                : 'border-slate-700/80 bg-slate-900/80 hover:bg-slate-800 text-slate-300'
            }`}
            title="Activar/Desactivar luz roja astronómica para no perder adaptación a la oscuridad"
          >
            <span className={`h-2 w-2 rounded-full ${isRedVision ? 'bg-white animate-ping' : 'bg-red-500'}`} />
            <span className="hidden md:inline">Luz Roja</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center justify-center h-8 w-8 rounded-xl border border-slate-700/80 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white transition disabled:opacity-50"
            title="Actualizar previsión"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
