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
- **Auth:** Google Sign-In; the FastAPI `/get_prediction` endpoint verifies Firebase ID tokens server-side via PyJWT against Google's public JWKs (no service account or gcloud login needed)

---

## Prerequisites

- Python **3.12** (TensorFlow doesn't yet support 3.13/3.14 stably)
- Node.js **18+** and npm
- A Firebase project — this repo is wired to **`chestxray-bde16`** via `.firebaserc`
- A Google account with access to that Firebase project

---

## One-time setup

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

This installs FastAPI, TensorFlow, PyJWT, etc. The model weights (`xray_model_fine_tuning_poc.keras`, ~48 MB) download automatically from Google Drive on the first request.

### 3. Frontend — Node dependencies

```bash
cd frontend
npm install
cd ..
```

### 4. Firebase Console (one-time, manual)

In [the Firebase Console](https://console.firebase.google.com/project/chestxray-bde16):

1. **Authentication → Sign-in method** → enable **Google** → save.
2. **Authentication → Settings → Authorized domains** → make sure `localhost` is in the list (we add it via the Identity Toolkit Admin API; if it's missing for some reason, re-add it).
3. **Firestore Database** → already created by `firebase deploy --only firestore` from earlier commits.

If you're starting from scratch on a new Firebase project, also run (requires the Firebase CLI):

```bash
firebase use <your-project-id>
firebase deploy --only firestore:rules,firestore:indexes
```

### 5. Frontend `.env.local` — Firebase web config

In Firebase Console → **Project Settings → Your apps**, register a Web app (or reuse the existing **Default Web App**) and copy its config into `frontend/.env.local`:

```bash
cp frontend/.env.example frontend/.env.local
# then edit and fill in:
#   VITE_FIREBASE_API_KEY
#   VITE_FIREBASE_AUTH_DOMAIN
#   VITE_FIREBASE_PROJECT_ID
#   VITE_FIREBASE_MESSAGING_SENDER_ID
#   VITE_FIREBASE_APP_ID
#   VITE_INFERENCE_API_BASE   (defaults to http://localhost:8000)
```

The fastest way to populate it without copying by hand:

```bash
firebase apps:sdkconfig --project chestxray-bde16 web <APP_ID>
```

---

## Running locally

You'll need **two terminals**.

### Terminal 1 — FastAPI backend

```bash
source .venv/bin/activate
uvicorn POC.model.inference.api:app --host 127.0.0.1 --port 8000
```

First start downloads the model (~5–10 s) and prints `Application startup complete`.

Sanity check:
```bash
curl http://127.0.0.1:8000/health
# → {"status":"ok","model_loaded":true}
```

Unauthenticated calls are rejected:
```bash
curl -X POST http://127.0.0.1:8000/get_prediction -F "file=@POC/test_xray_images/00000059_000-Normal.png"
# → HTTP 401  {"detail":"Missing or malformed Authorization header."}
```

### Terminal 2 — Vite dev server

```bash
cd frontend
npm run dev
```

Open the URL Vite prints — usually <http://localhost:5173>, or 5174 if 5173 is busy. The CORS allowlist on the backend covers 5173–5175.

---

## End-to-end smoke test

1. Open the Vite URL and click **Continue with Google** — you'll see a Google popup, then land on the empty worklist.
2. Click **+ New** (top-right or bottom tab on mobile) → drop a PNG (e.g. `POC/test_xray_images/00000059_000-Normal.png`) → submit.
3. Watch the four stages tick through: *Saving study → Storing image preview → Running classifier → Persisting results*.
4. The app auto-navigates to **/studies/{id}** showing the X-ray, ranked probabilities, and the AI draft report.
5. Refresh the page — your studies should reappear from Firestore.
6. Sign out and sign back in on a different device — same studies appear.

---

## Project structure

```
chest-x-ray-DL/
├── POC/
│   ├── model/
│   │   ├── inference/
│   │   │   ├── api.py                   FastAPI app — /health, /get_prediction
│   │   │   ├── model_inference.py       Model load + prediction logic
│   │   │   └── trained_model_parameters.py  Class names + thresholds
│   │   └── training/                    Training notebook + dataset README
│   └── test_xray_images/                Sample X-rays for manual testing
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── .env.example                     Firebase web config template
│   └── src/
│       ├── App.jsx                      Route table + auth gate
│       ├── main.jsx
│       ├── styles.css                   Dark radiology workstation theme
│       ├── components/                  AuthScreen, Shell, Sidebar,
│       │                                UploadView, ProcessingView,
│       │                                StudyDetail, SettingsView,
│       │                                XrayImage, Icon, WorklistEmpty
│       ├── hooks/                       useAuth, useStudies, useStudy
│       ├── lib/                         firebase, auth, studies,
│       │                                inferenceApi, imageResize
│       └── data/                        classes.js (3 pathologies + thresholds)
├── firebase.json                        Firestore + auth + hosting blocks
├── firestore.rules                      Per-user /users/{uid}/studies/{studyId}
├── firestore.indexes.json
├── .firebaserc                          Pinned to chestxray-bde16
└── requirements.txt
```

### Firestore schema

```
/users/{uid}                           created on first sign-in
  email, displayName, photoURL, createdAt, lastSeenAt

/users/{uid}/studies/{studyId}         studyId = client-generated UUID
  patientMrn, reasonForExam,
  fileName, fileContentType, fileSize,
  imageDataUrl, imageWidth, imageHeight,   resized JPEG (~< 700 KB base64)
  probabilities { Atelectasis, Effusion, Infiltration },
  predictions: ['Atelectasis' | 'Effusion' | 'Infiltration' | 'Normal'],
  modelVersion,
  status: 'pending' | 'complete' | 'failed',
  errorMessage,
  createdAt, completedAt
```

`topFinding`/`priority` are derived at render time from `probabilities` + the threshold map in `frontend/src/data/classes.js` so threshold changes don't stale-out historical rows.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `auth/unauthorized-domain` on sign-in | `localhost` missing from Firebase Auth authorized domains | Console → Authentication → Settings → Authorized domains → add `localhost` |
| `401 Missing or malformed Authorization header` from `/get_prediction` | Frontend isn't sending a Firebase ID token, or token expired | Check `auth.currentUser` exists; tokens auto-refresh, but you can call `getIdToken(true)` to force |
| `401 Invalid token issuer` / `Token audience does not match` | The frontend is signed in to a different Firebase project than the backend trusts | Confirm `VITE_FIREBASE_PROJECT_ID` (frontend) and `FIREBASE_PROJECT_ID` env (backend, defaults to `chestxray-bde16`) match |
| CORS error in browser console | Vite is on a port outside 5173–5175 | Free up port 5173, or extend `ALLOWED_ORIGINS` in `POC/model/inference/api.py` |
| `Permission denied` on a Firestore write | Doc shape doesn't match the rules | See `firestore.rules` — `create` requires `status: 'pending'` and the field types listed there |
| Processing screen stuck at first stage | Stale dev build | Hard-refresh the browser; HMR sometimes drops state |
| Image bigger than 10 MB rejected | Server-side cap | Resize before uploading; the frontend already pre-flights this |

---

## What this app deliberately does NOT do

- No DICOM viewer — `<img>` only handles JPG/PNG.
- No Grad-CAM / heatmap — the model doesn't return one.
- No multi-user / admin views — Firestore schema is per-user only.
- No Firebase Storage — images live inline in the Firestore doc as a resized JPEG so the project runs on the free **Spark** plan.
- The endpoint is a decision-support tool; it is not a medical device and not a substitute for clinical judgment.
