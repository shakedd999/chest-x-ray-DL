import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useStudies } from '../hooks/useStudies.js';

export default function WorklistEmpty() {
  const { user } = useAuth();
  const { studies, loading } = useStudies(user?.uid);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && studies.length > 0) {
      navigate(`/studies/${studies[0].id}`, { replace: true });
    }
  }, [loading, studies, navigate]);

  if (loading) {
    return (
      <div className="content" style={{ background: 'var(--bg-0)', padding: 40, color: 'var(--fg-2)' }}>
        Loading worklist…
      </div>
    );
  }

  return (
    <div
      className="content"
      style={{
        background: 'var(--bg-0)',
        display: 'grid',
        placeItems: 'center',
        textAlign: 'center',
        padding: 40,
      }}
    >
      <div style={{ maxWidth: 420 }}>
        <div
          style={{
            width: 64,
            height: 64,
            margin: '0 auto 18px',
            borderRadius: 16,
            background: 'var(--bg-2)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--fg-2)',
            border: '0.5px solid var(--line)',
          }}
        >
          <Icon name="image" size={28} />
        </div>
        <h1 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 600 }}>No studies yet</h1>
        <p style={{ color: 'var(--fg-1)', fontSize: 13.5, marginTop: 0 }}>
          Upload a chest X-ray and run classification. Your studies will appear in the sidebar and persist
          across devices.
        </p>
        <button
          className="btn btn-primary"
          style={{ marginTop: 14 }}
          onClick={() => navigate('/upload')}
        >
          <Icon name="plus" size={13} /> New study
        </button>
      </div>
    </div>
  );
}
