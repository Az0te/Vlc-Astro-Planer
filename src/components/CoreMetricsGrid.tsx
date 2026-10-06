import React, { useState } from 'react';
import {
  Cloud,
  Eye,
  Droplets,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  Wind,
  Navigation,
} from 'lucide-react';
import { AstroNight, HourlyForecastItem } from '../types';

interface CoreMetricsGridProps {
  night: AstroNight;
}

export const CoreMetricsGrid: React.FC<CoreMetricsGridProps> = ({ night }) => {
  const { clouds, visibility, transparency, dew, seeing, wind, hourly = [] } = night;

  // Selected hour index for each card to allow quick hour-by-hour inspection
  const [hoveredHourIdx, setHoveredHourIdx] = useState<number | null>(null);

  // Active hourly item or average fallback
  const activeHour: HourlyForecastItem | null =
    hoveredHourIdx !== null && hourly[hoveredHourIdx] ? hourly[hoveredHourIdx] : null;

  // Cloud status badge styling
  const getCloudBadge = (val: number) => {
    if (val <= 10)
      return {
        text: 'Cielo Despejado',
        color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      };
    if (val <= 30)
      return {
        text: 'Poco Nuboso',
        color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
      };
    if (val <= 60)
      return {
        text: 'Parcialmente Nublado',
        color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      };
    return {
      text: 'Cubierto / Inviable',
      color: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    };
  };

  // Dew risk styling
  const getDewRiskBadge = (level: string) => {
    switch (level) {
      case 'Bajo':
        return {
          badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          icon: <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />,
          title: 'Óptica Segura',
        };
      case 'Moderado':
        return {
          badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />,
          title: 'Vigilar Lentes',
        };
      case 'Alto':
        return {
          badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
          icon: <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />,
          title: 'Cintas Calentadoras',
        };
      case 'Crítico':
      default:
        return {
          badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse',
          icon: <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />,
          title: 'Condensación Inminente',
        };
    }
  };

  // Wind & Mount Guide impact styling
  const getWindBadge = (speed: number, gust: number) => {
    if (speed <= 10 && gust <= 15) {
      return {
        badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        text: 'Guiado <0.6" (Óptimo)',
        status: 'Montura Estable',
        advice: 'Telescopio sin vibraciones. Ideal para Newtonians y focales largas.',
      };
    }
    if (speed <= 18 && gust <= 25) {
      return {
        badge: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
        text: 'Guiado OK (~0.9")',
        status: 'Brisa Leve',
        advice: 'Apto para refractores o tubos cortos. Usar parasol rígido bien fijado.',
      };
    }
    if (speed <= 26 || gust <= 35) {
      return {
        badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        text: 'Riesgo Guiado (>1.3")',
        status: 'Oscilación en Ejes',
        advice: 'Rachas que mueven el tubo. Descartar tomas largas (>180s) o apantallar viento.',
      };
    }
    return {
      badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse',
      text: 'Inviable / Fuerte',
      status: 'Peligro Montura',
      advice: 'Ráfagas que arrastran la montura y causan deriva violenta. No exponer equipo.',
    };
  };

  const currentClouds = activeHour ? activeHour.cloudsTotal : clouds.total;
  const cloudBadge = getCloudBadge(currentClouds);

  const currentWindSpeed = activeHour ? activeHour.windSpeedKmh : wind.avgKmh;
  const currentWindGust = activeHour ? activeHour.windGustKmh : wind.maxGustKmh;
  const windBadge = getWindBadge(currentWindSpeed, currentWindGust);

  const currentVisKm = activeHour ? activeHour.visibilityKm : visibility.km;
  const currentTransScore = activeHour ? activeHour.transparencyScore : transparency.score;
  const currentSpread = activeHour ? activeHour.spread : dew.minSpread;
  const currentDewPoint = activeHour ? activeHour.dewPoint : dew.avgDewPoint;
  const currentDewRisk = activeHour ? activeHour.dewRiskLevel : dew.riskLevel;
  const dewBadge = getDewRiskBadge(currentDewRisk);

  return (
    <div className="space-y-3">
      {/* Interactive Hour indicator banner if hovering any hour bar */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          {activeHour ? (
            <>
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="font-semibold text-cyan-300">
                Detalle a las {activeHour.timeStr} h
              </span>
              <span className="text-[11px] text-slate-500">
                (Toca o pasa el ratón por las barras de cualquier tarjeta)
              </span>
            </>
          ) : (
            <span className="text-[11px] text-slate-400">
              Pasa el ratón por las barras horarias de cada tarjeta para ver la hora exacta.
            </span>
          )}
        </span>
        {activeHour && (
          <button
            onClick={() => setHoveredHourIdx(null)}
            className="text-[11px] text-cyan-400 hover:text-cyan-200 underline font-medium"
          >
            Ver valores medios de la noche
          </button>
        )}
      </div>

      {/* 5 KEY METRIC CARDS (Nubosidad, Viento, Transparencia, Visibilidad, Punto de Rocío) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {/* 1. NUBOSIDAD (por horas) */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between group hover:border-slate-700 transition">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                  <Cloud className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
                    Nubosidad
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">Por horas</span>
                </div>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cloudBadge.color}`}>
                {cloudBadge.text}
              </span>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-white tracking-tight">{currentClouds}%</span>
                <span className="text-[11px] text-slate-400">cobertura</span>
              </div>
              {activeHour && (
                <span className="text-[10px] font-mono font-bold text-cyan-400 bg-slate-800/90 px-1.5 py-0.5 rounded">
                  {activeHour.timeStr}h
                </span>
              )}
            </div>

            {/* Cloud layers */}
            <div className="mt-2.5 grid grid-cols-3 gap-1 text-center text-[10px] bg-slate-950/40 p-1.5 rounded-xl border border-slate-800/60">
              <div>
                <span className="text-slate-500 block text-[9px]">Bajas</span>
                <span className="font-mono font-bold text-slate-300">
                  {activeHour ? activeHour.cloudsLow : clouds.low}%
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px]">Medias</span>
                <span className="font-mono font-bold text-slate-300">
                  {activeHour ? activeHour.cloudsMid : clouds.mid}%
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px]">Cirros</span>
                <span className="font-mono font-bold text-slate-300">
                  {activeHour ? activeHour.cloudsHigh : clouds.high}%
                </span>
              </div>
            </div>
          </div>

          {/* Hourly Mini-Bars for Clouds */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 mb-1">
              <span>{hourly[0]?.timeStr || '18:00'}</span>
              <span className="text-slate-400 font-medium">Evolución nocturna</span>
              <span>{hourly[hourly.length - 1]?.timeStr || '08:00'}</span>
            </div>
            <div className="flex items-end gap-1 h-8 bg-slate-950/60 p-1 rounded-lg border border-slate-800/60">
              {hourly.map((h, idx) => {
                const heightPct = Math.max(12, Math.min(100, h.cloudsTotal));
                const barColor =
                  h.cloudsTotal <= 15
                    ? 'bg-emerald-400'
                    : h.cloudsTotal <= 45
                    ? 'bg-amber-400'
                    : 'bg-rose-500';
                const isHovered = hoveredHourIdx === idx;

                return (
                  <div
                    key={h.timestamp}
                    onMouseEnter={() => setHoveredHourIdx(idx)}
                    onClick={() => setHoveredHourIdx(idx)}
                    title={`${h.timeStr} h: ${h.cloudsTotal}% nubes`}
                    className="flex-1 h-full flex items-end cursor-pointer group/bar relative"
                  >
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t transition-all ${barColor} ${
                        isHovered ? 'ring-1 ring-white brightness-125 scale-y-105' : 'opacity-80 hover:opacity-100'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. VIENTO & MONTURA / GUIADO (por horas) */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between group hover:border-slate-700 transition">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 shrink-0">
                  <Wind className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
                    Viento & Guiado
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">Por horas</span>
                </div>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${windBadge.badge}`}>
                {windBadge.status}
              </span>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white tracking-tight">{currentWindSpeed}</span>
                  <span className="text-xs text-slate-400">km/h</span>
                </div>
                <span className="text-[10px] text-amber-400 font-medium block">
                  Racha máx: {currentWindGust} km/h
                </span>
              </div>
              {activeHour && (
                <span className="text-[10px] font-mono font-bold text-teal-400 bg-slate-800/90 px-1.5 py-0.5 rounded">
                  {activeHour.timeStr}h
                </span>
              )}
            </div>

            <p className="mt-2 text-[10px] text-slate-300 line-clamp-2 leading-relaxed bg-slate-950/40 p-1.5 rounded-xl border border-slate-800/60">
              {windBadge.advice}
            </p>
          </div>

          {/* Hourly Mini-Bars for Wind Speed & Gusts */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 mb-1">
              <span>{hourly[0]?.timeStr || '18:00'}</span>
              <span className="text-teal-400 font-medium">Viento/Rachas</span>
              <span>{hourly[hourly.length - 1]?.timeStr || '08:00'}</span>
            </div>
            <div className="flex items-end gap-1 h-8 bg-slate-950/60 p-1 rounded-lg border border-slate-800/60">
              {hourly.map((h, idx) => {
                const maxRef = Math.max(35, ...hourly.map((it) => it.windGustKmh || it.windSpeedKmh));
                const heightPct = Math.max(15, Math.min(100, Math.round((h.windSpeedKmh / maxRef) * 100)));
                const barColor =
                  h.windSpeedKmh <= 12
                    ? 'bg-teal-400'
                    : h.windSpeedKmh <= 22
                    ? 'bg-amber-400'
                    : 'bg-rose-500';
                const isHovered = hoveredHourIdx === idx;

                return (
                  <div
                    key={h.timestamp}
                    onMouseEnter={() => setHoveredHourIdx(idx)}
                    onClick={() => setHoveredHourIdx(idx)}
                    title={`${h.timeStr} h: Viento ${h.windSpeedKmh} km/h (Racha ${h.windGustKmh} km/h)`}
                    className="flex-1 h-full flex items-end cursor-pointer group/bar relative"
                  >
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t transition-all ${barColor} ${
                        isHovered ? 'ring-1 ring-white brightness-125 scale-y-105' : 'opacity-80 hover:opacity-100'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. TRANSPARENCIA ATMOSFÉRICA (por horas) */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between group hover:border-slate-700 transition">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
                    Transparencia
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">Por horas</span>
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-purple-500/15 text-purple-300 border-purple-500/30">
                {currentTransScore >= 75 ? 'Excelente' : currentTransScore >= 50 ? 'Aceptable' : 'Pobre'}
              </span>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-white tracking-tight">{currentTransScore}</span>
                <span className="text-[11px] text-slate-400">/ 100</span>
              </div>
              {activeHour && (
                <span className="text-[10px] font-mono font-bold text-purple-300 bg-slate-800/90 px-1.5 py-0.5 rounded">
                  {activeHour.timeStr}h
                </span>
              )}
            </div>

            <p className="mt-2 text-[10px] text-slate-300 line-clamp-2 leading-relaxed bg-slate-950/40 p-1.5 rounded-xl border border-slate-800/60">
              {currentTransScore >= 75
                ? 'Atmósfera limpia y contrastada. Excelente relación señal/ruido.'
                : 'Contraste moderado por aerosol o humedad media en suspensión.'}
            </p>
          </div>

          {/* Hourly Mini-Bars for Transparency */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 mb-1">
              <span>{hourly[0]?.timeStr || '18:00'}</span>
              <span className="text-purple-300 font-medium">Índice de claridad</span>
              <span>{hourly[hourly.length - 1]?.timeStr || '08:00'}</span>
            </div>
            <div className="flex items-end gap-1 h-8 bg-slate-950/60 p-1 rounded-lg border border-slate-800/60">
              {hourly.map((h, idx) => {
                const heightPct = Math.max(15, h.transparencyScore);
                const barColor =
                  h.transparencyScore >= 75
                    ? 'bg-purple-400'
                    : h.transparencyScore >= 50
                    ? 'bg-blue-400'
                    : 'bg-amber-400';
                const isHovered = hoveredHourIdx === idx;

                return (
                  <div
                    key={h.timestamp}
                    onMouseEnter={() => setHoveredHourIdx(idx)}
                    onClick={() => setHoveredHourIdx(idx)}
                    title={`${h.timeStr} h: Transparencia ${h.transparencyScore}%`}
                    className="flex-1 h-full flex items-end cursor-pointer group/bar relative"
                  >
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t transition-all ${barColor} ${
                        isHovered ? 'ring-1 ring-white brightness-125 scale-y-105' : 'opacity-80 hover:opacity-100'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4. VISIBILIDAD (por horas) */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between group hover:border-slate-700 transition">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
                  <Eye className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
                    Visibilidad
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">Por horas</span>
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-sky-500/15 text-sky-300 border-sky-500/30">
                {currentVisKm >= 25 ? 'Óptima' : currentVisKm >= 15 ? 'Buena' : 'Bruma'}
              </span>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-white tracking-tight">{currentVisKm}</span>
                <span className="text-xs text-slate-400">km</span>
              </div>
              {activeHour && (
                <span className="text-[10px] font-mono font-bold text-sky-300 bg-slate-800/90 px-1.5 py-0.5 rounded">
                  {activeHour.timeStr}h
                </span>
              )}
            </div>

            <div className="mt-2 text-[10px] text-slate-300 bg-slate-950/40 p-1.5 rounded-xl border border-slate-800/60 flex items-center justify-between">
              <span>Seeing / Turbulencia:</span>
              <span className="font-mono font-bold text-cyan-300">
                {activeHour ? activeHour.seeingArcsec.toFixed(1) : seeing.arcsecAvg.toFixed(1)}&quot;
              </span>
            </div>
          </div>

          {/* Hourly Mini-Bars for Visibility */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 mb-1">
              <span>{hourly[0]?.timeStr || '18:00'}</span>
              <span className="text-sky-400 font-medium">Alcance óptico</span>
              <span>{hourly[hourly.length - 1]?.timeStr || '08:00'}</span>
            </div>
            <div className="flex items-end gap-1 h-8 bg-slate-950/60 p-1 rounded-lg border border-slate-800/60">
              {hourly.map((h, idx) => {
                const maxVis = Math.max(30, ...hourly.map((it) => it.visibilityKm));
                const heightPct = Math.max(15, Math.min(100, Math.round((h.visibilityKm / maxVis) * 100)));
                const barColor = h.visibilityKm >= 20 ? 'bg-sky-400' : h.visibilityKm >= 10 ? 'bg-blue-400' : 'bg-amber-400';
                const isHovered = hoveredHourIdx === idx;

                return (
                  <div
                    key={h.timestamp}
                    onMouseEnter={() => setHoveredHourIdx(idx)}
                    onClick={() => setHoveredHourIdx(idx)}
                    title={`${h.timeStr} h: Visibilidad ${h.visibilityKm} km`}
                    className="flex-1 h-full flex items-end cursor-pointer group/bar relative"
                  >
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t transition-all ${barColor} ${
                        isHovered ? 'ring-1 ring-white brightness-125 scale-y-105' : 'opacity-80 hover:opacity-100'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 5. PUNTO DE ROCÍO & CONDENSACIÓN (por horas) */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between group hover:border-slate-700 transition">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  <Droplets className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
                    Punto de Rocío
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">Por horas</span>
                </div>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${dewBadge.badge}`}>
                {dewBadge.icon}
                <span>{dewBadge.title}</span>
              </span>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white tracking-tight">
                    {currentDewPoint > 0 ? `+${currentDewPoint}` : currentDewPoint}°
                  </span>
                  <span className="text-xs text-slate-400">C</span>
                </div>
                <span className="text-[10px] text-slate-400 block">
                  Temp: {activeHour ? activeHour.temp : dew.minTemp}°C
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-slate-400 uppercase font-bold block">Margen ($\Delta$T)</span>
                <span
                  className={`text-sm font-mono font-bold ${
                    currentSpread <= 2.0
                      ? 'text-rose-400'
                      : currentSpread <= 3.5
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {currentSpread}°C
                </span>
              </div>
            </div>

            <div className="mt-2 text-[10px] text-slate-300 bg-slate-950/40 p-1.5 rounded-xl border border-slate-800/60 flex items-center justify-between">
              <span>Cintas calentadoras:</span>
              <span className={`font-bold ${currentSpread <= 3.0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {currentSpread <= 3.0 ? 'Imprescindibles' : 'Seguro'}
              </span>
            </div>
          </div>

          {/* Hourly Mini-Bars for Spread (Delta T Margin) */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 mb-1">
              <span>{hourly[0]?.timeStr || '18:00'}</span>
              <span className="text-emerald-400 font-medium">Margen $\Delta$T</span>
              <span>{hourly[hourly.length - 1]?.timeStr || '08:00'}</span>
            </div>
            <div className="flex items-end gap-1 h-8 bg-slate-950/60 p-1 rounded-lg border border-slate-800/60">
              {hourly.map((h, idx) => {
                // Larger spread = safer = taller bar
                const heightPct = Math.max(15, Math.min(100, Math.round((h.spread / 8) * 100)));
                const barColor =
                  h.spread <= 1.8 ? 'bg-rose-500' : h.spread <= 3.5 ? 'bg-amber-400' : 'bg-emerald-400';
                const isHovered = hoveredHourIdx === idx;

                return (
                  <div
                    key={h.timestamp}
                    onMouseEnter={() => setHoveredHourIdx(idx)}
                    onClick={() => setHoveredHourIdx(idx)}
                    title={`${h.timeStr} h: Temp ${h.temp}°C, Rocío ${h.dewPoint}°C (Margen ${h.spread}°C)`}
                    className="flex-1 h-full flex items-end cursor-pointer group/bar relative"
                  >
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t transition-all ${barColor} ${
                        isHovered ? 'ring-1 ring-white brightness-125 scale-y-105' : 'opacity-80 hover:opacity-100'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
