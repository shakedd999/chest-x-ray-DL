# Pulmoscope — Chest X-Ray Classification

A doctor-facing web app that classifies chest X-rays for **Atelectasis**, **Effusion**, and **Infiltration**, with a per-user history of past studies.

```
Browser ──► Vite/React (frontend) ──► FastAPI (POC/model/inference) ──► TF model
                │
                └─► Firebase Auth (Google SSO) + Firestore (per-user studies + image preview)
```

- **Frontend:** Vite + React 18 + Firebase JS SDK (`frontend/`)
- **Backend:** FastAPI + TensorFlow (`POC/model/inference/`)
- **Storage:** Firestore document holds the resized JPEG preview + classifications (Spark plan; no Firebase Storage required)
- **Auth:** Google Sign-In; the FastAPI `/get_prediction` endpoint verifies Firebase ID tokens server-side via PyJWT against Google's public JWKs — no service account, no gcloud login

---

## Prerequisites

- Python **3.12** (TensorFlow doesn't yet support 3.13/3.14 stably)
- Node.js **18+** and npm
- A Firebase project — this repo is wired to **`chestxray-bde16`** via `.firebaserc`
- A Google account with access to that Firebase project

---

## Quickstart

If `frontend/.env.local` is already filled in (see [First-time setup](#first-time-setup) below), running the app is just:

```bash
# install
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
( cd frontend && npm install )

# terminal 1 — backend
source .venv/bin/activate
uvicorn POC.model.inference.api:app --host 127.0.0.1 --port 8000

# terminal 2 — frontend
cd frontend && npm run dev
```

Open the Vite URL (`http://localhost:5173`, or `5174` if 5173 is busy) and sign in with Google.

---

## First-time setup

### 1. Clone and enter the repo

```bash
git clone <repo-url> chest-x-ray-DL
cd chest-x-ray-DL
```

### 2. Backend — Python venv + dependencies

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

Installs FastAPI, TensorFlow, PyJWT, etc. The model weights (`xray_model_fine_tuning_poc.keras`, ~48 MB) download automatically from Google Drive on the first inference request.

### 3. Frontend — Node dependencies

```bash
cd frontend
npm install
cd ..
```

### 4. Firebase Console — one-time clicks

In [the Firebase Console](https://console.firebase.google.com/project/chestxray-bde16):

1. **Authentication → Sign-in method** → enable **Google** → save.
2. **Authentication → Settings → Authorized domains** → make sure `localhost` is in the list.
3. **Project Settings → Your apps** → register a Web app (or reuse the existing **Default Web App**) — keep the `firebaseConfig` values open in a tab; you'll paste them into `.env.local` next.

Already done for `chestxray-bde16` if you cloned an existing checkout — verify in the console rather than redoing.

### 5. `frontend/.env.local`

```bash
cp frontend/.env.example frontend/.env.local
```

Fill in the values from the Web app config you opened in step 4:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=chestxray-bde16.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=chestxray-bde16
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_INFERENCE_API_BASE=http://localhost:8000
```

If the Firebase CLI is installed, the fastest copy-free path is:

```bash
firebase apps:sdkconfig --project chestxray-bde16 web <APP_ID>
```

That's it — no gcloud, no service account.

---

## Running locally

You'll need **two terminals**.

### Terminal 1 — FastAPI backend

```bash
source .venv/bin/activate
uvicorn POC.model.inference.api:app --host 127.0.0.1 --port 8000
```

First start downloads the model (~5–10 s) and prints `Application startup complete`.

```bash
curl http://127.0.0.1:8000/health
# → {"status":"ok","model_loaded":true}

curl -X POST http://127.0.0.1:8000/get_prediction \
  -F "file=@POC/test_xray_images/00000059_000-Normal.png"
# → HTTP 401  {"detail":"Missing or malformed Authorization header."}
```

The 401 is correct — `/get_prediction` requires a Firebase ID token (`Authorization: Bearer <token>`) which the frontend attaches automatically after sign-in.

### Terminal 2 — Vite dev server

```bash
cd frontend
npm run dev
```

Open the URL Vite prints. The CORS allowlist on the backend covers ports `5173`–`5175` so Vite's auto-fallback works if 5173 is held by another project.

---

## End-to-end smoke test

1. Open the Vite URL and click **Continue with Google** — Google popup, then you land on the empty worklist.
2. Click **+ New** (top-right or bottom tab on mobile) → drop a PNG (e.g. `POC/test_xray_images/00000059_000-Normal.png`) → submit.
3. Watch the four stages tick through: *Saving study → Storing image preview → Running classifier → Persisting results*.
4. The app auto-navigates to **/studies/{id}** with the X-ray, ranked probabilities, and the AI draft report.
5. Refresh the page — studies persist (loaded from Firestore on every mount).
6. Sign out, sign back in on a different device with the same Google account — same studies appear.

---

## How auth flows

```
1. User clicks "Continue with Google" in the React app.
2. Firebase Auth (browser) returns a Firebase ID token (signed JWT).
3. Frontend stores token in memory; calls auth.currentUser.getIdToken()
   on every /get_prediction request and attaches Authorization: Bearer.
4. FastAPI fetches Google's public JWK set (cached 1h) and verifies:
     - signature (RS256)
     - audience  == FIREBASE_PROJECT_ID  (default: chestxray-bde16)
     - issuer    == https://securetoken.google.com/<project>
     - exp / iat / sub claims present
5. On success, the request handler runs with the verified uid; on
   failure, 401.
```

No credentials live on the server. The JWK endpoint
(`https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`)
is a public document.

To trust a different Firebase project, set `FIREBASE_PROJECT_ID` in the backend's environment:

```bash
FIREBASE_PROJECT_ID=my-other-project uvicorn POC.model.inference.api:app ...
```

---

## Project structure

```
chest-x-ray-DL/
├── POC/
│   ├── model/
│   │   ├── inference/
│   │   │   ├── api.py                       FastAPI app — /health, /get_prediction
│   │   │   ├── model_inference.py           Model load + prediction logic
│   │   │   └── trained_model_parameters.py  Class names + thresholds
│   │   └── training/                        Training notebook + dataset README
│   └── test_xray_images/                    Sample X-rays for manual testing
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── .env.example                         Firebase web config template
│   └── src/
│       ├── App.jsx                          Routes + auth gate
│       ├── main.jsx
│       ├── styles.css                       Dark radiology workstation theme
│       ├── components/                      AuthScreen, Shell, Sidebar,
│       │                                    UploadView, ProcessingView,
│       │                                    StudyDetail, SettingsView,
│       │                                    XrayImage, Icon, WorklistEmpty
│       ├── hooks/                           useAuth, useStudies, useStudy
│       ├── lib/                             firebase, auth, studies,
│       │                                    inferenceApi, imageResize
│       └── data/                            classes.js (3 pathologies + thresholds)
├── firebase.json                            Firestore + auth + hosting blocks
├── firestore.rules                          Per-user /users/{uid}/studies/{studyId}
├── firestore.indexes.json
├── .firebaserc                              Pinned to chestxray-bde16
└── requirements.txt
```

### Firestore schema

```
/users/{uid}                           created on first sign-in
  email, displayName, photoURL, createdAt, lastSeenAt

/users/{uid}/studies/{studyId}         studyId = client-generated UUID
  patientMrn, reasonForExam,
  fileName, fileContentType, fileSize,
  imageDataUrl, imageWidth, imageHeight,   resized JPEG (≤ ~700 KB base64)
  probabilities { Atelectasis, Effusion, Infiltration },
  predictions: ['Atelectasis' | 'Effusion' | 'Infiltration' | 'Normal'],
  modelVersion,
  status: 'pending' | 'complete' | 'failed',
  errorMessage,
  createdAt, completedAt
```

`topFinding`/`priority` are derived at render time from `probabilities` + the threshold map in `frontend/src/data/classes.js`, so threshold changes don't stale-out historical rows.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `auth/unauthorized-domain` on sign-in | `localhost` missing from Firebase Auth authorized domains | Console → Authentication → Settings → Authorized domains → add `localhost` |
| `401 Missing or malformed Authorization header` from `/get_prediction` | Frontend isn't sending a Firebase ID token, or it expired | Check `auth.currentUser` exists; tokens auto-refresh, but you can force with `getIdToken(true)` |
| `401 Invalid token issuer` / `Token audience does not match` | Frontend is signed in to a different Firebase project than the backend trusts | Confirm `VITE_FIREBASE_PROJECT_ID` (frontend) and `FIREBASE_PROJECT_ID` env (backend, defaults to `chestxray-bde16`) match |
| CORS error in browser console | Vite is on a port outside 5173–5175 | Free up port 5173, or extend `ALLOWED_ORIGINS` in `POC/model/inference/api.py` |
| `Permission denied` on a Firestore write | Doc shape doesn't match the rules | See `firestore.rules` — `create` requires `status: 'pending'` and the field types listed there |
| Processing screen stuck at first stage | Stale dev build | Hard-refresh the browser; HMR sometimes drops state |
| Image bigger than 10 MB rejected | Server-side cap | Resize before uploading; the frontend already pre-flights this |
| `pip install` fails on TensorFlow | Python 3.13 / 3.14 | Recreate the venv with `python3.12 -m venv .venv` |

---

## What this app deliberately does NOT do

- No DICOM viewer — `<img>` only handles JPG/PNG.
- No Grad-CAM / heatmap — the model doesn't return one.
- No multi-user / admin views — Firestore schema is per-user only.
- No Firebase Storage — images live inline in the Firestore doc as a resized JPEG so the project runs on the free **Spark** plan.
- The endpoint is a decision-support tool; it is not a medical device and not a substitute for clinical judgment.
