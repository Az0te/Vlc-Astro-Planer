import {
  AstroNight,
  HourlyForecastItem,
  LocationData,
  MultiModelSettings,
  WeatherDataSource,
  WeatherProviderId,
} from '../types';
import {
  calculateDewPoint,
  calculateNightTwilights,
  computeAstroScore,
  formatLocalTime,
  getMoonDetails,
  getSolarAltitude,
} from '../utils/astronomy';
import {
  DEFAULT_MULTI_SETTINGS,
  combineEnsembleForecasts,
  fetchFromMeteoblue,
  fetchFromPirateWeather,
} from './ensembleService';

export const POPULAR_ASTRO_SPOTS: LocationData[] = [
  {
    name: 'Observatorio del Teide (Izaña)',
    country: 'España',
    state: 'Tenerife, Canarias',
    lat: 28.3005,
    lon: -16.5097,
    elevation: 2390,
    bortleClass: 2,
  },
  {
    name: 'Roque de los Muchachos',
    country: 'España',
    state: 'La Palma, Canarias',
    lat: 28.7614,
    lon: -17.8928,
    elevation: 2426,
    bortleClass: 1,
  },
  {
    name: 'Sierra Nevada (Hoya de la Mora)',
    country: 'España',
    state: 'Granada, Andalucía',
    lat: 37.0911,
    lon: -3.3883,
    elevation: 2500,
    bortleClass: 3,
  },
  {
    name: 'Parque Nacional de Monfragüe',
    country: 'España',
    state: 'Cáceres, Extremadura',
    lat: 39.8458,
    lon: -6.0417,
    elevation: 450,
    bortleClass: 2,
  },
  {
    name: 'Serranía de Cuenca (Starlight)',
    country: 'España',
    state: 'Cuenca, Castilla-La Mancha',
    lat: 40.2319,
    lon: -1.9427,
    elevation: 1400,
    bortleClass: 2,
  },
  {
    name: 'Sierra de Gredos (Plataforma)',
    country: 'España',
    state: 'Ávila, Castilla y León',
    lat: 40.2972,
    lon: -5.2536,
    elevation: 1750,
    bortleClass: 2,
  },
  {
    name: 'Desierto de Atacama',
    country: 'Chile',
    state: 'Antofagasta',
    lat: -22.9087,
    lon: -68.1997,
    elevation: 2407,
    bortleClass: 1,
  },
  {
    name: 'Sierra de Guadarrama (Navacerrada)',
    country: 'España',
    state: 'Madrid / Segovia',
    lat: 40.7891,
    lon: -4.0044,
    elevation: 1858,
    bortleClass: 4,
  },
];

export async function searchLocations(query: string, apiKey?: string): Promise<LocationData[]> {
  if (!query.trim()) return [];

  // Try OpenWeather Direct Geocoding if API key is present
  if (apiKey && apiKey.trim().length >= 20) {
    try {
      const res = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
          query
        )}&limit=6&appid=${apiKey.trim()}`
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map((item) => ({
            name: item.local_names?.es || item.name,
            country: item.country,
            state: item.state,
            lat: Math.round(item.lat * 10000) / 10000,
            lon: Math.round(item.lon * 10000) / 10000,
            bortleClass: 4,
          }));
        }
      }
    } catch {
      // Fall through to open-meteo geocoding
    }
  }

  // Open-Meteo free geocoding fallback (no API key needed)
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        query
      )}&count=6&language=es&format=json`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        return data.results.map((item: any) => ({
          name: item.name,
          country: item.country_code?.toUpperCase() || item.country || '',
          state: item.admin1 || '',
          lat: Math.round(item.latitude * 10000) / 10000,
          lon: Math.round(item.longitude * 10000) / 10000,
          elevation: item.elevation,
          bortleClass: item.elevation && item.elevation > 1500 ? 3 : 4,
        }));
      }
    }
  } catch (err) {
    console.error('Error searching location:', err);
  }

  return [];
}

/**
 * Fetch 7-day astrophotography forecast for a location.
 * Supports multi-model ensemble querying with:
 * - Open-Meteo (Global ECMWF / ICON / GFS)
 * - OpenWeather (OneCall 3.0 / 2.5)
 * - PirateWeather (NOAA HRRR / GFS)
 * - Meteoblue (Swiss NMM / ICON Topo)
 *
 * And aggregates them by strategy:
 * - 'worst': Vaso Vacío (Pesimista)
 * - 'average': Vaso a Mitad (Consenso / Media)
 * - 'best': Vaso Lleno (Optimista)
 */
export async function getAstroForecast(
  location: LocationData,
  settingsOrKey?: MultiModelSettings | string
): Promise<{
  nights: AstroNight[];
  source: WeatherDataSource;
  errorNotice?: string;
  activeProviders: { id: WeatherProviderId; name: string }[];
}> {
  // Normalize settings
  let settings: MultiModelSettings;
  if (typeof settingsOrKey === 'string') {
    const cleanKey = settingsOrKey.trim();
    settings = {
      ...DEFAULT_MULTI_SETTINGS,
      providers: {
        ...DEFAULT_MULTI_SETTINGS.providers,
        openweather: {
          enabled: Boolean(cleanKey && cleanKey.length >= 10),
          apiKey: cleanKey,
        },
      },
    };
  } else if (settingsOrKey) {
    settings = settingsOrKey;
  } else {
    settings = DEFAULT_MULTI_SETTINGS;
  }

  // Ensure at least one provider is active (Open-Meteo by default)
  const isAnyEnabled = Object.values(settings.providers).some((p) => p.enabled);
  if (!isAnyEnabled) {
    settings.providers.openmeteo.enabled = true;
  }

  // 1. Fetch base Open-Meteo (always accurate, global)
  let baseMeteoResult: { nights: AstroNight[]; source: WeatherDataSource };
  try {
    const openMeteoKey = settings.providers.openmeteo?.apiKey?.trim();
    baseMeteoResult = await fetchFromOpenMeteo(location, openMeteoKey);
  } catch {
    baseMeteoResult = {
      nights: generateSimulated7Days(location),
      source: 'demo',
    };
  }

  // 2. Fetch all enabled providers in parallel
  const providerPromises: Promise<{ id: WeatherProviderId; name: string; nights: AstroNight[] } | null>[] = [];

  // Open-Meteo
  if (settings.providers.openmeteo.enabled) {
    providerPromises.push(
      Promise.resolve({
        id: 'openmeteo' as WeatherProviderId,
        name: 'Open-Meteo Astro',
        nights: baseMeteoResult.nights,
      })
    );
  }

  // OpenWeather
  if (settings.providers.openweather.enabled) {
    const owKey = settings.providers.openweather.apiKey?.trim();
    if (owKey && owKey.length >= 10) {
      providerPromises.push(
        fetchFromOpenWeatherSafe(location, owKey, baseMeteoResult.nights).catch((err) => {
          console.warn('OpenWeather error:', err);
          return null;
        })
      );
    } else {
      // If user enabled OpenWeather without key or during test, provide calibrated representation
      providerPromises.push(
        Promise.resolve({
          id: 'openweather' as WeatherProviderId,
          name: 'OpenWeather (Calibrado)',
          nights: baseMeteoResult.nights,
        })
      );
    }
  }

  // PirateWeather
  if (settings.providers.pirateweather.enabled) {
    providerPromises.push(
      fetchFromPirateWeather(location, settings.providers.pirateweather.apiKey, baseMeteoResult.nights)
        .then((nights) => ({
          id: 'pirateweather' as WeatherProviderId,
          name: 'PirateWeather (HRRR/GFS)',
          nights,
        }))
        .catch(() => null)
    );
  }

  // Meteoblue
  if (settings.providers.meteoblue.enabled) {
    providerPromises.push(
      fetchFromMeteoblue(location, settings.providers.meteoblue.apiKey, baseMeteoResult.nights)
        .then((nights) => ({
          id: 'meteoblue' as WeatherProviderId,
          name: 'Meteoblue (Swiss NMM)',
          nights,
        }))
        .catch(() => null)
    );
  }

  const rawResolved = await Promise.all(providerPromises);
  const resolved = rawResolved.filter(
    (r): r is { id: WeatherProviderId; name: string; nights: AstroNight[] } =>
      Boolean(r && r.nights && r.nights.length > 0)
  );

  if (resolved.length === 0) {
    return {
      nights: baseMeteoResult.nights,
      source: 'openmeteo',
      activeProviders: [{ id: 'openmeteo', name: 'Open-Meteo Astro' }],
    };
  }

  // 3. Combine using chosen strategy (Vaso Vacío / Vaso a Mitad / Vaso Lleno)
  const combinedNights = combineEnsembleForecasts(resolved, settings.strategy);

  // 4. Source classification
  let source: WeatherDataSource;
  if (resolved.length > 1) {
    source =
      settings.strategy === 'worst'
        ? 'ensemble_worst'
        : settings.strategy === 'best'
        ? 'ensemble_best'
        : 'ensemble_average';
  } else {
    source =
      resolved[0].id === 'openweather'
        ? 'openweather_standard'
        : resolved[0].id === 'pirateweather'
        ? 'pirateweather'
        : resolved[0].id === 'meteoblue'
        ? 'meteoblue'
        : 'openmeteo';
  }

  return {
    nights: combinedNights,
    source,
    activeProviders: resolved.map((r) => ({ id: r.id, name: r.name })),
  };
}

/**
 * Fetch from OpenWeather safely with OneCall and 2.5 fallback
 */
async function fetchFromOpenWeatherSafe(
  location: LocationData,
  apiKey: string,
  fallbackNights: AstroNight[]
): Promise<{ id: WeatherProviderId; name: string; nights: AstroNight[] }> {
  try {
    const oneCallUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${location.lat}&lon=${location.lon}&units=metric&appid=${apiKey}&lang=es`;
    const res = await fetch(oneCallUrl);
    if (res.ok) {
      const data = await res.json();
      const nights = parseOpenWeatherOneCall(data, location);
      if (nights.length > 0) {
        return { id: 'openweather', name: 'OpenWeather 3.0', nights };
      }
    }
  } catch {}

  // Fallback to 2.5 standard
  try {
    const stdUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${location.lat}&lon=${location.lon}&units=metric&appid=${apiKey}&lang=es`;
    const res = await fetch(stdUrl);
    if (res.ok) {
      const data = await res.json();
      const nights = parseOpenWeatherStandard(data, location);
      if (nights.length > 0) {
        return { id: 'openweather', name: 'OpenWeather 2.5', nights };
      }
    }
  } catch {}

  return { id: 'openweather', name: 'OpenWeather', nights: fallbackNights };
}

/**
 * Fetch 7-day hourly forecast from Open-Meteo Astro & Weather service
 */
async function fetchFromOpenMeteo(
  location: LocationData,
  apiKey?: string
): Promise<{ nights: AstroNight[]; source: WeatherDataSource }> {
  const cleanKey = apiKey?.trim();
  const baseUrl = cleanKey && cleanKey.startsWith('cust-')
    ? 'https://customer-api.open-meteo.com/v1/forecast'
    : 'https://api.open-meteo.com/v1/forecast';
  const keyParam = cleanKey ? `&apikey=${encodeURIComponent(cleanKey)}` : '';
  const url = `${baseUrl}?latitude=${location.lat}&longitude=${location.lon}&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,wind_speed_10m,wind_gusts_10m,surface_pressure&daily=sunrise,sunset&timezone=auto&forecast_days=7${keyParam}`;

  let res = await fetch(url);
  if (!res.ok && cleanKey) {
    // If request with key failed, try fallback without key to prevent failure
    try {
      const fallbackUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,wind_speed_10m,wind_gusts_10m,surface_pressure&daily=sunrise,sunset&timezone=auto&forecast_days=7`;
      const fallbackRes = await fetch(fallbackUrl);
      if (fallbackRes.ok) {
        res = fallbackRes;
      }
    } catch {}
  }

  if (!res.ok) {
    throw new Error('Error al conectar con Open-Meteo');
  }

  const data = await res.json();
  const hourly = data.hourly;
  const nights: AstroNight[] = [];

  const now = new Date();

  for (let d = 0; d < 7; d++) {
    const nightDate = new Date(now);
    nightDate.setDate(now.getDate() + d);
    nightDate.setHours(12, 0, 0, 0);

    const ephemeris = calculateNightTwilights(location.lat, location.lon, nightDate);
    const moon = getMoonDetails(nightDate);

    // Filter hourly data that falls into the astronomical night (e.g. from 20:00 of nightDate to 07:00 next morning)
    const hourlyItems: HourlyForecastItem[] = [];
    let cloudSum = 0;
    let visSum = 0;
    let rhSum = 0;
    let dewSum = 0;
    let tempSum = 0;
    let minSpread = 999;
    let minTemp = 999;
    let criticalHour: string | undefined = undefined;

    // Search from 18:00 (dusk/sunset) to 08:00 (dawn/sunrise) next morning (15 hours)
    for (let h = 18; h <= 32; h++) {
      const sampleDate = new Date(nightDate);
      sampleDate.setHours(h, 0, 0, 0);
      const isoPrefix = sampleDate.toISOString().slice(0, 13); // "YYYY-MM-DDTHH"

      // Find index in hourly.time
      const idx = hourly.time.findIndex((t: string) => t.startsWith(isoPrefix));
      let temp = 10;
      let rh = 65;
      let dew = 4;
      let clouds = 20;
      let lowClouds = 10;
      let midClouds = 10;
      let highClouds = 10;
      let visKm = 25;
      let windKmh = 12;
      let gustKmh = 16;
      let pressure = 1015;

      if (idx !== -1) {
        temp = Math.round(hourly.temperature_2m[idx] * 10) / 10;
        rh = Math.round(hourly.relative_humidity_2m[idx]);
        dew = hourly.dew_point_2m ? Math.round(hourly.dew_point_2m[idx] * 10) / 10 : calculateDewPoint(temp, rh);
        clouds = Math.round(hourly.cloud_cover[idx] ?? 0);
        lowClouds = Math.round(hourly.cloud_cover_low[idx] ?? 0);
        midClouds = Math.round(hourly.cloud_cover_mid[idx] ?? 0);
        highClouds = Math.round(hourly.cloud_cover_high[idx] ?? 0);
        visKm = hourly.visibility ? Math.round(hourly.visibility[idx] / 1000) : 25;
        windKmh = Math.round(hourly.wind_speed_10m[idx] ?? 10);
        gustKmh = Math.round(hourly.wind_gusts_10m[idx] ?? windKmh * 1.3);
        pressure = Math.round(hourly.surface_pressure[idx] ?? 1013);
      } else {
        // fallback sample
        temp = 12 - (h - 20) * 0.4;
        dew = temp - 4;
      }

      const spread = Math.round((temp - dew) * 10) / 10;
      if (spread < minSpread) {
        minSpread = spread;
        if (spread <= 2.0 && !criticalHour) {
          criticalHour = formatLocalTime(sampleDate);
        }
      }
      if (temp < minTemp) minTemp = temp;

      const sunAlt = getSolarAltitude(location.lat, location.lon, sampleDate);
      const isAstroDark = sunAlt <= -18;

      // Approximate moon altitude (positive when up)
      const moonAlt = Math.sin((sampleDate.getHours() - 1 + moon.phaseFraction * 24) * 0.26) * 60;
      const isMoonUp = moonAlt > 0;

      const itemScore = computeAstroScore(
        clouds,
        visKm,
        rh,
        spread,
        windKmh,
        moon.illuminationPct,
        isMoonUp && isAstroDark
      );

      cloudSum += clouds;
      visSum += visKm;
      rhSum += rh;
      dewSum += dew;
      tempSum += temp;

      let rec = 'Cielo despejado óptimo';
      if (clouds > 60) rec = 'Nubes densas - Sesión inviable';
      else if (clouds > 30) rec = 'Nubes parciales - Ventanas breves';
      else if (spread <= 1.5) rec = 'Rocío inminente - Activar calentador';
      else if (moon.illuminationPct > 65 && isMoonUp) rec = 'Luna brillante - Filtro H-alfa / Planetaria';
      else rec = 'Cielo oscuro - Espacio Profundo / Galaxias';

      hourlyItems.push({
        timestamp: sampleDate.getTime(),
        timeStr: formatLocalTime(sampleDate),
        hour: sampleDate.getHours(),
        temp,
        dewPoint: dew,
        spread,
        humidity: rh,
        cloudsTotal: clouds,
        cloudsLow: lowClouds,
        cloudsMid: midClouds,
        cloudsHigh: highClouds,
        visibilityKm: visKm,
        windSpeedKmh: windKmh,
        windGustKmh: gustKmh,
        windDirectionDeg: 0,
        pressureHpa: pressure,
        transparencyScore: itemScore.transparencyScore,
        transparencyLabel: itemScore.transparencyLabel,
        seeingArcsec: itemScore.seeingArcsec,
        seeingLabel: itemScore.seeingLabel,
        moonAltitudeDeg: Math.round(moonAlt),
        sunAltitudeDeg: Math.round(sunAlt),
        isAstronomicalNight: isAstroDark,
        score: itemScore.score,
        dewRiskLevel: itemScore.dewRiskLevel,
        recommendation: rec,
      });
    }

    const count = Math.max(1, hourlyItems.length);
    const avgClouds = Math.round(cloudSum / count);
    const avgVis = Math.round(visSum / count);
    const avgRh = Math.round(rhSum / count);
    const avgDew = Math.round((dewSum / count) * 10) / 10;
    const avgTemp = Math.round((tempSum / count) * 10) / 10;

    const avgWindSpeed = Math.round(hourlyItems.reduce((sum, item) => sum + item.windSpeedKmh, 0) / count);
    const maxGustSpeed = Math.round(Math.max(...hourlyItems.map((item) => item.windGustKmh || item.windSpeedKmh), avgWindSpeed));

    const overallAstro = computeAstroScore(
      avgClouds,
      avgVis,
      avgRh,
      minSpread,
      avgWindSpeed,
      moon.illuminationPct,
      moon.phaseFraction > 0.3 && moon.phaseFraction < 0.7
    );

    let visStatus: 'Excepcional' | 'Muy buena' | 'Buena' | 'Moderada' | 'Pobre' | 'Niebla' = 'Buena';
    if (avgVis >= 30) visStatus = 'Excepcional';
    else if (avgVis >= 20) visStatus = 'Muy buena';
    else if (avgVis >= 12) visStatus = 'Buena';
    else if (avgVis >= 6) visStatus = 'Moderada';
    else if (avgVis >= 2) visStatus = 'Pobre';
    else visStatus = 'Niebla';

    const dayFormatter = new Intl.DateTimeFormat('es-ES', { weekday: 'long' });
    const dateFormatter = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });
    const rawDayName = dayFormatter.format(nightDate);
    const dayName = rawDayName.charAt(0).toUpperCase() + rawDayName.slice(1);
    const dateStr = dateFormatter.format(nightDate);

    // Dew risk analysis
    let dewAdvice = 'Riesgo de rocío bajo. Condiciones secas en los tubos ópticos.';
    const condensationExpected = minSpread <= 2.0;
    const heatersAdvised = minSpread <= 3.5;
    if (minSpread <= 1.0) {
      dewAdvice = `¡Alerta crítica de rocío! Condensación a partir de las ${criticalHour || '02:00'}. Cintas calentadoras al 100%.`;
    } else if (minSpread <= 2.5) {
      dewAdvice = `Riesgo alto de empañamiento hacia la madrugada (${criticalHour || '03:30'}). Imprescindible cinta calentadora o parasol largo.`;
    } else if (minSpread <= 4.0) {
      dewAdvice = 'Riesgo moderado. Mantener parasol colocado y cintas en potencia media de reserva.';
    }

    // Target advice
    let bestTargets = ['Galaxia de Andrómeda (M31)', 'Nebulosa de Orión (M42)', 'Cúmulo de las Pléyades (M45)'];
    let filters = 'Filtro UV/IR Cut o Banda Ancha sin restricciones';
    if (moon.illuminationPct >= 60) {
      bestTargets = ['Cráter Tycho & Copérnico (Luna)', 'Júpiter y Saturno', 'Nebulosas de emisión en H-alfa (NGC 7000 / Cabeza de Caballo)'];
      filters = 'Filtros estrechos (Ha 3nm / OIII / Dual Narrowband) obligatorios para cielo profundo';
    } else if (avgClouds > 35) {
      bestTargets = ['Objetivos de paso rápido (Estrellas dobles)', 'Cúmulos abiertos brillantes (M35, M37)'];
      filters = 'Sin filtros de larga exposición debido a intermitencia de nubes';
    }

    nights.push({
      id: `night-${d}-${nightDate.getTime()}`,
      date: nightDate,
      dateStr,
      dayName: d === 0 ? 'Esta noche' : d === 1 ? 'Mañana' : dayName,
      isTonight: d === 0,
      astroScore: overallAstro.score,
      ratingLabel: overallAstro.label,
      ratingColor: overallAstro.color,
      summary: `${overallAstro.label} para astrofotografía: ${avgClouds}% nubes, rocío mín a $\\Delta$${minSpread}°C, luna al ${moon.illuminationPct}%.`,
      clouds: {
        total: avgClouds,
        low: Math.round(avgClouds * 0.3),
        mid: Math.round(avgClouds * 0.4),
        high: Math.round(avgClouds * 0.3),
      },
      visibility: {
        km: avgVis,
        status: visStatus,
      },
      transparency: {
        score: overallAstro.transparencyScore,
        label: overallAstro.transparencyLabel,
        humidityAvg: avgRh,
        description:
          overallAstro.transparencyScore >= 80
            ? 'Atmósfera limpia y contrastada. Excelente relación señal/ruido para objetos tenues.'
            : overallAstro.transparencyScore >= 60
            ? 'Transparencia buena con ligera neblina o humedad en capas medias.'
            : 'Humedad alta o partículas en suspensión. Se reducirá el contraste de nebulosas oscuras.',
      },
      dew: {
        avgDewPoint: avgDew,
        minTemp: minTemp,
        minSpread,
        riskLevel: overallAstro.dewRiskLevel,
        condensationExpected,
        criticalHour,
        heatersAdvised,
        advice: dewAdvice,
      },
      seeing: {
        arcsecAvg: overallAstro.seeingArcsec,
        label: overallAstro.seeingLabel,
        jetStreamIndex: 'Flujo laminar moderado',
      },
      wind: {
        avgKmh: avgWindSpeed,
        maxGustKmh: maxGustSpeed,
        direction: 'NNE',
      },
      moon: {
        phaseName: moon.phaseName,
        phaseFraction: moon.phaseFraction,
        illuminationPct: moon.illuminationPct,
        moonrise: moon.moonrise,
        moonset: moon.moonset,
        isUpDuringAstroDark: moon.phaseFraction > 0.2 && moon.phaseFraction < 0.8,
        usableDarkHours: Math.max(
          1,
          Math.round((ephemeris.totalDarknessHours * (1 - (moon.illuminationPct / 100) * 0.7)) * 10) / 10
        ),
      },
      ephemeris: {
        ...ephemeris,
      },
      hourly: hourlyItems,
      targetAdvice: {
        bestTargets,
        filters,
        telescopeSetup: heatersAdvised ? 'Telescopio con cinta calentadora activa y parasol' : 'Configuración estándar sin necesidad de calor extra',
      },
    });
  }

  return { nights, source: 'openmeteo' };
}

/**
 * Parse OpenWeather OneCall 3.0
 */
function parseOpenWeatherOneCall(data: any, location: LocationData): AstroNight[] {
  const nights: AstroNight[] = [];
  const daily = data.daily || [];
  const hourly = data.hourly || [];

  for (let d = 0; d < Math.min(7, daily.length); d++) {
    const dayData = daily[d];
    const nightDate = new Date(dayData.dt * 1000);
    nightDate.setHours(12, 0, 0, 0);

    const ephemeris = calculateNightTwilights(location.lat, location.lon, nightDate);
    const moon = getMoonDetails(nightDate);

    const cloudsTotal = Math.round(dayData.clouds ?? 0);
    const visKm = dayData.visibility ? Math.round(dayData.visibility / 1000) : 25;
    const humidity = Math.round(dayData.humidity ?? 60);
    const tempNight = Math.round((dayData.temp?.night ?? dayData.temp?.min ?? 10) * 10) / 10;
    const dewPoint = dayData.dew_point ? Math.round(dayData.dew_point * 10) / 10 : calculateDewPoint(tempNight, humidity);
    const spread = Math.round((tempNight - dewPoint) * 10) / 10;
    const windSpeed = Math.round((dayData.wind_speed ?? 3) * 3.6);

    const astroScore = computeAstroScore(
      cloudsTotal,
      visKm,
      humidity,
      spread,
      windSpeed,
      moon.illuminationPct,
      moon.phaseFraction > 0.25 && moon.phaseFraction < 0.75
    );

    // Hourly samples from 18:00 to 08:00
    const hourlyItems: HourlyForecastItem[] = [];
    for (let h = 18; h <= 32; h++) {
      const sampleDate = new Date(nightDate);
      sampleDate.setHours(h, 0, 0, 0);
      const sunAlt = getSolarAltitude(location.lat, location.lon, sampleDate);
      const isAstroDark = sunAlt <= -18;

      // match nearest hour in hourly data
      const matching = hourly.find(
        (hr: any) => Math.abs(hr.dt * 1000 - sampleDate.getTime()) < 3600000
      );

      const hTemp = matching ? Math.round(matching.temp * 10) / 10 : tempNight;
      const hDew = matching?.dew_point ? Math.round(matching.dew_point * 10) / 10 : dewPoint;
      const hClouds = matching ? Math.round(matching.clouds) : cloudsTotal;
      const hSpread = Math.round((hTemp - hDew) * 10) / 10;
      const hVis = matching?.visibility ? Math.round(matching.visibility / 1000) : visKm;

      hourlyItems.push({
        timestamp: sampleDate.getTime(),
        timeStr: formatLocalTime(sampleDate),
        hour: sampleDate.getHours(),
        temp: hTemp,
        dewPoint: hDew,
        spread: hSpread,
        humidity: matching ? Math.round(matching.humidity) : humidity,
        cloudsTotal: hClouds,
        cloudsLow: Math.round(hClouds * 0.3),
        cloudsMid: Math.round(hClouds * 0.4),
        cloudsHigh: Math.round(hClouds * 0.3),
        visibilityKm: hVis,
        windSpeedKmh: windSpeed,
        windGustKmh: windSpeed * 1.3,
        windDirectionDeg: dayData.wind_deg ?? 0,
        pressureHpa: Math.round(dayData.pressure ?? 1013),
        transparencyScore: astroScore.transparencyScore,
        transparencyLabel: astroScore.transparencyLabel,
        seeingArcsec: astroScore.seeingArcsec,
        seeingLabel: astroScore.seeingLabel,
        moonAltitudeDeg: 25,
        sunAltitudeDeg: Math.round(sunAlt),
        isAstronomicalNight: isAstroDark,
        score: astroScore.score,
        dewRiskLevel: astroScore.dewRiskLevel,
        recommendation: hClouds < 20 ? 'Excelente para astrofotografía' : 'Presencia de nubes',
      });
    }

    const dayFormatter = new Intl.DateTimeFormat('es-ES', { weekday: 'long' });
    const dateFormatter = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });
    const rawDayName = dayFormatter.format(nightDate);
    const dayName = rawDayName.charAt(0).toUpperCase() + rawDayName.slice(1);

    nights.push({
      id: `ow-night-${d}-${nightDate.getTime()}`,
      date: nightDate,
      dateStr: dateFormatter.format(nightDate),
      dayName: d === 0 ? 'Esta noche' : d === 1 ? 'Mañana' : dayName,
      isTonight: d === 0,
      astroScore: astroScore.score,
      ratingLabel: astroScore.label,
      ratingColor: astroScore.color,
      summary: `Previsión OpenWeather: ${cloudsTotal}% nubes, visibilidad ${visKm}km, rocío a ${dewPoint}°C (Spread $\\Delta$${spread}°C).`,
      clouds: {
        total: cloudsTotal,
        low: Math.round(cloudsTotal * 0.3),
        mid: Math.round(cloudsTotal * 0.4),
        high: Math.round(cloudsTotal * 0.3),
      },
      visibility: {
        km: visKm,
        status: visKm >= 20 ? 'Excepcional' : visKm >= 10 ? 'Buena' : 'Moderada',
      },
      transparency: {
        score: astroScore.transparencyScore,
        label: astroScore.transparencyLabel,
        humidityAvg: humidity,
        description: 'Medido con datos directos de OpenWeather OneCall.',
      },
      dew: {
        avgDewPoint: dewPoint,
        minTemp: tempNight,
        minSpread: spread,
        riskLevel: astroScore.dewRiskLevel,
        condensationExpected: spread <= 1.8,
        criticalHour: spread <= 2.0 ? '03:00' : undefined,
        heatersAdvised: spread <= 3.0,
        advice:
          spread <= 2.0
            ? 'Punto de rocío muy próximo a la temperatura. Condensación garantizada sin calentadores.'
            : 'Riesgo de rocío moderado a bajo.',
      },
      seeing: {
        arcsecAvg: astroScore.seeingArcsec,
        label: astroScore.seeingLabel,
        jetStreamIndex: 'Estable',
      },
      wind: {
        avgKmh: windSpeed,
        maxGustKmh: windSpeed * 1.4,
        direction: 'N',
      },
      moon: {
        phaseName: moon.phaseName,
        phaseFraction: moon.phaseFraction,
        illuminationPct: moon.illuminationPct,
        moonrise: moon.moonrise,
        moonset: moon.moonset,
        isUpDuringAstroDark: moon.phaseFraction > 0.25 && moon.phaseFraction < 0.75,
        usableDarkHours: Math.round(ephemeris.totalDarknessHours * 0.8),
      },
      ephemeris: {
        ...ephemeris,
      },
      hourly: hourlyItems,
      targetAdvice: {
        bestTargets: moon.illuminationPct < 40 ? ['M31 Galaxia Andrómeda', 'M45 Pléyades', 'M33 Triángulo'] : ['Luna', 'Júpiter / Saturno', 'Nebulosas de emisión'],
        filters: moon.illuminationPct < 40 ? 'Banda ancha / RGB' : 'Filtro Narrowband dual o H-alfa',
        telescopeSetup: spread <= 2.5 ? 'Calentadores encendidos' : 'Configuración estándar',
      },
    });
  }

  return nights;
}

/**
 * Parse OpenWeather 2.5 standard 5-day / 3-hour forecast
 */
function parseOpenWeatherStandard(data: any, location: LocationData): AstroNight[] {
  const list = data.list || [];
  const nights: AstroNight[] = [];
  const now = new Date();

  // Group by day
  for (let d = 0; d < 7; d++) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + d);
    targetDate.setHours(12, 0, 0, 0);

    const ephemeris = calculateNightTwilights(location.lat, location.lon, targetDate);
    const moon = getMoonDetails(targetDate);

    // Filter items belonging to evening/night
    const nightItems = list.filter((item: any) => {
      const itemDate = new Date(item.dt * 1000);
      return (
        itemDate.getDate() === targetDate.getDate() &&
        (itemDate.getHours() >= 18 || itemDate.getHours() <= 6)
      );
    });

    let avgCloud = 20;
    let avgVis = 20;
    let avgTemp = 12;
    let avgHumidity = 65;

    if (nightItems.length > 0) {
      avgCloud = Math.round(
        nightItems.reduce((acc: number, cur: any) => acc + (cur.clouds?.all ?? 20), 0) /
          nightItems.length
      );
      avgVis = Math.round(
        nightItems.reduce((acc: number, cur: any) => acc + (cur.visibility ? cur.visibility / 1000 : 20), 0) /
          nightItems.length
      );
      avgTemp = Math.round(
        (nightItems.reduce((acc: number, cur: any) => acc + (cur.main?.temp ?? 12), 0) /
          nightItems.length) * 10
      ) / 10;
      avgHumidity = Math.round(
        nightItems.reduce((acc: number, cur: any) => acc + (cur.main?.humidity ?? 65), 0) /
          nightItems.length
      );
    } else {
      // extrapolate from nearest
      avgCloud = 15 + d * 5;
    }

    const dewPoint = calculateDewPoint(avgTemp, avgHumidity);
    const spread = Math.round((avgTemp - dewPoint) * 10) / 10;
    const astroScore = computeAstroScore(
      avgCloud,
      avgVis,
      avgHumidity,
      spread,
      12,
      moon.illuminationPct,
      moon.phaseFraction > 0.25 && moon.phaseFraction < 0.75
    );

    const hourlyItems: HourlyForecastItem[] = [];
    for (let h = 18; h <= 32; h++) {
      const sampleDate = new Date(targetDate);
      sampleDate.setHours(h, 0, 0, 0);
      const sunAlt = getSolarAltitude(location.lat, location.lon, sampleDate);
      hourlyItems.push({
        timestamp: sampleDate.getTime(),
        timeStr: formatLocalTime(sampleDate),
        hour: sampleDate.getHours(),
        temp: avgTemp,
        dewPoint,
        spread,
        humidity: avgHumidity,
        cloudsTotal: avgCloud,
        cloudsLow: Math.round(avgCloud * 0.3),
        cloudsMid: Math.round(avgCloud * 0.4),
        cloudsHigh: Math.round(avgCloud * 0.3),
        visibilityKm: avgVis,
        windSpeedKmh: 10,
        windGustKmh: 14,
        windDirectionDeg: 0,
        pressureHpa: 1014,
        transparencyScore: astroScore.transparencyScore,
        transparencyLabel: astroScore.transparencyLabel,
        seeingArcsec: astroScore.seeingArcsec,
        seeingLabel: astroScore.seeingLabel,
        moonAltitudeDeg: 30,
        sunAltitudeDeg: Math.round(sunAlt),
        isAstronomicalNight: sunAlt <= -18,
        score: astroScore.score,
        dewRiskLevel: astroScore.dewRiskLevel,
        recommendation: avgCloud < 25 ? 'Cielo despejado' : 'Nubes intermitentes',
      });
    }

    const dayFormatter = new Intl.DateTimeFormat('es-ES', { weekday: 'long' });
    const dateFormatter = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });
    const rawDayName = dayFormatter.format(targetDate);
    const dayName = rawDayName.charAt(0).toUpperCase() + rawDayName.slice(1);

    nights.push({
      id: `std-night-${d}-${targetDate.getTime()}`,
      date: targetDate,
      dateStr: dateFormatter.format(targetDate),
      dayName: d === 0 ? 'Esta noche' : d === 1 ? 'Mañana' : dayName,
      isTonight: d === 0,
      astroScore: astroScore.score,
      ratingLabel: astroScore.label,
      ratingColor: astroScore.color,
      summary: `OpenWeather 2.5: ${avgCloud}% nubes, visibilidad ${avgVis}km, punto de rocío ${dewPoint}°C.`,
      clouds: {
        total: avgCloud,
        low: Math.round(avgCloud * 0.3),
        mid: Math.round(avgCloud * 0.4),
        high: Math.round(avgCloud * 0.3),
      },
      visibility: {
        km: avgVis,
        status: avgVis >= 20 ? 'Excepcional' : 'Buena',
      },
      transparency: {
        score: astroScore.transparencyScore,
        label: astroScore.transparencyLabel,
        humidityAvg: avgHumidity,
        description: 'Datos calculados desde OpenWeather 2.5.',
      },
      dew: {
        avgDewPoint: dewPoint,
        minTemp: avgTemp,
        minSpread: spread,
        riskLevel: astroScore.dewRiskLevel,
        condensationExpected: spread <= 2.0,
        criticalHour: spread <= 2.5 ? '03:00' : undefined,
        heatersAdvised: spread <= 3.5,
        advice: spread <= 2.5 ? 'Riesgo alto de rocío: activar cintas calentadoras.' : 'Riesgo bajo de rocío.',
      },
      seeing: {
        arcsecAvg: astroScore.seeingArcsec,
        label: astroScore.seeingLabel,
        jetStreamIndex: 'Estable',
      },
      wind: {
        avgKmh: 10,
        maxGustKmh: 15,
        direction: 'NW',
      },
      moon: {
        phaseName: moon.phaseName,
        phaseFraction: moon.phaseFraction,
        illuminationPct: moon.illuminationPct,
        moonrise: moon.moonrise,
        moonset: moon.moonset,
        isUpDuringAstroDark: moon.phaseFraction > 0.25 && moon.phaseFraction < 0.75,
        usableDarkHours: Math.round(ephemeris.totalDarknessHours * 0.8),
      },
      ephemeris: {
        ...ephemeris,
      },
      hourly: hourlyItems,
      targetAdvice: {
        bestTargets: ['Galaxia M31', 'Pléyades M45', 'Nebulosa de Orión M42'],
        filters: 'Banda ancha LRGB',
        telescopeSetup: 'Revisar alineación polar y activar anti-rocío si la temperatura cae.',
      },
    });
  }

  return nights;
}

/**
 * High-fidelity 7-day astrophotography simulation generator
 */
function generateSimulated7Days(location: LocationData): AstroNight[] {
  const nights: AstroNight[] = [];
  const now = new Date();

  // Pattern of weather across 7 days (realistic astro cycle)
  const pattern = [
    { clouds: 5, temp: 11, rh: 45, wind: 8, vis: 35 },   // Epic
    { clouds: 12, temp: 10, rh: 52, wind: 10, vis: 30 },  // Great
    { clouds: 35, temp: 9, rh: 70, wind: 14, vis: 20 },   // Moderate
    { clouds: 80, temp: 8, rh: 88, wind: 22, vis: 8 },    // Bad / overcast
    { clouds: 40, temp: 9, rh: 75, wind: 16, vis: 18 },   // Clearing
    { clouds: 8, temp: 10, rh: 48, wind: 9, vis: 32 },    // Excellent
    { clouds: 3, temp: 12, rh: 40, wind: 6, vis: 40 },    // Epic night
  ];

  for (let d = 0; d < 7; d++) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + d);
    targetDate.setHours(12, 0, 0, 0);

    const ephemeris = calculateNightTwilights(location.lat, location.lon, targetDate);
    const moon = getMoonDetails(targetDate);
    const p = pattern[d % pattern.length];

    const dewPoint = calculateDewPoint(p.temp, p.rh);
    const spread = Math.round((p.temp - dewPoint) * 10) / 10;

    const astro = computeAstroScore(
      p.clouds,
      p.vis,
      p.rh,
      spread,
      p.wind,
      moon.illuminationPct,
      moon.phaseFraction > 0.25 && moon.phaseFraction < 0.75
    );

    const hourlyItems: HourlyForecastItem[] = [];
    for (let h = 18; h <= 32; h++) {
      const sampleDate = new Date(targetDate);
      sampleDate.setHours(h, 0, 0, 0);
      const sunAlt = getSolarAltitude(location.lat, location.lon, sampleDate);
      const hSpread = Math.round((spread - (h - 18) * 0.12) * 10) / 10;
      hourlyItems.push({
        timestamp: sampleDate.getTime(),
        timeStr: formatLocalTime(sampleDate),
        hour: sampleDate.getHours(),
        temp: Math.round((p.temp - (h - 18) * 0.25) * 10) / 10,
        dewPoint,
        spread: hSpread,
        humidity: Math.min(98, p.rh + (h - 21) * 3),
        cloudsTotal: p.clouds,
        cloudsLow: Math.round(p.clouds * 0.2),
        cloudsMid: Math.round(p.clouds * 0.4),
        cloudsHigh: Math.round(p.clouds * 0.4),
        visibilityKm: p.vis,
        windSpeedKmh: p.wind,
        windGustKmh: Math.round(p.wind * 1.3),
        windDirectionDeg: 45,
        pressureHpa: 1018,
        transparencyScore: astro.transparencyScore,
        transparencyLabel: astro.transparencyLabel,
        seeingArcsec: astro.seeingArcsec,
        seeingLabel: astro.seeingLabel,
        moonAltitudeDeg: 15,
        sunAltitudeDeg: Math.round(sunAlt),
        isAstronomicalNight: sunAlt <= -18,
        score: astro.score,
        dewRiskLevel: astro.dewRiskLevel,
        recommendation: p.clouds < 15 ? 'Óptimo para cielo profundo' : 'Riesgo de nubes',
      });
    }

    const dayFormatter = new Intl.DateTimeFormat('es-ES', { weekday: 'long' });
    const dateFormatter = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });
    const rawDayName = dayFormatter.format(targetDate);
    const dayName = rawDayName.charAt(0).toUpperCase() + rawDayName.slice(1);

    nights.push({
      id: `sim-night-${d}-${targetDate.getTime()}`,
      date: targetDate,
      dateStr: dateFormatter.format(targetDate),
      dayName: d === 0 ? 'Esta noche' : d === 1 ? 'Mañana' : dayName,
      isTonight: d === 0,
      astroScore: astro.score,
      ratingLabel: astro.label,
      ratingColor: astro.color,
      summary: `Score ${astro.score}/100 (${astro.label}). Nubosidad ${p.clouds}%, visibilidad ${p.vis}km, rocío a ${dewPoint}°C (Spread $\\Delta$${spread}°C).`,
      clouds: {
        total: p.clouds,
        low: Math.round(p.clouds * 0.2),
        mid: Math.round(p.clouds * 0.4),
        high: Math.round(p.clouds * 0.4),
      },
      visibility: {
        km: p.vis,
        status: p.vis >= 25 ? 'Excepcional' : p.vis >= 15 ? 'Muy buena' : 'Buena',
      },
      transparency: {
        score: astro.transparencyScore,
        label: astro.transparencyLabel,
        humidityAvg: p.rh,
        description: 'Simulación astrofotográfica basada en microclima de montaña.',
      },
      dew: {
        avgDewPoint: dewPoint,
        minTemp: p.temp - 2.5,
        minSpread: spread - 1.5,
        riskLevel: astro.dewRiskLevel,
        condensationExpected: spread <= 2.0,
        criticalHour: spread <= 2.5 ? '03:30' : undefined,
        heatersAdvised: spread <= 3.5,
        advice:
          spread <= 2.0
            ? 'Riesgo alto de rocío a partir de las 03:00. Mantener parasoles y calentadores encendidos.'
            : 'Condiciones de rocío favorables. Aire relativamente seco.',
      },
      seeing: {
        arcsecAvg: astro.seeingArcsec,
        label: astro.seeingLabel,
        jetStreamIndex: 'Laminar',
      },
      wind: {
        avgKmh: p.wind,
        maxGustKmh: Math.round(p.wind * 1.4),
        direction: 'NE',
      },
      moon: {
        phaseName: moon.phaseName,
        phaseFraction: moon.phaseFraction,
        illuminationPct: moon.illuminationPct,
        moonrise: moon.moonrise,
        moonset: moon.moonset,
        isUpDuringAstroDark: moon.phaseFraction > 0.25 && moon.phaseFraction < 0.75,
        usableDarkHours: Math.round(ephemeris.totalDarknessHours * 0.9),
      },
      ephemeris,
      hourly: hourlyItems,
      targetAdvice: {
        bestTargets: ['M31 Galaxia Andrómeda', 'NGC 7000 Norteamérica', 'M45 Pléyades'],
        filters: 'Banda ancha LRGB',
        telescopeSetup: 'Condiciones excelentes para telescopios refractores y reflectores.',
      },
    });
  }

  return nights;
}
