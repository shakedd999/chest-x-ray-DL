# Pulmoscope — What We Built

Pulmoscope is a small web app that gives a doctor a fast, probabilistic
read on a chest X-ray. The doctor uploads an image, a deep-learning
model classifies it, and the screen shows confidence scores across
thirteen thoracic findings. Every study is kept in a private per-doctor
history. It is a **decision-support tool**, not a diagnostic device.

The project has two halves — a **backend** that owns the AI model, and
a **frontend** that the doctor actually drives — with Firebase in the
middle handling sign-in and per-user storage.

---

## Backend

A small Python service wrapped around a trained TensorFlow model.

- **The model** is a multi-label classifier over the NIH ChestX-ray14
  dataset, covering **13 findings** — every label in that set except
  Hernia: atelectasis, cardiomegaly, consolidation, edema, effusion,
  emphysema, fibrosis, infiltration, mass, nodule, pleural thickening,
  pneumonia and pneumothorax. It was trained in two stages (transfer
  learning, then fine-tuning), and each class carries its own decision
  threshold rather than a shared 0.5 cutoff, because the classes are
  very unevenly represented. If nothing crosses its threshold the case
  is reported as **Normal**.
- **The service** exposes a health check and a single prediction
  endpoint. It validates that uploads are images and under 10 MB before
  ever touching the model.
- **Auth without server-side secrets.** Every prediction request must
  carry a signed token issued by Firebase when the doctor signs in.
  The backend verifies the token against Google's public keys — no
  service account, no credentials file, nothing on the server worth
  stealing. Earlier in the project this was done with Google's
  admin SDK; switching to direct verification removed that whole
  category of risk.

---

## Frontend

A single-page web app styled like a calm radiology workstation.

- **Sign-in** is one click with the doctor's existing Google account.
- **The workspace** has a top bar, a left-side worklist sidebar
  (grouped by date, searchable, color-coded by priority), and a main
  pane. On mobile the sidebar becomes a drawer and a bottom tab bar
  takes over.
- **Uploading a study** is a drag-and-drop screen that accepts a JPEG
  or PNG, with optional patient MRN and reason-for-exam fields. It
  validates the file client-side before submission.
- **Processing** is shown as a four-step pipeline (save study → store
  image preview → run classifier → persist results) with a progress
  ring and a checklist. Every step is mirrored to the backend, so a
  refresh or device switch never loses state, and any failure is
  saved and shown with a retry.
- **The study detail screen** is a split view: an image viewer with
  zoom and color-invert on the left, and on the right a two-tab panel
  showing either ranked probability bars or a plain-language AI draft
  report (Indication / Technique / Findings / Impression) that adapts
  to whether the case is normal, single-finding, or multi-finding.
  Every report carries an explicit disclaimer.

---

## Data and privacy

Each doctor's studies live in their own private space — image preview,
file metadata, MRN, reason for exam, probabilities and predictions,
model version, and timestamps. Database rules enforce that a doctor can
only ever read or write their own data, and they validate the **shape**
of every write, so a buggy or malicious client cannot corrupt anyone's
history.

---

## Design choices worth calling out

- **Image previews are stored inline with the study**, not in a
  separate storage bucket. This keeps the project on the free tier;
  the full original is only sent to the model, never kept.
- **Each class has its own decision threshold**, picked by maximising
  validation F1 for that class rather than using a shared 0.5 cutoff.
  The classes are very unevenly represented, so one global cutoff would
  bury the rare findings.
- **The positive/negative verdict is decided by the backend and stored
  with the study.** Probabilities are stored too, so re-tuning a
  threshold changes how new studies are judged but leaves the verdict
  on existing ones untouched — those need a backfill pass to catch up.
- **No server-side credentials.** Token verification uses Google's
  public keys; the backend can run anywhere with no secrets.
- **Strictly per-user.** No admin views, no cross-user sharing — the
  privacy story is trivial because there is no cross-user code path.

---

## Out of scope

- Not a diagnostic device.
- No DICOM support — JPEG/PNG only.
- No heatmaps or model explanations.
- Only the 13 pathologies above — anything else, including Hernia, is
  not assessed.
- No multi-user or admin views.
