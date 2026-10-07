export interface LocationData {
  name: string;
  country: string;
  state?: string;
  lat: number;
  lon: number;
  elevation?: number;
  bortleClass?: number; // 1-9 Bortle scale
}

export interface HourlyForecastItem {
  timestamp: number;
  timeStr: string;
  hour: number;
  temp: number;
  dewPoint: number;
  spread: number; // temp - dewPoint
  humidity: number;
  cloudsTotal: number;
  cloudsLow: number;
  cloudsMid: number;
  cloudsHigh: number;
  visibilityKm: number;
  windSpeedKmh: number;
  windGustKmh: number;
  windDirectionDeg: number;
  pressureHpa: number;
  transparencyScore: number; // 0-100
  transparencyLabel: string;
  seeingArcsec: number; // e.g. 1.2" (excellent) to 3.5" (poor)
  seeingLabel: string;
  moonAltitudeDeg: number;
  sunAltitudeDeg: number;
  isAstronomicalNight: boolean;
  score: number; // 0-100
  dewRiskLevel: 'Bajo' | 'Moderado' | 'Alto' | 'Crítico';
  recommendation: string;
  providerValues?: ProviderModelValue[];
}

export interface AstroNight {
  id: string;
  date: Date;
  dateStr: string;
  dayName: string;
  isTonight: boolean;
  astroScore: number; // 0-100
  ratingLabel: 'Épica' | 'Excelente' | 'Buena' | 'Aceptable' | 'Regular' | 'Inviable';
  ratingColor: string;
  summary: string;
  
  // Core metrics requested by user
  clouds: {
    total: number;
    low: number;
    mid: number;
    high: number;
  };
  visibility: {
    km: number;
    status: 'Excepcional' | 'Muy buena' | 'Buena' | 'Moderada' | 'Pobre' | 'Niebla';
  };
  transparency: {
    score: number; // 0 - 100
    label: 'Transparente' | 'Buena' | 'Moderada' | 'Pobre' | 'Muy baja';
    humidityAvg: number;
    description: string;
  };
  dew: {
    avgDewPoint: number;
    minTemp: number;
    minSpread: number; // lowest (temp - dewPoint) during night
    riskLevel: 'Bajo' | 'Moderado' | 'Alto' | 'Crítico';
    condensationExpected: boolean;
    criticalHour?: string;
    heatersAdvised: boolean;
    advice: string;
  };

  seeing: {
    arcsecAvg: number;
    label: 'Excelente' | 'Buena' | 'Promedio' | 'Mala';
    jetStreamIndex: string;
  };

  wind: {
    avgKmh: number;
    maxGustKmh: number;
    direction: string;
  };

  moon: {
    phaseName: string;
    phaseFraction: number; // 0 = new, 0.5 = full, 1 = new
    illuminationPct: number; // 0 - 100%
    moonrise: string;
    moonset: string;
    isUpDuringAstroDark: boolean;
    usableDarkHours: number; // hours of dark sky without moon
  };

  ephemeris: {
    sunset: string;
    civilDusk: string;
    nauticalDusk: string;
    astroDusk: string; // Sun < -18° (start of astro dark)
    astroDawn: string; // Sun starts rising above -18°
    nauticalDawn: string;
    civilDawn: string;
    sunrise: string;
    totalDarknessHours: number; // duration between astroDusk and astroDawn
  };

  hourly: HourlyForecastItem[];

  targetAdvice: {
    bestTargets: string[];
    filters: string;
    telescopeSetup: string;
  };
}

export type ForecastStrategy = 'worst' | 'average' | 'best';

export type WeatherProviderId = 'openmeteo' | 'openweather' | 'pirateweather' | 'meteoblue';

export interface ProviderModelValue {
  providerId: string;
  providerName: string;
  score: number;
  clouds: number;
  windKmh: number;
  transparency: number;
  visibilityKm: number;
  spread: number;
}

export interface MultiModelSettings {
  strategy: ForecastStrategy;
  providers: {
    openmeteo: { enabled: boolean; apiKey: string };
    openweather: { enabled: boolean; apiKey: string };
    pirateweather: { enabled: boolean; apiKey: string };
    meteoblue: { enabled: boolean; apiKey: string };
  };
}

export type WeatherDataSource =
  | 'openweather_onecall'
  | 'openweather_standard'
  | 'demo'
  | 'openmeteo'
  | 'pirateweather'
  | 'meteoblue'
  | 'ensemble_worst'
  | 'ensemble_average'
  | 'ensemble_best';

export interface WeatherSettings {
  apiKey: string;
  units: 'metric' | 'imperial';
  autoRefresh: boolean;
  bortleOverride?: number;
}
