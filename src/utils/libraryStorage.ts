import { Book } from '../types';

const STORAGE_KEY = 'read_a_book_permanent_library_v1';

/**
 * Retrieve all permanently stored books from browser localStorage
 */
export function getStoredLibrary(): Book[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.error('Failed to read library from localStorage:', err);
  }
  return [];
}

/**
 * Persist the entire library array permanently to browser localStorage
 */
export function saveStoredLibrary(books: Book[]): void {
  try {
    if (!Array.isArray(books)) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  } catch (err) {
    console.error('Failed to save library to localStorage:', err);
  }
}

/**
 * Normalizes title for deduplication comparison
 */
export function normalizeTitle(title: string): string {
  return (title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Computes a deterministic richness score for a book summary so updated starter
 * books with deeper structure, insights, and implementation steps always upgrade older copies.
 */
export function getBookDetailScore(book: Partial<Book> | null | undefined): number {
  if (!book) return 0;
  const structure = Array.isArray(book.structure) ? book.structure : [];
  const insights = Array.isArray(book.keyInsights) ? book.keyInsights : [];
  const daily = Array.isArray(book.dailyImplementation) ? book.dailyImplementation : [];

  const structureTextLen = structure.reduce(
    (sum, part) =>
      sum +
      (part?.partTitle?.length || 0) +
      (part?.keyIdea?.length || 0) +
      (part?.realLifeExample?.length || 0) +
      (part?.whyItMatters?.length || 0),
    0
  );
  const insightsTextLen = insights.reduce((sum, s) => sum + (s?.length || 0), 0);
  const dailyTextLen = daily.reduce((sum, s) => sum + (s?.length || 0), 0);
  const metaTextLen =
    (book.thesis?.length || 0) +
    (book.qualificationRationale?.length || 0) +
    (book.conflictNote?.length || 0) +
    (book.strengthWeakness?.length || 0);

  return (
    structure.length * 1000 +
    insights.length * 150 +
    daily.length * 150 +
    structureTextLen +
    insightsTextLen +
    dailyTextLen +
    metaTextLen
  );
}

export function isBookRicher(candidate: Partial<Book>, current: Partial<Book>): boolean {
  return getBookDetailScore(candidate) > getBookDetailScore(current);
}

/**
 * Merges two book collections without duplicate titles or IDs,
 * preserving the richer more detailed version when duplicates exist.
 */
export function mergeLibraries(
  serverBooks: Book[],
  localBooks: Book[]
): { merged: Book[]; newForServer: Book[] } {
  const merged: Book[] = [...serverBooks];
  const newForServer: Book[] = [];

  const serverByNorm = new Map<string, number>();
  serverBooks.forEach((b, idx) => {
    serverByNorm.set(normalizeTitle(b.title), idx);
  });
  const existingIds = new Set(serverBooks.map((b) => b.id));

  for (const localBook of localBooks) {
    if (!localBook || !localBook.title) continue;
    const norm = normalizeTitle(localBook.title);
    const serverIdx = serverByNorm.get(norm);

    if (serverIdx === undefined && !existingIds.has(localBook.id)) {
      merged.push(localBook);
      newForServer.push(localBook);
      serverByNorm.set(norm, merged.length - 1);
      existingIds.add(localBook.id);
    } else if (serverIdx !== undefined) {
      const serverBook = merged[serverIdx];
      if (isBookRicher(localBook, serverBook)) {
        merged[serverIdx] = localBook;
      }
    }
  }

  return { merged, newForServer };
}

/**
 * Export library as JSON backup file to local device
 */
export function exportLibraryJson(books: Book[]): void {
  try {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(books, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadAnchor.setAttribute('download', `read-a-book-library-backup-${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  } catch (err) {
    console.error('Failed to export library JSON:', err);
  }
}
