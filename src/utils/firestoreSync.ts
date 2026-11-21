import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  deleteUser,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { Book, BookCategory } from '../types';
import { ReadRecord, ReadStatusMap } from './readingStorage';
import { isBookRicher } from './libraryStorage';

export interface UserProfileData {
  uid: string;
  username: string;
  email: string;
  tutorialCompleted: boolean;
}

const VALID_CATEGORIES = new Set<string>([
  'Self-Growth',
  'Investing',
  'Personal Development',
  'Business',
  'Entrepreneurship',
  'Finance',
  'Management',
]);

export function normalizeUsername(raw: string): string {
  return (raw || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
}

export function validateUsernameFormat(raw: string): string | null {
  const trimmed = (raw || '').trim().toLowerCase();
  if (trimmed.length < 3) return 'Username must be at least 3 characters.';
  if (trimmed.length > 24) return 'Username must be 24 characters or fewer.';
  if (!/^[a-z0-9_]+$/.test(trimmed)) {
    return 'Use only lowercase letters, numbers, and underscores (_).';
  }
  return null;
}

function sanitizeBookId(id: string): string {
  const cleaned = (id || 'book').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  return cleaned || 'book-item';
}

function clampStr(value: string | undefined, max: number, fallback = ''): string {
  const raw = typeof value === 'string' ? value : '';
  const chosen = raw.trim().length > 0 ? raw : fallback;
  return chosen.slice(0, max);
}

function clampCategory(cat: string | undefined): BookCategory {
  if (cat && VALID_CATEGORIES.has(cat)) {
    return cat as BookCategory;
  }
  return 'Self-Growth';
}

function toFirestoreBookDoc(uid: string, book: Book, includeCreatedAt: boolean) {
  const safeId = sanitizeBookId(book.id);
  const sources = (book.sourcesChecked || [])
    .filter((s) => typeof s === 'string' && s.trim().length > 0)
    .slice(0, 25)
    .map((s) => clampStr(s, 500));
  const structure = (book.structure || [])
    .slice(0, 100)
    .map((part, idx) => ({
      partNumber: Number(part.partNumber) || idx + 1,
      partTitle: clampStr(part.partTitle, 400, `Part ${idx + 1}`),
      keyIdea: clampStr(part.keyIdea, 25000, 'Key idea summary.'),
      realLifeExample: clampStr(part.realLifeExample, 5000, ''),
      whyItMatters: clampStr(part.whyItMatters, 5000, ''),
    }));
  if (structure.length === 0) {
    structure.push({
      partNumber: 1,
      partTitle: 'Core Idea',
      keyIdea: clampStr(book.thesis, 25000, 'Summary notes.'),
      realLifeExample: '',
      whyItMatters: 'Practical daily mindset.',
    });
  }

  const insights = (book.keyInsights || [])
    .filter((i) => typeof i === 'string' && i.trim().length > 0)
    .slice(0, 100)
    .map((i) => clampStr(i, 2000));
  if (insights.length === 0) {
    insights.push(clampStr(book.thesis, 2000, 'Key takeaway from the book.'));
  }

  const daily = (book.dailyImplementation || [])
    .filter((d) => typeof d === 'string' && d.trim().length > 0)
    .slice(0, 100)
    .map((d) => clampStr(d, 2000));

  const payload: Record<string, unknown> = {
    uid,
    bookId: safeId,
    day: Math.min(5000, Math.max(1, Number(book.day) || 1)),
    date: clampStr(book.date, 32, new Date().toISOString().slice(0, 10)),
    title: clampStr(book.title, 300, 'Untitled Book'),
    subtitle: clampStr(book.subtitle, 300, ''),
    author: clampStr(book.author, 200, 'Author'),
    category: clampCategory(book.category),
    year: Math.min(2100, Math.max(1400, Number(book.year) || new Date().getFullYear())),
    readingTimeMin: Math.min(120, Math.max(1, Number(book.readingTimeMin) || 8)),
    qualificationRationale: clampStr(book.qualificationRationale, 10000, 'Recommended classic.'),
    thesis: clampStr(book.thesis, 10000, 'Core summary.'),
    conflictNote: clampStr(book.conflictNote, 10000, ''),
    sourcesChecked: sources,
    structure,
    keyInsights: insights,
    dailyImplementation: daily,
    strengthWeakness: clampStr(book.strengthWeakness, 20000, ''),
    updatedAt: serverTimestamp(),
  };

  if (includeCreatedAt) {
    payload.createdAt = serverTimestamp();
  }

  return payload;
}

export async function checkUsernameAvailable(rawUsername: string): Promise<boolean> {
  const username = rawUsername.trim().toLowerCase();
  if (validateUsernameFormat(username) !== null) return false;
  const path = `usernames/${username}`;
  try {
    const snap = await getDoc(doc(db, 'usernames', username));
    return !snap.exists();
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

function mapFirebaseAuthError(err: any): string {
  const code = err?.code || '';
  if (code === 'auth/operation-not-allowed') {
    return 'Email/Password sign-in is not turned on yet in Firebase Console (Authentication → Sign-in method → Email/Password).';
  }
  if (code === 'auth/email-already-in-use') {
    return 'This Gmail address is already registered. Please switch to Log In instead.';
  }
  if (code === 'auth/invalid-email') {
    return 'Please enter a valid Gmail or email address.';
  }
  if (code === 'auth/weak-password') {
    return 'Password must be at least 6 characters long.';
  }
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Incorrect password, or no app account exists yet for this Gmail. If you have not created a password in this app yet, switch to Sign Up first.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  return err?.message || 'Authentication failed. Please try again.';
}

const pendingSignups = new Map<string, Promise<void>>();
const inFlightSeeds = new Map<string, Promise<void>>();

export async function awaitPendingSignup(uid: string): Promise<void> {
  const pending = pendingSignups.get(uid);
  if (pending) {
    await pending.catch(() => {});
  }
}

export async function signUpWithUsernameEmailPassword(
  rawUsername: string,
  rawEmail: string,
  password: string,
  starterBooks: Book[]
): Promise<{ user: User; profile: UserProfileData }> {
  const username = rawUsername.trim().toLowerCase();
  const email = rawEmail.trim().toLowerCase();

  const usernameError = validateUsernameFormat(username);
  if (usernameError) {
    throw new Error(usernameError);
  }
  if (!email || !email.includes('@')) {
    throw new Error('Please enter a valid Gmail or email address.');
  }
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  // Fast pre-check so taken usernames fail before creating an auth account
  const available = await checkUsernameAvailable(username);
  if (!available) {
    throw new Error(`Username "@${username}" is already taken. Please pick a different one.`);
  }

  let cred;
  try {
    cred = await createUserWithEmailAndPassword(auth, email, password);
  } catch (err: any) {
    throw new Error(mapFirebaseAuthError(err));
  }

  const user = cred.user;
  let resolveSignup!: () => void;
  const signupGate = new Promise<void>((res) => {
    resolveSignup = res;
  });
  pendingSignups.set(user.uid, signupGate);

  try {
    const usernameRef = doc(db, 'usernames', username);
    const profileRef = doc(db, 'users', user.uid, 'private', 'profile');

    try {
      await runTransaction(db, async (tx) => {
        const existingClaim = await tx.get(usernameRef);
        if (existingClaim.exists()) {
          throw new Error('USERNAME_TAKEN');
        }

        tx.set(usernameRef, {
          uid: user.uid,
          username,
          createdAt: serverTimestamp(),
        });

        tx.set(profileRef, {
          uid: user.uid,
          username,
          email,
          tutorialCompleted: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
    } catch (err: any) {
      // Roll back orphaned Firebase Auth user if username claim lost race or failed rules
      try {
        await deleteUser(user);
      } catch {
        await signOut(auth).catch(() => {});
      }

      if (err?.message === 'USERNAME_TAKEN') {
        throw new Error(`Username "@${username}" is already taken. Please choose another.`);
      }
      handleFirestoreError(err, OperationType.WRITE, `usernames/${username}`);
    }

    try {
      await updateProfile(user, { displayName: username });
    } catch {
      // Non-fatal
    }

    // Seed default 20 starter books into user's personal Firestore library
    await seedDefaultBooksIfEmpty(user.uid, starterBooks);

    return {
      user,
      profile: {
        uid: user.uid,
        username,
        email,
        tutorialCompleted: false,
      },
    };
  } finally {
    resolveSignup();
    pendingSignups.delete(user.uid);
  }
}

export async function logInWithEmailPassword(rawEmail: string, password: string): Promise<User> {
  const email = rawEmail.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    throw new Error('Please enter your Gmail or email address.');
  }
  if (!password) {
    throw new Error('Please enter your password.');
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  } catch (err: any) {
    throw new Error(mapFirebaseAuthError(err));
  }
}

export async function sendPasswordResetForEmail(rawEmail: string): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    throw new Error('Enter your Gmail or email address above first.');
  }

  try {
    await sendPasswordResetEmail(auth, email);
  } catch (err: any) {
    if (err?.code === 'auth/user-not-found') {
      throw new Error('No account exists yet for this Gmail. Use Sign Up to create one.');
    }
    throw new Error(mapFirebaseAuthError(err));
  }
}

export async function claimUsernameForExistingUser(
  user: User,
  rawUsername: string,
  starterBooks: Book[]
): Promise<UserProfileData> {
  const username = rawUsername.trim().toLowerCase();
  const usernameError = validateUsernameFormat(username);
  if (usernameError) {
    throw new Error(usernameError);
  }

  const available = await checkUsernameAvailable(username);
  if (!available) {
    throw new Error(`Username "@${username}" is already taken. Please pick another.`);
  }

  const email = (user.email || '').trim().toLowerCase() || `${username}@user.local`;
  const usernameRef = doc(db, 'usernames', username);
  const profileRef = doc(db, 'users', user.uid, 'private', 'profile');

  try {
    await runTransaction(db, async (tx) => {
      const existingClaim = await tx.get(usernameRef);
      if (existingClaim.exists()) {
        throw new Error('USERNAME_TAKEN');
      }

      tx.set(usernameRef, {
        uid: user.uid,
        username,
        createdAt: serverTimestamp(),
      });

      tx.set(profileRef, {
        uid: user.uid,
        username,
        email,
        tutorialCompleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  } catch (err: any) {
    if (err?.message === 'USERNAME_TAKEN') {
      throw new Error(`Username "@${username}" is already taken. Please choose another.`);
    }
    handleFirestoreError(err, OperationType.WRITE, `usernames/${username}`);
  }

  try {
    await updateProfile(user, { displayName: username });
  } catch {
    // Non-fatal
  }

  await seedDefaultBooksIfEmpty(user.uid, starterBooks);

  return {
    uid: user.uid,
    username,
    email,
    tutorialCompleted: false,
  };
}

export async function logOutUser(): Promise<void> {
  await signOut(auth);
}

export async function fetchUserProfile(uid: string): Promise<UserProfileData | null> {
  const path = `users/${uid}/private/profile`;
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'private', 'profile'));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      uid: data.uid,
      username: data.username,
      email: data.email,
      tutorialCompleted: Boolean(data.tutorialCompleted),
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export function subscribeUserProfile(
  uid: string,
  onProfile: (profile: UserProfileData | null) => void
): Unsubscribe {
  const path = `users/${uid}/private/profile`;
  return onSnapshot(
    doc(db, 'users', uid, 'private', 'profile'),
    (snap) => {
      if (!snap.exists()) {
        onProfile(null);
        return;
      }
      const data = snap.data();
      onProfile({
        uid: data.uid,
        username: data.username,
        email: data.email,
        tutorialCompleted: Boolean(data.tutorialCompleted),
      });
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function markTutorialCompletedInFirestore(uid: string): Promise<void> {
  const path = `users/${uid}/private/profile`;
  try {
    const profileRef = doc(db, 'users', uid, 'private', 'profile');
    const snap = await getDoc(profileRef);
    if (!snap.exists()) return;
    await updateDoc(profileRef, {
      tutorialCompleted: true,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function seedDefaultBooksIfEmpty(uid: string, starterBooks: Book[]): Promise<void> {
  const existingPromise = inFlightSeeds.get(uid);
  if (existingPromise) {
    return existingPromise;
  }

  const colPath = `users/${uid}/books`;
  const run = (async () => {
    let existingSnap;
    try {
      const booksQuery = query(collection(db, 'users', uid, 'books'), where('uid', '==', uid));
      existingSnap = await getDocs(booksQuery);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, colPath);
    }

    if (!existingSnap.empty) return;

    try {
      const batch = writeBatch(db);
      for (const book of starterBooks) {
        const safeId = sanitizeBookId(book.id);
        const bookRef = doc(db, 'users', uid, 'books', safeId);
        batch.set(bookRef, toFirestoreBookDoc(uid, book, true));
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, colPath);
    }
  })().finally(() => {
    inFlightSeeds.delete(uid);
  });

  inFlightSeeds.set(uid, run);
  return run;
}

/**
 * Upgrades already-seeded starter books in a user's Firestore library whenever
 * canonical defaultLibrary books gain richer summaries, structure parts, or takeaways.
 */
export async function refreshStarterBooksInFirestore(
  uid: string,
  starterBooks: Book[]
): Promise<void> {
  const colPath = `users/${uid}/books`;
  let existingSnap;
  try {
    const booksQuery = query(collection(db, 'users', uid, 'books'), where('uid', '==', uid));
    existingSnap = await getDocs(booksQuery);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, colPath);
  }

  const starterById = new Map(starterBooks.map((b) => [sanitizeBookId(b.id), b]));
  const docsToUpgrade: Array<{ docId: string; starter: Book }> = [];

  for (const snapDoc of existingSnap.docs) {
    const starter = starterById.get(snapDoc.id);
    if (!starter) continue;
    const data = snapDoc.data();
    const existingBook: Partial<Book> = {
      id: data.bookId || snapDoc.id,
      thesis: data.thesis || '',
      qualificationRationale: data.qualificationRationale || '',
      conflictNote: data.conflictNote || '',
      strengthWeakness: data.strengthWeakness || '',
      structure: Array.isArray(data.structure) ? data.structure : [],
      keyInsights: Array.isArray(data.keyInsights) ? data.keyInsights : [],
      dailyImplementation: Array.isArray(data.dailyImplementation) ? data.dailyImplementation : [],
    };
    if (isBookRicher(starter, existingBook)) {
      docsToUpgrade.push({ docId: snapDoc.id, starter });
    }
  }

  if (docsToUpgrade.length === 0) return;

  try {
    for (let i = 0; i < docsToUpgrade.length; i += 400) {
      const chunk = docsToUpgrade.slice(i, i + 400);
      const batch = writeBatch(db);
      for (const { docId, starter } of chunk) {
        const { uid: _u, bookId: _b, ...mutableFields } = toFirestoreBookDoc(uid, starter, false);
        batch.update(doc(db, 'users', uid, 'books', docId), mutableFields);
      }
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, colPath);
  }
}

export async function syncReadProgressMapToFirestore(
  uid: string,
  map: ReadStatusMap
): Promise<void> {
  const entries = Object.values(map).filter((r) => r && r.read);
  if (entries.length === 0) return;

  const colPath = `users/${uid}/readProgress`;
  try {
    const batch = writeBatch(db);
    for (const record of entries) {
      const safeId = sanitizeBookId(record.bookId);
      const docRef = doc(db, 'users', uid, 'readProgress', safeId);
      batch.set(docRef, {
        uid,
        bookId: safeId,
        read: true,
        readAt: clampStr(record.readAt, 64, new Date().toISOString()),
        category: clampCategory(record.category),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, colPath);
  }
}

export async function syncBooksToFirestore(uid: string, books: Book[]): Promise<void> {
  const colPath = `users/${uid}/books`;
  let existingSnap;
  try {
    const booksQuery = query(collection(db, 'users', uid, 'books'), where('uid', '==', uid));
    existingSnap = await getDocs(booksQuery);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, colPath);
  }

  try {
    const existingIds = new Set(existingSnap.docs.map((d) => d.id));
    const missing = books.filter((b) => !existingIds.has(sanitizeBookId(b.id)));
    if (missing.length === 0) return;

    // Firestore batch supports up to 500 ops; chunk safely
    for (let i = 0; i < missing.length; i += 400) {
      const chunk = missing.slice(i, i + 400);
      const batch = writeBatch(db);
      for (const book of chunk) {
        const safeId = sanitizeBookId(book.id);
        batch.set(doc(db, 'users', uid, 'books', safeId), toFirestoreBookDoc(uid, book, true));
      }
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, colPath);
  }
}

export function subscribeUserBooks(
  uid: string,
  onBooks: (books: Book[]) => void
): Unsubscribe {
  const colPath = `users/${uid}/books`;
  const booksQuery = query(collection(db, 'users', uid, 'books'), where('uid', '==', uid));
  return onSnapshot(
    booksQuery,
    (snapshot) => {
      const items: Book[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: data.bookId || d.id,
          day: Number(data.day) || 1,
          date: data.date || '',
          title: data.title || '',
          subtitle: data.subtitle || '',
          author: data.author || '',
          category: clampCategory(data.category),
          year: Number(data.year) || 2020,
          readingTimeMin: Number(data.readingTimeMin) || 8,
          qualificationRationale: data.qualificationRationale || '',
          thesis: data.thesis || '',
          conflictNote: data.conflictNote || '',
          sourcesChecked: Array.isArray(data.sourcesChecked) ? data.sourcesChecked : [],
          structure: Array.isArray(data.structure) ? data.structure : [],
          keyInsights: Array.isArray(data.keyInsights) ? data.keyInsights : [],
          dailyImplementation: Array.isArray(data.dailyImplementation)
            ? data.dailyImplementation
            : [],
          strengthWeakness: data.strengthWeakness || '',
        };
      });
      items.sort((a, b) => (a.day || 999) - (b.day || 999));
      onBooks(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, colPath);
    }
  );
}

export function subscribeUserReadProgress(
  uid: string,
  onProgress: (map: ReadStatusMap) => void
): Unsubscribe {
  const colPath = `users/${uid}/readProgress`;
  const progressQuery = query(
    collection(db, 'users', uid, 'readProgress'),
    where('uid', '==', uid)
  );
  return onSnapshot(
    progressQuery,
    (snapshot) => {
      const map: ReadStatusMap = {};
      snapshot.docs.forEach((d) => {
        const data = d.data();
        if (data.read) {
          const bookId = data.bookId || d.id;
          map[bookId] = {
            bookId,
            read: true,
            readAt: data.readAt || new Date().toISOString(),
            category: data.category || 'Self-Growth',
          };
        }
      });
      onProgress(map);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, colPath);
    }
  );
}

export async function saveBookReadProgressToFirestore(
  uid: string,
  bookId: string,
  record: ReadRecord | null
): Promise<void> {
  const safeId = sanitizeBookId(bookId);
  const path = `users/${uid}/readProgress/${safeId}`;
  const docRef = doc(db, 'users', uid, 'readProgress', safeId);

  try {
    if (!record || !record.read) {
      await deleteDoc(docRef);
    } else {
      await setDoc(docRef, {
        uid,
        bookId: safeId,
        read: true,
        readAt: clampStr(record.readAt, 64, new Date().toISOString()),
        category: clampCategory(record.category),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export function subscribeDailyQuota(
  uid: string,
  dateKey: string,
  onCount: (count: number) => void
): Unsubscribe {
  const path = `users/${uid}/dailyQuotas/${dateKey}`;
  return onSnapshot(
    doc(db, 'users', uid, 'dailyQuotas', dateKey),
    (snap) => {
      if (!snap.exists()) {
        onCount(0);
        return;
      }
      const data = snap.data();
      const raw = typeof data.count === 'number' ? data.count : 0;
      onCount(Math.max(0, Math.min(5, Math.floor(raw))));
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function incrementFirestoreDailyQuota(
  uid: string,
  dateKey: string,
  delta: number
): Promise<number> {
  const safeDelta = Math.max(0, Math.floor(delta));
  const path = `users/${uid}/dailyQuotas/${dateKey}`;
  const quotaRef = doc(db, 'users', uid, 'dailyQuotas', dateKey);

  try {
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(quotaRef);
      const current = snap.exists() && typeof snap.data()?.count === 'number'
        ? Math.max(0, Math.floor(snap.data().count))
        : 0;
      const nextCount = Math.min(5, current + safeDelta);
      tx.set(quotaRef, {
        uid,
        dateKey,
        count: nextCount,
        updatedAt: serverTimestamp(),
      });
      return nextCount;
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

