import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useAuth } from '../hooks/useAuth.js';
import {
  completePipeline,
  STAGES,
} from './processingPipeline.js';

export default function ProcessingView() {
  const { studyId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stageIdx, setStageIdx] = useState(0);
  const [pct, setPct] = useState(8);
  const [error, setError] = useState(null);
  const startedRef = useRef(false);

  const file = state?.file;
  const mrn = state?.mrn || '';
  const reason = state?.reason || '';

  useEffect(() => {
    if (startedRef.current) return;
    if (!file || !user || !studyId) return;
    startedRef.current = true;

    completePipeline({
      uid: user.uid,
      studyId,
      file,
      patientMrn: mrn,
      reasonForExam: reason,
      onStage: (i) => {
        setStageIdx(i);
        setPct(Math.min(95, 8 + (i / STAGES.length) * 85));
      },
    })
      .then(() => {
        setPct(100);
        setStageIdx(STAGES.length);
        setTimeout(() => navigate(`/studies/${studyId}`, { replace: true }), 350);
      })
      .catch((err) => {
        console.error('[processing] failed', err);
        setError(err?.message || 'Classification failed.');
      });
  }, [file, user, studyId, mrn, reason, navigate]);

  if (!file) {
    return (
      <div className="upload-shell">
        <div className="upload-card">
          <h2>No file</h2>
          <p className="lede">No image was provided. Start over from the upload screen.</p>
          <button className="btn btn-primary" onClick={() => navigate('/upload')}>
            Go to upload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="upload-shell">
      <div className="upload-card">
        <h2>Analyzing study</h2>
        <p className="lede mono" style={{ fontSize: 12, color: 'var(--fg-2)' }}>
          {file.name}
        </p>

        <div className="processing">
          <div className="ring" style={{ '--p': `${pct}%` }}>
            <span>
              {Math.round(pct)}
              <small style={{ fontSize: 10, color: 'var(--fg-2)', marginLeft: 1 }}>%</small>
            </span>
          </div>
          <div className="stage-list">
            {STAGES.map((s, i) => {
              const done = i < stageIdx;
              const active = i === stageIdx && !error;
              return (
                <div key={s} className={`stage ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
                  <span className="ico">
                    {done ? (
                      <Icon name="check" size={14} />
                    ) : active ? (
                      <span className="spinner" />
                    ) : (
                      <span className="dot dot-pending" style={{ width: 6, height: 6 }} />
                    )}
                  </span>
                  {s}
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              marginTop: 18,
              padding: '12px 14px',
              background: 'rgba(232,101,74,0.08)',
              border: '0.5px solid rgba(232,101,74,0.25)',
              borderRadius: 8,
              color: 'var(--critical)',
              fontSize: 13,
            }}
          >
            <div style={{ fontWeight: 500, marginBottom: 4 }}>Classification failed</div>
            <div style={{ color: 'var(--fg-1)' }}>{error}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                className="btn btn-sm"
                onClick={() => {
                  startedRef.current = false;
                  setError(null);
                  setStageIdx(0);
                  setPct(8);
                }}
              >
                Retry
              </button>
              <button className="btn btn-sm btn-ghost" onClick={() => navigate('/upload')}>
                Back to upload
              </button>
            </div>
          </div>
        )}

        {!error && (
          <div className="disclaimer" style={{ marginTop: 18 }}>
            Image is uploaded to your secure storage and classified by the inference service.
          </div>
        )}
      </div>
    </div>
  );
}
