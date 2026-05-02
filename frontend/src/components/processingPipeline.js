import {
  completeStudy,
  createPendingStudy,
  failStudy,
  uploadStudyImage,
} from '../lib/studies.js';
import { postPrediction } from '../lib/inferenceApi.js';

export const STAGES = [
  'Saving study',
  'Uploading image',
  'Running classifier',
  'Persisting results',
];

export async function completePipeline({ uid, studyId, file, patientMrn, reasonForExam, onStage }) {
  try {
    onStage?.(0);
    await createPendingStudy({ uid, studyId, file, patientMrn, reasonForExam });

    onStage?.(1);
    await uploadStudyImage({ uid, studyId, file });

    onStage?.(2);
    const { probabilities, predictions } = await postPrediction(file);

    onStage?.(3);
    await completeStudy({ uid, studyId, probabilities, predictions });
  } catch (err) {
    try {
      await failStudy({
        uid,
        studyId,
        errorMessage: err?.message || String(err),
      });
    } catch (writeErr) {
      console.error('[pipeline] could not record failure', writeErr);
    }
    throw err;
  }
}
