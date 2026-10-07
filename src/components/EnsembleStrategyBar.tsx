import React from 'react';
import { ForecastStrategy, WeatherProviderId } from '../types';
import { STRATEGY_DETAILS, WEATHER_PROVIDERS_META } from '../services/ensembleService';
import { Sliders, HelpCircle, Layers, CheckCircle, ShieldAlert } from 'lucide-react';

interface EnsembleStrategyBarProps {
  currentStrategy: ForecastStrategy;
  onSelectStrategy: (strategy: ForecastStrategy) => void;
  activeProviders: { id: WeatherProviderId; name: string }[];
  onOpenConfigModal: () => void;
  disabled?: boolean;
}

export const EnsembleStrategyBar: React.FC<EnsembleStrategyBarProps> = ({
  currentStrategy,
  onSelectStrategy,
  activeProviders,
  onOpenConfigModal,
  disabled = false,
}) => {
  const strategies: ForecastStrategy[] = ['worst', 'average', 'best'];
  const hasMultiple = activeProviders.length > 1;

  return (
    <section className="rounded-2xl border border-slate-800 bg-[#0a0f1d]/90 p-3.5 sm:p-4 shadow-xl backdrop-blur-sm transition">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Title and Active providers count */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold tracking-tight text-white">
                Previsión Multi-Modelo
              </h3>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  hasMultiple
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {activeProviders.length === 1
                  ? '1 Modelo activo'
                  : `${activeProviders.length} Modelos combinados`}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
              <span>Fuentes:</span>
              <span className="font-medium text-slate-300">
                {activeProviders.map((p) => p.name.split(' ')[0]).join(' + ')}
              </span>
            </p>
          </div>
        </div>

        {/* Strategy Selector Pills */}
        <div className="w-full md:w-auto flex items-center justify-between sm:justify-end gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-800">
          {strategies.map((strat) => {
            const meta = STRATEGY_DETAILS[strat];
            const isSelected = currentStrategy === strat;
            return (
              <button
                key={strat}
                onClick={() => onSelectStrategy(strat)}
                disabled={disabled}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isSelected
                    ? `${meta.badgeColor} border font-bold shadow-md shadow-black/40 scale-[1.02]`
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                } disabled:opacity-50`}
                title={meta.description}
              >
                <span className="text-sm leading-none">{meta.icon}</span>
                <span>{meta.title}</span>
                {isSelected && (
                  <span className="hidden lg:inline text-[10px] opacity-75">
                    ({strat === 'worst' ? 'Pesimista' : strat === 'best' ? 'Optimista' : 'Media'})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Open Config Modal button */}
        <button
          onClick={onOpenConfigModal}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white transition shrink-0"
          title="Configurar claves de OpenWeather, PirateWeather, Meteoblue"
        >
          <Sliders className="h-3.5 w-3.5 text-cyan-400" />
          <span>Configurar APIs</span>
        </button>
      </div>

      {/* Dynamic Strategy Explanation Footer */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span className="text-base">{STRATEGY_DETAILS[currentStrategy].icon}</span>
          <span className="text-slate-300 font-medium">
            {STRATEGY_DETAILS[currentStrategy].title}:
          </span>
          <span className="text-slate-400 line-clamp-1">
            {STRATEGY_DETAILS[currentStrategy].description}
          </span>
        </div>
        {!hasMultiple && (
          <button
            onClick={onOpenConfigModal}
            className="text-cyan-400 hover:text-cyan-300 font-medium underline underline-offset-2 shrink-0 ml-2 hidden sm:inline"
          >
            Activar más APIs para comparar
          </button>
        )}
      </div>
    </section>
  );
};
