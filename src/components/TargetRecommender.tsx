import React from 'react';
import { AstroNight } from '../types';
import { Telescope, Compass, ShieldAlert, Sparkles, Filter, CheckCircle2 } from 'lucide-react';

interface TargetRecommenderProps {
  night: AstroNight;
}

export const TargetRecommender: React.FC<TargetRecommenderProps> = ({ night }) => {
  const { moon, transparency, dew, clouds, targetAdvice } = night;

  // Curated target suggestions catalog with DSO types
  const getCatalogTargets = () => {
    if (moon.illuminationPct <= 35 && clouds.total <= 30) {
      return [
        {
          name: 'Galaxia de Andrómeda (M31)',
          type: 'Galaxia espiral',
          constellation: 'Andromeda',
          filter: 'Banda ancha / Sin filtro',
          mag: '3.4',
          difficulty: 'Fácil',
        },
        {
          name: 'Cúmulo de las Pléyades (M45)',
          type: 'Cúmulo abierto y nebulosa de reflexión',
          constellation: 'Tauro',
          filter: 'Banda ancha RGB',
          mag: '1.6',
          difficulty: 'Muy fácil',
        },
        {
          name: 'Nebulosa del Velo (NGC 6960 / 6992)',
          type: 'Remanente de supernova',
          constellation: 'Cisne',
          filter: 'Dual Narrowband (OIII + Ha)',
          mag: '7.0',
          difficulty: 'Moderada',
        },
      ];
    } else if (moon.illuminationPct > 60) {
      return [
        {
          name: 'Nebulosa Norteamérica y Pelícano (NGC 7000)',
          type: 'Nebulosa de emisión en H-alfa',
          constellation: 'Cisne',
          filter: 'Filtro H-alfa 3nm / 7nm',
          mag: '4.0',
          difficulty: 'Fácil con filtro',
        },
        {
          name: 'Planetas Júpiter y Saturno',
          type: 'Planetaria de alta resolución',
          constellation: 'Eclíptica',
          filter: 'Cámara planetaria de alta tasa de frames (Lucky Imaging)',
          mag: '-2.5',
          difficulty: 'Fácil',
        },
        {
          name: 'Nebulosa de la Burbuja (NGC 7635)',
          type: 'Nebulosa de emisión',
          constellation: 'Casiopea',
          filter: 'Filtro de banda estrecha',
          mag: '8.5',
          difficulty: 'Media',
        },
      ];
    } else {
      return [
        {
          name: 'Nebulosa de Orión (M42)',
          type: 'Nebulosa difusa',
          constellation: 'Orión',
          filter: 'RGB o Dual Band',
          mag: '4.0',
          difficulty: 'Muy fácil',
        },
        {
          name: 'Galaxia del Triángulo (M33)',
          type: 'Galaxia espiral',
          constellation: 'Triángulo',
          filter: 'Banda ancha LRGB',
          mag: '5.7',
          difficulty: 'Media',
        },
        {
          name: 'Cúmulo Doble de Perseo (NGC 869 / 884)',
          type: 'Cúmulo estelar abierto',
          constellation: 'Perseo',
          filter: 'Sin filtro / UV-IR Cut',
          mag: '3.7',
          difficulty: 'Fácil',
        },
      ];
    }
  };

  const targets = getCatalogTargets();

  return (
    <div className="rounded-3xl border border-slate-800 bg-[#0b101e] p-6 shadow-xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Telescope className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Objetivos Sugeridos y Configuración Óptica
            </h3>
            <p className="text-[11px] text-slate-400">
              Alineados con la fase lunar ({moon.illuminationPct}%), transparencia ({transparency.score}%) y rocío
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
          <Filter className="h-3.5 w-3.5 text-cyan-400" />
          <span>Filtro recomendado: <strong className="text-cyan-300 font-semibold">{targetAdvice.filters}</strong></span>
        </div>
      </div>

      {/* Target cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {targets.map((tgt) => (
          <div
            key={tgt.name}
            className="p-4 rounded-2xl border border-slate-800/90 bg-slate-900/50 flex flex-col justify-between hover:border-slate-700 transition"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white tracking-tight">{tgt.name}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                  Mag {tgt.mag}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5">{tgt.type} • {tgt.constellation}</span>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1 text-[11px]">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-500">Técnica:</span>
                <span className="font-semibold text-cyan-300">{tgt.filter}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-500">Dificultad:</span>
                <span className="text-slate-300">{tgt.difficulty}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dew & Equipment Safety Checklist */}
      <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
        <div className="space-y-1">
          <span className="font-bold text-white flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-teal-400" />
            <span>Lista de comprobación de campo (Astrofoto)</span>
          </span>
          <p className="text-slate-400">
            Punto de rocío a {dew.avgDewPoint}°C (Margen $\Delta$: {dew.minSpread}°C). {dew.advice}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-3 py-1.5 rounded-xl font-bold border ${dew.heatersAdvised ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'}`}>
            {dew.heatersAdvised ? '⚡ Conectar Calentadores' : '✓ Lentes Seguras'}
          </span>
        </div>
      </div>
    </div>
  );
};
