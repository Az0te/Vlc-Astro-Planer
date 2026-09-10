import React, { useState, useEffect, useCallback } from 'react';
import {
  AstroNight,
  ForecastStrategy,
  LocationData,
  MultiModelSettings,
  WeatherDataSource,
  WeatherProviderId,
} from './types';
import { getAstroForecast, POPULAR_ASTRO_SPOTS } from './services/weatherService';
import { DEFAULT_MULTI_SETTINGS } from './services/ensembleService';
import { Header } from './components/Header';
import { EnsembleStrategyBar } from './components/EnsembleStrategyBar';
import { DaysCarousel } from './components/DaysCarousel';
import { NightScoreHero } from './components/NightScoreHero';
import { CoreMetricsGrid } from './components/CoreMetricsGrid';
import { HourlyMetricsChart } from './components/HourlyMetricsChart';
import { HourlyNightTimeline } from './components/HourlyNightTimeline';
import { EphemerisAndMoon } from './components/EphemerisAndMoon';
import { TargetRecommender } from './components/TargetRecommender';
import { LocationSelectorModal } from './components/LocationSelectorModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { AlertCircle, Sparkles } from 'lucide-react';

const STORAGE_KEYS = {
  API_KEY: 'vlc_ow_api_key',
  LOCATION: 'vlc_astro_location',
  RED_VISION: 'vlc_red_vision',
  MULTI_SETTINGS: 'vlc_multi_settings',
};

export default function App() {
  // Location
  const [location, setLocation] = useState<LocationData>(() => {
    const saved =
      localStorage.getItem(STORAGE_KEYS.LOCATION) ||
      localStorage.getItem('ava_astro_location') ||
      localStorage.getItem('noctar_astro_location');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return POPULAR_ASTRO_SPOTS[0]; // Observatorio del Teide by default
  });

  // Red vision mode for astro field use
  const [isRedVision, setIsRedVision] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.RED_VISION) === 'true';
  });

  // Multi-Model Weather & API Settings
  const [multiSettings, setMultiSettings] = useState<MultiModelSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MULTI_SETTINGS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    const legacyKey =
      localStorage.getItem(STORAGE_KEYS.API_KEY) ||
      localStorage.getItem('ava_ow_api_key') ||
      localStorage.getItem('noctar_ow_api_key') ||
      '';
    return {
      ...DEFAULT_MULTI_SETTINGS,
      providers: {
        ...DEFAULT_MULTI_SETTINGS.providers,
        openweather: {
          enabled: Boolean(legacyKey),
          apiKey: legacyKey,
        },
      },
    };
  });

  const [activeProviders, setActiveProviders] = useState<{ id: WeatherProviderId; name: string }[]>([
    { id: 'openmeteo', name: 'Open-Meteo Astro' },
  ]);

  const [nights, setNights] = useState<AstroNight[]>([]);
  const [selectedNightId, setSelectedNightId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [source, setSource] = useState<WeatherDataSource>('demo');
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Modals
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // Load forecast
  const loadForecast = useCallback(
    async (targetLoc = location, settingsToUse = multiSettings) => {
      setLoading(true);
      setErrorNotice(null);

      try {
        const result = await getAstroForecast(targetLoc, settingsToUse);
        setNights(result.nights);
        setSource(result.source);
        if (result.activeProviders) {
          setActiveProviders(result.activeProviders);
        }
        if (result.errorNotice) {
          setErrorNotice(result.errorNotice);
        }
        if (result.nights.length > 0) {
          // Keep current selection if still valid, or default to first
          setSelectedNightId((prev) => {
            const exists = result.nights.some((n) => n.id === prev);
            return exists ? prev : result.nights[0].id;
          });
        }
      } catch (err: any) {
        console.error('Failed to load forecast:', err);
        setErrorNotice(err.message || 'Error al cargar la previsión meteorológica.');
      } finally {
        setLoading(false);
      }
    },
    [location, multiSettings]
  );

  // Trigger initial load
  useEffect(() => {
    loadForecast();
  }, [loadForecast]);

  // Handle red vision mode toggle on body
  useEffect(() => {
    if (isRedVision) {
      document.body.classList.add('red-vision');
    } else {
      document.body.classList.remove('red-vision');
    }
    localStorage.setItem(STORAGE_KEYS.RED_VISION, String(isRedVision));
  }, [isRedVision]);

  // Handle location update
  const handleSelectLocation = (newLoc: LocationData) => {
    setLocation(newLoc);
    localStorage.setItem(STORAGE_KEYS.LOCATION, JSON.stringify(newLoc));
    loadForecast(newLoc, multiSettings);
  };

  // Handle strategy change directly from the bar
  const handleSelectStrategy = (strategy: ForecastStrategy) => {
    const updated: MultiModelSettings = {
      ...multiSettings,
      strategy,
    };
    setMultiSettings(updated);
    localStorage.setItem(STORAGE_KEYS.MULTI_SETTINGS, JSON.stringify(updated));
    loadForecast(location, updated);
  };

  // Handle full multi-model settings save from the modal
  const handleSaveMultiSettings = (newSettings: MultiModelSettings) => {
    setMultiSettings(newSettings);
    localStorage.setItem(STORAGE_KEYS.MULTI_SETTINGS, JSON.stringify(newSettings));
    if (newSettings.providers.openweather?.apiKey) {
      localStorage.setItem(STORAGE_KEYS.API_KEY, newSettings.providers.openweather.apiKey);
    }
    loadForecast(location, newSettings);
  };

  // Selected night object
  const selectedNight =
    nights.find((n) => n.id === selectedNightId) || (nights.length > 0 ? nights[0] : null);

  return (
    <div className="min-h-screen bg-[#060810] text-slate-100 selection:bg-cyan-500 selection:text-slate-950">
      {/* Top sticky app header */}
      <Header
        location={location}
        onOpenLocationModal={() => setIsLocationModalOpen(true)}
        onOpenKeyModal={() => setIsKeyModalOpen(true)}
        apiKey={multiSettings.providers.openweather?.apiKey || ''}
        source={source}
        onRefresh={() => loadForecast(location, multiSettings)}
        isRefreshing={loading}
        isRedVision={isRedVision}
        onToggleRedVision={() => setIsRedVision(!isRedVision)}
      />

      {/* Main dashboard content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-5 sm:py-6 space-y-6">
        {/* Error / Notice Alert Banner */}
        {errorNotice && (
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/40 p-4 text-xs text-cyan-200 flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-cyan-400" />
              <span>{errorNotice}</span>
            </div>
            <button
              onClick={() => setErrorNotice(null)}
              className="text-cyan-400 hover:text-white font-mono text-sm px-1 shrink-0"
            >
              ✕
            </button>
          </div>
        )}

        {/* Loading Overlay or Spinner */}
        {loading && nights.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center space-y-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
              <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Calculando previsión multi-modelo...</h3>
              <p className="text-xs text-slate-400 mt-1">
                Consultando y combinando modelos meteorológicos para {location.name}
              </p>
            </div>
          </div>
        ) : nights.length > 0 && selectedNight ? (
          <div className="space-y-6 animate-fade-in">
            {/* 1. Multi-Model Forecast Strategy Bar (Vaso Vacío / Vaso a Mitad / Vaso Lleno) */}
            <EnsembleStrategyBar
              currentStrategy={multiSettings.strategy}
              onSelectStrategy={handleSelectStrategy}
              activeProviders={activeProviders}
              onOpenConfigModal={() => setIsKeyModalOpen(true)}
              disabled={loading}
            />

            {/* 2. 7-Night Carousel Deck */}
            <DaysCarousel
              nights={nights}
              selectedId={selectedNight.id}
              onSelectNight={(id) => setSelectedNightId(id)}
            />

            {/* 3. Selected Night Score Hero */}
            <NightScoreHero night={selectedNight} />

            {/* 4. The Requested Core Astro Metrics (Score, Nubosidad, Viento & Guiado, Transparencia, Visibilidad, Punto de Rocío) */}
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                Variables Meteorológicas Clave para Astrofotografía
              </h2>
              <CoreMetricsGrid night={selectedNight} />
            </div>

            {/* 5. Hourly Multi-Metric Chart (Night Score, Viento, Nubosidad, Transparencia, Visibilidad, Luz Solar) */}
            <HourlyMetricsChart
              night={selectedNight}
              nights={nights}
              onSelectNight={(id) => setSelectedNightId(id)}
            />

            {/* 6. Hourly Night Detailed Timeline from Dusk to Dawn */}
            <HourlyNightTimeline night={selectedNight} />

            {/* 7. Ephemeris & Moon Phase Card */}
            <EphemerisAndMoon
              night={selectedNight}
              bortleClass={location.bortleClass || 3}
            />

            {/* 8. Target Suggestions & Equipment Dew Safety */}
            <TargetRecommender night={selectedNight} />
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-800 bg-[#0b101e] p-12 text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-rose-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">No se pudieron cargar datos meteorológicos</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Verifica la conexión a internet o configura tus proveedores en el panel de APIs.
            </p>
            <button
              onClick={() => loadForecast()}
              className="rounded-xl bg-cyan-500 hover:bg-cyan-400 px-5 py-2.5 text-xs font-bold text-slate-950 transition"
            >
              Reintentar
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#070a12] py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">Vlc AstroPlaner</span>
            <span>•</span>
            <span>Previsión y planificación multi-modelo para astrofotografía</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button
              onClick={() => setIsKeyModalOpen(true)}
              className="text-slate-400 hover:text-cyan-400 transition"
            >
              {activeProviders.length > 1
                ? `${activeProviders.length} APIs Activas`
                : 'Configurar APIs y Modelos'}
            </button>
            <span>•</span>
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="text-slate-400 hover:text-cyan-400 transition"
            >
              Cambiar Spot
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        settings={multiSettings}
        onSaveSettings={handleSaveMultiSettings}
      />

      <LocationSelectorModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocation={location}
        onSelectLocation={handleSelectLocation}
        apiKey={multiSettings.providers.openweather?.apiKey || ''}
      />
    </div>
  );
}

