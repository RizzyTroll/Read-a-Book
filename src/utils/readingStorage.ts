export interface ReadRecord {
  bookId: string;
  read: boolean;
  readAt: string; // ISO string
  category: string;
}

export type ReadStatusMap = Record<string, ReadRecord>;

const STORAGE_KEY = 'daily_book_lab_read_status_v1';

export function getStoredReadStatus(): ReadStatusMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse read status from localStorage', err);
    return {};
  }
}

export function saveReadStatus(map: ReadStatusMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.error('Failed to save read status to localStorage', err);
  }
}

export function toggleBookReadStatus(
  bookId: string,
  category: string
): { isRead: boolean; updatedMap: ReadStatusMap } {
  const current = getStoredReadStatus();
  const existing = current[bookId];

  let isRead = false;
  if (existing && existing.read) {
    // Unmark
    delete current[bookId];
    isRead = false;
  } else {
    // Mark as read
    current[bookId] = {
      bookId,
      read: true,
      readAt: new Date().toISOString(),
      category,
    };
    isRead = true;
  }

  saveReadStatus(current);
  return { isRead, updatedMap: current };
}
