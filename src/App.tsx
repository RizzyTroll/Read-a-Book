import React, { useState, useEffect, useMemo, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Book } from './types';
import defaultLibraryData from './data/defaultLibrary.json';
import { Header } from './components/Header';
import { RightSidebar, LibraryFilter, AddBookFeedback } from './components/RightSidebar';
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
  normalizeTitle,
} from './utils/libraryStorage';
import { getSharedBookIdFromUrl, getShortBookShareId } from './utils/formatters';
import { addBooksOnClientViaFreeApis } from './utils/freeBookApi';
import {
  DAILY_BOOK_ADD_LIMIT,
  getLocalDateKey,
  getLocalDailyAddedCount,
  setLocalDailyAddedCount,
  incrementLocalDailyAddedCount,
} from './utils/dailyLimitStorage';
import {
  getStoredReaderPrefs,
  saveReaderPrefs,
  getReaderThemeClasses,
  ReaderPreferences,
} from './utils/readerPreferences';
import { auth } from './firebase';
import {
  awaitPendingSignup,
  incrementFirestoreDailyQuota,
  logOutUser,
  markTutorialCompletedInFirestore,
  refreshStarterBooksInFirestore,
  saveBookReadProgressToFirestore,
  seedDefaultBooksIfEmpty,
  subscribeDailyQuota,
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
const GENERIC_ADD_BOOK_ERROR = 'Failed to add the book. Please try again.';

function findBookByShareParam(books: Book[], shareParam: string): Book | undefined {
  const trimmed = shareParam.trim();
  if (!trimmed) return undefined;

  const exactIdMatch = books.find(
    (b) => b.id === trimmed || b.id.toLowerCase() === trimmed.toLowerCase()
  );
  if (exactIdMatch) return exactIdMatch;

  if (/^\d+$/.test(trimmed)) {
    const dayNum = Number(trimmed);
    const dayMatch = books.find((b) => b.day === dayNum);
    if (dayMatch) return dayMatch;
  }

  const targetNorm = normalizeTitle(trimmed);
  if (!targetNorm) return undefined;
  return books.find((b) => normalizeTitle(b.title) === targetNorm);
}

function updateBookUrlParam(book: Pick<Book, 'id' | 'day'> | null): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    if (book) {
      url.searchParams.set('book', getShortBookShareId(book));
    } else {
      url.searchParams.delete('book');
    }
    const nextRelative = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(null, '', nextRelative);
  } catch {
    // ignore history errors in restricted frames
  }
}

export default function App() {
  const initialSharedBookParam = useMemo(() => getSharedBookIdFromUrl(), []);

  const [library, setLibrary] = useState<Book[]>(() => {
    const stored = getStoredLibrary();
    const { merged } = mergeLibraries(DEFAULT_BOOKS, stored);
    return merged;
  });

  const initialMatchedSharedBook = useMemo(() => {
    if (!initialSharedBookParam) return undefined;
    return findBookByShareParam(library, initialSharedBookParam);
  }, []); // mount-time match only

  const pendingSharedBookRef = useRef<string | null>(
    initialSharedBookParam && !initialMatchedSharedBook ? initialSharedBookParam : null
  );

  const [selectedBookId, setSelectedBookId] = useState<string>(
    () => initialMatchedSharedBook?.id || DEFAULT_BOOKS[0]?.id || ''
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
  const [addBookFeedback, setAddBookFeedback] = useState<AddBookFeedback | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Firebase Auth & Cloud Sync state
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'signup' | 'login' | 'claim'>('signup');
  const [showGuestPrompt, setShowGuestPrompt] = useState<boolean>(true);

  // Daily 5-book addition limit tracking (resets at local midnight 12:00 AM)
  const [localDateKey, setLocalDateKey] = useState<string>(() => getLocalDateKey());
  const quotaUserKey = authUser?.uid || 'guest';
  const [dailyAddedCount, setDailyAddedCount] = useState<number>(() =>
    getLocalDailyAddedCount('guest', getLocalDateKey())
  );

  // Quick Tutorial Modal state (don't obscure a shared book landing link)
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(() => {
    if (initialSharedBookParam) return false;
    try {
      return localStorage.getItem(TUTORIAL_SEEN_KEY) !== 'true';
    } catch {
      return false;
    }
  });

  // Modal preview state
  const [previewBook, setPreviewBook] = useState<Book | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  // Expanded summary view (auto-open if shared ?book= link matched synchronously)
  const [isSummaryExpanded, setIsSummaryExpanded] = useState<boolean>(
    () => Boolean(initialMatchedSharedBook)
  );

  // Read completion status map (guest localStorage when signed out; Firestore when signed in)
  const [readStatusMap, setReadStatusMap] = useState<ReadStatusMap>(() => getStoredReadStatus());

  // Readable Mode preferences
  const [readerPrefs, setReaderPrefs] = useState<ReaderPreferences>(() => getStoredReaderPrefs());
  const isOnline = useOnlineStatus();

  const showToast = (text: string, isError = false, durationMs = 5000) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage({ text, isError });
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, durationMs);
  };

  const showInlineAddFeedback = (feedback: AddBookFeedback, durationMs = 6000) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setAddBookFeedback(feedback);
    feedbackTimerRef.current = setTimeout(() => {
      setAddBookFeedback(null);
    }, durationMs);
  };

  useEffect(() => {
    const checkMidnight = () => {
      const nextKey = getLocalDateKey();
      if (nextKey !== localDateKey) {
        setLocalDateKey(nextKey);
      }
    };
    const interval = setInterval(checkMidnight, 30000);
    return () => clearInterval(interval);
  }, [localDateKey]);

  // Keep dailyAddedCount synced for guest & signed-in users (with midnight reset)
  useEffect(() => {
    const localCount = getLocalDailyAddedCount(quotaUserKey, localDateKey);
    setDailyAddedCount(localCount);

    if (!authUser) {
      return;
    }

    const unsubQuota = subscribeDailyQuota(authUser.uid, localDateKey, (cloudCount) => {
      const latestLocal = getLocalDailyAddedCount(authUser.uid, localDateKey);
      const effective = Math.max(latestLocal, cloudCount);
      setLocalDailyAddedCount(authUser.uid, effective, localDateKey);
      setDailyAddedCount(effective);
    });

    return () => {
      unsubQuota();
    };
  }, [authUser, quotaUserKey, localDateKey]);

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

        // Upgrade any previously seeded starter books if canonical defaults gained richer detail
        await refreshStarterBooksInFirestore(user.uid, DEFAULT_BOOKS);
        if (cancelled || auth.currentUser?.uid !== user.uid) return;

        // Subscribe to real-time private profile (@username, tutorialCompleted)
        unsubProfile = subscribeUserProfile(user.uid, (profile) => {
          setUserProfile(profile);
          if (profile && !profile.tutorialCompleted && !getSharedBookIdFromUrl()) {
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

  // Resolve shared book deep links once async server or Firestore books load
  useEffect(() => {
    const pendingId = pendingSharedBookRef.current;
    if (!pendingId) return;
    const matched = findBookByShareParam(library, pendingId);
    if (matched) {
      setSelectedBookId(matched.id);
      setIsSummaryExpanded(true);
      setIsPreviewOpen(false);
      pendingSharedBookRef.current = null;
    }
  }, [library]);

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
    updateBookUrlParam(book);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToLibrary = () => {
    setIsSummaryExpanded(false);
    updateBookUrlParam(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAutoAddBooks = async (
    count: number,
    specificTitle?: string,
    specificAuthor?: string
  ) => {
    // Re-evaluate midnight reset cleanly right at click time
    const currentDateKey = getLocalDateKey();
    if (currentDateKey !== localDateKey) {
      setLocalDateKey(currentDateKey);
    }

    const currentUsed = Math.max(
      dailyAddedCount,
      getLocalDailyAddedCount(quotaUserKey, currentDateKey)
    );
    const remainingToday = Math.max(0, DAILY_BOOK_ADD_LIMIT - currentUsed);

    if (remainingToday <= 0) {
      const limitMsg =
        "You have reached today's limit of 5 book additions. Your limit resets after midnight (12:00 AM).";
      showToast(limitMsg, true, 6000);
      showInlineAddFeedback({ type: 'limit', message: limitMsg }, 7000);
      return;
    }

    const requestedCount = specificTitle
      ? 1
      : Math.max(1, Math.min(DAILY_BOOK_ADD_LIMIT, Math.floor(count) || 1));

    if (requestedCount > remainingToday) {
      const partialMsg = `You can only add ${remainingToday} more book${
        remainingToday === 1 ? '' : 's'
      } today. Your 5-book daily limit resets after midnight (12:00 AM).`;
      showToast(partialMsg, true, 6000);
      showInlineAddFeedback({ type: 'limit', message: partialMsg }, 7000);
      return;
    }

    setIsAddingBooks(true);
    setToastMessage(null);
    setAddBookFeedback(null);

    const recordAddedQuota = (addedCount: number, serverTotalToday?: number) => {
      const nextLocal = incrementLocalDailyAddedCount(quotaUserKey, addedCount, currentDateKey);
      const nextEffective =
        typeof serverTotalToday === 'number'
          ? Math.min(DAILY_BOOK_ADD_LIMIT, Math.max(nextLocal, serverTotalToday))
          : nextLocal;
      setLocalDailyAddedCount(quotaUserKey, nextEffective, currentDateKey);
      setDailyAddedCount(nextEffective);

      if (authUser) {
        void incrementFirestoreDailyQuota(authUser.uid, currentDateKey, addedCount).catch((err) => {
          console.error('Failed to sync daily quota:', err);
        });
      }
      return Math.max(0, DAILY_BOOK_ADD_LIMIT - nextEffective);
    };

    const applyAddedBooks = (addedBooks: Book[], serverTotalToday?: number) => {
      setLibrary((prev) => {
        const next = [...prev];
        for (const newBook of addedBooks) {
          const newNorm = normalizeTitle(newBook.title);
          if (
            !next.some(
              (b) => b.id === newBook.id || (newNorm && normalizeTitle(b.title) === newNorm)
            )
          ) {
            next.push(newBook);
          }
        }
        saveStoredLibrary(next);
        return next;
      });

      if (authUser) {
        void syncBooksToFirestore(authUser.uid, addedBooks).catch((err) => {
          console.error('Failed to sync newly added books:', err);
        });
      }

      const leftToday = recordAddedQuota(addedBooks.length, serverTotalToday);
      const titleSummary =
        addedBooks.length === 1
          ? `Added "${addedBooks[0].title}" to your library.`
          : `Added ${addedBooks.length} new books to your library.`;
      const remainingNote =
        leftToday === 0
          ? ' Daily limit of 5 reached (resets at 12:00 AM).'
          : ` ${leftToday} of ${DAILY_BOOK_ADD_LIMIT} left today.`;

      const confirmMsg = `${titleSummary}${remainingNote}`;
      showToast(confirmMsg, false, 6000);
      showInlineAddFeedback({ type: 'success', message: confirmMsg }, 7000);
    };

    try {
      let handledByServer = false;

      try {
        const res = await fetch('/api/auto-add-books', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            count: requestedCount,
            specificTitle,
            author: specificAuthor,
            userId: quotaUserKey,
            dateKey: currentDateKey,
          }),
        });

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (res.ok) {
            handledByServer = true;
            if (data.addedBooks && data.addedBooks.length > 0) {
              applyAddedBooks(data.addedBooks, data.dailyAddedCount);
            } else {
              showToast('No new books found to add.', false, 4500);
              showInlineAddFeedback({ type: 'error', message: 'No new books found to add.' }, 5000);
            }
            return;
          }

          if (res.status === 429 || data.limitReached) {
            if (typeof data.dailyAddedCount === 'number') {
              setLocalDailyAddedCount(quotaUserKey, data.dailyAddedCount, currentDateKey);
              setDailyAddedCount(data.dailyAddedCount);
            }
            const limitMsg =
              "You have reached today's limit of 5 book additions. Your limit resets after midnight (12:00 AM).";
            showToast(limitMsg, true, 6000);
            showInlineAddFeedback({ type: 'limit', message: limitMsg }, 7000);
            return;
          }

          if (res.status === 400 && typeof data.error === 'string' && data.error.includes('already in')) {
            showToast(data.error, true, 5000);
            showInlineAddFeedback({ type: 'error', message: data.error }, 6000);
            return;
          }

          if (res.status >= 500) {
            console.error('Server add-book error status:', res.status, data?.error);
            showToast(GENERIC_ADD_BOOK_ERROR, true, 5000);
            showInlineAddFeedback({ type: 'error', message: GENERIC_ADD_BOOK_ERROR }, 6000);
            return;
          }
        } else if (!res.ok) {
          console.error('Unexpected response status when adding books:', res.status);
          showToast(GENERIC_ADD_BOOK_ERROR, true, 5000);
          showInlineAddFeedback({ type: 'error', message: GENERIC_ADD_BOOK_ERROR }, 6000);
          return;
        }
      } catch {
        // Server unreachable (e.g. static deployment) — continue to free Open Library/Wikipedia APIs
      }

      if (!handledByServer) {
        const clientResult = await addBooksOnClientViaFreeApis(
          requestedCount,
          specificTitle,
          library,
          specificAuthor
        );
        if (clientResult.error) {
          const isSafeDuplicate = clientResult.error.includes('already in');
          const safeMsg = isSafeDuplicate ? clientResult.error : GENERIC_ADD_BOOK_ERROR;
          showToast(safeMsg, true, 5000);
          showInlineAddFeedback({ type: 'error', message: safeMsg }, 6000);
          return;
        }
        if (clientResult.addedBooks.length > 0) {
          applyAddedBooks(clientResult.addedBooks);
          void fetch('/api/sync-library', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ books: clientResult.addedBooks }),
          }).catch(() => {});
        } else {
          showToast(GENERIC_ADD_BOOK_ERROR, true, 5000);
          showInlineAddFeedback({ type: 'error', message: GENERIC_ADD_BOOK_ERROR }, 6000);
        }
      }
    } catch (err) {
      console.error('Unhandled error while adding book:', err);
      showToast(GENERIC_ADD_BOOK_ERROR, true, 5000);
      showInlineAddFeedback({ type: 'error', message: GENERIC_ADD_BOOK_ERROR }, 6000);
    } finally {
      setIsAddingBooks(false);
    }
  };

  const handleOpenAuth = (mode: 'signup' | 'login' | 'claim') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleLogOut = async () => {
    try {
      await logOutUser();
      showToast('Signed out cleanly.', false, 3500);
    } catch {
      showToast('Failed to sign out. Please try again.', true, 4000);
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

          {/* Prominent Floating Confirmation & Alert Toast */}
          {toastMessage && (
            <div
              role="status"
              className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[92vw] max-w-md pointer-events-auto"
            >
              <div
                className={`p-3.5 rounded-2xl border shadow-lg backdrop-blur-xl text-[13px] font-medium flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
                  toastMessage.isError
                    ? 'bg-[#FFF5F5]/95 border-[#FF3B30]/30 text-[#D70015]'
                    : 'bg-[#F2FBF5]/95 border-[#34C759]/35 text-[#1F7A35]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {toastMessage.isError ? (
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span>{toastMessage.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setToastMessage(null)}
                  className="text-xs font-bold opacity-60 hover:opacity-100 cursor-pointer"
                  aria-label="Dismiss notification"
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
          dailyAddedCount={dailyAddedCount}
          dailyLimit={DAILY_BOOK_ADD_LIMIT}
          addBookFeedback={addBookFeedback}
          onDismissAddFeedback={() => setAddBookFeedback(null)}
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
