# Encrypted Data Log

A list of every field that is encrypted or hashed. Check it to confirm the right data is protected, or to spot fields that still need it.

**Method key:**
- **Hash**: one-way and cannot be decrypted. Helpers: `src/utils/password.ts` (bcrypt), `src/utils/token.ts` (SHA-256)
- **Encrypt**: two-way and can be decrypted when needed (used for personal or sensitive data). Helper: `src/utils/encryption.ts`

| Firestore path | Field | Method | Algorithm | Reason | Date Added |
|----------------|-------|--------|-----------|--------|------------|
| `users/{id}` | password | Hash | bcrypt (12 rounds) | Login credential | 2026-10-30 |
| `users/{id}` | phone | Encrypt | AES-256-GCM | Personal contact info | 2026-10-30 |
| `users/{id}` | phoneHash | Hash | HMAC-SHA256 (ENCRYPTION_KEY) | Finds duplicate mobile numbers without decrypting. Not reversible. | 2026-10-30 |
| `users/{id}` | address (region, province, city, barangay, street) | Encrypt | AES-256-GCM (JSON) | Home address | 2026-10-30 |
| `authTokens/{id}` | document id | Hash | SHA-256 | Email verification / password reset link token. The raw token only exists in the email. | 2026-10-30 |
| `users/{id}/students/{id}` | data (the whole student form: name, date encoded, sex, grade & section, school year, birthday, LRN, address, contacts, guardians, interests, help requested, parent concerns, review, remarks, …) | Encrypt | AES-256-GCM (JSON) | Student personal record. Only the record ID and created/updated times stay plain. | 2026-10-30 |
| `users/{id}/cases/{id}` | data (learner name, grade & section, concern, action, referred to, classification, intake date, follow-up date, status, remarks) | Encrypt | AES-256-GCM (JSON) | Confidential case record. Only the case number and created/updated times stay plain. | 2026-10-30 |
| `users/{id}/appointments/{id}` | data (student, staff, date, time, duration, type, reason, status, reminder, rescheduled from, notes) | Encrypt | AES-256-GCM (JSON) | Confidential appointment. Only the appointment ID and created/updated times stay plain. | 2026-10-30 |
| `users/{id}/files/{id}` | data (file name, type, size, storage key) | Encrypt | AES-256-GCM (JSON) | File names can include student names. Only the upload time stays plain. | 2026-10-30 |
| `users/{id}/categories/{id}` | data (name, options) | Encrypt | AES-256-GCM (JSON) | Settings dropdown values (e.g. staff names, grade sections). Only the created time stays plain. | 2026-10-30 |
| `users/{id}/todo/board` | data (columns and cards) | Encrypt | AES-256-GCM (JSON) | To Do cards can mention students | 2026-10-30 |
| `users/{id}/forms/{id}` | data (title, description, header, questions) | Encrypt | AES-256-GCM (JSON) | Forms can name students or concerns. Only created/updated times stay plain. | 2026-10-30 |
| `users/{id}/forms/{id}` | link (public answer link code) | Encrypt | AES-256-GCM | Anyone with the code can answer the form | 2026-10-31 |
| `users/{id}/forms/{id}/responses/{id}` | data (each answer with its question) | Encrypt | AES-256-GCM (JSON) | Answers can be personal (names, feelings, family). Only the submitted time stays plain. | 2026-10-31 |
| `formLinks/{id}` | document id | Hash | SHA-256 of the link code | Finds the form from a public link without storing the code | 2026-10-31 |
| R2 object (`files/{id}.storageKey`) | file content | Encrypt | AES-256-GCM (binary) | Uploaded documents may contain student records | 2026-10-30 |
| R2 object (`users/{id}.photo.storageKey`) | profile photo | Encrypt | AES-256-GCM (binary) | Personal photo | 2026-10-30 |
| R2 objects (`supportRequests/{id}.attachments[].storageKey`) | bug report images/videos | Encrypt | AES-256-GCM (binary) | Screenshots may show student records | 2026-10-30 |
| R2 objects (`updates/{id}.media[].storageKey`) | system update images/videos | Encrypt | AES-256-GCM (binary) | Screenshots may show student records | 2026-10-30 |
| `authTokens/{id}` (DEV_INVITE) | document id | Hash | SHA-256 | Developer invitation link token | 2026-10-30 |
| `users/{id}` | name, email, role (job title) | Encrypt | AES-256-GCM | Personal details | 2026-10-30 |
| `users/{id}` | school (all school details) | Encrypt | AES-256-GCM (JSON) | School information | 2026-10-30 |
| `users/{id}` | emailHash | Hash | HMAC-SHA256 (ENCRYPTION_KEY) | Sign-in and duplicate checks find the account without decrypting emails. Not reversible. | 2026-10-30 |
| `supportRequests/{id}` | data (subject, description, severity, reporter name and email, attachment details) | Encrypt | AES-256-GCM (JSON) | Reports can describe students. Only ids, statuses, votes and times stay plain. | 2026-10-30 |
| `updates/{id}` | data (title, text, media details, author name) | Encrypt | AES-256-GCM (JSON) | Only ids and the publish time stay plain. | 2026-10-30 |
| `authTokens/{id}` (DEV_INVITE) | email + emailHash | Encrypt + Hash | AES-256-GCM / HMAC-SHA256 | The invited email | 2026-10-30 |
| `authTokens/{id}` (LOGIN_CODE) | codeHash | Hash | SHA-256 | Two-step sign-in code (10 minutes, 5 tries). The code only exists in the email. | 2026-10-30 |
| `rateLimits/{id}` | document id | Hash | HMAC-SHA256 (ENCRYPTION_KEY) | Rate-limit counter per IP address or user, without storing the IP | 2026-10-30 |

## Plain text (approved)

By default every field is encrypted (see CLAUDE.md). Fields listed here are plain text only because the owner asked for it.

| Firestore path | Field | Reason | Approved |
|----------------|-------|--------|----------|
| _none yet_ | | | |

## Fields to Review

No personal or record data is stored in plain text. These system fields stay plain because the app needs them to run (lookups, sorting, access checks) and they hold no personal content. Tell the developer if any of them should be encrypted.

- **Ids and references**: document ids, `reporterId`, `assigneeId`, `authorId`, `reportId`, `updateId`, `firebaseUid`, generated numbers (case number, record ID, appointment ID).
- **Access and status**: `accessRoles`, `tokenVersion`, `revokedSessions` (session ids), report `type`/`status`/`review`, `voterIds`/`votes`.
- **Times**: `createdAt`, `updatedAt`, `emailVerifiedAt`, `publishedAt`, `doneAt`, `expiresAt`, `submittedAt`.
- **Form counters and links**: `exports.pdf` / `exports.word` (how many times a form was downloaded), and `formLinks` `userId` / `formId` (which form a public link opens).
- **Activity log** (`users/{id}/auditLogs`): action, record type, record id and time — never the record's content.
- **Read markers**: `readUpdateIds`, `readNotificationIds` (ids only).
- **Photo info**: `photo.storageKey`, `photo.mimeType` (the photo itself is encrypted in R2).

## Notes

- Every record a user owns (students, cases, appointments, files, categories, To Do board) is stored as `{ <reference number>, data: <encrypted JSON>, createdAt, updatedAt }`. Search and filters run on the server after decrypting. Users, support reports and system updates are encrypted the same way. Records saved before this are still readable; convert them once with `npm run db:encrypt-all` (add `-- --dry-run` to test first). Deploy the backend before running it.
- The encryption key is `ENCRYPTION_KEY` in `.env` (64 hex characters). **If this key is lost or changed, encrypted data and uploaded files cannot be decrypted.** Back it up offline and never commit it. To replace it safely, follow "Rotating the encryption key" in DEPLOYMENT.md (`npm run db:rotate-key`).
- Encrypted text is stored as `iv:authTag:ciphertext` (base64). Encrypted files are stored as `[12-byte iv][16-byte authTag][ciphertext]`.
