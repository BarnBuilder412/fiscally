import * as Location from 'expo-location';
import { api } from '@/services/api';

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  IN: 'INR',
  US: 'USD',
  GB: 'GBP',
  AE: 'AED',
  SG: 'SGD',
  CA: 'CAD',
  AU: 'AUD',
  DE: 'EUR',
  FR: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
};

export type LocationBudgetingResult = {
  granted: boolean;
  city?: string;
  country?: string;
  countryCode?: string;
  currency?: string;
};

export const inferCurrencyFromCountry = (countryCode?: string) => {
  if (!countryCode) return 'INR';
  return COUNTRY_TO_CURRENCY[countryCode.toUpperCase()] || 'INR';
};

export const enableLocationAwareBudgeting = async (): Promise<LocationBudgetingResult> => {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    return { granted: false };
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const geocode = await Location.reverseGeocodeAsync({
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  });
  const first = geocode?.[0];
  const countryCode = first?.isoCountryCode?.toUpperCase();
  const currency = inferCurrencyFromCountry(countryCode);

  await api.updateProfile({
    profile: {
      identity: {
        currency,
        locale: countryCode ? `en-${countryCode}` : undefined,
      },
      location: {
        enabled: true,
        city: first?.city || first?.subregion || undefined,
        region: first?.region || undefined,
        country: first?.country || undefined,
        country_code: countryCode,
        latitude: Number(position.coords.latitude.toFixed(4)),
        longitude: Number(position.coords.longitude.toFixed(4)),
        updated_at: new Date().toISOString(),
      },
      preferences: {
        location_budgeting_enabled: true,
      },
    },
  } as any);

  return {
    granted: true,
    city: first?.city || first?.subregion || undefined,
    country: first?.country || undefined,
    countryCode,
    currency,
  };
};

