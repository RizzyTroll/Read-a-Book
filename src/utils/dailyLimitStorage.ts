export const DAILY_BOOK_ADD_LIMIT = 5;

const STORAGE_PREFIX = 'read_a_book_daily_adds_v1_';

export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface DailyAddRecord {
  dateKey: string;
  count: number;
}

export function getLocalDailyAddedCount(userKey: string, dateKey: string = getLocalDateKey()): number {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userKey || 'guest'}`);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as DailyAddRecord;
    if (parsed && parsed.dateKey === dateKey && typeof parsed.count === 'number') {
      return Math.max(0, Math.min(DAILY_BOOK_ADD_LIMIT, Math.floor(parsed.count)));
    }
  } catch {
    // ignore storage errors
  }
  return 0;
}

export function setLocalDailyAddedCount(
  userKey: string,
  count: number,
  dateKey: string = getLocalDateKey()
): number {
  const safeCount = Math.max(0, Math.min(DAILY_BOOK_ADD_LIMIT, Math.floor(count) || 0));
  try {
    const record: DailyAddRecord = { dateKey, count: safeCount };
    localStorage.setItem(`${STORAGE_PREFIX}${userKey || 'guest'}`, JSON.stringify(record));
  } catch {
    // ignore storage errors
  }
  return safeCount;
}

export function incrementLocalDailyAddedCount(
  userKey: string,
  delta: number,
  dateKey: string = getLocalDateKey()
): number {
  const current = getLocalDailyAddedCount(userKey, dateKey);
  return setLocalDailyAddedCount(userKey, current + Math.max(0, delta), dateKey);
}
