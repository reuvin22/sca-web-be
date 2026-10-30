# Encrypted Data Log

A list of every field that is encrypted or hashed. Check it to confirm the right data is protected, or to spot fields that still need it.

**Method key:**
- **Hash**: one-way and cannot be decrypted. Helpers: `src/utils/password.ts` (bcrypt), `src/utils/token.ts` (SHA-256)
- **Encrypt**: two-way and can be decrypted when needed (used for personal or sensitive data). Helper: `src/utils/encryption.ts`

| Firestore path | Field | Method | Algorithm | Reason | Date Added |
|----------------|-------|--------|-----------|--------|------------|
| `users/{id}` | password | Hash | bcrypt (12 rounds) | Login credential | 2026-10-30 |
| `users/{id}` | phone | Encrypt | AES-256-GCM | Personal contact info | 2026-10-30 |
| `authTokens/{id}` | document id | Hash | SHA-256 | Email verification / password reset link token. The raw token only exists in the email. | 2026-10-30 |
| `users/{id}/students/{id}` | details | Encrypt | AES-256-GCM (JSON) | Student personal details: birthday, LRN, address, contact numbers, guardian and emergency contacts, interests, help requested, parent concerns, guidance review and remarks | 2026-10-30 |
| `users/{id}/cases/{id}` | remarks | Encrypt | AES-256-GCM | Confidential counseling remarks | 2026-10-30 |
| `users/{id}/appointments/{id}` | notes | Encrypt | AES-256-GCM | Confidential appointment notes | 2026-10-30 |
| R2 object (`files/{id}.storageKey`) | file content | Encrypt | AES-256-GCM (binary) | Uploaded documents may contain student records | 2026-10-30 |

## Fields to Review

Fields that might need encryption but are not protected yet.

- **users.email**: **plain text** because login looks users up by email. If it has to be encrypted, add an `emailHash` field (HMAC-SHA256) for lookups and keep the encrypted email in a separate field.
- **users.name**: **plain text**. Encrypt it if names count as sensitive for this project.
- **students.studentName, cases.learnerName, appointments.studentName**: **plain text** because the lists search by name. Encrypting them means name search must change (e.g. search on a hashed/normalized copy).
- **students filter fields** (sex, gradeSection, schoolYear, livesWith, feelingAboutSchool, prefersPrivate, signatureReceived, followUpNeeded): **plain text** because the Students page filters by them in Firestore.
- **cases.concern / action / referredTo / classification**: **plain text** because the dashboard and reports count them. "Nature of concern" may be sensitive; review with the school.
- **files.name**: **plain text**. File names can include student names.

## Notes

- The encryption key is `ENCRYPTION_KEY` in `.env` (64 hex characters). **If this key is lost or changed, encrypted data and uploaded files cannot be decrypted.** Back it up securely and never commit it.
- Encrypted text is stored as `iv:authTag:ciphertext` (base64). Encrypted files are stored as `[12-byte iv][16-byte authTag][ciphertext]`.
