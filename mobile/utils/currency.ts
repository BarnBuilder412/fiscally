export const currencyToLocale: Record<string, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  AED: 'en-AE',
  SGD: 'en-SG',
  CAD: 'en-CA',
  AUD: 'en-AU',
  JPY: 'ja-JP',
};

export const getLocaleForCurrency = (currencyCode?: string, fallback = 'en-IN') => {
  if (!currencyCode) return fallback;
  return currencyToLocale[currencyCode.toUpperCase()] || fallback;
};

export const formatCurrency = (
  amount: number,
  currencyCode = 'INR',
  locale?: string,
  minimumFractionDigits = 0,
  maximumFractionDigits = 0
) => {
  const safeCurrency = currencyCode.toUpperCase();
  const resolvedLocale = locale || getLocaleForCurrency(safeCurrency);
  return new Intl.NumberFormat(resolvedLocale, {
    style: 'currency',
    currency: safeCurrency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount || 0);
};

export const getCurrencySymbol = (currencyCode = 'INR') => {
  const formatted = formatCurrency(0, currencyCode);
  return formatted.replace(/[0-9.,\s]/g, '') || currencyCode;
};

