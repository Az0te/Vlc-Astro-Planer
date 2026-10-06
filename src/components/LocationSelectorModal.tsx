import React, { useState } from 'react';
import { MapPin, Navigation, Search, Star, X, Compass, Loader2 } from 'lucide-react';
import { LocationData } from '../types';
import { POPULAR_ASTRO_SPOTS, searchLocations } from '../services/weatherService';

interface LocationSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: LocationData;
  onSelectLocation: (location: LocationData) => void;
  apiKey?: string;
}

export const LocationSelectorModal: React.FC<LocationSelectorModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onSelectLocation,
  apiKey,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<LocationData[]>([]);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [customLat, setCustomLat] = useState('');
  const [customLon, setCustomLon] = useState('');
  const [customName, setCustomName] = useState('');
  const [showCustomCoords, setShowCustomCoords] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const results = await searchLocations(searchQuery, apiKey);
      setSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleGpsLocation = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización.');
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Math.round(pos.coords.latitude * 10000) / 10000;
        const lon = Math.round(pos.coords.longitude * 10000) / 10000;

        // reverse geocoding approximation
        let placeName = 'Mi ubicación astronómica';
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
          );
          if (res.ok) {
            const data = await res.json();
            placeName =
              data.address?.city ||
              data.address?.town ||
              data.address?.village ||
              data.address?.county ||
              'Mi ubicación';
          }
        } catch {
          // ignore
        }

        onSelectLocation({
          name: placeName,
          country: 'Local',
          lat,
          lon,
          bortleClass: 4,
        });
        setGpsLoading(false);
        onClose();
      },
      (err) => {
        console.warn('Geolocation error:', err);
        alert('No se pudo acceder a la ubicación. Puedes buscar por nombre o introducir coordenadas.');
        setGpsLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleCustomCoordsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(customLat);
    const lon = parseFloat(customLon);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      alert('Por favor introduce coordenadas válidas (Lat -90 a 90, Lon -180 a 180).');
      return;
    }

    onSelectLocation({
      name: customName.trim() || `Coord: ${lat.toFixed(3)}, ${lon.toFixed(3)}`,
      country: 'Personalizado',
      lat,
      lon,
      bortleClass: 3,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-[#0b101d] p-6 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Ubicación de Observación</h2>
              <p className="text-xs text-slate-400">
                Actual: <span className="text-cyan-400 font-medium">{currentLocation.name}</span> ({currentLocation.lat}°, {currentLocation.lon}°)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="py-4 space-y-5">
          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar ciudad, pueblo o sierra (ej. Madrid, Granada, Teide)..."
                className="w-full rounded-xl border border-slate-700 bg-slate-900/90 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="rounded-xl bg-cyan-500 hover:bg-cyan-400 px-4 py-2.5 text-xs font-semibold text-slate-950 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
            </button>
          </form>

          {/* Quick GPS button */}
          <button
            onClick={handleGpsLocation}
            disabled={gpsLoading}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/40 hover:bg-slate-800/80 px-4 py-2.5 text-xs font-medium text-slate-200 transition"
          >
            {gpsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
            ) : (
              <Navigation className="h-4 w-4 text-cyan-400" />
            )}
            <span>Detectar mi ubicación actual por GPS</span>
          </button>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Resultados de búsqueda
              </h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {searchResults.map((loc, idx) => (
                  <button
                    key={`${loc.lat}-${loc.lon}-${idx}`}
                    onClick={() => {
                      onSelectLocation(loc);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:border-cyan-500/40 hover:bg-slate-800/60 text-left transition group"
                  >
                    <div>
                      <span className="text-sm font-medium text-white group-hover:text-cyan-300 transition">
                        {loc.name}
                      </span>
                      <span className="text-xs text-slate-400 ml-2">
                        {loc.state ? `${loc.state}, ` : ''}
                        {loc.country}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 group-hover:text-slate-300">
                      {loc.lat > 0 ? `${loc.lat}°N` : `${Math.abs(loc.lat)}°S`},{' '}
                      {loc.lon > 0 ? `${loc.lon}°E` : `${Math.abs(loc.lon)}°W`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular Observatories & Starlight Spots */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-amber-400" />
                <span>Lugares y Observatorios Emblemáticos</span>
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {POPULAR_ASTRO_SPOTS.map((spot) => {
                const isSelected =
                  Math.abs(spot.lat - currentLocation.lat) < 0.05 &&
                  Math.abs(spot.lon - currentLocation.lon) < 0.05;

                return (
                  <button
                    key={spot.name}
                    onClick={() => {
                      onSelectLocation(spot);
                      onClose();
                    }}
                    className={`flex flex-col p-2.5 rounded-xl border text-left transition ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-200'
                        : 'border-slate-800/90 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-800/50 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate">{spot.name}</span>
                      {spot.bortleClass && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700 font-mono">
                          Bortle {spot.bortleClass}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 truncate mt-0.5">{spot.state || spot.country}</span>
                    <span className="text-[10px] font-mono text-slate-500 mt-1">
                      {spot.elevation ? `${spot.elevation}m alt` : ''} • {spot.lat.toFixed(2)}°, {spot.lon.toFixed(2)}°
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Coordinates Toggle */}
          <div className="pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setShowCustomCoords(!showCustomCoords)}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1.5"
            >
              <Compass className="h-3.5 w-3.5" />
              <span>{showCustomCoords ? 'Ocultar coordenadas manuales' : 'Introducir coordenadas GPS manuales (telescopio de campo)'}</span>
            </button>

            {showCustomCoords && (
              <form onSubmit={handleCustomCoordsSubmit} className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="sm:col-span-3">
                  <input
                    type="text"
                    placeholder="Nombre del spot (ej. Mi observatorio en el jardín)"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Latitud (ej. 40.416)"
                    value={customLat}
                    onChange={(e) => setCustomLat(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Longitud (ej. -3.703)"
                    value={customLon}
                    onChange={(e) => setCustomLon(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-cyan-500 hover:bg-cyan-400 py-1.5 text-xs font-semibold text-slate-950 transition"
                  >
                    Usar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
