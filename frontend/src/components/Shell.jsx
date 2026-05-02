import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import Sidebar from './Sidebar.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useStudies } from '../hooks/useStudies.js';
import { initialsFor, signOut } from '../lib/auth.js';

export default function Shell() {
  const { user } = useAuth();
  const { studies, loading } = useStudies(user?.uid);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const showSidebar =
    location.pathname.startsWith('/worklist') ||
    location.pathname.startsWith('/studies') ||
    location.pathname.startsWith('/upload');

  const onNew = () => {
    setDrawerOpen(false);
    navigate('/upload');
  };

  return (
    <div className="app">
      <header className="topbar">
        <button
          className="menu-btn"
          onClick={() => setDrawerOpen((o) => !o)}
          aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
        >
          <Icon name={drawerOpen ? 'x' : 'filter'} size={18} />
        </button>
        <div className="brand">
          <div className="brand-mark">P</div>
          <div>
            Pulmoscope
            <small style={{ display: 'block', marginTop: 1 }}>Chest CXR</small>
          </div>
        </div>
        <nav className="topnav">
          <button
            className={
              location.pathname === '/worklist' || location.pathname.startsWith('/studies')
                ? 'active'
                : ''
            }
            onClick={() => navigate('/worklist')}
          >
            Worklist
          </button>
          <button
            className={location.pathname.startsWith('/upload') ? 'active' : ''}
            onClick={() => navigate('/upload')}
          >
            New study
          </button>
          <button
            className={location.pathname.startsWith('/settings') ? 'active' : ''}
            onClick={() => navigate('/settings')}
          >
            Settings
          </button>
        </nav>

        <div className="topbar-right">
          <button className="btn btn-ghost btn-icon" title="Notifications">
            <Icon name="bell" size={15} />
          </button>
          <button
            className="user-pill"
            type="button"
            onClick={() => navigate('/settings')}
            style={{ background: 'var(--bg-2)', cursor: 'pointer' }}
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                width={24}
                height={24}
                style={{ borderRadius: '50%' }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="avatar">{initialsFor(user)}</div>
            )}
            <span>{user?.displayName || user?.email || 'Account'}</span>
            <Icon name="chevron-down" size={12} />
          </button>
        </div>
      </header>

      <div className="main">
        {showSidebar && (
          <>
            <div
              className={`scrim ${drawerOpen ? 'open' : ''}`}
              onClick={() => setDrawerOpen(false)}
            />
            <Sidebar
              studies={studies}
              loading={loading}
              drawerOpen={drawerOpen}
              onCloseDrawer={() => setDrawerOpen(false)}
              onNew={onNew}
            />
          </>
        )}

        <Outlet />
      </div>

      <nav className="mobile-tabbar">
        <button
          className={location.pathname.startsWith('/studies') || location.pathname === '/worklist' ? 'active' : ''}
          onClick={() => {
            navigate('/worklist');
            setDrawerOpen(false);
          }}
        >
          <Icon name="pulse" size={20} />
          <span>Worklist</span>
        </button>
        <button
          className={drawerOpen ? 'active' : ''}
          onClick={() => setDrawerOpen((o) => !o)}
        >
          <Icon name="filter" size={20} />
          <span>Studies</span>
        </button>
        <button onClick={onNew} aria-label="New study">
          <span className="fab">
            <Icon name="plus" size={22} />
          </span>
          <span>New</span>
        </button>
        <button
          className={location.pathname.startsWith('/settings') ? 'active' : ''}
          onClick={() => {
            navigate('/settings');
            setDrawerOpen(false);
          }}
        >
          <Icon name="settings" size={20} />
          <span>Settings</span>
        </button>
        <button onClick={() => signOut()} aria-label="Sign out">
          <Icon name="logout" size={20} />
          <span>Sign out</span>
        </button>
      </nav>
    </div>
  );
}
