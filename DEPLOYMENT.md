# Deployment

The backend is deployed on **Render** ([render.yaml](render.yaml)).
A **DigitalOcean App Platform** spec is ready in [.do/app.yaml](.do/app.yaml) but is **not in use yet**.

Both run the same commands:

| Step | Command |
|------|---------|
| Build | `npm ci --include=dev && npm run build` (TypeScript is a devDependency) |
| Start | `npm start` (runs `dist/server.js`) |
| Health check | `GET /health` |

`.env` and `sca.json` are never committed. Every secret is set in the host's dashboard.

## Environment variables

| Variable | Render | DigitalOcean | Notes |
|----------|--------|--------------|-------|
| `CLIENT_URL` | secret | secret | Deployed frontend URL (CORS + email links) |
| `ENCRYPTION_KEY` | secret | secret | **Copy from your local `.env`.** Use the same key everywhere, or existing encrypted data and files can't be read. Back it up. |
| `JWT_SECRET` | auto-generated | secret | Changing it signs everyone out |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | secret | secret | The whole content of `sca.json`. Locally, `FIREBASE_SERVICE_ACCOUNT_PATH=sca.json` reads the file instead. |
| `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` | secret | secret | Sender must be verified in Brevo |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | secret | secret | Cloudflare R2 |
| `PORT` | set by Render | `8080` (in spec) | The app reads `PORT` |

The app checks all variables at startup and stops with a clear message if one is missing or invalid (see the deploy logs).

## Render (current)

1. Push `sca-be` to GitHub (render.yaml must be in the repo root).
2. Render dashboard → **New → Blueprint** → choose the repo. Render reads `render.yaml`.
3. Fill in the values it asks for (the `sync: false` variables above). For `FIREBASE_SERVICE_ACCOUNT_JSON`, paste the whole content of `sca.json`.
4. Deploy. Check `https://<service>.onrender.com/health` returns `{"success":true,"status":"ok"}`.
5. In the frontend, set `VITE_API_BASE_URL=https://<service>.onrender.com/api/v1` and redeploy it.

Notes:
- `plan: free` sleeps after 15 minutes without traffic, so the first request after that is slow (about 1 minute). Change `plan` to `starter` for production.
- Region is `singapore` (closest to the Philippines). Region can't be changed after the service is created.

## DigitalOcean App Platform (later)

1. In `.do/app.yaml`, set `github.repo` (and `branch` if not `master`).
2. Create the app: `doctl apps create --spec .do/app.yaml`, or in the dashboard **Apps → Create App** and import the spec.
3. In **Settings → Environment Variables**, fill every `SECRET` value. For `FIREBASE_SERVICE_ACCOUNT_JSON`, paste the content of `sca.json` (same as on Render). To get it on one line:
   `node -p "JSON.stringify(require('./sca.json'))"`
4. Deploy and check `/health`.
5. Point the frontend's `VITE_API_BASE_URL` to the new URL. Moving hosts doesn't move data: Firestore and R2 stay the same.

Keep `instance_count: 1` until the in-memory cache (`src/utils/cache.ts`) is replaced with a shared one. With more instances, each would keep its own cache.

## After the first deploy

- Deploy the Firestore rules and indexes once from this folder: `firebase deploy --only firestore` (needs `firebase-tools`).
- In Firebase console → Authentication → Settings → **Authorized domains**, add the frontend domain (needed for Google sign-in).
