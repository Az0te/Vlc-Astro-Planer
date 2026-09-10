import React from 'react';
import { AstroNight } from '../types';
import { Sparkles, Moon, Clock, Telescope, Compass, Thermometer } from 'lucide-react';

interface NightScoreHeroProps {
  night: AstroNight;
}

export const NightScoreHero: React.FC<NightScoreHeroProps> = ({ night }) => {
  const { astroScore, ratingLabel, ratingColor, moon, ephemeris, dew, clouds, seeing, targetAdvice } = night;

  // Circumference for 0-100 radial ring
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (astroScore / 100) * circumference;

  return (
    <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-[#0e1628] to-[#0a0f1c] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      {/* Background glow effects */}
      <div
        className="absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ backgroundColor: ratingColor }}
      />
      <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full blur-3xl bg-cyan-600/10 pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8 justify-between">
        {/* Left: Score Gauge and Classification */}
        <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          {/* Radial Circular Gauge */}
          <div className="relative flex h-40 w-40 shrink-0 items-center justify-center">
            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 160 160">
              {/* Background circle track */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="stroke-slate-800/80"
                strokeWidth="10"
                fill="transparent"
              />
              {/* Dynamic Score Ring */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke={ratingColor}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
            </svg>

            {/* Inner Content */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-4xl sm:text-5xl font-extrabold text-white tracking-tighter">
                {astroScore}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Night Score
              </span>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
              <span
                className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider text-slate-950 shadow-md"
                style={{ backgroundColor: ratingColor }}
              >
                Noche {ratingLabel}
              </span>
              {night.isTonight && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Esta Noche
                </span>
              )}
            </div>

            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Previsión {night.dayName} ({night.dateStr})
            </h1>

            <p className="mt-2 text-sm text-slate-300 max-w-xl leading-relaxed">
              {night.summary}
            </p>

            {/* Quick badges */}
            <div className="mt-4 flex flex-wrap gap-2.5 text-xs text-slate-300 justify-center sm:justify-start">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <Clock className="h-3.5 w-3.5 text-cyan-400" />
                <span>
                  <strong className="text-white">{ephemeris.totalDarknessHours}h</strong> oscuridad pura
                </span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <Moon className="h-3.5 w-3.5 text-amber-300" />
                <span>
                  {moon.phaseName} ({moon.illuminationPct}%)
                </span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <Thermometer className="h-3.5 w-3.5 text-teal-400" />
                <span>
                  Rocío a <strong className="text-white">{dew.avgDewPoint > 0 ? `+${dew.avgDewPoint}` : dew.avgDewPoint}°C</strong> ($\Delta${dew.minSpread}°C)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Astrophotography Equipment & Session Strategy */}
        <div className="w-full lg:w-80 rounded-2xl bg-slate-950/70 border border-slate-800/90 p-4 shrink-0 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
            <Telescope className="h-4 w-4" />
            <span>Recomendación de Sesión</span>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Objetivos recomendados:</span>
              <span className="font-semibold text-white">
                {targetAdvice.bestTargets.slice(0, 2).join(' • ')}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Filtros sugeridos:</span>
              <span className="text-slate-200">{targetAdvice.filters}</span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Control de condensación:</span>
              <span
                className={`font-semibold ${
                  dew.heatersAdvised ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {dew.advice}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
