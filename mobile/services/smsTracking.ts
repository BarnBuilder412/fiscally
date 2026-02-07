import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionsAndroid, Platform } from 'react-native';
import { api } from '@/services/api';
import { eventBus, Events } from '@/services/eventBus';

type ParsedSmsTransaction = {
  amount: number;
  merchant?: string;
  category?: string;
  transactionAt?: string;
};

type SmsRecord = {
  address?: string;
  body?: string;
  date?: number;
};

const SMS_TRACKING_ENABLED_KEY = 'sms_tracking_enabled';
const SMS_DEDUPE_CACHE_KEY = 'sms_tracking_dedupe_cache';
const SMS_POLL_INTERVAL_MS = 3 * 60 * 1000;
const MAX_CACHE_SIZE = 400;

const BANK_SENDER_PATTERN = /(HDFCBK|SBIINB|ICICIB|AXISBK|KOTAKB|PAYTM|UPI|AMZPAY|HDFCCC|SBICRD)/i;
const AMOUNT_PATTERNS = [
  /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i,
  /debited for (?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{2})?)/i,
  /(?:spent|paid)\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{2})?)/i,
];
const MERCHANT_PATTERNS = [
  /(?:at|to|VPA)\s+([A-Za-z][A-Za-z0-9\s]+?)(?:\.|,|$)/i,
  /\(([A-Z][A-Za-z0-9\s]+?)\)/,
];

let pollTimer: ReturnType<typeof setInterval> | null = null;

const parseAmount = (body: string): number | null => {
  for (const pattern of AMOUNT_PATTERNS) {
    const match = body.match(pattern);
    if (match?.[1]) {
      const normalized = match[1].replace(/,/g, '');
      const amount = parseFloat(normalized);
      if (!Number.isNaN(amount) && amount > 0) {
        return amount;
      }
    }
  }
  return null;
};

const parseMerchant = (body: string): string | undefined => {
  for (const pattern of MERCHANT_PATTERNS) {
    const match = body.match(pattern);
    if (match?.[1]) {
      const cleaned = match[1].trim();
      if (cleaned.length > 1) return cleaned.slice(0, 80);
    }
  }
  return undefined;
};

const inferCategory = (merchant?: string): string => {
  const name = (merchant || '').toLowerCase();
  if (name.includes('swiggy') || name.includes('zomato') || name.includes('cafe')) return 'food';
  if (name.includes('uber') || name.includes('ola') || name.includes('rapido')) return 'transport';
  if (name.includes('amazon') || name.includes('flipkart') || name.includes('myntra')) return 'shopping';
  if (name.includes('electric') || name.includes('airtel') || name.includes('jio')) return 'bills';
  return 'other';
};

const createDedupKey = (sms: SmsRecord, parsed: ParsedSmsTransaction) => {
  const date = sms.date || 0;
  const sender = sms.address || '';
  const amount = parsed.amount.toFixed(2);
  const merchant = parsed.merchant || '';
  return `${date}|${sender}|${amount}|${merchant}`;
};

const getDedupeCache = async (): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(SMS_DEDUPE_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveDedupeCache = async (cache: string[]) => {
  const normalized = cache.slice(-MAX_CACHE_SIZE);
  await AsyncStorage.setItem(SMS_DEDUPE_CACHE_KEY, JSON.stringify(normalized));
};

const parseSmsToTransaction = (sms: SmsRecord): ParsedSmsTransaction | null => {
  const sender = sms.address || '';
  const body = sms.body || '';
  if (!BANK_SENDER_PATTERN.test(sender) && !BANK_SENDER_PATTERN.test(body)) return null;

  const amount = parseAmount(body);
  if (!amount) return null;

  const merchant = parseMerchant(body);
  const category = inferCategory(merchant);

  return {
    amount,
    merchant,
    category,
    transactionAt: sms.date ? new Date(sms.date).toISOString() : undefined,
  };
};

const fetchInboxSms = async (): Promise<SmsRecord[]> => {
  if (Platform.OS !== 'android') return [];

  let smsAndroid: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    smsAndroid = require('react-native-get-sms-android');
  } catch {
    return [];
  }
  if (!smsAndroid?.list) return [];

  return new Promise((resolve) => {
    const filter = { box: 'inbox', maxCount: 80 };
    smsAndroid.list(
      JSON.stringify(filter),
      () => resolve([]),
      (_count: number, smsList: string) => {
        try {
          const parsed = JSON.parse(smsList);
          resolve(Array.isArray(parsed) ? parsed : []);
        } catch {
          resolve([]);
        }
      }
    );
  });
};

export const requestSmsPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;

  const receive = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS);
  const read = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS);
  return receive === PermissionsAndroid.RESULTS.GRANTED && read === PermissionsAndroid.RESULTS.GRANTED;
};

export const syncSmsTransactions = async () => {
  if (Platform.OS !== 'android') return;

  const inbox = await fetchInboxSms();
  if (!inbox.length) return;

  const dedupeCache = await getDedupeCache();
  const dedupeSet = new Set(dedupeCache);
  let changed = false;

  for (const sms of inbox) {
    const parsed = parseSmsToTransaction(sms);
    if (!parsed) continue;

    const dedupeKey = createDedupKey(sms, parsed);
    if (dedupeSet.has(dedupeKey)) continue;

    try {
      await api.createTransaction({
        amount: parsed.amount,
        merchant: parsed.merchant,
        category: parsed.category || 'other',
        source: 'sms',
      });
      dedupeSet.add(dedupeKey);
      changed = true;
    } catch (error) {
      console.warn('SMS sync createTransaction failed:', error);
    }
  }

  if (changed) {
    await saveDedupeCache(Array.from(dedupeSet));
    eventBus.emit(Events.TRANSACTION_ADDED);
  }
};

export const startSmsTracking = async () => {
  if (Platform.OS !== 'android') return;
  await AsyncStorage.setItem(SMS_TRACKING_ENABLED_KEY, 'true');

  if (pollTimer) clearInterval(pollTimer);
  await syncSmsTransactions();
  pollTimer = setInterval(syncSmsTransactions, SMS_POLL_INTERVAL_MS);
};

export const stopSmsTracking = async () => {
  await AsyncStorage.setItem(SMS_TRACKING_ENABLED_KEY, 'false');
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
};

export const isSmsTrackingEnabled = async () => {
  const value = await AsyncStorage.getItem(SMS_TRACKING_ENABLED_KEY);
  return value === 'true';
};

export const restoreSmsTracking = async () => {
  if (Platform.OS !== 'android') return;
  const enabled = await isSmsTrackingEnabled();
  if (enabled) {
    await startSmsTracking();
  }
};

