import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import { MAX_UPLOAD_BYTES } from '../data/classes.js';
import { newStudyId } from '../lib/studies.js';

export default function UploadView() {
  const [file, setFile] = useState(null);
  const [mrn, setMrn] = useState('');
  const [reason, setReason] = useState('');
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);
  const navigate = useNavigate();

  const validate = (f) => {
    if (!f) return 'No file selected.';
    if (!f.type.startsWith('image/')) return 'File must be an image (JPG / PNG).';
    if (f.size === 0) return 'File is empty.';
    if (f.size > MAX_UPLOAD_BYTES) {
      const mb = (f.size / 1024 / 1024).toFixed(1);
      return `File is ${mb} MB; the limit is 10 MB.`;
    }
    return null;
  };

  const handleFile = (f) => {
    const err = validate(f);
    if (err) {
      setError(err);
      setFile(null);
      return;
    }
    setError(null);
    setFile(f);
  };

  const submit = (e) => {
    e?.preventDefault();
    if (!file) return;
    const studyId = newStudyId();
    navigate(`/studies/${studyId}/processing`, {
      state: { file, mrn, reason },
    });
  };

  return (
    <div className="upload-shell">
      <form className="upload-card" onSubmit={submit}>
        <h2>New study</h2>
        <p className="lede">Upload a single chest X-ray. JPG or PNG up to 10&nbsp;MB.</p>

        <div
          className={`dropzone ${drag ? 'dragover' : ''}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            handleFile(e.dataTransfer.files[0]);
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => handleFile(e.target.files[0])}
          />
          <Icon name="upload" size={28} />
          <div className="t">{file ? file.name : 'Drop image or click to browse'}</div>
          <div className="s">
            {file
              ? `${(file.size / 1024 / 1024).toFixed(2)} MB · click to choose a different file`
              : 'AP / PA view recommended'}
          </div>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              marginTop: 12,
              padding: '10px 12px',
              background: 'rgba(232,101,74,0.08)',
              border: '0.5px solid rgba(232,101,74,0.25)',
              borderRadius: 6,
              color: 'var(--critical)',
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}

        <div className="field-row">
          <div className="field">
            <label>Patient MRN</label>
            <input
              className="input"
              placeholder="e.g. 4490321"
              value={mrn}
              onChange={(e) => setMrn(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Reason for exam</label>
            <input
              className="input"
              placeholder="Optional clinical context"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22, alignItems: 'center' }}>
          <button type="submit" className="btn btn-primary" disabled={!file}>
            Run classification
            <Icon name="arrow-right" size={14} />
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
