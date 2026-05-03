import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from './Icon.jsx';
import { isNegative, priorityFor, topFinding } from '../data/classes.js';

function formatTime(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function dateBucket(ts) {
  if (!ts) return 'Pending';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function studyDisplay(s) {
  if (s.status === 'pending') {
    return { topLabel: 'Processing…', priority: 'pending', sub: s.fileName };
  }
  if (s.status === 'failed') {
    return { topLabel: 'Failed', priority: 'failed', sub: s.errorMessage || s.fileName };
  }
  const top = topFinding(s.probabilities, s.predictions);
  const negative = isNegative(s.predictions);
  return {
    topLabel: negative ? 'Normal' : top.label,
    priority: priorityFor(s.probabilities, s.predictions),
    sub: s.patientMrn ? `MRN ${s.patientMrn}` : s.fileName,
  };
}

export default function Sidebar({ studies, loading, drawerOpen, onCloseDrawer, onNew }) {
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const { studyId: activeId } = useParams();

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return studies;
    return studies.filter((s) => {
      const top = topFinding(s.probabilities, s.predictions).label?.toLowerCase() ?? '';
      return (
        s.id.toLowerCase().includes(k) ||
        (s.patientMrn || '').toLowerCase().includes(k) ||
        (s.fileName || '').toLowerCase().includes(k) ||
        top.includes(k)
      );
    });
  }, [studies, q]);

  const groups = useMemo(() => {
    const out = {};
    filtered.forEach((s) => {
      const date = dateBucket(s.createdAt);
      out[date] = out[date] || [];
      out[date].push(s);
    });
    return out;
  }, [filtered]);

  const handleSelect = (id) => {
    navigate(`/studies/${id}`);
    onCloseDrawer?.();
  };

  return (
    <aside className={`sidebar ${drawerOpen ? 'open' : ''}`}>
      <div className="sidebar-hd">
        <h3>Studies</h3>
        <button className="btn btn-sm btn-primary" onClick={onNew}>
          <Icon name="plus" size={12} /> New
        </button>
      </div>
      <div className="sidebar-search">
        <div className="search-wrap">
          <Icon name="search" size={13} />
          <input
            className="input"
            placeholder="Search ID, MRN, finding…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>
      <div className="sidebar-list">
        {loading && studies.length === 0 && (
          <div style={{ padding: '8px 10px' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 44,
                  borderRadius: 8,
                  background: 'linear-gradient(90deg, var(--bg-2) 0%, var(--bg-3) 50%, var(--bg-2) 100%)',
                  marginBottom: 6,
                  opacity: 0.6,
                }}
              />
            ))}
          </div>
        )}

        {!loading && studies.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-3)', fontSize: 12 }}>
            No studies yet. Click <strong style={{ color: 'var(--fg-1)' }}>New</strong> to upload a chest X-ray.
          </div>
        )}

        {Object.entries(groups).map(([date, items]) => (
          <div key={date}>
            <div className="sidebar-grouphdr">
              {date} · <span className="tnum">{items.length}</span>
            </div>
            {items.map((s) => {
              const d = studyDisplay(s);
              const dotClass =
                d.priority === 'critical'
                  ? 'dot-crit'
                  : d.priority === 'warning'
                  ? 'dot-warn'
                  : d.priority === 'failed'
                  ? 'dot-crit'
                  : d.priority === 'pending'
                  ? 'dot-pending'
                  : 'dot-norm';
              return (
                <div
                  key={s.id}
                  className={`study-row ${activeId === s.id ? 'active' : ''}`}
                  onClick={() => handleSelect(s.id)}
                >
                  <div className="row-dot">
                    {s.status === 'pending' ? (
                      <span
                        className="spinner"
                        style={{
                          width: 10,
                          height: 10,
                          border: '1.5px solid var(--accent)',
                          borderRightColor: 'transparent',
                          borderRadius: '50%',
                          display: 'inline-block',
                          animation: 'spin 0.8s linear infinite',
                        }}
                      />
                    ) : (
                      <span className={`dot ${dotClass}`} />
                    )}
                  </div>
                  <div className="row-meta">
                    <div className="row-name">{d.topLabel}</div>
                    <div className="row-sub">
                      <span className="mono">{s.id.slice(0, 8)}</span>
                      <span>·</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.sub}</span>
                    </div>
                  </div>
                  <div className="row-time">{formatTime(s.createdAt)}</div>
                </div>
              );
            })}
          </div>
        ))}

        {!loading && filtered.length === 0 && studies.length > 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-3)', fontSize: 12 }}>
            No studies match "{q}".
          </div>
        )}
      </div>
    </aside>
  );
}
