import { auth } from './firebase.js';

const BASE = import.meta.env.VITE_INFERENCE_API_BASE || 'http://localhost:8000';

async function postOnce(file, idToken) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/get_prediction`, {
    method: 'POST',
    body: form,
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`Inference failed: ${res.status} ${text}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function postPrediction(file) {
  if (!auth.currentUser) throw new Error('Not signed in');
  const idToken = await auth.currentUser.getIdToken();
  try {
    return await postOnce(file, idToken);
  } catch (err) {
    const retriable = err.status === undefined || err.status >= 500;
    if (!retriable) throw err;
    await new Promise((r) => setTimeout(r, 1000));
    const fresh = await auth.currentUser.getIdToken();
    return postOnce(file, fresh);
  }
}
