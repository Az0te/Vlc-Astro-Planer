import React from 'react';
import { AstroNight } from '../types';
import { Moon, Cloud, Droplets } from 'lucide-react';

interface DaysCarouselProps {
  nights: AstroNight[];
  selectedId: string;
  onSelectNight: (id: string) => void;
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
          Previsión de las Próximas 7 Noches
        </h2>
        <span className="text-[11px] text-slate-500">Selecciona una noche para ver el desglose</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin pt-1">
        {nights.map((night) => {
          const isSelected = night.id === selectedId;

          return (
            <button
              key={night.id}
              onClick={() => onSelectNight(night.id)}
              className={`flex-shrink-0 w-36 sm:w-44 rounded-2xl border p-3.5 text-left transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? 'border-cyan-500 bg-slate-900 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/50 -translate-y-0.5'
                  : 'border-slate-800/80 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/80'
              }`}
            >
              {/* Header: Day & Date */}
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold tracking-tight ${isSelected ? 'text-cyan-300' : 'text-white'}`}>
                    {night.dayName}
                  </span>
                  {night.isTonight && (
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      Hoy
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 block mt-0.5 font-medium">{night.dateStr}</span>
              </div>

              {/* Main: Astro Score Badge */}
              <div className="my-3 flex items-center justify-between">
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-2xl font-extrabold tracking-tight"
                    style={{ color: night.ratingColor }}
                  >
                    {night.astroScore}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">/100</span>
                </div>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                  style={{
                    backgroundColor: `${night.ratingColor}20`,
                    color: night.ratingColor,
                    border: `1px solid ${night.ratingColor}40`,
                  }}
                >
                  {night.ratingLabel}
                </span>
              </div>

              {/* Footer metrics: Clouds, Moon, Dew Point */}
              <div className="pt-2.5 border-t border-slate-800/80 space-y-1.5 text-[11px] text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-400">
                    <Cloud className="h-3 w-3 text-slate-400" /> Nubes
                  </span>
                  <span className={`font-mono font-semibold ${night.clouds.total <= 20 ? 'text-emerald-400' : night.clouds.total <= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {night.clouds.total}%
                  </span>
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
