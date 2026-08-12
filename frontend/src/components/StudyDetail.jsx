import { Fragment, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from './Icon.jsx';
import XrayImage from './XrayImage.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useStudy } from '../hooks/useStudy.js';
import {
  isNegative,
  levelFor,
  priorityFor,
  rankedProbabilities,
  topFinding,
} from '../data/classes.js';

function lvlLabel(level) {
  if (level === 'high') return 'High';
  if (level === 'mid') return 'Mod';
  return 'Low';
}

function formatTimestamp(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function StudyDetail() {
  const { studyId } = useParams();
  const { user } = useAuth();
  const { study, loading } = useStudy(user?.uid, studyId);
  const [tab, setTab] = useState('findings');
  const [zoom, setZoom] = useState(1);
  const [invert, setInvert] = useState(false);
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="content" style={{ background: 'var(--bg-0)', padding: 40, color: 'var(--fg-2)' }}>
        Loading study…
      </div>
    );
  }

  if (!study) {
    return (
      <div className="content" style={{ background: 'var(--bg-0)', padding: 40 }}>
        <h1 style={{ marginTop: 0 }}>Study not found</h1>
        <p style={{ color: 'var(--fg-1)' }}>
          This study doesn't exist, or you don't have permission to view it.
        </p>
        <button className="btn" onClick={() => navigate('/upload')}>
          Upload a new study
        </button>
      </div>
    );
  }

  if (study.status === 'pending') {
    return (
      <div className="content" style={{ background: 'var(--bg-0)' }}>
        <div className="detail-header">
          <div>
            <div className="crumbs">
              Worklist <span>›</span> <span className="mono">{study.id.slice(0, 8)}</span>
            </div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="dot dot-pending" />
              Processing…
            </h1>
          </div>
        </div>
        <div style={{ padding: 40, color: 'var(--fg-1)' }}>
          The classifier is still running. Stay on this screen — results will appear automatically.
        </div>
      </div>
    );
  }

  if (study.status === 'failed') {
    return (
      <div className="content" style={{ background: 'var(--bg-0)' }}>
        <div className="detail-header">
          <div>
            <div className="crumbs">
              Worklist <span>›</span> <span className="mono">{study.id.slice(0, 8)}</span>
            </div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="dot dot-crit" />
              Classification failed
            </h1>
          </div>
        </div>
        <div style={{ padding: 40 }}>
          <div className="disclaimer" style={{ color: 'var(--critical)' }}>
            {study.errorMessage || 'Unknown error'}
          </div>
          <button className="btn" style={{ marginTop: 16 }} onClick={() => navigate('/upload')}>
            Try a new upload
          </button>
        </div>
      </div>
    );
  }

  const sorted = rankedProbabilities(study.probabilities);
  const top = topFinding(study.probabilities, study.predictions);
  const negative = isNegative(study.predictions);
  const priority = priorityFor(study.probabilities, study.predictions);
  const findingsAboveThreshold = sorted.filter((r) => r.p >= (r.threshold ?? 0.5));

  const reportImpression = negative
    ? 'No acute cardiopulmonary abnormality identified within the supported pathology set. Lungs are clear bilaterally with normal cardiac silhouette.'
    : findingsAboveThreshold.length === 1
    ? `Findings most consistent with ${findingsAboveThreshold[0].label.toLowerCase()}. Clinical correlation recommended.`
    : `Multiple findings detected. Most prominent: ${findingsAboveThreshold
        .map((f) => f.label.toLowerCase())
        .join(', ')}. Consider clinical correlation and prior imaging.`;

  const ProbabilityList = () => (
    <div className="prob-list">
      <div className="prob-summary">
        <div>
          <div className="prob-summary-label">Top finding</div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              marginTop: 2,
              color: negative
                ? 'var(--normal)'
                : top.p >= 0.6
                ? 'var(--signal-high)'
                : 'var(--fg-0)',
            }}
          >
            {negative ? 'Normal' : top.label}
          </div>
        </div>
        {!negative && (
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div className="prob-summary-num">
              {(top.p * 100).toFixed(1)}
              <span style={{ fontSize: 14, color: 'var(--fg-2)' }}>%</span>
            </div>
            <div className="prob-summary-meta">probability</div>
          </div>
        )}
      </div>

      <div className="uppercase-label" style={{ marginBottom: 6, paddingLeft: 6 }}>
        Classes · ranked
      </div>

      {sorted.map((r) => {
        const lvl = levelFor(r.p, r.threshold);
        return (
          <div key={r.key} className={`prob-row ${lvl} ${r.p < 0.05 ? 'muted' : ''}`}>
            <span
              className={`dot dot-${
                lvl === 'high' ? 'crit' : lvl === 'mid' ? 'warn' : 'pending'
              }`}
            />
            <div className="label">{r.label}</div>
            <div className="bar">
              <i style={{ width: `${Math.max(2, r.p * 100)}%` }} />
            </div>
            <div>
              <div className="pct">{(r.p * 100).toFixed(1)}%</div>
              <div className="lvl">{lvlLabel(lvl)}</div>
            </div>
          </div>
        );
      })}

      <div
        style={{
          marginTop: 16,
          fontSize: 11,
          color: 'var(--fg-3)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        Thresholds — Atelectasis 0.34 · Effusion 0.44 · Infiltration 0.29
      </div>
    </div>
  );

  const Report = () => (
    <div className="report">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="chip chip-accent">
          <Icon name="sparkle" size={11} /> AI draft
        </span>
        <span className="chip">{study.modelVersion || 'v1.0'}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fg-3)' }}>
          {formatTimestamp(study.completedAt || study.createdAt)}
        </span>
      </div>

      {study.reasonForExam && (
        <div className="report-section">
          <h4>Indication</h4>
          <div className="report-text">{study.reasonForExam}</div>
        </div>
      )}

      <div className="report-section">
        <h4>Technique</h4>
        <div className="report-text">Single AP/PA chest radiograph.</div>
      </div>

      <div className="report-section">
        <h4>Findings</h4>
        <div className="report-text">
          {negative ? (
            <span>
              No findings above threshold for the supported pathologies (Atelectasis, Effusion, Infiltration).
              Heart size and mediastinal contours not assessed by this model — review the image directly.
            </span>
          ) : findingsAboveThreshold.length === 0 ? (
            <span>
              No class crossed its decision threshold, but the following probabilities were observed:{' '}
              {sorted
                .map((f) => `${f.label.toLowerCase()} (${(f.p * 100).toFixed(0)}%)`)
                .join(', ')}
              .
            </span>
          ) : (
            <span>
              The model flagged{' '}
              {findingsAboveThreshold.map((f, i) => (
                <Fragment key={f.key}>
                  {i > 0 && (i === findingsAboveThreshold.length - 1 ? ', and ' : ', ')}
                  <mark>{f.label.toLowerCase()}</mark> ({(f.p * 100).toFixed(0)}%)
                </Fragment>
              ))}
              . Other supported classes:{' '}
              {sorted
                .filter((f) => !findingsAboveThreshold.includes(f))
                .map((f) => `${f.label.toLowerCase()} (${(f.p * 100).toFixed(0)}%)`)
                .join(', ')}
              .
            </span>
          )}
        </div>
      </div>

      <div className="report-section">
        <h4>Impression</h4>
        <div className="report-text" style={{ fontWeight: 500 }}>
          {reportImpression}
        </div>
      </div>

      <div className="report-section">
        <h4>Doctor's notes</h4>
        <textarea
          className="input"
          rows={3}
          placeholder="Add your impression — overrides AI draft when signed."
          defaultValue=""
        />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
        <button className="btn btn-primary">
          <Icon name="check" size={13} /> Approve & sign
        </button>
        <button className="btn">
          <Icon name="edit" size={13} /> Edit draft
        </button>
        <button className="btn btn-ghost btn-icon" title="Copy">
          <Icon name="copy" size={13} />
        </button>
      </div>

      <div className="disclaimer">
        AI-generated draft. The interpreting radiologist is responsible for the final report. This model
        only classifies for Atelectasis, Effusion, and Infiltration — other pathologies are not assessed.
      </div>
    </div>
  );

  const Viewer = () => (
    <div className="viewer-pane">
      <div className="viewer">
        <div className="viewer-toolbar">
          <button title="Zoom in" onClick={() => setZoom((z) => Math.min(2, z + 0.1))}>
            <Icon name="zoom-in" size={14} />
          </button>
          <button title="Zoom out" onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}>
            <Icon name="zoom-out" size={14} />
          </button>
          <button title="Invert" className={invert ? 'on' : ''} onClick={() => setInvert((v) => !v)}>
            <Icon name="invert" size={14} />
          </button>
        </div>

        <div className="xray-frame">
          <XrayImage dataUrl={study.imageDataUrl} alt="Chest X-ray" invert={invert} zoom={zoom} />
          <div className="viewer-corner" style={{ top: 8, left: 8 }}>R</div>
          <div className="viewer-corner" style={{ top: 8, right: 8 }}>L</div>
        </div>

        <div className="viewer-meta">
          {study.patientMrn && <div>MRN {study.patientMrn}</div>}
          <div>{study.id.slice(0, 8)}</div>
          <div>{formatTimestamp(study.createdAt)}</div>
        </div>
        <div className="viewer-meta-r">
          <div>{study.fileName}</div>
          <div>{(study.fileSize / 1024 / 1024).toFixed(2)} MB</div>
          <div>{Math.round(zoom * 100)}%</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="content" style={{ background: 'var(--bg-0)' }}>
      <div className="detail-header">
        <div>
          <div className="crumbs">
            Worklist <span>›</span> <span className="mono">{study.id.slice(0, 8)}</span>
          </div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span
              className={`dot dot-${
                priority === 'critical' ? 'crit' : priority === 'warning' ? 'warn' : 'norm'
              }`}
            />
            {negative ? 'Normal' : top.label}
            {priority === 'critical' && <span className="chip chip-crit">Critical</span>}
            {negative && <span className="chip chip-neg">Normal</span>}
          </h1>
        </div>
        <div className="detail-header-meta">
          {study.patientMrn && (
            <div>
              <span className="label">Patient</span>
              <span className="mono">MRN {study.patientMrn}</span>
            </div>
          )}
          <div>
            <span className="label">Received</span>
            <span className="mono">{formatTimestamp(study.createdAt)}</span>
          </div>
          <div>
            <span className="label">Model</span>
            <span className="mono">{study.modelVersion || 'v1.0'}</span>
          </div>
        </div>
      </div>

      <div className="detail-body layout-split">
        <Viewer />
        <div className="findings-pane">
          <div className="tabs">
            <button className={tab === 'findings' ? 'active' : ''} onClick={() => setTab('findings')}>
              Findings
            </button>
            <button className={tab === 'report' ? 'active' : ''} onClick={() => setTab('report')}>
              Draft report
            </button>
          </div>
          {tab === 'findings' ? <ProbabilityList /> : <Report />}
        </div>
      </div>
    </div>
  );
}
