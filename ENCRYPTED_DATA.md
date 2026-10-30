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
| R2 object (`files/{id}.storageKey`) | file content | Encrypt | AES-256-GCM (binary) | Uploaded documents may contain student records | 2026-10-30 |
| R2 object (`users/{id}.photo.storageKey`) | profile photo | Encrypt | AES-256-GCM (binary) | Personal photo | 2026-10-30 |
| R2 objects (`supportRequests/{id}.attachments[].storageKey`) | bug report images/videos | Encrypt | AES-256-GCM (binary) | Screenshots may show student records | 2026-10-30 |
| R2 objects (`updates/{id}.media[].storageKey`) | system update images/videos | Encrypt | AES-256-GCM (binary) | Screenshots may show student records | 2026-10-30 |
| `authTokens/{id}` (DEV_INVITE) | document id | Hash | SHA-256 | Developer invitation link token | 2026-10-30 |

## Fields to Review

Fields that might need encryption but are not protected yet.

- **users.email**: **plain text** because login looks users up by email. If it has to be encrypted, add an `emailHash` field (HMAC-SHA256) for lookups and keep the encrypted email in a separate field.
- **users.name**: **plain text**. Encrypt it if names count as sensitive for this project.
- **supportRequests subject / description / reporter**: **plain text** so developers can read them on the board. Users should not put student details in support messages.
- **updates.contentHtml**: **plain text** (sanitized HTML). It is shown to every user.

## Notes

- Every record a user owns (students, cases, appointments, files, categories, To Do board) is stored as `{ <reference number>, data: <encrypted JSON>, createdAt, updatedAt }`. Search and filters run on the server after decrypting. Records saved before this are still readable; convert them once with `npm run db:encrypt-all` (add `-- --dry-run` to test first). Deploy the backend before running it.
- `users/{id}/auditLogs` keep only the action, record type, record id and time (no content), so they are not encrypted.
- The encryption key is `ENCRYPTION_KEY` in `.env` (64 hex characters). **If this key is lost or changed, encrypted data and uploaded files cannot be decrypted.** Back it up securely and never commit it.
- Encrypted text is stored as `iv:authTag:ciphertext` (base64). Encrypted files are stored as `[12-byte iv][16-byte authTag][ciphertext]`.
