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
    <div className="rounded-2xl sm:rounded-3xl border border-slate-800 bg-gradient-to-b from-[#0e1628] to-[#0a0f1c] p-3.5 sm:p-8 shadow-2xl relative overflow-hidden">
      {/* Background glow effects */}
      <div
        className="absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ backgroundColor: ratingColor }}
      />
      <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full blur-3xl bg-cyan-600/10 pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-center gap-4 sm:gap-8 justify-between">
        {/* Left: Score Gauge and Classification */}
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-center sm:text-left w-full sm:w-auto">
          {/* Radial Circular Gauge */}
          <div className="relative flex h-24 w-24 sm:h-40 sm:w-40 shrink-0 items-center justify-center">
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
              <span className="text-2xl sm:text-5xl font-extrabold text-white tracking-tighter">
                {astroScore}
              </span>
              <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Score
              </span>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 justify-center sm:justify-start">
              <span
                className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-950 shadow-md"
                style={{ backgroundColor: ratingColor }}
              >
                Noche {ratingLabel}
              </span>
              {night.isTonight && (
                <span className="px-2 sm:px-2.5 py-0.2 sm:py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Esta Noche
                </span>
              )}
            </div>

            <h1 className="mt-1 sm:mt-2 text-lg sm:text-3xl font-extrabold text-white tracking-tight">
              Previsión {night.dayName} ({night.dateStr})
            </h1>

            <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              {night.summary}
            </p>

            {/* Quick badges */}
            <div className="mt-2.5 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2.5 text-[11px] sm:text-xs text-slate-300 justify-center sm:justify-start">
              <div className="flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-cyan-400" />
                <span>
                  <strong className="text-white">{ephemeris.totalDarknessHours}h</strong> oscura
                </span>
              </div>

              <div className="flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <Moon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-300" />
                <span>
                  {moon.phaseName} ({moon.illuminationPct}%)
                </span>
              </div>

              <div className="flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <Thermometer className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-teal-400" />
                <span>
                  Δ{dew.minSpread}°C
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Astrophotography Equipment & Session Strategy */}
        <div className="w-full lg:w-80 rounded-xl sm:rounded-2xl bg-slate-950/70 border border-slate-800/90 p-2.5 sm:p-4 shrink-0 space-y-2 sm:space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-cyan-400">
            <Telescope className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Recomendación de Sesión</span>
          </div>

          <div className="space-y-1.5 sm:space-y-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] sm:text-[11px]">Objetivos recomendados:</span>
              <span className="font-semibold text-white text-[11px] sm:text-xs">
                {targetAdvice.bestTargets.slice(0, 2).join(' • ')}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] sm:text-[11px]">Filtros sugeridos:</span>
              <span className="text-slate-200 text-[11px] sm:text-xs">{targetAdvice.filters}</span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] sm:text-[11px]">Control condensación:</span>
              <span
                className={`font-semibold text-[11px] sm:text-xs ${
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
