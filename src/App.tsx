import React, { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Book } from './types';
import defaultLibraryData from './data/defaultLibrary.json';
import { Header } from './components/Header';
import { RightSidebar, LibraryFilter } from './components/RightSidebar';
import { GrowthModule } from './components/GrowthModule';
import { BookGrid } from './components/BookGrid';
import { BookDetail } from './components/BookDetail';
import { BookPreviewModal } from './components/BookPreviewModal';
import { AuthModal } from './components/AuthModal';
import { QuickTutorialModal } from './components/QuickTutorialModal';
import {
  getStoredReadStatus,
  toggleBookReadStatus,
  ReadStatusMap,
} from './utils/readingStorage';
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
import { auth } from './firebase';
import {
  awaitPendingSignup,
  logOutUser,
  markTutorialCompletedInFirestore,
  saveBookReadProgressToFirestore,
  seedDefaultBooksIfEmpty,
  subscribeUserBooks,
  subscribeUserProfile,
  subscribeUserReadProgress,
  syncBooksToFirestore,
  syncReadProgressMapToFirestore,
  UserProfileData,
} from './utils/firestoreSync';
import { Loader2, BookX, CheckCircle, AlertCircle, WifiOff, UserPlus, X } from 'lucide-react';
import { useOnlineStatus } from './hooks/useOnlineStatus';

const DEFAULT_BOOKS = defaultLibraryData as Book[];
const TUTORIAL_SEEN_KEY = 'read_a_book_tutorial_seen_v1';

export default function App() {
  const [library, setLibrary] = useState<Book[]>(() => {
    const stored = getStoredLibrary();
    const { merged } = mergeLibraries(DEFAULT_BOOKS, stored);
    return merged;
  });
  const [selectedBookId, setSelectedBookId] = useState<string>(
    () => DEFAULT_BOOKS[0]?.id || ''
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<LibraryFilter>('all');

  // Right sidebar open by default on large desktop screens, closed on mobile until tapped
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return false;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAddingBooks, setIsAddingBooks] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Firebase Auth & Cloud Sync state
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'signup' | 'login' | 'claim'>('signup');
  const [showGuestPrompt, setShowGuestPrompt] = useState<boolean>(true);

  // Quick Tutorial Modal state
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(TUTORIAL_SEEN_KEY) !== 'true';
    } catch {
      return false;
    }
  });

  // Modal preview state
  const [previewBook, setPreviewBook] = useState<Book | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  // Expanded summary view
  const [isSummaryExpanded, setIsSummaryExpanded] = useState<boolean>(false);

  // Read completion status map (guest localStorage when signed out; Firestore when signed in)
  const [readStatusMap, setReadStatusMap] = useState<ReadStatusMap>(() => getStoredReadStatus());

  // Readable Mode preferences
  const [readerPrefs, setReaderPrefs] = useState<ReaderPreferences>(() => getStoredReaderPrefs());
  const isOnline = useOnlineStatus();

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

  // Listen to Firebase Auth state changes
  useEffect(() => {
    let cancelled = false;
    let unsubProfile: (() => void) | undefined;
    let unsubBooks: (() => void) | undefined;
    let unsubProgress: (() => void) | undefined;

    const cleanupUserListeners = () => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = undefined;
      }
      if (unsubBooks) {
        unsubBooks();
        unsubBooks = undefined;
      }
      if (unsubProgress) {
        unsubProgress();
        unsubProgress = undefined;
      }
    };

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      cleanupUserListeners();
      setAuthUser(user);
      setIsAuthReady(true);

      if (!user) {
        // Guest mode: always show all 20+ books and load clean guest read progress
        setUserProfile(null);
        setFilterMode('all');
        setReadStatusMap(getStoredReadStatus());
        setLibrary((prev) => {
          const { merged } = mergeLibraries(DEFAULT_BOOKS, prev);
          return merged;
        });
        return;
      }

      // Wait for atomic signup transaction to finish before attaching Firestore listeners
      await awaitPendingSignup(user.uid);
      if (cancelled || auth.currentUser?.uid !== user.uid) return;

      try {
        // Seed 20 starter books cleanly if user's Firestore library is empty
        await seedDefaultBooksIfEmpty(user.uid, DEFAULT_BOOKS);
        if (cancelled || auth.currentUser?.uid !== user.uid) return;

        // Subscribe to real-time private profile (@username, tutorialCompleted)
        unsubProfile = subscribeUserProfile(user.uid, (profile) => {
          setUserProfile(profile);
          if (profile && !profile.tutorialCompleted) {
            setIsTutorialOpen(true);
          }
        });

        // Subscribe to real-time Firestore books & merge with starter 20 books
        unsubBooks = subscribeUserBooks(user.uid, (cloudBooks) => {
          setLibrary((prev) => {
            const { merged: withDefaults } = mergeLibraries(DEFAULT_BOOKS, cloudBooks);
            const { merged: fullMerged } = mergeLibraries(withDefaults, prev);
            saveStoredLibrary(fullMerged);
            return fullMerged;
          });
        });

        // Subscribe to signed-in user's Firestore reading progress
        unsubProgress = subscribeUserReadProgress(user.uid, (cloudMap) => {
          setReadStatusMap(cloudMap);
        });
      } catch (err) {
        console.error('Firebase user sync error:', err);
      }
    });

    const readyFallbackTimer = setTimeout(() => {
      setIsAuthReady(true);
    }, 800);

    return () => {
      cancelled = true;
      clearTimeout(readyFallbackTimer);
      unsubAuth();
      cleanupUserListeners();
    };
  }, []);

  // Load and bidirectionally sync library with backend API (when available)
  useEffect(() => {
    async function loadAndSyncData() {
      try {
        const storedLocal = getStoredLibrary();
        const { merged: baseline } = mergeLibraries(DEFAULT_BOOKS, storedLocal);

        const libRes = await fetch('/api/library');
        if (libRes.ok) {
          const libData = await libRes.json();
          const serverBooks: Book[] = libData.library || [];
          const { merged, newForServer } = mergeLibraries(serverBooks, baseline);

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
            }).catch(() => {});
          }
        }
      } catch {
        // Static hosting (e.g. Vercel without Express) gracefully relies on DEFAULT_BOOKS + Firestore
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
    if (authUser) {
      const currentlyRead = !!readStatusMap[bookId]?.read;
      const nextMap = { ...readStatusMap };
      let nextRecord = null;
      if (currentlyRead) {
        delete nextMap[bookId];
      } else {
        nextRecord = {
          bookId,
          read: true,
          readAt: new Date().toISOString(),
          category,
        };
        nextMap[bookId] = nextRecord;
      }
      setReadStatusMap(nextMap);
      void saveBookReadProgressToFirestore(authUser.uid, bookId, nextRecord).catch((err) => {
        console.error('Failed to sync read status:', err);
      });
    } else {
      const { updatedMap } = toggleBookReadStatus(bookId, category);
      setReadStatusMap({ ...updatedMap });
    }
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

        if (authUser) {
          void syncBooksToFirestore(authUser.uid, data.addedBooks).catch((err) => {
            console.error('Failed to sync newly added books:', err);
          });
        }

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

  const handleOpenAuth = (mode: 'signup' | 'login' | 'claim') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleLogOut = async () => {
    try {
      await logOutUser();
      setToastMessage({ text: 'Signed out cleanly.' });
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      setToastMessage({ text: err.message || 'Failed to sign out.', isError: true });
    }
  };

  const handleCompleteTutorial = () => {
    try {
      localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
    } catch {
      // ignore
    }
    if (authUser) {
      void markTutorialCompletedInFirestore(authUser.uid).catch((err) => {
        console.error('Failed to update tutorial status:', err);
      });
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
        userProfile={userProfile}
        signedInEmail={authUser?.email || null}
        onOpenAuth={handleOpenAuth}
      />

      {/* Workspace Body + Right Sidebar */}
      <div className="flex-1 flex items-start">
        {/* Main Content Column */}
        <div className="flex-1 min-w-0 flex flex-col min-h-[calc(100vh-3.5rem)]">
          {/* Subtle Account Invite Banner (when signed out) */}
          {isAuthReady && !authUser && showGuestPrompt && !isSummaryExpanded && (
            <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4">
              <div className="bg-white rounded-2xl border border-black/[0.06] px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-2.5 text-[13px] text-[#1D1D1F]">
                  <div className="w-8 h-8 rounded-xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center shrink-0">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <span>
                    Save your <strong>{library.length} books</strong> and reading streak with a unique username account.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenAuth('signup')}
                    className="h-8 px-3.5 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-[12px] font-semibold cursor-pointer transition-colors"
                  >
                    Sign Up
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenAuth('login')}
                    className="h-8 px-3 rounded-xl bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F] text-[12px] font-semibold cursor-pointer transition-colors"
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGuestPrompt(false)}
                    className="w-7 h-7 rounded-full text-[#86868B] hover:text-[#1D1D1F] flex items-center justify-center cursor-pointer"
                    aria-label="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Offline Mode Banner */}
          {!isOnline && (
            <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-3">
              <div className="p-3 rounded-2xl border bg-[#FF9500]/[0.10] border-[#FF9500]/25 text-[#B25000] text-[13px] flex items-center gap-2">
                <WifiOff className="w-4 h-4 flex-shrink-0" />
                <span>Offline Mode — Reading saved books from your device.</span>
              </div>
            </div>
          )}

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
          userProfile={userProfile}
          signedInEmail={authUser?.email || null}
          isAuthReady={isAuthReady}
          onOpenAuth={handleOpenAuth}
          onLogOut={handleLogOut}
          onOpenTutorial={() => setIsTutorialOpen(true)}
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

      {/* Sign Up / Log In Modal (Username + Gmail + Password) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        starterBooks={DEFAULT_BOOKS}
        initialMode={authModalMode}
        onAuthSuccess={(mode, profile) => {
          if (profile) {
            setUserProfile(profile);
            if (mode === 'signup') {
              const guestMarks = getStoredReadStatus();
              if (Object.keys(guestMarks).length > 0) {
                void syncReadProgressMapToFirestore(profile.uid, guestMarks).catch((err) => {
                  console.error('Failed to migrate guest progress:', err);
                });
              }
            }
          }
          setToastMessage({
            text:
              mode === 'signup'
                ? `Welcome, @${profile?.username || 'reader'}! Your 20 starter books are ready.`
                : 'Signed in! Your library and progress are synced.',
          });
          setTimeout(() => setToastMessage(null), 4500);
          if (mode === 'signup') {
            setIsTutorialOpen(true);
          }
        }}
      />

      {/* Quick Tutorial Walkthrough */}
      <QuickTutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        onComplete={handleCompleteTutorial}
      />
    </div>
  );
}
