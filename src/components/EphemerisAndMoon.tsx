import React from 'react';
import { AstroNight } from '../types';
import { Sun, Moon, Sparkles, Compass, AlertCircle, Clock } from 'lucide-react';

interface EphemerisAndMoonProps {
  night: AstroNight;
  bortleClass?: number;
}

export const EphemerisAndMoon: React.FC<EphemerisAndMoonProps> = ({ night, bortleClass = 3 }) => {
  const { ephemeris, moon } = night;

  // Visual helper for moon phase icon / rendering
  const getMoonSvg = (fraction: number) => {
    // 0 = new moon, 0.5 = full moon, 1 = new moon
    return (
      <div className="relative h-16 w-16 rounded-full bg-slate-900 border border-slate-700 overflow-hidden shadow-inner flex items-center justify-center shrink-0">
        {/* Glow */}
        <div className="absolute inset-0 bg-amber-200/10 blur-sm rounded-full" />
        {/* Moon disk representation */}
        <div
          className="h-12 w-12 rounded-full border border-slate-600 bg-gradient-to-tr from-slate-300 to-amber-100 shadow-lg relative overflow-hidden"
          style={{
            opacity: Math.max(0.2, moon.illuminationPct / 100),
          }}
        >
          {/* Crater texture illusion */}
          <div className="absolute top-2 left-3 h-2 w-2 rounded-full bg-slate-400/30" />
          <div className="absolute bottom-3 right-3 h-3 w-3 rounded-full bg-slate-400/25" />
          <div className="absolute top-5 right-2 h-1.5 w-1.5 rounded-full bg-slate-400/30" />
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Sun & Twilight Ephemeris Card */}
      <div className="rounded-3xl border border-slate-800 bg-[#0b101e] p-6 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Sun className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Efemérides Solares y Crepúsculos</h3>
                <p className="text-[11px] text-slate-400">Horarios calculados para la latitud y longitud exacta</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-300 font-semibold">
              <Clock className="h-3.5 w-3.5 text-cyan-400" />
              <span>{ephemeris.totalDarknessHours} h Oscuridad Pura</span>
            </div>
          </div>

          {/* Twilight visual timeline */}
          <div className="mt-5 space-y-3">
            {/* Dusk progression */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Anochecer y Entrada en la Noche
              </span>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-amber-950/20 border border-amber-900/30">
                  <span className="text-[10px] text-slate-400 block">Puesta Sol</span>
                  <span className="font-mono font-bold text-amber-400">{ephemeris.sunset}</span>
                </div>
                <div className="p-2 rounded-xl bg-orange-950/20 border border-orange-900/30">
                  <span className="text-[10px] text-slate-400 block">Crep. Civil</span>
                  <span className="font-mono font-bold text-orange-300">{ephemeris.civilDusk}</span>
                </div>
                <div className="p-2 rounded-xl bg-blue-950/30 border border-blue-900/40">
                  <span className="text-[10px] text-slate-400 block">Crep. Náutico</span>
                  <span className="font-mono font-bold text-blue-300">{ephemeris.nauticalDusk}</span>
                </div>
                <div className="p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/40 ring-1 ring-cyan-500/30">
                  <span className="text-[10px] text-cyan-400 font-semibold block">Noche Astro</span>
                  <span className="font-mono font-bold text-cyan-300">{ephemeris.astroDusk}</span>
                </div>
              </div>
            </div>

            {/* Dawn progression */}
            <div className="pt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Fin de Oscuridad y Amanecer
              </span>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/40 ring-1 ring-cyan-500/30">
                  <span className="text-[10px] text-cyan-400 font-semibold block">Fin Astro</span>
                  <span className="font-mono font-bold text-cyan-300">{ephemeris.astroDawn}</span>
                </div>
                <div className="p-2 rounded-xl bg-blue-950/30 border border-blue-900/40">
                  <span className="text-[10px] text-slate-400 block">Crep. Náutico</span>
                  <span className="font-mono font-bold text-blue-300">{ephemeris.nauticalDawn}</span>
                </div>
                <div className="p-2 rounded-xl bg-orange-950/20 border border-orange-900/30">
                  <span className="text-[10px] text-slate-400 block">Crep. Civil</span>
                  <span className="font-mono font-bold text-orange-300">{ephemeris.civilDawn}</span>
                </div>
                <div className="p-2 rounded-xl bg-amber-950/20 border border-amber-900/30">
                  <span className="text-[10px] text-slate-400 block">Salida Sol</span>
                  <span className="font-mono font-bold text-amber-400">{ephemeris.sunrise}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
          <span>Ventana de cielo negro ($\le -18^\circ$):</span>
          <span className="font-semibold text-slate-200">
            {ephemeris.astroDusk} h → {ephemeris.astroDawn} h
          </span>
        </div>
      </div>

      {/* Moon Phase & Illumination Card */}
      <div className="rounded-3xl border border-slate-800 bg-[#0b101e] p-6 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Moon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Fase Lunar y Ventana Oscura</h3>
                <p className="text-[11px] text-slate-400">Brillo de fondo de cielo y visibilidad de cielo profundo</p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-xl bg-indigo-950/60 text-indigo-300 border border-indigo-900/50">
              {moon.illuminationPct}% iluminada
            </span>
          </div>

          <div className="mt-5 flex items-center gap-6">
            {getMoonSvg(moon.phaseFraction)}

            <div className="space-y-1">
              <span className="text-lg font-bold text-white tracking-tight block">
                {moon.phaseName}
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                {moon.illuminationPct <= 25
                  ? 'Fase lunar óptima. Mínima dispersión de luz parásita en cielo profundo.'
                  : moon.illuminationPct <= 60
                  ? 'Luna moderada. Recomendable priorizar objetos en el lado opuesto o usar filtros duales.'
                  : 'Fase de alta luminosidad. Se aconseja fotografía planetaria o filtros de banda estrecha (H-alfa).'}
              </p>
            </div>
          </div>

          {/* Moonrise & Moonset metrics */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1">Salida de la Luna</span>
              <span className="text-base font-mono font-bold text-white">{moon.moonrise} h</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1">Puesta de la Luna</span>
              <span className="text-base font-mono font-bold text-white">{moon.moonset} h</span>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>Horas útiles sin luna en oscuridad:</span>
          <span className="font-mono font-bold text-cyan-300">{moon.usableDarkHours} horas</span>
        </div>
      </div>
    </div>
  );
};
