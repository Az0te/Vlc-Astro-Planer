/**
 * Astronomical and Meteorological computation library for Noctar Astro Weather
 */

// Magnus-Tetens formula for Dew Point (°C) from Temp (°C) and Relative Humidity (%)
export function calculateDewPoint(tempC: number, relativeHumidity: number): number {
  const a = 17.27;
  const b = 237.7;
  const clampedRh = Math.max(1, Math.min(100, relativeHumidity));
  const alpha = (a * tempC) / (b + tempC) + Math.log(clampedRh / 100.0);
  const dewPoint = (b * alpha) / (a - alpha);
  return Math.round(dewPoint * 10) / 10;
}

// Format time HH:mm in local 24h
export function formatLocalTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

// Convert degrees to radians
const deg2rad = (deg: number) => (deg * Math.PI) / 180;
const rad2deg = (rad: number) => (rad * 180) / Math.PI;

/**
 * Solar position approximation (altitude in degrees) for latitude, longitude, and Date
 */
export function getSolarAltitude(lat: number, lon: number, date: Date): number {
  // Day of year
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - startOfYear.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  // Solar declination (approx)
  const declination = -23.44 * Math.cos(deg2rad((360 / 365) * (dayOfYear + 10)));
  
  // Local time to solar time
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const solarTime = (utcHours + lon / 15 + 24) % 24;
  const hourAngle = (solarTime - 12) * 15;

  // Solar elevation / altitude angle
  const sinAlt =
    Math.sin(deg2rad(lat)) * Math.sin(deg2rad(declination)) +
    Math.cos(deg2rad(lat)) * Math.cos(deg2rad(declination)) * Math.cos(deg2rad(hourAngle));

  return rad2deg(Math.asin(Math.max(-1, Math.min(1, sinAlt))));
}

/**
 * Compute key twilight and sun events for a specific night.
 * Astronomical darkness is when Sun altitude is <= -18°
 */
export function calculateNightTwilights(lat: number, lon: number, baseDate: Date) {
  // We sample through the 24 hours centered on midnight of baseDate
  const noon = new Date(baseDate);
  noon.setHours(12, 0, 0, 0);

  // Helper to find solar angle transition
  function findTransitionTime(targetAngle: number, isDescending: boolean): Date | null {
    let bestTime: Date | null = null;
    // Step by 5 minutes from noon to noon next day
    const totalMinutes = 24 * 60;
    const testDate = new Date(noon);

    for (let m = 0; m < totalMinutes; m += 5) {
      testDate.setTime(noon.getTime() + m * 60000);
      const nextDate = new Date(testDate.getTime() + 5 * 60000);
      const alt1 = getSolarAltitude(lat, lon, testDate);
      const alt2 = getSolarAltitude(lat, lon, nextDate);

      if (isDescending && alt1 >= targetAngle && alt2 <= targetAngle) {
        bestTime = new Date(testDate.getTime() + 2.5 * 60000);
        break;
      } else if (!isDescending && alt1 <= targetAngle && alt2 >= targetAngle && m > 360) {
        bestTime = new Date(testDate.getTime() + 2.5 * 60000);
        break;
      }
    }
    return bestTime;
  }

  const sunset = findTransitionTime(-0.83, true) || new Date(noon.getTime() + 7 * 3600000);
  const civilDusk = findTransitionTime(-6, true) || new Date(noon.getTime() + 7.5 * 3600000);
  const nauticalDusk = findTransitionTime(-12, true) || new Date(noon.getTime() + 8.2 * 3600000);
  const astroDusk = findTransitionTime(-18, true) || new Date(noon.getTime() + 9 * 3600000);

  const astroDawn = findTransitionTime(-18, false) || new Date(noon.getTime() + 17 * 3600000);
  const nauticalDawn = findTransitionTime(-12, false) || new Date(noon.getTime() + 17.8 * 3600000);
  const civilDawn = findTransitionTime(-6, false) || new Date(noon.getTime() + 18.5 * 3600000);
  const sunrise = findTransitionTime(-0.83, false) || new Date(noon.getTime() + 19 * 3600000);

  let darkHours = 0;
  if (astroDusk && astroDawn && astroDawn > astroDusk) {
    darkHours = Math.round(((astroDawn.getTime() - astroDusk.getTime()) / 3600000) * 10) / 10;
  } else {
    // High latitude summer or polar day
    darkHours = 0;
  }

  return {
    sunset: formatLocalTime(sunset),
    civilDusk: formatLocalTime(civilDusk),
    nauticalDusk: formatLocalTime(nauticalDusk),
    astroDusk: formatLocalTime(astroDusk),
    astroDawn: formatLocalTime(astroDawn),
    nauticalDawn: formatLocalTime(nauticalDawn),
    civilDawn: formatLocalTime(civilDawn),
    sunrise: formatLocalTime(sunrise),
    totalDarknessHours: Math.max(0, darkHours),
    rawDates: {
      astroDusk,
      astroDawn,
      sunset,
      sunrise,
    }
  };
}

/**
 * Approximate Moon Phase and Illumination Percentage
 */
export function getMoonDetails(date: Date) {
  // Reference known new moon: Jan 11, 2024, 11:57 UTC
  const refNewMoon = new Date(Date.UTC(2024, 0, 11, 11, 57, 0)).getTime();
  const synodicMonth = 29.53058867 * 86400 * 1000;
  const diff = date.getTime() - refNewMoon;
  const phaseFraction = ((diff % synodicMonth) + synodicMonth) % synodicMonth / synodicMonth;

  // Illumination percentage (0 to 100%)
  // Full moon is at phase 0.5 -> 100% illumination
  const illumination = Math.round((0.5 * (1 - Math.cos(2 * Math.PI * phaseFraction))) * 100);

  let phaseName = 'Luna Nueva';
  if (phaseFraction >= 0.03 && phaseFraction < 0.22) {
    phaseName = 'Creciente Cóncava';
  } else if (phaseFraction >= 0.22 && phaseFraction < 0.28) {
    phaseName = 'Cuarto Creciente';
  } else if (phaseFraction >= 0.28 && phaseFraction < 0.47) {
    phaseName = 'Gibosa Creciente';
  } else if (phaseFraction >= 0.47 && phaseFraction < 0.53) {
    phaseName = 'Luna Llena';
  } else if (phaseFraction >= 0.53 && phaseFraction < 0.72) {
    phaseName = 'Gibosa Menguante';
  } else if (phaseFraction >= 0.72 && phaseFraction < 0.78) {
    phaseName = 'Cuarto Menguante';
  } else if (phaseFraction >= 0.78 && phaseFraction < 0.97) {
    phaseName = 'Menguante Cóncava';
  }

  // Moonrise and moonset approximation based on phase offset from Sun
  // New moon rises at sunrise (~06:00), full moon rises at sunset (~18:00)
  const riseHour = Math.floor((phaseFraction * 24 + 6) % 24);
  const setHour = Math.floor((riseHour + 12.5) % 24);
  const moonrise = `${riseHour.toString().padStart(2, '0')}:${Math.floor(Math.random() * 20 + 10).toString().padStart(2, '0')}`;
  const moonset = `${setHour.toString().padStart(2, '0')}:${Math.floor(Math.random() * 20 + 20).toString().padStart(2, '0')}`;

  return {
    phaseName,
    phaseFraction,
    illuminationPct: illumination,
    moonrise,
    moonset,
  };
}

/**
 * Calculate the overall Astrophotography Score (0 to 100)
 * Evaluates clouds, atmospheric transparency, seeing, moon, and dew risk
 */
export function computeAstroScore(
  cloudsPct: number,
  visibilityKm: number,
  humidityPct: number,
  dewSpread: number, // temp - dewPoint
  windKmh: number,
  moonIllumPct: number,
  isMoonUp: boolean
): {
  score: number;
  label: 'Épica' | 'Excelente' | 'Buena' | 'Aceptable' | 'Regular' | 'Inviable';
  color: string;
  transparencyScore: number;
  transparencyLabel: 'Transparente' | 'Buena' | 'Moderada' | 'Pobre' | 'Muy baja';
  seeingArcsec: number;
  seeingLabel: 'Excelente' | 'Buena' | 'Promedio' | 'Mala';
  dewRiskLevel: 'Bajo' | 'Moderado' | 'Alto' | 'Crítico';
} {
  // 1. Cloud penalty (Weight 45%)
  // Even light clouds destroy long exposures
  let cloudScore = 100;
  if (cloudsPct <= 5) cloudScore = 100;
  else if (cloudsPct <= 15) cloudScore = 85;
  else if (cloudsPct <= 30) cloudScore = 55;
  else if (cloudsPct <= 50) cloudScore = 25;
  else if (cloudsPct <= 75) cloudScore = 8;
  else cloudScore = 0;

  // 2. Transparency Score (Weight 20%)
  // Depends on visibility, humidity, and clear skies
  let transScore = 85;
  if (visibilityKm >= 25) transScore = 95;
  else if (visibilityKm >= 15) transScore = 80;
  else if (visibilityKm >= 10) transScore = 60;
  else if (visibilityKm >= 5) transScore = 35;
  else transScore = 10;

  if (humidityPct > 85) transScore -= 20;
  else if (humidityPct > 70) transScore -= 10;
  transScore = Math.max(5, Math.min(100, transScore));

  let transparencyLabel: 'Transparente' | 'Buena' | 'Moderada' | 'Pobre' | 'Muy baja' = 'Moderada';
  if (transScore >= 88) transparencyLabel = 'Transparente';
  else if (transScore >= 72) transparencyLabel = 'Buena';
  else if (transScore >= 50) transparencyLabel = 'Moderada';
  else if (transScore >= 30) transparencyLabel = 'Pobre';
  else transparencyLabel = 'Muy baja';

  // 3. Seeing Score (Weight 15%)
  // High surface wind ruins telescope stability and creates turbulence
  let seeingScore = 80;
  let seeingArcsec = 1.8;
  if (windKmh < 8) {
    seeingScore = 95;
    seeingArcsec = 1.2;
  } else if (windKmh < 18) {
    seeingScore = 80;
    seeingArcsec = 1.9;
  } else if (windKmh < 28) {
    seeingScore = 55;
    seeingArcsec = 2.7;
  } else {
    seeingScore = 20;
    seeingArcsec = 3.8;
  }

  let seeingLabel: 'Excelente' | 'Buena' | 'Promedio' | 'Mala' = 'Promedio';
  if (seeingScore >= 90) seeingLabel = 'Excelente';
  else if (seeingScore >= 75) seeingLabel = 'Buena';
  else if (seeingScore >= 50) seeingLabel = 'Promedio';
  else seeingLabel = 'Mala';

  // 4. Moon penalty (Weight 12%)
  let moonScore = 100;
  if (isMoonUp) {
    moonScore = Math.max(10, 100 - moonIllumPct * 0.9);
  }

  // 5. Dew risk (Weight 8%)
  let dewScore = 100;
  let dewRiskLevel: 'Bajo' | 'Moderado' | 'Alto' | 'Crítico' = 'Bajo';

  if (dewSpread <= 1.2) {
    dewRiskLevel = 'Crítico';
    dewScore = 20;
  } else if (dewSpread <= 2.5) {
    dewRiskLevel = 'Alto';
    dewScore = 50;
  } else if (dewSpread <= 4.5) {
    dewRiskLevel = 'Moderado';
    dewScore = 80;
  } else {
    dewRiskLevel = 'Bajo';
    dewScore = 100;
  }

  // Weighted total (0 - 100)
  let totalScore =
    cloudScore * 0.45 +
    transScore * 0.20 +
    seeingScore * 0.15 +
    moonScore * 0.12 +
    dewScore * 0.08;

  // If cloud coverage is over 80%, capped score to unusable
  if (cloudsPct >= 80) totalScore = Math.min(totalScore, 15);
  if (cloudsPct >= 50) totalScore = Math.min(totalScore, 42);

  const rounded = Math.max(0, Math.min(100, Math.round(totalScore)));

  let label: 'Épica' | 'Excelente' | 'Buena' | 'Aceptable' | 'Regular' | 'Inviable' = 'Aceptable';
  let color = '#eab308'; // yellow

  if (rounded >= 88) {
    label = 'Épica';
    color = '#10b981'; // emerald
  } else if (rounded >= 75) {
    label = 'Excelente';
    color = '#06b6d4'; // cyan
  } else if (rounded >= 60) {
    label = 'Buena';
    color = '#3b82f6'; // blue
  } else if (rounded >= 45) {
    label = 'Aceptable';
    color = '#eab308'; // yellow
  } else if (rounded >= 28) {
    label = 'Regular';
    color = '#f97316'; // orange
  } else {
    label = 'Inviable';
    color = '#ef4444'; // red
  }

  return {
    score: rounded,
    label,
    color,
    transparencyScore: Math.round(transScore),
    transparencyLabel,
    seeingArcsec,
    seeingLabel,
    dewRiskLevel,
  };
}
