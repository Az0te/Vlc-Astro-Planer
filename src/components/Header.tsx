import React, { useState, useRef, useEffect } from 'react';
import {
  MapPin,
  Key,
  RefreshCw,
  Star,
  ChevronDown,
  Check,
  Trash2,
  Plus,
  Search,
} from 'lucide-react';
import { LocationData, WeatherDataSource } from '../types';
import { isSameLocation } from '../services/weatherService';

interface HeaderProps {
  location: LocationData;
  favorites: LocationData[];
  onSelectLocation: (location: LocationData) => void;
  onToggleFavorite: (location: LocationData) => void;
  onResetDefaultFavorites?: () => void;
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
  favorites,
  onSelectLocation,
  onToggleFavorite,
  onResetDefaultFavorites,
  onOpenLocationModal,
  onOpenKeyModal,
  apiKey,
  source,
  onRefresh,
  isRefreshing,
  isRedVision,
  onToggleRedVision,
}) => {
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [favoriteSearch, setFavoriteSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFavoritesOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFavoritesOpen(false);
      }
    };

    if (isFavoritesOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFavoritesOpen]);

  const isCurrentFavorite = favorites.some((fav) => isSameLocation(fav, location));

  const filteredFavorites = favorites.filter((fav) => {
    if (!favoriteSearch.trim()) return true;
    const q = favoriteSearch.toLowerCase();
    return (
      fav.name.toLowerCase().includes(q) ||
      (fav.state && fav.state.toLowerCase().includes(q)) ||
      fav.country.toLowerCase().includes(q)
    );
  });

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
      case 'aemet':
        return { label: 'AEMET OpenData', color: 'bg-orange-500/15 text-orange-300 border-orange-500/30' };
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
    <header className="relative z-40 border-b border-slate-800/90 bg-[#070a12]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 py-1.5 sm:py-2.5 flex items-center justify-between gap-1.5 sm:gap-3 flex-wrap">
        {/* Brand without logo */}
        <div className="shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-sm sm:text-lg font-black tracking-wider text-white">Vlc AstroPlaner</span>
            <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-md uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              Astro
            </span>
          </div>
          <p className="hidden sm:block text-[11px] text-slate-400">Previsión y planificación para astrofotografía</p>
        </div>

        {/* Location & Controls */}
        <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
          {/* Unified Compact Location & Quick Favorites Pill: [ 📍 Location B_ | ⭐⌄ ] */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center rounded-xl border border-slate-700/80 bg-slate-900/90 transition hover:border-slate-600 overflow-hidden shadow-sm">
              {/* Left segment: Current Location click opens full search modal */}
              <button
                type="button"
                onClick={onOpenLocationModal}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold text-slate-200 transition group hover:bg-slate-800/70"
                title="Cambiar ubicación o abrir mapa/buscador"
              >
                <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="max-w-[100px] sm:max-w-[170px] truncate font-bold text-white text-[11px] sm:text-xs">
                  {location.name}
                </span>
                {location.bortleClass && (
                  <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300 border border-slate-700 font-mono font-medium">
                    B{location.bortleClass}
                  </span>
                )}
              </button>

              {/* Right segment: [ ⭐⌄ ] Fast favorites dropdown trigger */}
              <button
                type="button"
                onClick={() => {
                  setIsFavoritesOpen((prev) => !prev);
                  setFavoriteSearch('');
                }}
                className={`flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2.5 py-1 sm:py-1.5 border-l border-slate-800/90 hover:bg-slate-800/90 transition text-amber-400 ${
                  isFavoritesOpen ? 'bg-slate-800/90 text-amber-300' : ''
                }`}
                title="Ubicaciones favoritas (menú rápido combo box)"
                aria-haspopup="listbox"
                aria-expanded={isFavoritesOpen}
              >
                <Star
                  className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${
                    isCurrentFavorite ? 'fill-amber-400 text-amber-400' : 'text-amber-400'
                  }`}
                />
                <ChevronDown
                  className={`h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-400 transition-transform duration-200 ${
                    isFavoritesOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            {/* Popup Menu (Combo Box) */}
            {isFavoritesOpen && (
              <div
                className="absolute left-0 sm:left-0 top-full mt-1.5 w-72 sm:w-80 rounded-2xl border border-slate-700/90 bg-[#0c1222]/95 p-2.5 shadow-2xl backdrop-blur-xl ring-1 ring-black/60 text-slate-100 z-50 animate-in fade-in zoom-in-95 duration-150"
                role="listbox"
              >
                {/* Header of Combo Box */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/90 px-1">
                  <div className="flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      Favoritas
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-amber-300 font-mono">
                      {favorites.length}
                    </span>
                  </div>
                  {/* Quick toggle current location */}
                  {!isCurrentFavorite ? (
                    <button
                      type="button"
                      onClick={() => onToggleFavorite(location)}
                      className="text-[10px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 hover:underline"
                    >
                      <Plus className="h-3 w-3" /> Añadir actual
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onToggleFavorite(location)}
                      className="text-[10px] text-slate-400 hover:text-rose-400 transition underline"
                    >
                      Quitar actual
                    </button>
                  )}
                </div>

                {/* Search filter if more than 4 favorites */}
                {favorites.length > 4 && (
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-2 h-3 w-3 text-slate-400" />
                    <input
                      type="text"
                      value={favoriteSearch}
                      onChange={(e) => setFavoriteSearch(e.target.value)}
                      placeholder="Filtrar favoritas..."
                      className="w-full rounded-lg border border-slate-700 bg-slate-900/90 pl-7 pr-2.5 py-1 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                )}

                {/* List of favorites */}
                <div className="max-h-56 overflow-y-auto space-y-1 pr-0.5 scrollbar-thin">
                  {filteredFavorites.length === 0 ? (
                    <div className="py-3 text-center text-xs text-slate-400">
                      {favorites.length === 0
                        ? 'No tienes ubicaciones guardadas en favoritas.'
                        : 'No se encontraron coincidencias.'}
                    </div>
                  ) : (
                    filteredFavorites.map((fav) => {
                      const isSelected = isSameLocation(fav, location);
                      return (
                        <div
                          key={`combo-fav-${fav.name}-${fav.lat}-${fav.lon}`}
                          onClick={() => {
                            onSelectLocation(fav);
                            setIsFavoritesOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl border text-left cursor-pointer transition group ${
                            isSelected
                              ? 'border-amber-500/80 bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30'
                              : 'border-slate-800/80 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-800/60 text-slate-200'
                          }`}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1 mr-1.5">
                            <div className="shrink-0">
                              {isSelected ? (
                                <Check className="h-3.5 w-3.5 text-amber-400" />
                              ) : (
                                <Star className="h-3 w-3 text-slate-500 group-hover:text-amber-400 group-hover:fill-amber-400/30 transition" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-white truncate group-hover:text-amber-300 transition">
                                  {fav.name}
                                </span>
                                {fav.bortleClass && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-amber-300 border border-amber-500/30 font-mono shrink-0">
                                    B{fav.bortleClass}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 truncate block">
                                {fav.state || fav.country}
                              </span>
                            </div>
                          </div>

                          {/* Delete favorite button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavorite(fav);
                            }}
                            title="Quitar de favoritas"
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800/80 rounded-lg transition shrink-0 opacity-70 group-hover:opacity-100"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer Link */}
                <div className="mt-2 pt-1.5 border-t border-slate-800/90 flex items-center justify-between gap-2 px-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFavoritesOpen(false);
                      onOpenLocationModal();
                    }}
                    className="flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition"
                  >
                    <Search className="h-3 w-3" />
                    <span>Buscar otra ubicación...</span>
                  </button>

                  {onResetDefaultFavorites && favorites.length === 0 && (
                    <button
                      type="button"
                      onClick={() => onResetDefaultFavorites()}
                      className="text-[10px] text-slate-400 hover:text-amber-300 transition underline"
                    >
                      Restaurar sugeridas
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* OpenWeather API Key button */}
          <button
            onClick={onOpenKeyModal}
            className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/80 hover:bg-slate-800/90 px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium text-slate-200 transition"
            title="Configurar clave API OpenWeather y fuentes meteorológicas"
          >
            <Key className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-400" />
            <span className="hidden sm:inline">API:</span>
            <span className={`text-[9px] sm:text-[10px] font-mono px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded border ${sourceBadge.color}`}>
              {sourceBadge.label}
            </span>
          </button>

          {/* Red Vision Mode Toggle (Astro Red Light) */}
          <button
            onClick={onToggleRedVision}
            className={`flex items-center gap-1 sm:gap-1.5 rounded-xl border px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold transition ${
              isRedVision
                ? 'bg-red-600 text-white border-red-500 ring-2 ring-red-500/50 shadow-lg shadow-red-600/30'
                : 'border-slate-700/80 bg-slate-900/80 hover:bg-slate-800 text-slate-300'
            }`}
            title="Activar/Desactivar luz roja astronómica para no perder adaptación a la oscuridad"
          >
            <span className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full ${isRedVision ? 'bg-white animate-ping' : 'bg-red-500'}`} />
            <span className="hidden md:inline">Luz Roja</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-xl border border-slate-700/80 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white transition disabled:opacity-50"
            title="Actualizar previsión"
          >
            <RefreshCw className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
