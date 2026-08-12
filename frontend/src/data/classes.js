// Mirrors POC/model/inference/trained_model_parameters.py
// (CLASSES + THRESHOLDS_FOR_PREDICTIONS). Update both places when retraining.
// 13 classes: NIH ChestX-ray14 minus Hernia, alphabetical (= model output order).

export const PATHOLOGY_CLASSES = [
  { key: 'Atelectasis', label: 'Atelectasis', threshold: 0.37 },
  { key: 'Cardiomegaly', label: 'Cardiomegaly', threshold: 0.42 },
  { key: 'Consolidation', label: 'Consolidation', threshold: 0.29 },
  { key: 'Edema', label: 'Edema', threshold: 0.46 },
  { key: 'Effusion', label: 'Effusion', threshold: 0.4 },
  { key: 'Emphysema', label: 'Emphysema', threshold: 0.53 },
  { key: 'Fibrosis', label: 'Fibrosis', threshold: 0.3 },
  { key: 'Infiltration', label: 'Infiltration', threshold: 0.32 },
  { key: 'Mass', label: 'Mass', threshold: 0.32 },
  { key: 'Nodule', label: 'Nodule', threshold: 0.27 },
  { key: 'Pleural_Thickening', label: 'Pleural thickening', threshold: 0.31 },
  { key: 'Pneumonia', label: 'Pneumonia', threshold: 0.25 },
  { key: 'Pneumothorax', label: 'Pneumothorax', threshold: 0.49 },
];

export const NORMAL_LABEL = 'Normal';
export const MODEL_VERSION = 'pulmoscope-cxr-v2.0';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // matches POC/model/inference/api.py

export function rankedProbabilities(probabilities = {}) {
  return PATHOLOGY_CLASSES
    .map((c) => ({ ...c, p: Number(probabilities[c.key] ?? 0) }))
    .sort((a, b) => b.p - a.p);
}

export function isNegative(predictions) {
  return Array.isArray(predictions) && predictions.length === 1 && predictions[0] === NORMAL_LABEL;
}

export function topFinding(probabilities, predictions) {
  if (isNegative(predictions)) {
    return { key: 'normal', label: NORMAL_LABEL, p: 0 };
  }
  const ranked = rankedProbabilities(probabilities);
  return ranked[0] || { key: 'unknown', label: '—', p: 0 };
}

export function priorityFor(probabilities, predictions) {
  if (isNegative(predictions)) return 'normal';
  const top = topFinding(probabilities, predictions);
  if (top.p >= 0.85) return 'critical';
  if (top.p >= top.threshold || (top.threshold == null && top.p >= 0.5)) return 'warning';
  return 'normal';
}

export function levelFor(p, threshold) {
  if (p >= Math.max(0.6, threshold ?? 0.6)) return 'high';
  if (p >= Math.max(0.3, (threshold ?? 0.5) * 0.7)) return 'mid';
  return 'low';
}
