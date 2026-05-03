import { useState } from 'react';
import Icon from './Icon.jsx';
import { signInWithGoogle } from '../lib/auth.js';

export default function AuthScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error('[auth] sign-in failed', e);
      if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') {
        setError(e?.message || 'Sign-in failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <aside className="auth-side">
        <div className="grid-bg" />
        <div className="auth-brand">
          <div className="brand-mark">P</div>
          <div>
            Pulmoscope
            <small>Radiology AI · v1.0</small>
          </div>
        </div>
        <div>
          <div className="auth-tagline">
            Probabilistic chest&nbsp;X-ray classification, in <em>seconds</em>.
          </div>
          <div style={{ display: 'flex', gap: 24, marginTop: 32, fontSize: 12, color: 'var(--fg-2)' }}>
            <div>
              <div className="mono" style={{ fontSize: 22, color: 'var(--fg-0)', letterSpacing: '-0.02em' }}>3</div>
              <div className="uppercase-label" style={{ marginTop: 2 }}>pathology classes</div>
            </div>
            <div>
              <div className="mono" style={{ fontSize: 22, color: 'var(--fg-0)', letterSpacing: '-0.02em' }}>~2s</div>
              <div className="uppercase-label" style={{ marginTop: 2 }}>median latency</div>
            </div>
            <div>
              <div className="mono" style={{ fontSize: 22, color: 'var(--fg-0)', letterSpacing: '-0.02em' }}>SSO</div>
              <div className="uppercase-label" style={{ marginTop: 2 }}>google</div>
            </div>
          </div>
        </div>
        <div className="auth-foot">
          <span>Decision-support tool</span>
          <span>Not a diagnostic device</span>
        </div>
      </aside>

      <div className="auth-form-wrap">
        <div className="auth-form">
          <h1>Sign in</h1>
          <p className="sub">Continue with your Google account to access your worklist.</p>

          <button
            type="button"
            className="btn"
            style={{ width: '100%', height: 44, justifyContent: 'center', gap: 10, background: 'var(--bg-2)' }}
            onClick={onSignIn}
            disabled={loading}
          >
            <Icon name="google" size={18} />
            {loading ? 'Signing in…' : 'Continue with Google'}
          </button>

          {error && (
            <div
              role="alert"
              style={{
                marginTop: 14,
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

          <div className="auth-foot-text">
            By signing in you acknowledge this software is a{' '}
            <em style={{ color: 'var(--fg-1)' }}>decision-support tool</em> — not a substitute for clinical judgment.
          </div>
        </div>
      </div>
    </div>
  );
}
