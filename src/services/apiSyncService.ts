import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { MultiModelSettings, LocationData, WeatherProviderId } from '../types';

export interface SyncPayloadData {
  v: 1;
  app: 'vlc-astro';
  t: number;
  settings: MultiModelSettings;
  location?: LocationData;
}

export interface ParsedSyncResult {
  valid: boolean;
  settings?: MultiModelSettings;
  location?: LocationData;
  timestamp?: number;
  providerCount?: number;
  activeProvidersSummary?: { id: WeatherProviderId; name: string; hasKey: boolean; enabled: boolean }[];
  error?: string;
}

const PROVIDER_NAMES: Record<WeatherProviderId, string> = {
  openmeteo: 'Open-Meteo',
  openweather: 'OpenWeather',
  pirateweather: 'PirateWeather',
  meteoblue: 'Meteoblue',
};

/**
 * Encodes the API settings (and optional location) into a portable sync string.
 */
export function serializeSyncPayload(
  settings: MultiModelSettings,
  location?: LocationData,
  includeLocation: boolean = false
): string {
  const payload: SyncPayloadData = {
    v: 1,
    app: 'vlc-astro',
    t: Date.now(),
    settings,
    location: includeLocation ? location : undefined,
  };

  const jsonString = JSON.stringify(payload);
  // Base64 encode for compact QR representation
  try {
    return btoa(unescape(encodeURIComponent(jsonString)));
  } catch {
    return btoa(jsonString);
  }
}

/**
 * Generates the full shareable URL containing the sync payload in hash.
 * This allows a phone camera to open the web app directly and import with 1 tap.
 */
export function getSyncShareUrl(
  settings: MultiModelSettings,
  location?: LocationData,
  includeLocation: boolean = false
): string {
  const encoded = serializeSyncPayload(settings, location, includeLocation);
  const baseUrl = typeof window !== 'undefined' && window.location.origin
    ? `${window.location.origin}${window.location.pathname}`
    : 'https://Az0te.github.io/Vlc-Astro-Planer';

  return `${baseUrl}#sync=${encodeURIComponent(encoded)}`;
}

/**
 * Generates a clean JSON file string for downloading / manual backup.
 */
export function getSyncJsonExport(
  settings: MultiModelSettings,
  location?: LocationData,
  includeLocation: boolean = false
): string {
  const payload: SyncPayloadData = {
    v: 1,
    app: 'vlc-astro',
    t: Date.now(),
    settings,
    location: includeLocation ? location : undefined,
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Parses raw text, URL, base64 or JSON into verified settings.
 */
export function parseSyncPayload(input: string): ParsedSyncResult {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Código o texto vacío.' };
  }

  const trimmed = input.trim();
  let jsonStr = '';

  // 1. Check if it's a URL with #sync= or ?sync=
  if (trimmed.includes('sync=')) {
    try {
      const match = trimmed.match(/[#&?]sync=([^&]+)/);
      if (match && match[1]) {
        const decodedParam = decodeURIComponent(match[1]);
        jsonStr = decodeURIComponent(escape(atob(decodedParam)));
      }
    } catch {
      // fallback to direct base64 attempt below
    }
  }

  // 2. Check if it's direct JSON
  if (!jsonStr && trimmed.startsWith('{') && trimmed.endsWith('}')) {
    jsonStr = trimmed;
  }

  // 3. Try Base64 decode directly
  if (!jsonStr) {
    try {
      jsonStr = decodeURIComponent(escape(atob(trimmed)));
    } catch {
      try {
        jsonStr = atob(trimmed);
      } catch {
        // Not base64
      }
    }
  }

  if (!jsonStr) {
    return { valid: false, error: 'No se pudo decodificar el formato de datos QR/código.' };
  }

  try {
    const parsed = JSON.parse(jsonStr);

    // Validate that it has settings or providers
    let settingsToUse: MultiModelSettings | null = null;
    let locationToUse: LocationData | undefined = undefined;

    if (parsed.settings && parsed.settings.providers) {
      settingsToUse = parsed.settings;
      locationToUse = parsed.location;
    } else if (parsed.providers) {
      // Direct MultiModelSettings format
      settingsToUse = parsed as MultiModelSettings;
    } else if (parsed.openweather || parsed.apiKey || parsed.openmeteo) {
      // Legacy simple object format
      settingsToUse = {
        strategy: 'average',
        providers: {
          openmeteo: { enabled: true, apiKey: parsed.openmeteo?.apiKey || '' },
          openweather: { enabled: Boolean(parsed.apiKey || parsed.openweather?.apiKey), apiKey: parsed.apiKey || parsed.openweather?.apiKey || '' },
          pirateweather: { enabled: Boolean(parsed.pirateweather?.apiKey), apiKey: parsed.pirateweather?.apiKey || '' },
          meteoblue: { enabled: Boolean(parsed.meteoblue?.apiKey), apiKey: parsed.meteoblue?.apiKey || '' },
        },
      };
    }

    if (!settingsToUse || !settingsToUse.providers) {
      return { valid: false, error: 'El archivo o QR no contiene proveedores de API válidos.' };
    }

    // Sanitize and ensure all provider keys exist with string values
    const sanitizedProviders: MultiModelSettings['providers'] = {
      openmeteo: {
        enabled: Boolean(settingsToUse.providers.openmeteo?.enabled),
        apiKey: String(settingsToUse.providers.openmeteo?.apiKey || '').trim(),
      },
      openweather: {
        enabled: Boolean(settingsToUse.providers.openweather?.enabled),
        apiKey: String(settingsToUse.providers.openweather?.apiKey || '').trim(),
      },
      pirateweather: {
        enabled: Boolean(settingsToUse.providers.pirateweather?.enabled),
        apiKey: String(settingsToUse.providers.pirateweather?.apiKey || '').trim(),
      },
      meteoblue: {
        enabled: Boolean(settingsToUse.providers.meteoblue?.enabled),
        apiKey: String(settingsToUse.providers.meteoblue?.apiKey || '').trim(),
      },
    };

    const finalSettings: MultiModelSettings = {
      strategy: ['worst', 'average', 'best'].includes(settingsToUse.strategy)
        ? settingsToUse.strategy
        : 'average',
      providers: sanitizedProviders,
    };

    // Build human readable summary
    const activeProvidersSummary = (['openmeteo', 'openweather', 'pirateweather', 'meteoblue'] as WeatherProviderId[]).map(
      (id) => ({
        id,
        name: PROVIDER_NAMES[id],
        hasKey: sanitizedProviders[id].apiKey.length > 0,
        enabled: sanitizedProviders[id].enabled,
      })
    );

    const providerCount = activeProvidersSummary.filter((p) => p.hasKey || (p.id === 'openmeteo' && p.enabled)).length;

    return {
      valid: true,
      settings: finalSettings,
      location: locationToUse,
      timestamp: parsed.t || Date.now(),
      providerCount,
      activeProvidersSummary,
    };
  } catch (err: any) {
    return { valid: false, error: `Error de sintaxis: ${err.message || 'JSON inválido'}` };
  }
}

/**
 * Generates high quality QR code data URL (PNG)
 */
export async function generateQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 8,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}

/**
 * Scans an HTML canvas / ImageData for a QR code using jsQR
 */
export function scanQrFromImageData(imageData: ImageData): string | null {
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'dontInvert',
  });
  return code ? code.data : null;
}

/**
 * Decodes QR code from an image File (e.g. uploaded screenshot or photo)
 */
export async function scanQrFromFile(file: File): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo inicializar canvas'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const result = scanQrFromImageData(imageData);
        resolve(result);
      };
      img.onerror = () => reject(new Error('Error al cargar la imagen'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsDataURL(file);
  });
}
