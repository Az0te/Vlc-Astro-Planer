import React from 'react';
import { AstroNight } from '../types';
import { Moon, Cloud, Droplets } from 'lucide-react';

interface DaysCarouselProps {
  nights: AstroNight[];
  selectedId: string;
  onSelectNight: (id: string) => void;
}

function getCloudColor(val: number): string {
  if (val <= 20) return 'text-emerald-400';
  if (val <= 50) return 'text-amber-400';
  return 'text-rose-400';
}

export const DaysCarousel: React.FC<DaysCarouselProps> = ({
  nights,
  selectedId,
  onSelectNight,
}) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Previsión de los Próximos {nights.length} Días
        </h2>
        <span className="text-[11px] text-slate-500">Selecciona una noche para ver el desglose</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin pt-1">
        {nights.map((night) => {
          const isSelected = night.id === selectedId;

          const hourlyClouds = night.hourly?.length ? night.hourly.map((h) => h.cloudsTotal) : [];
          const maxClouds = night.clouds.max !== undefined
            ? night.clouds.max
            : (hourlyClouds.length > 0 ? Math.max(...hourlyClouds) : night.clouds.total);
          const minClouds = night.clouds.min !== undefined
            ? night.clouds.min
            : (hourlyClouds.length > 0 ? Math.min(...hourlyClouds) : night.clouds.total);
          const avgClouds = night.clouds.total;

          return (
            <button
              key={night.id}
              onClick={() => onSelectNight(night.id)}
              className={`flex-shrink-0 w-32 sm:w-44 rounded-xl sm:rounded-2xl border p-2.5 sm:p-3.5 text-left transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? 'border-cyan-500 bg-slate-900 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/50 -translate-y-0.5'
                  : 'border-slate-800/80 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/80'
              }`}
            >
              {/* Header: Day & Date */}
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] sm:text-xs font-bold tracking-tight ${isSelected ? 'text-cyan-300' : 'text-white'}`}>
                    {night.dayName}
                  </span>
                  {night.isTonight && (
                    <span className="text-[8.5px] sm:text-[9px] font-extrabold uppercase px-1 sm:px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      Hoy
                    </span>
                  )}
                </div>
                <span className="text-[10px] sm:text-[11px] text-slate-400 block mt-0.5 font-medium">{night.dateStr}</span>
              </div>

              {/* Main: Astro Score Badge */}
              <div className="my-2 sm:my-3 flex items-center justify-between">
                <div className="flex items-baseline gap-0.5 sm:gap-1">
                  <span
                    className="text-xl sm:text-2xl font-extrabold tracking-tight"
                    style={{ color: night.ratingColor }}
                  >
                    {night.astroScore}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-slate-400 font-semibold">/100</span>
                </div>
                <span
                  className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-full uppercase truncate max-w-[65px] sm:max-w-none text-center"
                  style={{
                    backgroundColor: `${night.ratingColor}20`,
                    color: night.ratingColor,
                    border: `1px solid ${night.ratingColor}40`,
                  }}
                >
                  {night.ratingLabel}
                </span>
              </div>

              {/* Footer metrics: Clouds (Máx · Media · Mín), Moon, Dew Point */}
              <div className="pt-2 sm:pt-2.5 border-t border-slate-800/80 space-y-1 sm:space-y-1.5 text-[10px] sm:text-[11px] text-slate-300">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className="flex items-center gap-1 text-slate-400 shrink-0"
                    title="Nubosidad de la noche: Máxima · Media · Mínima"
                  >
                    <Cloud className="h-3 w-3 text-slate-400" /> Nubes
                  </span>
                  <div className="flex items-baseline gap-1 font-mono">
                    {/* Delante: Mayor porcentaje de nubes de esa noche (más pequeño, color según lo bueno que es) */}
                    <span
                      className={`text-[9.5px] font-semibold ${getCloudColor(maxClouds)}`}
                      title={`Máxima de la noche: ${maxClouds}%`}
                    >
                      {maxClouds}%
                    </span>
                    <span className="text-[9px] text-slate-600 select-none">·</span>
                    {/* Centro: Media de nubes tal y como está */}
                    <span
                      className={`text-[11px] font-bold ${getCloudColor(avgClouds)}`}
                      title={`Nubosidad media: ${avgClouds}%`}
                    >
                      {avgClouds}%
                    </span>
                    <span className="text-[9px] text-slate-600 select-none">·</span>
                    {/* Derecha: Menor cantidad de nubes de esa noche (más pequeño, color según lo bueno que es) */}
                    <span
                      className={`text-[9.5px] font-semibold ${getCloudColor(minClouds)}`}
                      title={`Mínima de la noche: ${minClouds}%`}
                    >
                      {minClouds}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-400">
                    <Moon className="h-3 w-3 text-amber-300" /> Luna
                  </span>
                  <span className="font-mono font-medium text-slate-200">
                    {night.moon.illuminationPct}%
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-400">
                    <Droplets className="h-3 w-3 text-teal-400" /> Rocío
                  </span>
                  <span className={`font-mono font-medium ${night.dew.minSpread <= 2.0 ? 'text-rose-400' : 'text-teal-300'}`}>
                    {night.dew.avgDewPoint > 0 ? `+${night.dew.avgDewPoint}` : night.dew.avgDewPoint}°C
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
