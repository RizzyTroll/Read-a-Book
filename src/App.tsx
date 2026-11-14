import React, { useState, useEffect, useMemo } from 'react';
import { Book } from './types';
import { Header } from './components/Header';
import { RightSidebar, LibraryFilter } from './components/RightSidebar';
import { GrowthModule } from './components/GrowthModule';
import { BookGrid } from './components/BookGrid';
import { BookDetail } from './components/BookDetail';
import { BookPreviewModal } from './components/BookPreviewModal';
import { getStoredReadStatus, toggleBookReadStatus, ReadStatusMap } from './utils/readingStorage';
import {
  getStoredLibrary,
  saveStoredLibrary,
  mergeLibraries,
} from './utils/libraryStorage';
import {
  getStoredReaderPrefs,
  saveReaderPrefs,
  getReaderThemeClasses,
  ReaderPreferences,
} from './utils/readerPreferences';
import { Loader2, BookX, CheckCircle, AlertCircle } from 'lucide-react';

export default function App() {
  const [library, setLibrary] = useState<Book[]>(() => getStoredLibrary());
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<LibraryFilter>('all');

  // Right sidebar open by default on large desktop screens, closed on mobile until tapped
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return false;
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => getStoredLibrary().length === 0);
  const [isAddingBooks, setIsAddingBooks] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Modal preview state
  const [previewBook, setPreviewBook] = useState<Book | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  // Expanded summary view
  const [isSummaryExpanded, setIsSummaryExpanded] = useState<boolean>(false);

  // Local storage read completion status map
  const [readStatusMap, setReadStatusMap] = useState<ReadStatusMap>(() => getStoredReadStatus());

  // Readable Mode preferences
  const [readerPrefs, setReaderPrefs] = useState<ReaderPreferences>(() => getStoredReaderPrefs());

  const handleUpdateReaderPrefs = (next: ReaderPreferences) => {
    setReaderPrefs(next);
    saveReaderPrefs(next);
  };

  const activeReaderTheme = useMemo(() => {
    if (isSummaryExpanded && readerPrefs.isReadableMode) {
      return getReaderThemeClasses(readerPrefs);
    }
    return undefined;
  }, [isSummaryExpanded, readerPrefs]);

  // Load and bidirectionally sync library on mount
  useEffect(() => {
    async function loadAndSyncData() {
      try {
        const storedLocal = getStoredLibrary();
        const libRes = await fetch('/api/library');
        const libData = await libRes.json();
        const serverBooks: Book[] = libData.library || [];

        const { merged, newForServer } = mergeLibraries(serverBooks, storedLocal);

        if (merged.length > 0) {
          setLibrary(merged);
          saveStoredLibrary(merged);
          if (!selectedBookId) {
            setSelectedBookId(merged[0].id);
          }
        }

        if (newForServer.length > 0) {
          await fetch('/api/sync-library', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ books: newForServer }),
          });
        }
      } catch (err) {
        console.error('Failed to load or sync library:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadAndSyncData();
  }, []);

  // Filtered books (by search query and sidebar filter)
  const filteredBooks = useMemo(() => {
    return library.filter((book) => {
      const isRead = !!readStatusMap[book.id]?.read;
      if (filterMode === 'completed' && !isRead) return false;
      if (filterMode === 'unread' && isRead) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        book.thesis.toLowerCase().includes(q) ||
        book.keyInsights.some((i) => i.toLowerCase().includes(q))
      );
    });
  }, [library, readStatusMap, filterMode, searchQuery]);

  const activeBook = useMemo(() => {
    return library.find((b) => b.id === selectedBookId) || filteredBooks[0] || library[0] || null;
  }, [library, selectedBookId, filteredBooks]);

  const handleToggleRead = (bookId: string, category: string) => {
    const { updatedMap } = toggleBookReadStatus(bookId, category);
    setReadStatusMap({ ...updatedMap });
  };

  const handleSelectBookForPreview = (book: Book) => {
    setSelectedBookId(book.id);
    setPreviewBook(book);
    setIsPreviewOpen(true);
  };

  const handleExpandSummary = (book: Book) => {
    setSelectedBookId(book.id);
    setIsSummaryExpanded(true);
    setIsPreviewOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToLibrary = () => {
    setIsSummaryExpanded(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAutoAddBooks = async (count: number, specificTitle?: string) => {
    setIsAddingBooks(true);
    setToastMessage(null);

    try {
      const res = await fetch('/api/auto-add-books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count, specificTitle }),
      });

      const data = await res.json();

      if (!res.ok) {
        setToastMessage({ text: data.error || 'Failed to add book.', isError: true });
        return;
      }

      if (data.addedBooks && data.addedBooks.length > 0) {
        setLibrary((prev) => {
          const next = [...prev];
          for (const newBook of data.addedBooks) {
            if (!next.some((b) => b.id === newBook.id || b.title.toLowerCase() === newBook.title.toLowerCase())) {
              next.push(newBook);
            }
          }
          saveStoredLibrary(next);
          return next;
        });

        setToastMessage({
          text: specificTitle
            ? `Added "${data.addedBooks[0].title}".`
            : `Added ${data.addedBooks.length} new ${data.addedBooks.length > 1 ? 'books' : 'book'}.`,
        });
      } else {
        setToastMessage({ text: 'No new books found to add.', isError: false });
      }
    } catch (err: any) {
      setToastMessage({ text: err.message || 'Adding books failed.', isError: true });
    } finally {
      setIsAddingBooks(false);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center text-[#6E6E73] gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#007AFF]" />
        <span className="text-xs font-medium text-[#6E6E73]">Loading Read a Book...</span>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col selection:bg-[#007AFF]/15 selection:text-[#007AFF] transition-colors duration-200 ${
        activeReaderTheme
          ? `${activeReaderTheme.pageBg} ${activeReaderTheme.textPrimary}`
          : 'bg-[#F5F5F7] text-[#1D1D1F]'
      }`}
    >
      {/* Clean Single-Row Apple Top Bar */}
      <Header
        onBackToLibrary={handleBackToLibrary}
        searchQuery={searchQuery}
        onSearchChange={(q) => setSearchQuery(q)}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        readerTheme={activeReaderTheme}
      />

      {/* Workspace Body + Right Sidebar */}
      <div className="flex-1 flex items-start">
        {/* Main Content Column */}
        <div className="flex-1 min-w-0 flex flex-col min-h-[calc(100vh-3.5rem)]">
          {/* Toast Notification */}
          {toastMessage && (
            <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-3">
              <div
                className={`p-3.5 rounded-2xl border text-[13px] flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
                  toastMessage.isError
                    ? 'bg-[#FF3B30]/[0.08] border-[#FF3B30]/20 text-[#D70015]'
                    : 'bg-[#34C759]/[0.10] border-[#34C759]/25 text-[#248A3D]'
                }`}
              >
                <div className="flex items-center gap-2">
                  {toastMessage.isError ? (
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span>{toastMessage.text}</span>
                </div>
                <button
                  onClick={() => setToastMessage(null)}
                  className="text-xs font-bold opacity-60 hover:opacity-100 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          <main className="flex-1 pb-10">
            {isSummaryExpanded && activeBook ? (
              <BookDetail
                book={activeBook}
                isRead={!!readStatusMap[activeBook.id]?.read}
                onToggleRead={() => handleToggleRead(activeBook.id, activeBook.category)}
                onBackToLibrary={handleBackToLibrary}
                readerPrefs={readerPrefs}
                onUpdateReaderPrefs={handleUpdateReaderPrefs}
              />
            ) : (
              <>
                <GrowthModule readStatusMap={readStatusMap} />

                {filteredBooks.length > 0 ? (
                  <BookGrid
                    books={filteredBooks}
                    totalBooksCount={library.length}
                    readStatusMap={readStatusMap}
                    onSelectBookForPreview={handleSelectBookForPreview}
                    onToggleRead={handleToggleRead}
                  />
                ) : (
                  <div className="max-w-md mx-auto text-center py-20 px-4 space-y-3">
                    <BookX className="w-10 h-10 text-[#86868B] mx-auto" />
                    <h3 className="text-base font-semibold text-[#1D1D1F]">
                      No books found
                    </h3>
                    <p className="text-xs text-[#6E6E73]">
                      Try clearing your search or switching the filter in the menu.
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setFilterMode('all');
                      }}
                      className="px-4 py-2 rounded-xl bg-white border border-black/[0.08] text-xs font-semibold text-[#007AFF] hover:bg-[#F2F2F7] cursor-pointer"
                    >
                      Show All Books
                    </button>
                  </div>
                )}
              </>
            )}
          </main>

          {/* Minimal Footer */}
          <footer
            className={`border-t py-5 text-center text-xs transition-colors ${
              activeReaderTheme
                ? `${activeReaderTheme.pageBg} ${activeReaderTheme.border} ${activeReaderTheme.textMuted}`
                : 'border-black/[0.06] bg-[#F5F5F7] text-[#86868B]'
            }`}
          >
            <p className={activeReaderTheme ? activeReaderTheme.textPrimary : 'text-[#6E6E73] font-medium'}>
              Read a Book
            </p>
          </footer>
        </div>

        {/* Right Sidebar Menu (Docked on Desktop, Slide-Over Drawer on Mobile) */}
        <RightSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          searchQuery={searchQuery}
          onSearchChange={(q) => setSearchQuery(q)}
          books={library}
          readStatusMap={readStatusMap}
          filterMode={filterMode}
          onFilterChange={(f) => setFilterMode(f)}
          onAutoAddBooks={handleAutoAddBooks}
          isAddingBooks={isAddingBooks}
        />
      </div>

      {/* Book Preview Modal */}
      <BookPreviewModal
        book={previewBook}
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewBook(null);
        }}
        onExpandSummary={handleExpandSummary}
        isRead={previewBook ? !!readStatusMap[previewBook.id]?.read : false}
        onToggleRead={() => {
          if (previewBook) handleToggleRead(previewBook.id, previewBook.category);
        }}
      />
    </div>
  );
}
