import { useState, useEffect } from 'react';

/**
 * Platform detection utility for Android (Capacitor native app or mobile browser)
 */
export function isAndroidPlatform(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Check Capacitor native runtime
  const cap = (window as any).Capacitor;
  if (cap?.getPlatform?.() === 'android') {
    return true;
  }
  if (cap?.isNativePlatform?.() && /Android/i.test(navigator.userAgent)) {
    return true;
  }

  // 2. Check Android user-agent
  if (/Android/i.test(navigator.userAgent)) {
    return true;
  }

  // 3. User override / testing flag in localStorage
  try {
    const override = localStorage.getItem('vlc_force_platform');
    if (override === 'android') return true;
  } catch {
    // ignore
  }

  return false;
}

/**
 * Hook to reactively check if running on Android
 */
export function useIsAndroid(): boolean {
  const [isAndroid, setIsAndroid] = useState<boolean>(() => isAndroidPlatform());

  useEffect(() => {
    setIsAndroid(isAndroidPlatform());
  }, []);

  return isAndroid;
}
