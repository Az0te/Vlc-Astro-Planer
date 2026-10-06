import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { AstroNight } from '../types';
import {
  CalendarRange,
  Sparkles,
  Sun,
  Droplets,
  Eye,
  Wind,
  Cloud,
  Layers,
  ChevronDown,
  ChevronUp,
  Check,
  CheckCircle2,
} from 'lucide-react';

interface WeeklyStackedChartsProps {
  nights: AstroNight[];
  selectedNightId?: string;
  onSelectNight?: (id: string) => void;
  onClose?: () => void;
}

interface ChartHourPoint {
  timeStr: string;
  hour: number;
  hourPill: string;
  score: number;
  clouds: number;
  transparency: number;
  windSpeed: number;
  windGust: number;
  spread: number;
  spreadSecurity: number;
  sunlightPct: number;
  temp: number;
  dewPoint: number;
  isDark: boolean;
}

function computeSunlightPct(sunAlt: number): number {
  if (sunAlt >= 0) return 100;
  if (sunAlt <= -18) return 0;
  const ratio = (sunAlt + 18) / 18;
  return Math.min(100, Math.max(3, Math.round(Math.pow(ratio, 1.4) * 100)));
}

function getPillStyle(score: number): { bg: string; text: string } {
  if (score >= 70) {
    return { bg: '#059669', text: '#ffffff' }; // Emerald
  } else if (score >= 60) {
    return { bg: '#0d9488', text: '#ffffff' }; // Teal
  } else if (score >= 50) {
    return { bg: '#d97706', text: '#ffffff' }; // Amber
  } else if (score >= 40) {
    return { bg: '#ea580c', text: '#ffffff' }; // Orange
  } else {
    return { bg: '#dc2626', text: '#ffffff' }; // Rose / Red
  }
}

export const WeeklyStackedCharts: React.FC<WeeklyStackedChartsProps> = ({
  nights,
  selectedNightId,
  onSelectNight,
  onClose,
}) => {
  // Layer visibility toggles
  const [visibleLayers, setVisibleLayers] = useState({
    score: true,
    sunlight: true,
    dew: true,
    transparency: true,
    wind: true,
    clouds: true,
  });

  const toggleLayer = (layer: keyof typeof visibleLayers) => {
    setVisibleLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  // Build points for each night
  const daysData = useMemo(() => {
    return nights.map((night, idx) => {
      const nextNight = nights[idx + 1] || null;

      // Extract next day's label for the right corner (as seen in screenshot)
      const nextDayLabel = nextNight
        ? `${nextNight.dayName.toUpperCase()} (${nextNight.dateStr.toUpperCase()}) • Score ${nextNight.astroScore}`
        : `FIN DE PREVISIÓN • Score ${night.astroScore}`;

      const points: ChartHourPoint[] = night.hourly.map((h) => {
        const sunlightPct = computeSunlightPct(h.sunAltitudeDeg);
        // Dew spread security: 0°C spread = 15% security, >=5°C spread = 95% security
        const spreadSecurity = Math.min(
          95,
          Math.max(15, Math.round(20 + Math.min(h.spread, 6) * 12.5))
        );

        return {
          timeStr: h.timeStr,
          hour: h.hour,
          hourPill: `${h.hour}h`,
          score: h.score,
          clouds: h.cloudsTotal,
          transparency: h.transparencyScore,
          windSpeed: h.windSpeedKmh,
          windGust: h.windGustKmh,
          spread: h.spread,
          spreadSecurity,
          sunlightPct,
          temp: h.temp,
          dewPoint: h.dewPoint,
          isDark: h.isAstronomicalNight,
        };
      });

      return {
        night,
        nextDayLabel,
        points,
      };
    });
  }, [nights]);

  return (
    <section className="rounded-3xl border border-slate-800 bg-[#060810] p-4 sm:p-6 shadow-2xl space-y-6 animate-fade-in">
      {/* 1. Header with title & close button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-inner">
            <CalendarRange className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Gráfico Apilado de Toda la Semana (7 Días)
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                {nights.length} Días Completos
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparativa vertical de calidad astronómica día a día desde el atardecer hasta el amanecer
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="self-end sm:self-center flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-xs text-slate-300 transition"
          >
            <span>Ocultar gráfico apilado</span>
            <ChevronUp className="h-4 w-4 text-slate-400" />
          </button>
        )}
      </div>

      {/* 2. Interactive Legend of Symbols (Leyenda de cada símbolo) */}
      <div className="rounded-2xl border border-slate-800/90 bg-slate-950/70 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Leyenda de Símbolos y Curvas Meteorológicas
            </span>
          </div>
          <span className="text-[10px] text-slate-400 hidden md:inline">
            Haz clic en cualquier métrica para activarla u ocultarla en los gráficos
          </span>
        </div>

        {/* Legend pills / toggles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 text-xs">
          {/* Night Score */}
          <button
            type="button"
            onClick={() => toggleLayer('score')}
            className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
              visibleLayers.score
                ? 'border-cyan-500/40 bg-cyan-950/20 text-cyan-200'
                : 'border-slate-800 bg-slate-900/30 text-slate-400 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold flex items-center gap-1.5 text-cyan-300">
                <span className="h-2 w-4 rounded-full bg-cyan-400 inline-block shadow-[0_0_8px_#22d3ee]" />
                Night Score
              </span>
              {visibleLayers.score && <Check className="h-3 w-3 text-cyan-400" />}
            </div>
            <span className="text-[10px] text-slate-400 leading-tight">
              Curva sólida cian: Calidad global de astrofotografía (0-100)
            </span>
          </button>

          {/* Sunlight / Twilight */}
          <button
            type="button"
            onClick={() => toggleLayer('sunlight')}
            className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
              visibleLayers.sunlight
                ? 'border-amber-500/40 bg-amber-950/20 text-amber-200'
                : 'border-slate-800 bg-slate-900/30 text-slate-400 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold flex items-center gap-1.5 text-amber-300">
                <span className="h-2.5 w-4 rounded bg-amber-500/40 border border-amber-400 inline-block" />
                Luz Solar
              </span>
              {visibleLayers.sunlight && <Check className="h-3 w-3 text-amber-400" />}
            </div>
            <span className="text-[10px] text-slate-400 leading-tight">
              Área ámbar: Puesta/salida de sol; valle central = noche oscura
            </span>
          </button>

          {/* Dew Spread */}
          <button
            type="button"
            onClick={() => toggleLayer('dew')}
            className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
              visibleLayers.dew
                ? 'border-purple-500/40 bg-purple-950/20 text-purple-200'
                : 'border-slate-800 bg-slate-900/30 text-slate-400 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold flex items-center gap-1.5 text-purple-300">
                <span className="h-1.5 w-4 rounded bg-purple-400 inline-block shadow-[0_0_6px_#c084fc]" />
                Margen Rocío
              </span>
              {visibleLayers.dew && <Check className="h-3 w-3 text-purple-400" />}
            </div>
            <span className="text-[10px] text-slate-400 leading-tight">
              Línea violeta: Margen térmico frente a condensación en lentes
            </span>
          </button>

          {/* Transparency */}
          <button
            type="button"
            onClick={() => toggleLayer('transparency')}
            className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
              visibleLayers.transparency
                ? 'border-sky-500/40 bg-sky-950/20 text-sky-200'
                : 'border-slate-800 bg-slate-900/30 text-slate-400 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold flex items-center gap-1.5 text-sky-300">
                <span className="h-0.5 w-4 border-b-2 border-dotted border-sky-400 inline-block" />
                Transparencia
              </span>
              {visibleLayers.transparency && <Check className="h-3 w-3 text-sky-400" />}
            </div>
            <span className="text-[10px] text-slate-400 leading-tight">
              Línea punteada azul: Claridad sin bruma, polvo ni aerosoles
            </span>
          </button>

          {/* Wind */}
          <button
            type="button"
            onClick={() => toggleLayer('wind')}
            className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
              visibleLayers.wind
                ? 'border-orange-500/40 bg-orange-950/20 text-orange-200'
                : 'border-slate-800 bg-slate-900/30 text-slate-400 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold flex items-center gap-1.5 text-orange-300">
                <span className="h-0.5 w-4 border-b-2 border-dashed border-orange-400 inline-block" />
                Viento
              </span>
              {visibleLayers.wind && <Check className="h-3 w-3 text-orange-400" />}
            </div>
            <span className="text-[10px] text-slate-400 leading-tight">
              Línea discontinua naranja: Afectación al guiado y montura
            </span>
          </button>

          {/* Clouds */}
          <button
            type="button"
            onClick={() => toggleLayer('clouds')}
            className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
              visibleLayers.clouds
                ? 'border-rose-500/40 bg-rose-950/20 text-rose-200'
                : 'border-slate-800 bg-slate-900/30 text-slate-400 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold flex items-center gap-1.5 text-rose-300">
                <span className="h-0.5 w-4 border-b-2 border-dotted border-rose-400 inline-block" />
                Nubosidad
              </span>
              {visibleLayers.clouds && <Check className="h-3 w-3 text-rose-400" />}
            </div>
            <span className="text-[10px] text-slate-400 leading-tight">
              Línea discontinua roja: Cobertura total de nubes (0-100%)
            </span>
          </button>
        </div>

        {/* Hourly score pill color indicator */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Píldoras Horarias Inferiores:</span>
            <span>Muestran la hora arriba (ej. 22h) y el score abajo (ej. 76).</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-semibold">
            <span className="px-2 py-0.5 rounded bg-[#059669] text-white">Verde (70-100) Óptimo</span>
            <span className="px-2 py-0.5 rounded bg-[#0d9488] text-white">Turquesa (60-69) Bueno</span>
            <span className="px-2 py-0.5 rounded bg-[#d97706] text-white">Ámbar (50-59) Regular</span>
            <span className="px-2 py-0.5 rounded bg-[#ea580c] text-white">Naranja (40-49) Pobre</span>
            <span className="px-2 py-0.5 rounded bg-[#dc2626] text-white">Rojo (&lt;40) Inviable</span>
          </div>
        </div>
      </div>

      {/* 3. Stack of 7 Day Cards (One below the other, exactly as in screenshot) */}
      <div className="space-y-6">
        {daysData.map(({ night, nextDayLabel, points }, dayIndex) => {
          const isSelected = selectedNightId === night.id;

          return (
            <div
              key={night.id || dayIndex}
              onClick={() => onSelectNight && onSelectNight(night.id)}
              className={`rounded-2xl border overflow-hidden transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'border-cyan-500/80 bg-[#060a16] shadow-xl shadow-cyan-950/30 ring-1 ring-cyan-500/30'
                  : 'border-slate-800 bg-[#060810] hover:border-slate-700/90 hover:bg-[#070b15]'
              }`}
            >
              {/* Day Header Bar: matching image layout */}
              <div className="px-4 py-2.5 bg-[#080d1a] border-b border-slate-800/80 flex items-center justify-between text-xs font-mono">
                {/* Left: VIERNES (9 OCT) • Score 56 */}
                <div className="flex items-center gap-2.5">
                  <span className="font-extrabold text-cyan-300 tracking-wider uppercase text-xs sm:text-sm">
                    {night.dayName} ({night.dateStr})
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="font-bold text-white">
                    Score {night.astroScore}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.2 rounded-full font-sans uppercase font-bold border ${night.ratingColor}`}
                  >
                    {night.ratingLabel}
                  </span>
                  {isSelected && (
                    <span className="hidden sm:inline text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      Noche Seleccionada
                    </span>
                  )}
                </div>

                {/* Right: SÁBADO (10 OCT) • Score 59 */}
                <div className="text-slate-400 text-[11px] font-semibold text-right truncate max-w-[200px] sm:max-w-none">
                  {nextDayLabel}
                </div>
              </div>

              {/* Chart Plot Area */}
              <div className="p-3 sm:p-4">
                <div className="h-56 sm:h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={points}
                      margin={{ top: 12, right: 12, left: -20, bottom: 0 }}
                    >
                      <defs>
                        {/* Amber Sunlight Gradient (mountain slopes on sides) */}
                        <linearGradient
                          id={`sunlightGrad-${night.id}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                          <stop offset="70%" stopColor="#b45309" stopOpacity={0.15} />
                          <stop offset="100%" stopColor="#78350f" stopOpacity={0.0} />
                        </linearGradient>

                        {/* Cyan Night Score Gradient */}
                        <linearGradient
                          id={`nightScoreGrad-${night.id}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.35} />
                          <stop offset="80%" stopColor="#0891b2" stopOpacity={0.08} />
                          <stop offset="100%" stopColor="#0e7490" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>

                      <CartesianGrid
                        strokeDasharray="2 4"
                        stroke="#1e293b"
                        vertical={false}
                        opacity={0.4}
                      />

                      <XAxis
                        dataKey="timeStr"
                        stroke="#64748b"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: '#1e293b' }}
                        interval="preserveStartEnd"
                      />

                      <YAxis
                        domain={[0, 100]}
                        stroke="#475569"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        ticks={[0, 25, 50, 75, 100]}
                      />

                      <Tooltip
                        content={<CustomWeeklyTooltip nightName={night.dayName} totalPoints={points.length} />}
                        position={{ x: 0 }}
                        isAnimationActive={false}
                        cursor={{ stroke: '#22d3ee', strokeWidth: 1.5, strokeDasharray: '3 3' }}
                      />

                      {/* 1. Sunlight / Twilight Area (warm amber shaded slopes on left and right) */}
                      {visibleLayers.sunlight && (
                        <Area
                          type="monotone"
                          dataKey="sunlightPct"
                          stroke="#f59e0b"
                          strokeWidth={1.5}
                          strokeDasharray="4 3"
                          fill={`url(#sunlightGrad-${night.id})`}
                          isAnimationActive={false}
                        />
                      )}

                      {/* 2. Night Score Curve & Area (cyan line with soft glow) */}
                      {visibleLayers.score && (
                        <Area
                          type="monotone"
                          dataKey="score"
                          stroke="#22d3ee"
                          strokeWidth={2.5}
                          fill={`url(#nightScoreGrad-${night.id})`}
                          isAnimationActive={false}
                        />
                      )}

                      {/* 3. Transparency Curve (dotted cyan/sky blue) */}
                      {visibleLayers.transparency && (
                        <Line
                          type="monotone"
                          dataKey="transparency"
                          stroke="#38bdf8"
                          strokeWidth={1.8}
                          strokeDasharray="3 3"
                          dot={false}
                          isAnimationActive={false}
                        />
                      )}

                      {/* 4. Dew Spread Security (solid purple/violet line as in image) */}
                      {visibleLayers.dew && (
                        <Line
                          type="monotone"
                          dataKey="spreadSecurity"
                          stroke="#c084fc"
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                      )}

                      {/* 5. Wind Curve (orange dashed) */}
                      {visibleLayers.wind && (
                        <Line
                          type="monotone"
                          dataKey="windSpeed"
                          stroke="#fb923c"
                          strokeWidth={1.6}
                          strokeDasharray="4 3"
                          dot={false}
                          isAnimationActive={false}
                        />
                      )}

                      {/* 6. Clouds Curve (rose dotted) */}
                      {visibleLayers.clouds && (
                        <Line
                          type="monotone"
                          dataKey="clouds"
                          stroke="#f43f5e"
                          strokeWidth={1.5}
                          strokeDasharray="2 3"
                          dot={false}
                          isAnimationActive={false}
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Bottom Hourly Score Pills Strip: EXACTLY matching image row */}
                <div className="mt-3 overflow-x-auto pb-1">
                  <div className="flex gap-1.5 min-w-full">
                    {points.map((pt, ptIdx) => {
                      const pillStyle = getPillStyle(pt.score);
                      return (
                        <div
                          key={ptIdx}
                          className="flex-1 min-w-[36px] sm:min-w-[42px] rounded-lg py-1 px-0.5 text-center transition-transform hover:scale-105"
                          style={{ backgroundColor: pillStyle.bg }}
                          title={`Hora ${pt.timeStr} • Score: ${pt.score}/100 • Nubes: ${pt.clouds}% • Rocío: ${pt.spread}°C`}
                        >
                          {/* Hour top */}
                          <div
                            className="text-[10px] font-mono font-semibold opacity-90 leading-none"
                            style={{ color: pillStyle.text }}
                          >
                            {pt.hourPill}
                          </div>
                          {/* Score bottom */}
                          <div
                            className="text-xs font-mono font-extrabold mt-0.5 leading-tight"
                            style={{ color: pillStyle.text }}
                          >
                            {pt.score}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

// Custom interactive tooltip with exact 4-hour horizontal separation.
// Rule: If advancing past half the screen (> 50%), flip to the left side!
// Always clamped within chart bounds so it is never cut off.
const CustomWeeklyTooltip = ({
  active,
  payload,
  nightName,
  coordinate,
  viewBox,
  totalPoints = 16,
}: any) => {
  if (!active || !payload || !payload.length) return null;
  const data: ChartHourPoint = payload[0]?.payload;
  if (!data) return null;

  const cursorX = coordinate?.x ?? 0;
  const chartLeft = viewBox?.x ?? 0;
  const chartWidth = viewBox?.width ?? (typeof window !== 'undefined' ? Math.min(window.innerWidth - 64, 1100) : 900);
  const plotRight = chartLeft + chartWidth;
  const halfPoint = chartLeft + chartWidth / 2;

  // 4 hours distance:
  const hourStep = chartWidth / Math.max(1, totalPoints - 1);
  const fourHoursDistance = Math.round(hourStep * 4);
  const cardWidth = 230;

  // If advancing past half of the screen, flip to the left side:
  const isPastHalf = cursorX > halfPoint;

  let targetX = isPastHalf
    ? cursorX - fourHoursDistance - cardWidth
    : cursorX + fourHoursDistance;

  // Always keep inside chart boundaries: visible at all times, never cut off
  const minX = chartLeft + 8;
  const maxX = plotRight - cardWidth - 8;
  targetX = Math.max(minX, Math.min(maxX, targetX));

  return (
    <div
      style={{
        transform: `translateX(${targetX}px)`,
      }}
      className="pointer-events-none select-none rounded-xl border border-cyan-500/40 bg-slate-950/95 p-3 text-xs shadow-2xl backdrop-blur-md text-slate-200 space-y-1.5 w-[230px]"
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-1 font-mono">
        <span className="font-bold text-white truncate max-w-[140px]">
          {nightName} • {data.timeStr} h
        </span>
        <span
          className={`px-1.5 py-0.2 rounded font-bold ${
            data.score >= 70
              ? 'bg-emerald-500/20 text-emerald-300'
              : data.score >= 50
              ? 'bg-amber-500/20 text-amber-300'
              : 'bg-rose-500/20 text-rose-300'
          }`}
        >
          {data.score}/100
        </span>
      </div>

      <div className="space-y-1 text-[11px] font-mono">
        <div className="flex items-center justify-between">
          <span className="text-cyan-400 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Night Score:
          </span>
          <span className="font-bold text-white">{data.score}%</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-rose-400 flex items-center gap-1">
            <Cloud className="h-3 w-3" /> Nubosidad:
          </span>
          <span className="font-bold text-white">{data.clouds}%</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-purple-400 flex items-center gap-1">
            <Droplets className="h-3 w-3" /> Margen Rocío:
          </span>
          <span className="font-bold text-white">
            Δ {data.spread}°C (T:{data.temp}° / R:{data.dewPoint}°)
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sky-400 flex items-center gap-1">
            <Eye className="h-3 w-3" /> Transparencia:
          </span>
          <span className="font-bold text-white">{data.transparency}%</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-orange-400 flex items-center gap-1">
            <Wind className="h-3 w-3" /> Viento / Rachas:
          </span>
          <span className="font-bold text-white">
            {data.windSpeed} / {data.windGust} km/h
          </span>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px]">
          <span className="text-amber-400 flex items-center gap-1">
            <Sun className="h-3 w-3" /> Luz Solar:
          </span>
          <span className="font-bold text-slate-300">
            {data.isDark ? 'Noche Oscura (< -18°)' : `${data.sunlightPct}% Crepúsculo`}
          </span>
        </div>
      </div>
    </div>
  );
};
