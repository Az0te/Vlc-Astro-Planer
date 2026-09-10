import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { AstroNight, HourlyForecastItem } from '../types';
import {
  Activity,
  Cloud,
  Sparkles,
  Eye,
  Clock,
  Sun,
  ChevronLeft,
  ChevronRight,
  MoveHorizontal,
  Info,
  Wind,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

interface HourlyMetricsChartProps {
  night: AstroNight;
  nights?: AstroNight[];
  onSelectNight?: (id: string) => void;
}

type MetricView = 'all' | 'score' | 'wind' | 'clouds' | 'transparency' | 'visibility' | 'sunlight';
type TimelineSpan = '7days' | '48h' | '1night';

export interface ChartPoint {
  id: string;
  dayId: string;
  dayLabel: string;
  time: string;
  hour: number;
  nightScore: number;
  clouds: number;
  transparency: number;
  visibilityKm: number;
  visibilityPct: number;
  windSpeedKmh: number;
  windGustKmh: number;
  isAstroDark: boolean;
  sunAlt: number;
  sunlightPct: number;
  twilightLabel: string;
  recommendation: string;
  temp: number;
  dewPoint: number;
  spread: number;
  isSunsetOrDusk?: boolean;
  isSunriseOrDawn?: boolean;
  rawItem?: HourlyForecastItem;
}

/**
 * Calculates sunlight attenuation percentage (0% = complete darkness <= -18°, 100% = daylight >= 0°)
 * and descriptive twilight status.
 */
function computeSunlightDetails(sunAlt: number): { sunlightPct: number; twilightLabel: string } {
  if (sunAlt <= -18) {
    return {
      sunlightPct: 0,
      twilightLabel: 'Oscuridad total (< -18°)',
    };
  }
  if (sunAlt >= 0) {
    return {
      sunlightPct: 100,
      twilightLabel: 'Día / Sol sobre el horizonte',
    };
  }
  const norm = (sunAlt + 18) / 18;
  const sunlightPct = Math.min(100, Math.max(1, Math.round(Math.pow(norm, 1.35) * 100)));

  if (sunAlt <= -12) {
    return {
      sunlightPct,
      twilightLabel: 'Crepúsculo Astronómico (-18° a -12°)',
    };
  } else if (sunAlt <= -6) {
    return {
      sunlightPct,
      twilightLabel: 'Crepúsculo Náutico (-12° a -6°)',
    };
  } else {
    return {
      sunlightPct,
      twilightLabel: 'Crepúsculo Civil (-6° a 0°)',
    };
  }
}

/**
 * Color logic requested by user:
 * - Red if score < 50: the redder the worse score
 * - Orange if score between 50 and 60
 * - Green if score > 60: the greener the better score
 */
export function getScoreSegmentStyle(score: number): {
  bgClass: string;
  hex: string;
  textClass: string;
  borderClass: string;
  label: string;
} {
  if (score < 50) {
    if (score < 25) {
      return {
        bgClass: 'bg-red-950',
        hex: '#7f1d1d',
        textClass: 'text-red-200',
        borderClass: 'border-red-800',
        label: 'Inviable',
      };
    } else if (score < 38) {
      return {
        bgClass: 'bg-red-700',
        hex: '#b91c1c',
        textClass: 'text-white',
        borderClass: 'border-red-600',
        label: 'Muy bajo',
      };
    } else {
      return {
        bgClass: 'bg-rose-600',
        hex: '#e11d48',
        textClass: 'text-white',
        borderClass: 'border-rose-500',
        label: 'Bajo',
      };
    }
  } else if (score <= 60) {
    if (score <= 55) {
      return {
        bgClass: 'bg-orange-600',
        hex: '#ea580c',
        textClass: 'text-white',
        borderClass: 'border-orange-500',
        label: 'Regular',
      };
    } else {
      return {
        bgClass: 'bg-amber-500',
        hex: '#f59e0b',
        textClass: 'text-slate-950',
        borderClass: 'border-amber-400',
        label: 'Aceptable',
      };
    }
  } else {
    if (score < 72) {
      return {
        bgClass: 'bg-emerald-700',
        hex: '#047857',
        textClass: 'text-emerald-100',
        borderClass: 'border-emerald-600',
        label: 'Bueno',
      };
    } else if (score < 85) {
      return {
        bgClass: 'bg-emerald-500',
        hex: '#10b981',
        textClass: 'text-slate-950',
        borderClass: 'border-emerald-400',
        label: 'Muy bueno',
      };
    } else {
      return {
        bgClass: 'bg-green-400',
        hex: '#4ade80',
        textClass: 'text-slate-950',
        borderClass: 'border-green-300',
        label: 'Excelente',
      };
    }
  }
}

/**
 * Diagnoses impact of wind on telescope mounts and guiding (RMS error)
 */
export function getMountWindStatus(speed: number, gust: number): {
  status: string;
  badgeClass: string;
  tip: string;
} {
  if (speed <= 10 && gust <= 15) {
    return {
      status: 'Montura Estable (RMS <0.6")',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      tip: 'Sin vibraciones mecánicas. Guiado óptimo para cielo profundo y focales largas.',
    };
  }
  if (speed <= 18 && gust <= 24) {
    return {
      status: 'Brisa Leve (Guiado OK)',
      badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      tip: 'Apto para refractores o tubos cerrados. Usar parasol rígido bien asegurado.',
    };
  }
  if (speed <= 26 || gust <= 34) {
    return {
      status: 'Vibración en Montura (RMS >1.3")',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      tip: 'Riesgo de estrellas estiradas en exposiciones largas. Apantallar trípode o acortar tomas.',
    };
  }
  return {
    status: 'Peligro Montura / Inviable',
    badgeClass: 'bg-rose-500/25 text-rose-300 border-rose-500/50',
    tip: 'Rachas violentas arrastran la montura y pierden la estrella guía. No arriesgar el equipo.',
  };
}

export const HourlyMetricsChart: React.FC<HourlyMetricsChartProps> = ({
  night,
  nights = [],
  onSelectNight,
}) => {
  const [activeView, setActiveView] = useState<MetricView>('all');
  // Default to 7days (or 48h) so scrolling to the right naturally reveals all future days of forecast!
  const [timelineSpan, setTimelineSpan] = useState<TimelineSpan>('7days');
  const [activePoint, setActivePoint] = useState<ChartPoint | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Helper to scroll chart horizontally with buttons
  const scrollChart = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'right' ? 520 : -520;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Enable mouse wheel horizontal scrolling directly on the chart
  const handleWheel = (e: React.WheelEvent) => {
    if (scrollContainerRef.current) {
      // If user is scrolling vertically with wheel, convert to horizontal scroll smoothly
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        scrollContainerRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  // Find index of current night in nights array
  const currentNightIndex = useMemo(() => {
    if (!nights || nights.length === 0) return 0;
    const idx = nights.findIndex((n) => n.id === night.id);
    return idx !== -1 ? idx : 0;
  }, [nights, night.id]);

  // Transform night data into chart points based on timelineSpan
  const chartData: ChartPoint[] = useMemo(() => {
    let sourceNights: AstroNight[] = [night];

    if (nights && nights.length > 0) {
      if (timelineSpan === '48h') {
        sourceNights = nights.slice(currentNightIndex, currentNightIndex + 2);
        if (sourceNights.length === 0) sourceNights = [night];
      } else if (timelineSpan === '7days') {
        // Full continuous forecast
        sourceNights = nights;
      }
    }

    const points: ChartPoint[] = [];

    sourceNights.forEach((n) => {
      if (!n.hourly) return;
      const maxVis = Math.max(30, ...n.hourly.map((h) => h.visibilityKm));

      n.hourly.forEach((item, itemIdx) => {
        const sun = computeSunlightDetails(item.sunAltitudeDeg);

        const isSunsetOrDusk =
          itemIdx > 0 &&
          n.hourly[itemIdx - 1].sunAltitudeDeg > -6 &&
          item.sunAltitudeDeg <= -6;
        const isSunriseOrDawn =
          itemIdx > 0 &&
          n.hourly[itemIdx - 1].sunAltitudeDeg <= -18 &&
          item.sunAltitudeDeg > -18;

        points.push({
          id: `${n.id}-${item.hour}-${itemIdx}`,
          dayId: n.id,
          dayLabel: n.dayName || n.dateStr,
          time: item.timeStr,
          hour: item.hour,
          nightScore: item.score,
          clouds: item.cloudsTotal,
          transparency: item.transparencyScore,
          visibilityKm: item.visibilityKm,
          visibilityPct: Math.min(100, Math.round((item.visibilityKm / maxVis) * 100)),
          windSpeedKmh: item.windSpeedKmh || n.wind.avgKmh,
          windGustKmh: item.windGustKmh || Math.round((item.windSpeedKmh || n.wind.avgKmh) * 1.3),
          isAstroDark: item.isAstronomicalNight,
          sunAlt: item.sunAltitudeDeg,
          sunlightPct: sun.sunlightPct,
          twilightLabel: sun.twilightLabel,
          recommendation: item.recommendation,
          temp: item.temp,
          dewPoint: item.dewPoint,
          spread: item.spread,
          isSunsetOrDusk,
          isSunriseOrDawn,
          rawItem: item,
        });
      });
    });

    return points;
  }, [night, nights, timelineSpan, currentNightIndex]);

  // Derived statistics to highlight quickly
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return {
        bestHour: null,
        minCloudHour: null,
        maxTransHour: null,
        maxVisKm: 0,
        maxWindHour: null,
        avgWind: 0,
      };
    }

    const sortedByScore = [...chartData].sort((a, b) => b.nightScore - a.nightScore);
    const bestHour = sortedByScore[0];

    const sortedByClouds = [...chartData].sort((a, b) => a.clouds - b.clouds);
    const minCloudHour = sortedByClouds[0];

    const sortedByTrans = [...chartData].sort((a, b) => b.transparency - a.transparency);
    const maxTransHour = sortedByTrans[0];

    const sortedByWind = [...chartData].sort((a, b) => b.windSpeedKmh - a.windSpeedKmh);
    const maxWindHour = sortedByWind[0];

    const maxVisKm = Math.max(...chartData.map((d) => d.visibilityKm));
    const avgWind = Math.round(
      chartData.reduce((acc, it) => acc + it.windSpeedKmh, 0) / chartData.length
    );

    return {
      bestHour,
      minCloudHour,
      maxTransHour,
      maxVisKm,
      maxWindHour,
      avgWind,
    };
  }, [chartData]);

  // Point to display in the live top inspector (under cursor hover, or peak hour of the night/span when idle)
  const displayedPoint: ChartPoint | null =
    activePoint || stats.bestHour || (chartData.length > 0 ? chartData[0] : null);
  const isInspecting = Boolean(activePoint);

  // Find index bounds of astronomical darkness for chart highlight
  const astroDarkBounds = useMemo(() => {
    const darkIndices = chartData
      .map((item, idx) => (item.isAstroDark ? idx : -1))
      .filter((idx) => idx !== -1);
    if (darkIndices.length === 0) return null;
    return {
      start: chartData[darkIndices[0]].time,
      end: chartData[darkIndices[darkIndices.length - 1]].time,
    };
  }, [chartData]);

  // Ensure width is ALWAYS generously larger than container so horizontal scrolling to the right works on any device!
  // For 15 hours: ~1400px min-width. For 30 hours: ~2400px. For 7 days: ~5500px.
  const chartPixelWidth = useMemo(() => {
    const count = chartData.length;
    return Math.max(1400, count * 68);
  }, [chartData.length]);

  return (
    <div className="rounded-3xl border border-slate-800 bg-[#0b101e] p-4 sm:p-6 shadow-xl space-y-4">
      {/* Header with Title, Timeline Span Selector & Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2 flex-wrap">
                <span>Evolución Horaria & Pronóstico Continuo</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  Desplaza a la derecha ▶
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Pasa el ratón por la gráfica para ver datos al instante. Desplaza hacia la derecha para ver los siguientes días.
              </p>
            </div>
          </div>
        </div>

        {/* Multi-Night Span Controls & Day navigation */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Timeline Horizon selector */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-2xl border border-slate-800 text-xs">
            <button
              onClick={() => setTimelineSpan('7days')}
              className={`px-2.5 py-1 rounded-xl font-semibold transition ${
                timelineSpan === '7days'
                  ? 'bg-cyan-500 text-slate-950 shadow font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              7 Días Continuos
            </button>
            <button
              onClick={() => setTimelineSpan('48h')}
              className={`px-2.5 py-1 rounded-xl font-semibold transition ${
                timelineSpan === '48h'
                  ? 'bg-cyan-500 text-slate-950 shadow font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              48 Horas (2 Noches)
            </button>
            <button
              onClick={() => setTimelineSpan('1night')}
              className={`px-2.5 py-1 rounded-xl font-semibold transition ${
                timelineSpan === '1night'
                  ? 'bg-cyan-500 text-slate-950 shadow font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Solo Esta Noche
            </button>
          </div>

          {/* Quick Day Navigator */}
          {nights.length > 1 && onSelectNight && (
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-2xl border border-slate-800">
              <button
                disabled={currentNightIndex <= 0}
                onClick={() => {
                  if (currentNightIndex > 0) {
                    onSelectNight(nights[currentNightIndex - 1].id);
                  }
                }}
                className="p-1 rounded-xl text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-800 transition"
                title="Noche anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[11px] font-mono text-cyan-300 font-bold px-1.5 truncate max-w-[90px]">
                {night.dayName}
              </span>
              <button
                disabled={currentNightIndex >= nights.length - 1}
                onClick={() => {
                  if (currentNightIndex < nights.length - 1) {
                    onSelectNight(nights[currentNightIndex + 1].id);
                  }
                }}
                className="p-1 rounded-xl text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-800 transition"
                title="Siguiente noche"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* View Switcher Toggles (Variables to show) & Horizontal Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveView('all')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition ${
              activeView === 'all'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ver Todas
          </button>
          <button
            onClick={() => setActiveView('score')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              activeView === 'score'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'text-slate-400 hover:text-cyan-400'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            Night Score
          </button>
          {/* Added Wind View */}
          <button
            onClick={() => setActiveView('wind')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              activeView === 'wind'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold'
                : 'text-slate-400 hover:text-teal-400'
            }`}
          >
            <Wind className="h-3 w-3 text-teal-400" />
            Viento & Montura
          </button>
          <button
            onClick={() => setActiveView('clouds')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              activeView === 'clouds'
                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 font-bold'
                : 'text-slate-400 hover:text-orange-400'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-orange-400" />
            Nubosidad
          </button>
          <button
            onClick={() => setActiveView('transparency')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              activeView === 'transparency'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                : 'text-slate-400 hover:text-purple-400'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-purple-400" />
            Transparencia
          </button>
          <button
            onClick={() => setActiveView('visibility')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              activeView === 'visibility'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold'
                : 'text-slate-400 hover:text-sky-400'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-sky-400" />
            Visibilidad
          </button>
          <button
            onClick={() => setActiveView('sunlight')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              activeView === 'sunlight'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'text-slate-400 hover:text-amber-400'
            }`}
          >
            <Sun className="h-3 w-3 text-amber-400" />
            Luz Solar
          </button>
        </div>

        {/* Clear, prominent buttons to move horizontally across hours and days */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollChart('left')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition active:scale-95 shadow-sm"
            title="Desplazar hacia horas anteriores"
          >
            <ChevronLeft className="h-4 w-4 text-cyan-400" />
            <span>Anterior</span>
          </button>
          <button
            type="button"
            onClick={() => scrollChart('right')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-500/50 text-xs font-bold text-cyan-300 hover:text-white hover:bg-cyan-900 transition active:scale-95 shadow-md"
            title="Desplazar a la derecha para ver más horas y los siguientes días"
          >
            <span>Ver más días / horas</span>
            <ChevronRight className="h-4 w-4 text-cyan-300" />
          </button>
        </div>
      </div>

      {/* DYNAMIC LIVE VALUES PANEL ABOVE THE CHART (Updates with mouse movement across the chart) */}
      {displayedPoint && (
        <div className="rounded-2xl border border-cyan-500/30 bg-[#090e1d]/90 p-3 sm:p-4 space-y-2.5 shadow-xl backdrop-blur-md">
          {/* Header of the Inspector: Time, Day, Cursor Inspection Status, Score, Guiding Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-white text-xs sm:text-sm bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-700 flex items-center gap-1.5 shadow-inner">
                <Clock className="h-3.5 w-3.5 text-cyan-400" />
                <span>{displayedPoint.time} h</span>
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-200">
                {displayedPoint.dayLabel}
              </span>

              {/* Cursor indicator */}
              {isInspecting ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  <span>Lectura en cursor</span>
                </span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/80" />
                  <span>Pico de la noche (mueve el ratón por la gráfica para explorar)</span>
                </span>
              )}

              {/* Twilight Stage */}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700">
                {displayedPoint.twilightLabel}
              </span>
            </div>

            {/* Score & Mount Status */}
            <div className="flex items-center gap-2 flex-wrap">
              {(() => {
                const sc = getScoreSegmentStyle(displayedPoint.nightScore);
                return (
                  <div
                    className={`flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-1 rounded-xl border shadow-sm ${sc.bgClass} ${sc.borderClass} ${sc.textClass}`}
                  >
                    <span>Score: {displayedPoint.nightScore}/100</span>
                    <span className="text-[10px] opacity-80 uppercase tracking-wide">({sc.label})</span>
                  </div>
                );
              })()}

              {(() => {
                const mount = getMountWindStatus(displayedPoint.windSpeedKmh, displayedPoint.windGustKmh);
                return (
                  <div
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${mount.badgeClass}`}
                    title={mount.tip}
                  >
                    <Wind className="h-3 w-3" />
                    <span>{mount.status}</span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Metric Values Grid (Live-updated as cursor moves) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {/* 1. Viento & Rachas */}
            <div className="p-2 sm:p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/90 text-center sm:text-left">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Wind className="h-3 w-3 text-teal-400" />
                  Viento
                </span>
                <span className="text-[10px] font-mono text-amber-400">
                  Racha {displayedPoint.windGustKmh}k
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-center sm:justify-start gap-1">
                <span className="text-lg sm:text-xl font-mono font-extrabold text-teal-300">
                  {displayedPoint.windSpeedKmh}
                </span>
                <span className="text-[10px] text-slate-400">km/h</span>
              </div>
              <span className="text-[9px] text-slate-500 block truncate">
                {displayedPoint.windSpeedKmh <= 15 ? 'Guiado óptimo' : displayedPoint.windSpeedKmh <= 20 ? 'Tolerable' : 'Riesgo guiado'}
              </span>
            </div>

            {/* 2. Nubosidad */}
            <div className="p-2 sm:p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/90 text-center sm:text-left">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Cloud className="h-3 w-3 text-orange-400" />
                  Nubes
                </span>
                <span className="text-[10px] text-slate-400">
                  {displayedPoint.clouds <= 20 ? 'Despejado' : displayedPoint.clouds <= 50 ? 'Parcial' : 'Cubierto'}
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-center sm:justify-start gap-1">
                <span
                  className={`text-lg sm:text-xl font-mono font-extrabold ${
                    displayedPoint.clouds <= 20
                      ? 'text-emerald-400'
                      : displayedPoint.clouds <= 50
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {displayedPoint.clouds}%
                </span>
                <span className="text-[10px] text-slate-400">cubierto</span>
              </div>
              <span className="text-[9px] text-slate-500 block truncate">
                {displayedPoint.clouds === 0 ? 'Cielo limpio' : 'Cobertura'}
              </span>
            </div>

            {/* 3. Transparencia */}
            <div className="p-2 sm:p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/90 text-center sm:text-left">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-purple-400" />
                  Transparencia
                </span>
                <span className="text-[10px] text-purple-400 font-mono">
                  {displayedPoint.transparency >= 80 ? 'Alta' : 'Media'}
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-center sm:justify-start gap-1">
                <span className="text-lg sm:text-xl font-mono font-extrabold text-purple-300">
                  {displayedPoint.transparency}%
                </span>
                <span className="text-[10px] text-slate-400">claridad</span>
              </div>
              <span className="text-[9px] text-slate-500 block truncate">
                Dispersión lumínica
              </span>
            </div>

            {/* 4. Visibilidad */}
            <div className="p-2 sm:p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/90 text-center sm:text-left">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3 text-sky-400" />
                  Visibilidad
                </span>
                <span className="text-[10px] text-sky-400 font-mono">Radio</span>
              </div>
              <div className="mt-1 flex items-baseline justify-center sm:justify-start gap-1">
                <span className="text-lg sm:text-xl font-mono font-extrabold text-sky-300">
                  {displayedPoint.visibilityKm}
                </span>
                <span className="text-[10px] text-slate-400">km</span>
              </div>
              <span className="text-[9px] text-slate-500 block truncate">
                Alcance horizontal
              </span>
            </div>

            {/* 5. Temp / Margen Rocío */}
            <div className="p-2 sm:p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/90 text-center sm:text-left">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Temp / Rocío</span>
                <span
                  className={`text-[10px] font-mono font-bold ${
                    displayedPoint.spread <= 2 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  ΔT {displayedPoint.spread}°C
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-center sm:justify-start gap-1.5">
                <span className="text-lg sm:text-xl font-mono font-extrabold text-white">
                  {displayedPoint.temp}°C
                </span>
                <span className="text-[10px] text-slate-400">
                  (Rocío {displayedPoint.dewPoint}°C)
                </span>
              </div>
              <span
                className={`text-[9px] block truncate font-mono ${
                  displayedPoint.spread <= 2 ? 'text-rose-400 font-bold' : 'text-slate-500'
                }`}
              >
                {displayedPoint.spread <= 2 ? '⚠️ Alerta condensación' : 'Margen seguro'}
              </span>
            </div>

            {/* 6. Luz Solar */}
            <div className="p-2 sm:p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/90 text-center sm:text-left">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Sun className="h-3 w-3 text-amber-400" />
                  Luz Solar
                </span>
                <span className="text-[10px] font-mono text-amber-400">
                  Sol {displayedPoint.sunAlt}°
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-center sm:justify-start gap-1">
                <span
                  className={`text-lg sm:text-xl font-mono font-extrabold ${
                    displayedPoint.sunlightPct === 0 ? 'text-cyan-300' : 'text-amber-400'
                  }`}
                >
                  {displayedPoint.sunlightPct}%
                </span>
                <span className="text-[10px] text-slate-400">luz</span>
              </div>
              <span className="text-[9px] text-slate-500 block truncate">
                {displayedPoint.isAstroDark ? 'Oscuridad astronómica' : 'Crepúsculo'}
              </span>
            </div>
          </div>

          {/* Multi-Model Breakdown if available */}
          {displayedPoint.rawItem?.providerValues && displayedPoint.rawItem.providerValues.length > 1 && (
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap text-xs">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                <span>Comparativa Multi-Modelo ({displayedPoint.time} h):</span>
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {displayedPoint.rawItem.providerValues.map((pv) => (
                  <span
                    key={pv.providerId}
                    className="rounded-lg bg-slate-900/95 px-2.5 py-1 border border-slate-800 font-mono text-[11px] text-slate-300"
                  >
                    <strong className="text-cyan-300">{pv.providerName.split(' ')[0]}</strong>: Score{' '}
                    <span className={pv.score >= 60 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {pv.score}
                    </span>{' '}
                    · {pv.clouds}% nub · {pv.windKmh} km/h
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CHART STAGE (Completely unobstructed, full visibility of all curves) */}
      <div
        className="relative rounded-2xl border border-slate-800/80 bg-slate-950/70 overflow-hidden"
        onMouseLeave={() => setActivePoint(null)}
      >
        {/* HORIZONTALLY SCROLLABLE CHART CANVAS */}
        <div
          ref={scrollContainerRef}
          onWheel={handleWheel}
          className="w-full overflow-x-auto overscroll-x-contain touch-pan-x pb-2 pt-2 scrollbar-thin scrollbar-thumb-cyan-500/60 scrollbar-track-slate-900/80 select-none"
        >
          {/* Day Headers along the top of the timeline so you know which day you are looking at */}
          <div style={{ width: `${chartPixelWidth}px` }} className="flex border-b border-slate-800/80 pb-1 px-3 mb-1">
            {nights.slice(0, timelineSpan === '1night' ? 1 : timelineSpan === '48h' ? 2 : 7).map((n) => (
              <div key={n.id} className="flex-1 min-w-[280px] text-left px-2 flex items-center gap-1.5">
                <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wide">
                  {n.dayName} ({n.dateStr})
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  • Score {n.astroScore}
                </span>
              </div>
            ))}
          </div>

          <div style={{ width: `${chartPixelWidth}px` }} className="h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 20, right: 30, left: -5, bottom: 5 }}
                onMouseMove={(e: any) => {
                  if (e?.activePayload?.[0]?.payload) {
                    setActivePoint(e.activePayload[0].payload);
                  } else if (e?.activeLabel) {
                    const found = chartData.find((p) => p.time === e.activeLabel);
                    if (found) setActivePoint(found);
                  }
                }}
                onMouseLeave={() => setActivePoint(null)}
              >
                <defs>
                  {/* Sunlight gradient */}
                  <linearGradient id="sunlightGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="50%" stopColor="#d97706" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#b45309" stopOpacity={0.0} />
                  </linearGradient>

                  {/* Night Score Gradient */}
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>

                  {/* Clouds Gradient */}
                  <linearGradient id="cloudsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                  </linearGradient>

                  {/* Wind Gradient */}
                  <linearGradient id="windGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />

                {/* Reference line for Telescope Mount Guiding Threshold (20 km/h) */}
                {(activeView === 'all' || activeView === 'wind') && (
                  <ReferenceLine
                    y={20}
                    yAxisId="left"
                    stroke="#f43f5e"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: 'Límite guiado seguro (20 km/h)',
                      fill: '#fb7185',
                      fontSize: 10,
                      position: 'insideTopRight',
                    }}
                  />
                )}

                {/* Active selected point vertical marker */}
                {activePoint && (
                  <ReferenceLine
                    x={activePoint.time}
                    yAxisId="left"
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    strokeDasharray="2 2"
                    strokeOpacity={0.8}
                  />
                )}

                {/* X-Axis for Hours */}
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                  tickLine={{ stroke: '#334155' }}
                  axisLine={{ stroke: '#334155' }}
                />

                {/* Left Y-Axis (0 - 100 Scale for Score, Clouds, Trans, Wind) */}
                <YAxis
                  yAxisId="left"
                  domain={[0, 100]}
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                  tickLine={{ stroke: '#334155' }}
                  axisLine={{ stroke: '#334155' }}
                  unit="%"
                />

                {/* Hidden cursor tooltip to avoid duplicate popups */}
                <Tooltip
                  content={() => null}
                  cursor={{ stroke: '#06b6d4', strokeWidth: 1.5, strokeDasharray: '3 3' }}
                />

                {/* INVISIBLE TOUCH/HOVER HIT-TEST BARS:
                    Captures hover instantly on any vertical position! */}
                <Bar
                  yAxisId="left"
                  dataKey={() => 100}
                  fill="#ffffff"
                  fillOpacity={0.0001}
                  onMouseEnter={(data: any) => {
                    if (data?.payload) {
                      setActivePoint(data.payload);
                    }
                  }}
                  onClick={(data: any) => {
                    if (data?.payload) {
                      setActivePoint(data.payload);
                    }
                  }}
                />

                {/* 0. LUZ SOLAR DE FONDO (Daylight Attenuation Area) */}
                {(activeView === 'all' || activeView === 'sunlight') && (
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="sunlightPct"
                    name="Luz Solar"
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    strokeOpacity={0.8}
                    fillOpacity={1}
                    fill="url(#sunlightGradient)"
                    activeDot={{ r: 5, fill: '#f59e0b', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                )}

                {/* 1. NIGHT SCORE */}
                {(activeView === 'all' || activeView === 'score') && (
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="nightScore"
                    name="Night Score"
                    stroke="#06b6d4"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#scoreGradient)"
                    activeDot={{ r: 6, fill: '#06b6d4', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                )}

                {/* 2. VIENTO & RACHAS (Speed km/h and Gusts) */}
                {(activeView === 'all' || activeView === 'wind') && (
                  <>
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="windSpeedKmh"
                      name="Viento (km/h)"
                      stroke="#14b8a6"
                      strokeWidth={2}
                      fillOpacity={activeView === 'wind' ? 0.3 : 0.05}
                      fill="url(#windGradient)"
                      activeDot={{ r: 5, fill: '#14b8a6', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="windGustKmh"
                      name="Rachas de viento (km/h)"
                      stroke="#f59e0b"
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                      dot={false}
                      activeDot={{ r: 4, fill: '#f59e0b', stroke: '#ffffff', strokeWidth: 1.5 }}
                    />
                  </>
                )}

                {/* 3. NUBOSIDAD (Cloud Cover) */}
                {(activeView === 'all' || activeView === 'clouds') && (
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="clouds"
                    name="Nubosidad (%)"
                    stroke="#f97316"
                    strokeWidth={2}
                    strokeDasharray={activeView === 'all' ? '4 3' : undefined}
                    fillOpacity={1}
                    fill="url(#cloudsGradient)"
                    activeDot={{ r: 5, fill: '#f97316', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                )}

                {/* 4. TRANSPARENCIA */}
                {(activeView === 'all' || activeView === 'transparency') && (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="transparency"
                    name="Transparencia (%)"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5, fill: '#a855f7', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                )}

                {/* 5. VISIBILIDAD */}
                {(activeView === 'all' || activeView === 'visibility') && (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="visibilityPct"
                    name="Visibilidad (%)"
                    stroke="#38bdf8"
                    strokeWidth={1.5}
                    strokeDasharray="2 2"
                    dot={false}
                    activeDot={{ r: 4, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 1.5 }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* PEQUEÑA BARRA DE SCORE DE CADA HORA
              Color: Rojo < 50, Naranja 50-60, Verde > 60 */}
          <div style={{ width: `${chartPixelWidth}px` }} className="pt-2 px-1">
            <div className="flex items-center gap-1 w-full">
              {chartData.map((item) => {
                const style = getScoreSegmentStyle(item.nightScore);
                const isSelected = activePoint?.id === item.id;

                return (
                  <div
                    key={item.id}
                    onMouseEnter={() => setActivePoint(item)}
                    onClick={() => setActivePoint(item)}
                    title={`${item.time} h (${item.dayLabel}): Score ${item.nightScore}/100 • Viento ${item.windSpeedKmh}km/h - ${style.label}`}
                    className={`flex-1 min-w-[34px] py-1 px-0.5 rounded-lg border text-center transition-all flex flex-col items-center justify-between cursor-pointer ${
                      style.bgClass
                    } ${style.borderClass} ${style.textClass} ${
                      isSelected
                        ? 'ring-2 ring-cyan-300 ring-offset-1 ring-offset-slate-950 scale-105 z-20 shadow-lg brightness-110'
                        : 'opacity-90 hover:opacity-100'
                    }`}
                  >
                    <span className="text-[9px] font-mono font-bold leading-none opacity-90">
                      {item.time.split(':')[0]}h
                    </span>
                    <span className="text-[11px] font-mono font-black leading-tight mt-0.5">
                      {item.nightScore}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Legend and Interpretation Guide */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2.5 border-t border-slate-800/80 text-xs">
        {/* Color Code Bar Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <span className="font-bold text-slate-300">Barra de Score:</span>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-red-600 inline-block border border-red-500" />
            <span className="text-slate-300">&lt; 50 (Inviable)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-amber-500 inline-block border border-amber-400" />
            <span className="text-slate-300">50 - 60 (Regular)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-emerald-500 inline-block border border-emerald-400" />
            <span className="text-slate-300">&gt; 60 (Óptimo)</span>
          </div>
        </div>

        {/* Wind Mount Warning Guide */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-teal-400" />
            <span>Viento &lt; 15 km/h: Guiado estable</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 bg-rose-500 border border-rose-400" />
            <span>&gt; 20 km/h: Vibración en montura</span>
          </div>
        </div>
      </div>
    </div>
  );
};
