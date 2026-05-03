// Mirrors POC/model/inference/trained_model_parameters.py:
//   CLASSES = {0: 'Infiltration', 1: 'Effusion', 2: 'Atelectasis'}
//   THRESHOLDS_FOR_PREDICTIONS = [0.29, 0.44, 0.34]
// Update both places when retraining.

export const PATHOLOGY_CLASSES = [
  { key: 'Infiltration', label: 'Infiltration', threshold: 0.29 },
  { key: 'Effusion', label: 'Effusion', threshold: 0.44 },
  { key: 'Atelectasis', label: 'Atelectasis', threshold: 0.34 },
];

export const NORMAL_LABEL = 'Normal';
export const MODEL_VERSION = 'pulmoscope-cxr-v1.0';

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
