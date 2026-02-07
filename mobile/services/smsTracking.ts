import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionsAndroid, Platform } from 'react-native';
import { api } from '@/services/api';
import { eventBus, Events } from '@/services/eventBus';

type ParsedSmsTransaction = {
  amount: number;
  merchant?: string;
  category?: string;
  transactionAt?: string;
  rawSms?: string;
  sender?: string;
  dedupeKey?: string;
};

type SmsRecord = {
  address?: string;
  body?: string;
  date?: number;
};

const SMS_TRACKING_ENABLED_KEY = 'sms_tracking_enabled';
const SMS_DEDUPE_CACHE_KEY = 'sms_tracking_dedupe_cache';
const SMS_LAST_SYNC_TS_KEY = 'sms_last_sync_ts';
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
  if (name.includes('swiggy') || name.includes('zomato') || name.includes('cafe')) return 'food_delivery';
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
  const category = parsed.category || 'other';
  return `${date}|${sender}|${amount}|${merchant}|${category}`;
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

const getLastSyncTimestamp = async (): Promise<number> => {
  try {
    const raw = await AsyncStorage.getItem(SMS_LAST_SYNC_TS_KEY);
    if (!raw) return 0;
    const value = Number(raw);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
};

const saveLastSyncTimestamp = async (timestampMs: number) => {
  await AsyncStorage.setItem(SMS_LAST_SYNC_TS_KEY, String(timestampMs));
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
    rawSms: body || undefined,
    sender: sender || undefined,
    dedupeKey: undefined,
  };
};

const fetchInboxSms = async (minDateMs?: number): Promise<SmsRecord[]> => {
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
    const filter: Record<string, any> = { box: 'inbox', maxCount: 120 };
    if (minDateMs && minDateMs > 0) {
      // Pull a small overlap window to handle delayed SMS timestamps safely.
      filter.minDate = Math.max(0, minDateMs - 10 * 60 * 1000);
    }
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

  const lastSyncTimestamp = await getLastSyncTimestamp();
  const inbox = await fetchInboxSms(lastSyncTimestamp);
  if (!inbox.length) return;

  const dedupeCache = await getDedupeCache();
  const dedupeSet = new Set(dedupeCache);
  let newestTimestamp = lastSyncTimestamp;
  const batchPayload: Array<{
    amount: number;
    merchant?: string;
    category?: string;
    transaction_at?: string;
    raw_sms?: string;
    sms_sender?: string;
    dedupe_key?: string;
  }> = [];
  const sentKeys: string[] = [];

  for (const sms of inbox) {
    const smsDate = Number(sms.date || 0);
    if (smsDate > newestTimestamp) newestTimestamp = smsDate;

    const parsed = parseSmsToTransaction(sms);
    if (!parsed) continue;

    const dedupeKey = createDedupKey(sms, parsed);
    if (dedupeSet.has(dedupeKey)) continue;
    parsed.dedupeKey = dedupeKey;
    batchPayload.push({
      amount: parsed.amount,
      merchant: parsed.merchant,
      category: parsed.category || 'other',
      transaction_at: parsed.transactionAt,
      raw_sms: parsed.rawSms,
      sms_sender: parsed.sender,
      dedupe_key: dedupeKey,
    });
    sentKeys.push(dedupeKey);
  }

  if (!batchPayload.length) {
    if (newestTimestamp > lastSyncTimestamp) {
      await saveLastSyncTimestamp(newestTimestamp);
    }
    return;
  }

  try {
    const result = await api.ingestSmsTransactionsBatch(batchPayload);
    for (const key of sentKeys) dedupeSet.add(key);
    await saveDedupeCache(Array.from(dedupeSet));
    if (newestTimestamp > lastSyncTimestamp) {
      await saveLastSyncTimestamp(newestTimestamp);
    }
    if (result.created_count > 0) {
      eventBus.emit(Events.TRANSACTION_ADDED);
    }
  } catch (error) {
    console.warn('SMS batch sync failed, falling back to single inserts:', error);
    let changed = false;
    for (const payload of batchPayload) {
      try {
        await api.createTransaction({
          amount: payload.amount,
          merchant: payload.merchant,
          category: payload.category,
          source: 'sms',
          transaction_at: payload.transaction_at,
          raw_sms: payload.raw_sms,
        });
        if (payload.dedupe_key) {
          dedupeSet.add(payload.dedupe_key);
        }
        changed = true;
      } catch (singleError) {
        console.warn('SMS single sync failed:', singleError);
      }
    }
    if (changed) {
      await saveDedupeCache(Array.from(dedupeSet));
      if (newestTimestamp > lastSyncTimestamp) {
        await saveLastSyncTimestamp(newestTimestamp);
      }
      eventBus.emit(Events.TRANSACTION_ADDED);
    }
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
