# Firestore Security Architecture Specification

## 1. Data Invariants
1. **Unique Username Lock**: A document in `/usernames/{username}` cannot be overwritten or deleted, contains zero PII (only `uid`, `username`, `createdAt`), blocks `list` scraping, and requires an atomic `existsAfter` private profile creation for the same `request.auth.uid`.
2. **PII Isolation**: User email lives exclusively inside `/users/{userId}/private/profile`, readable and writable only by `request.auth.uid == userId`.
3. **Owner-Only Library & Progress**: Every document under `/users/{userId}/books/{bookId}` and `/users/{userId}/readProgress/{bookId}` enforces `request.auth.uid == userId` on single-document reads/writes and `existing().uid == request.auth.uid` on `list` queries.
4. **Strict Field & Volumetric Bounds**: All documents validate exact key allowlists (`hasAll` + `hasOnly`), immutable ownership/creation fields (`uid`, `username`, `email`, `createdAt`), server-time timestamps (`request.time`), regex document IDs, and explicit `.size()` limits on every string and array.

## 2. The "Dirty Dozen" Adversarial Test Payloads
1. **Username Hijack Overwrite**: Signed-in User B calls `setDoc` on `/usernames/alice` -> Denied (`allow update: if false`, `!exists(...)`).
2. **Username Directory Scrape**: Signed-in User B calls `getDocs(collection(db, 'usernames'))` -> Denied (`allow list: if false`).
3. **Orphaned Username Without Profile**: Signed-in User B creates `/usernames/bob` outside transaction without `/users/{uid}/private/profile` -> Denied (`existsAfter(...)` fails).
4. **Cross-User PII Read**: Signed-in User B reads `/users/aliceUid/private/profile` -> Denied (`request.auth.uid == userId` fails).
5. **Privilege Escalation / Ghost Field**: User A injects `{ isAdmin: true, role: 'admin' }` into `/users/aliceUid/private/profile` -> Denied (`hasOnly(...)` rejects ghost keys).
6. **Username / Email Spoofing on Profile Update**: User A updates `/users/aliceUid/private/profile` changing `username` or `uid` -> Denied (`affectedKeys().hasOnly(['tutorialCompleted', 'updatedAt'])` and equality assertions reject).
7. **ID Poisoning Attack**: User A attempts to write a 1KB key or slash-containing ID at `/users/aliceUid/books/<1KB>` -> Denied (`isValidId(bookId)` regex + size check).
8. **Cross-User Library Theft**: User B queries `collection(db, 'users/aliceUid/books')` -> Denied (`request.auth.uid == userId && existing().uid == request.auth.uid`).
9. **Spoofed UID in Book Payload**: User A sets `{ uid: 'someoneElse' }` inside `/users/aliceUid/books/b1` -> Denied (`data.uid == userId`).
10. **Forged Timestamp Injection**: Client submits `{ createdAt: new Date(2000, 0, 1) }` instead of `serverTimestamp()` -> Denied (`incoming().createdAt == request.time`).
11. **Denial-of-Wallet String/Array Bloat**: Client submits 50KB `thesis` or 500 elements in `keyInsights` -> Denied (`.size() <= 1500` and `.size() <= 20`).
12. **Unauthenticated Write**: Anonymous/signed-out client writes to `/users/any/readProgress/b1` -> Denied (`isSignedIn()` fails).
