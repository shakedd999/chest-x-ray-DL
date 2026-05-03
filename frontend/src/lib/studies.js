import {
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase.js';
import { MODEL_VERSION } from '../data/classes.js';
import { resizeImageForFirestore } from './imageResize.js';

function studyDocRef(uid, studyId) {
  return doc(db, 'users', uid, 'studies', studyId);
}

export function newStudyId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `stu-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function createPendingStudy({ uid, studyId, file, patientMrn, reasonForExam }) {
  await setDoc(studyDocRef(uid, studyId), {
    patientMrn: patientMrn || '',
    reasonForExam: reasonForExam || '',
    fileName: file.name,
    fileContentType: file.type || 'application/octet-stream',
    fileSize: file.size,
    imageDataUrl: '',
    probabilities: {},
    predictions: [],
    modelVersion: MODEL_VERSION,
    status: 'pending',
    errorMessage: null,
    createdAt: serverTimestamp(),
    completedAt: null,
  });
}

export async function attachStudyImage({ uid, studyId, file }) {
  const { dataUrl, width, height } = await resizeImageForFirestore(file);
  await updateDoc(studyDocRef(uid, studyId), {
    imageDataUrl: dataUrl,
    imageWidth: width,
    imageHeight: height,
  });
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
