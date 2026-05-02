import Icon from './Icon.jsx';
import { initialsFor, signOut } from '../lib/auth.js';

export default function SettingsView({ user }) {
  return (
    <div className="content" style={{ background: 'var(--bg-0)' }}>
      <div className="detail-header">
        <div>
          <div className="crumbs">
            Account <span>›</span> Settings
          </div>
          <h1>Settings</h1>
        </div>
      </div>

      <div className="settings-page">
        <section className="settings-section">
          <h3>Profile</h3>
          <div className="setting-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  width={44}
                  height={44}
                  style={{ borderRadius: '50%', border: '0.5px solid var(--line-strong)' }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="avatar" style={{ width: 44, height: 44, fontSize: 16 }}>
                  {initialsFor(user)}
                </div>
              )}
              <div>
                <div className="lbl">{user?.displayName || 'Signed-in user'}</div>
                <div className="desc mono" style={{ fontSize: 11 }}>
                  {user?.email || ''}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h3>Model</h3>
          <div className="setting-row">
            <div>
              <div className="lbl">Active model</div>
              <div className="desc">
                Inference is served by the project's FastAPI endpoint. Class set: Atelectasis, Effusion, Infiltration.
              </div>
            </div>
            <span className="chip">pulmoscope-cxr-v1.0</span>
          </div>
        </section>

        <section className="settings-section">
          <h3>Session</h3>
          <div className="setting-row">
            <div>
              <div className="lbl">Sign out</div>
              <div className="desc">End this session on this device.</div>
            </div>
            <button className="btn btn-sm" onClick={() => signOut()}>
              <Icon name="logout" size={13} /> Sign out
            </button>
          </div>
        </section>

        <div className="disclaimer" style={{ marginTop: 18 }}>
          Pulmoscope is a decision-support tool. The interpreting clinician is responsible for the final report.
        </div>
      </div>
    </div>
  );
}
