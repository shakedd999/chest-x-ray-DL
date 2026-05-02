import { Navigate, Route, Routes } from 'react-router-dom';
import AuthScreen from './components/AuthScreen.jsx';
import Shell from './components/Shell.jsx';
import UploadView from './components/UploadView.jsx';
import ProcessingView from './components/ProcessingView.jsx';
import StudyDetail from './components/StudyDetail.jsx';
import SettingsView from './components/SettingsView.jsx';
import WorklistEmpty from './components/WorklistEmpty.jsx';
import { useAuth } from './hooks/useAuth.js';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: 'grid',
          placeItems: 'center',
          height: '100vh',
          background: 'var(--bg-0)',
          color: 'var(--fg-2)',
          fontSize: 13,
        }}
      >
        Loading…
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Navigate to="/worklist" replace />} />
        <Route path="/worklist" element={<WorklistEmpty />} />
        <Route path="/upload" element={<UploadView />} />
        <Route path="/studies/:studyId" element={<StudyDetail />} />
        <Route path="/studies/:studyId/processing" element={<ProcessingView />} />
        <Route path="/settings" element={<SettingsView user={user} />} />
        <Route path="*" element={<Navigate to="/worklist" replace />} />
      </Route>
    </Routes>
  );
}
