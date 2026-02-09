import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionsAndroid, Platform } from 'react-native';
import { api } from '@/services/api';
import { eventBus, Events } from '@/services/eventBus';

type ParsedSmsTransaction = {
  amount: number;
  merchant?: string;
  category?: string;
  transactionAt?: string;
  sender?: string;
  dedupeKey?: string;
};

type SmsRecord = {
  address?: string;
  body?: string;
  date?: number;
};

export type SmsTrackingStartResult = {
  started: boolean;
  reason?: 'android_only' | 'module_unavailable' | 'permission_denied' | 'sync_failed';
};

const SMS_TRACKING_ENABLED_KEY = 'sms_tracking_enabled';
const SMS_DEDUPE_CACHE_KEY = 'sms_tracking_dedupe_cache';
const SMS_LAST_SYNC_TS_KEY = 'sms_last_sync_ts';
const SMS_BASELINE_INITIALIZED_KEY = 'sms_tracking_baseline_initialized';
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

const getSmsModule = () => {
  if (Platform.OS !== 'android') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const smsAndroid = require('react-native-get-sms-android');
    return smsAndroid?.list ? smsAndroid : null;
  } catch {
    return null;
  }
};

export const isSmsModuleAvailable = (): boolean => {
  return getSmsModule() !== null;
};

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

const hashSignature = (value: string): string => {
  let a = 5381;
  let b = 52711;
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    a = ((a << 5) + a) ^ code;
    b = ((b << 5) + b) ^ (code * 131);
  }
  const first = (a >>> 0).toString(16).padStart(8, '0');
  const second = (b >>> 0).toString(16).padStart(8, '0');
  return `${first}${second}`;
};

const createDedupKey = (sms: SmsRecord, parsed: ParsedSmsTransaction) => {
  const date = sms.date || 0;
  const sender = sms.address || '';
  const amount = parsed.amount.toFixed(2);
  const merchant = parsed.merchant || '';
  const category = parsed.category || 'other';
  const canonical = `${date}|${sender}|${amount}|${merchant}|${category}`;
  return hashSignature(canonical);
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

const ensureSyncBaseline = async (): Promise<boolean> => {
  const [baselineFlag, rawLastSync] = await Promise.all([
    AsyncStorage.getItem(SMS_BASELINE_INITIALIZED_KEY),
    AsyncStorage.getItem(SMS_LAST_SYNC_TS_KEY),
  ]);
  const parsedLastSync = Number(rawLastSync);
  const hasValidLastSync = Number.isFinite(parsedLastSync) && parsedLastSync > 0;

  if (baselineFlag === '1' && hasValidLastSync) {
    return false;
  }

  const now = Date.now();
  await Promise.all([
    AsyncStorage.setItem(SMS_BASELINE_INITIALIZED_KEY, '1'),
    saveLastSyncTimestamp(now),
  ]);
  return true;
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
    sender: sender || undefined,
    dedupeKey: undefined,
  };
};

const fetchInboxSms = async (minDateMs?: number): Promise<SmsRecord[]> => {
  if (Platform.OS !== 'android') return [];

  const smsAndroid = getSmsModule();
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

const hasSmsPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;
  const hasReceive = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS);
  const hasRead = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
  return hasReceive && hasRead;
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
    sms_sender?: string;
    sms_signature?: string;
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
      sms_sender: parsed.sender,
      sms_signature: dedupeKey,
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
        });
        if (payload.sms_signature) {
          dedupeSet.add(payload.sms_signature);
        } else if (payload.dedupe_key) {
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

export const startSmsTracking = async (): Promise<SmsTrackingStartResult> => {
  if (Platform.OS !== 'android') {
    return { started: false, reason: 'android_only' };
  }
  if (!isSmsModuleAvailable()) {
    return { started: false, reason: 'module_unavailable' };
  }
  if (!(await hasSmsPermissions())) {
    return { started: false, reason: 'permission_denied' };
  }

  await AsyncStorage.setItem(SMS_TRACKING_ENABLED_KEY, 'true');

  if (pollTimer) clearInterval(pollTimer);
  const baselineJustInitialized = await ensureSyncBaseline();
  if (!baselineJustInitialized) {
    try {
      await syncSmsTransactions();
    } catch (error) {
      console.warn('Initial SMS sync failed:', error);
      return { started: false, reason: 'sync_failed' };
    }
  }
  pollTimer = setInterval(() => {
    syncSmsTransactions().catch((error) => {
      console.warn('SMS polling sync failed:', error);
    });
  }, SMS_POLL_INTERVAL_MS);

  return { started: true };
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
    const result = await startSmsTracking();
    if (!result.started) {
      await AsyncStorage.setItem(SMS_TRACKING_ENABLED_KEY, 'false');
    }
  }
};
