import {
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { db, storage } from './firebase.js';
import { MODEL_VERSION } from '../data/classes.js';

function studyDocRef(uid, studyId) {
  return doc(db, 'users', uid, 'studies', studyId);
}

function imageStoragePath(uid, studyId, fileName) {
  return `studies/${uid}/${studyId}/${fileName}`;
}

export function newStudyId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `stu-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function createPendingStudy({ uid, studyId, file, patientMrn, reasonForExam }) {
  const path = imageStoragePath(uid, studyId, file.name);
  await setDoc(studyDocRef(uid, studyId), {
    patientMrn: patientMrn || '',
    reasonForExam: reasonForExam || '',
    fileName: file.name,
    fileContentType: file.type || 'application/octet-stream',
    fileSize: file.size,
    imagePath: path,
    probabilities: {},
    predictions: [],
    modelVersion: MODEL_VERSION,
    status: 'pending',
    errorMessage: null,
    createdAt: serverTimestamp(),
    completedAt: null,
  });
  return path;
}

export async function uploadStudyImage({ uid, studyId, file }) {
  const path = imageStoragePath(uid, studyId, file.name);
  const ref = storageRef(storage, path);
  await uploadBytes(ref, file, { contentType: file.type || 'application/octet-stream' });
  return path;
}

export async function getStudyImageUrl(imagePath) {
  if (!imagePath) return null;
  return getDownloadURL(storageRef(storage, imagePath));
}

export async function completeStudy({ uid, studyId, probabilities, predictions }) {
  await updateDoc(studyDocRef(uid, studyId), {
    probabilities,
    predictions,
    status: 'complete',
    errorMessage: null,
    completedAt: serverTimestamp(),
  });
}

export async function failStudy({ uid, studyId, errorMessage }) {
  await updateDoc(studyDocRef(uid, studyId), {
    status: 'failed',
    errorMessage: errorMessage || 'Unknown error',
    completedAt: serverTimestamp(),
  });
}
