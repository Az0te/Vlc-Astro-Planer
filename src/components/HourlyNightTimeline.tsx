import React, { useState } from 'react';
import { AstroNight, HourlyForecastItem } from '../types';
import { Clock, ShieldAlert, Sparkles, Wind, Eye, Droplets, Cloud, Info } from 'lucide-react';

interface HourlyNightTimelineProps {
  night: AstroNight;
}

export const HourlyNightTimeline: React.FC<HourlyNightTimelineProps> = ({ night }) => {
  const [selectedHour, setSelectedHour] = useState<HourlyForecastItem | null>(
    night.hourly[Math.min(3, night.hourly.length - 1)] || null
  );

  return (
    <div className="rounded-3xl border border-slate-800 bg-[#0b101e] p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="h-4 w-4 text-cyan-400" />
            <span>Evolución Horaria de la Noche Astronómica</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Desde el anochecer ({night.ephemeris.sunset}) hasta el amanecer ({night.ephemeris.sunrise}). Haz clic en cualquier hora.
          </p>
        </div>

        {/* Legend indicator */}
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span>Oscuridad astronómica (&lt;-18°)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-indigo-500/60" />
            <span>Crepúsculo</span>
          </div>
        </div>
      </div>

      {/* Hourly Horizontal Strip */}
      <div className="overflow-x-auto pb-3 pt-1">
        <div className="flex gap-2 min-w-[700px]">
          {night.hourly.map((item) => {
            const isSelected = selectedHour?.timestamp === item.timestamp;

            return (
              <button
                key={item.timestamp}
                onClick={() => setSelectedHour(item)}
                className={`flex-1 min-w-[62px] p-2.5 rounded-2xl border text-center transition-all flex flex-col justify-between items-center ${
                  isSelected
                    ? 'border-cyan-500 bg-slate-800/90 ring-2 ring-cyan-500/40 shadow-lg'
                    : 'border-slate-800/80 bg-slate-900/50 hover:bg-slate-800/50 hover:border-slate-700'
                }`}
              >
                {/* Time */}
                <span className="text-xs font-mono font-bold text-white block">
                  {item.timeStr}
                </span>

                {/* Astro darkness tag */}
                <span
                  className={`text-[9px] px-1 py-0.5 rounded font-mono mt-1 ${
                    item.isAstronomicalNight
                      ? 'bg-cyan-500/15 text-cyan-300'
                      : 'bg-indigo-950 text-indigo-300'
                  }`}
                >
                  {item.isAstronomicalNight ? 'Oscuro' : 'Crep.'}
                </span>

                {/* Astro Score Pill */}
                <div className="my-2 flex flex-col items-center">
                  <span
                    className={`text-sm font-extrabold ${
                      item.score >= 80
                        ? 'text-emerald-400'
                        : item.score >= 60
                        ? 'text-cyan-400'
                        : item.score >= 40
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {item.score}
                  </span>
                  {/* Mini height bar indicator */}
                  <div className="w-1.5 h-8 bg-slate-800 rounded-full overflow-hidden mt-1 flex flex-col justify-end">
                    <div
                      className={`w-full rounded-full ${
                        item.score >= 80
                          ? 'bg-emerald-400'
                          : item.score >= 60
                          ? 'bg-cyan-400'
                          : item.score >= 40
                          ? 'bg-amber-400'
                          : 'bg-rose-500'
                      }`}
                      style={{ height: `${Math.max(10, item.score)}%` }}
                    />
                  </div>
                </div>

                {/* Clouds */}
                <div className="text-[10px] font-mono text-slate-300">
                  {item.cloudsTotal}%
                  <span className="text-[9px] text-slate-500 block">nub</span>
                </div>

                {/* Temp / Spread */}
                <div className="mt-1 pt-1 border-t border-slate-800/80 text-[10px] font-mono">
                  <span className="text-slate-300 block">{item.temp}°</span>
                  <span
                    className={`font-semibold block ${
                      item.spread <= 1.5
                        ? 'text-rose-400 font-bold'
                        : item.spread <= 3.0
                        ? 'text-amber-400'
                        : 'text-teal-400'
                    }`}
                  >
                    $\Delta${item.spread}°
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Hour Detailed Inspector */}
      {selectedHour && (
        <div className="rounded-2xl border border-slate-800/90 bg-slate-950/60 p-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <span className="text-xl font-mono font-extrabold text-cyan-400">
                {selectedHour.timeStr} h
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                  selectedHour.score >= 80
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : selectedHour.score >= 60
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : selectedHour.score >= 40
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                Night Score {selectedHour.score}/100
              </span>
              <span className="text-xs text-slate-400">
                {selectedHour.isAstronomicalNight
                  ? 'Oscuridad astronómica total (Sol a ' + selectedHour.sunAltitudeDeg + '°)'
                  : 'Fase de crepúsculo (Sol a ' + selectedHour.sunAltitudeDeg + '°)'}
              </span>
            </div>

            <div className="text-xs text-cyan-300 font-medium bg-cyan-950/40 px-3 py-1 rounded-xl border border-cyan-900/50">
              {selectedHour.recommendation}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Nubosidad */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                <Cloud className="h-3.5 w-3.5 text-cyan-400" /> Nubes
              </span>
              <span className="text-base font-bold text-white font-mono">
                {selectedHour.cloudsTotal}%
              </span>
              <span className="text-[10px] text-slate-500 block">
                B:{selectedHour.cloudsLow}% M:{selectedHour.cloudsMid}% A:{selectedHour.cloudsHigh}%
              </span>
            </div>

            {/* Temperatura & Rocío */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                <Droplets className="h-3.5 w-3.5 text-teal-400" /> Temp / Rocío
              </span>
              <span className="text-base font-bold text-white font-mono">
                {selectedHour.temp}°C / {selectedHour.dewPoint}°C
              </span>
              <span
                className={`text-[10px] font-semibold block ${
                  selectedHour.spread <= 1.5 ? 'text-rose-400' : 'text-slate-400'
                }`}
              >
                Margen $\Delta$: {selectedHour.spread}°C
              </span>
            </div>

            {/* Transparencia */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                <Sparkles className="h-3.5 w-3.5 text-violet-400" /> Transparencia
              </span>
              <span className="text-base font-bold text-white font-mono">
                {selectedHour.transparencyScore}%
              </span>
              <span className="text-[10px] text-slate-400 block">
                {selectedHour.transparencyLabel}
              </span>
            </div>

            {/* Seeing */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                <Eye className="h-3.5 w-3.5 text-blue-400" /> Seeing FWHM
              </span>
              <span className="text-base font-bold text-white font-mono">
                {selectedHour.seeingArcsec.toFixed(1)}&quot;
              </span>
              <span className="text-[10px] text-slate-400 block">
                {selectedHour.seeingLabel}
              </span>
            </div>

            {/* Viento */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                <Wind className="h-3.5 w-3.5 text-slate-400" /> Viento y rachas
              </span>
              <span className="text-base font-bold text-white font-mono">
                {selectedHour.windSpeedKmh} km/h
              </span>
              <span className="text-[10px] text-slate-500 block">
                Rachas {selectedHour.windGustKmh} km/h
              </span>
            </div>

            {/* Riesgo de Rocío */}
            <div
              className={`p-3 rounded-xl border ${
                selectedHour.spread <= 1.5
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : selectedHour.spread <= 3.0
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}
            >
              <span className="text-[11px] flex items-center gap-1 mb-1 font-semibold">
                <ShieldAlert className="h-3.5 w-3.5" /> Condensación
              </span>
              <span className="text-base font-bold font-mono">
                {selectedHour.dewRiskLevel}
              </span>
              <span className="text-[10px] block opacity-90">
                {selectedHour.spread <= 2.0 ? 'Calentadores al 100%' : 'Lentes libres'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
