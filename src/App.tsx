import React, { useState, useEffect } from 'react';
import { TeacherProfile } from './types/index.ts';
import { sessionStore } from './services/storage.ts';
import { Navbar } from './components/Navbar.tsx';
import { LandingPage } from './pages/LandingPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { SlideEditorPage } from './pages/SlideEditorPage.tsx';
import { TeacherPresenterPage } from './pages/TeacherPresenterPage.tsx';
import { StudentPlayPage } from './pages/StudentPlayPage.tsx';
import { GamesLibraryPage } from './pages/GamesLibraryPage.tsx';
import { ResultsGradebookPage } from './pages/ResultsGradebookPage.tsx';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || '/';
    }
    return '/';
  });

  const [teacher, setTeacher] = useState<TeacherProfile | null>(() =>
    sessionStore.getTeacher()
  );

  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();

  // Sync browser URL changes
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
  };

  const handleStartSession = (presentationId: string) => {
    const session = sessionStore.createSession(presentationId);
    setActiveSessionId(session.id);
    navigate(`/session/${session.id}/present`);
  };

  const handleLogout = () => {
    sessionStore.setTeacher(null);
    setTeacher(null);
    navigate('/');
  };

  // Route matching
  const renderRoute = () => {
    // 1. Root / Landing
    if (currentPath === '/' || currentPath === '') {
      return (
        <LandingPage
          onNavigate={navigate}
          onStartLiveDemo={handleStartSession}
        />
      );
    }

    // 2. Student Direct Join Page
    if (currentPath === '/join') {
      return (
        <LandingPage
          onNavigate={navigate}
          onStartLiveDemo={handleStartSession}
        />
      );
    }

    // 3. Student Play View (/play/:code)
    if (currentPath.startsWith('/play/')) {
      const code = currentPath.replace('/play/', '').split('/')[0];
      return <StudentPlayPage joinCode={code} onNavigate={navigate} />;
    }

    // 4. Teacher Live Presenter View (/session/:id/present)
    if (currentPath.startsWith('/session/')) {
      const parts = currentPath.split('/');
      const sessionId = parts[2];
      return (
        <TeacherPresenterPage
          sessionIdOrCode={sessionId}
          onNavigate={navigate}
        />
      );
    }

    // 5. Slide Editor (/presentations/:id/edit)
    if (currentPath.startsWith('/presentations/') && currentPath.endsWith('/edit')) {
      const parts = currentPath.split('/');
      const presentationId = parts[2];
      return (
        <SlideEditorPage
          presentationId={presentationId}
          onNavigate={navigate}
          onStartSession={handleStartSession}
        />
      );
    }

    // 6. Teacher Login / Register (/login)
    if (currentPath === '/login') {
      return (
        <LoginPage
          onSuccess={setTeacher}
          onNavigate={navigate}
        />
      );
    }

    // 7. Teacher Dashboard (/dashboard)
    if (currentPath === '/dashboard') {
      return (
        <DashboardPage
          teacher={teacher}
          onNavigate={navigate}
          onStartSession={handleStartSession}
        />
      );
    }

    // 8. Games Arena (/games)
    if (currentPath === '/games') {
      return <GamesLibraryPage onNavigate={navigate} />;
    }

    // 9. Post-Session Results Gradebook (/results/:sessionId)
    if (currentPath.startsWith('/results/')) {
      const sessionId = currentPath.replace('/results/', '').split('/')[0];
      return (
        <ResultsGradebookPage
          sessionId={sessionId}
          onNavigate={navigate}
        />
      );
    }

    // Fallback: Default to Landing
    return (
      <LandingPage
        onNavigate={navigate}
        onStartLiveDemo={handleStartSession}
      />
    );
  };

  // Hide the global navbar when in full-screen presentation mode or student play mode for true immersion
  const isImmersiveMode = currentPath.startsWith('/play/') || currentPath.includes('/present');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {!isImmersiveMode && (
        <Navbar
          teacher={teacher}
          onNavigate={navigate}
          currentRoute={currentPath}
          onLogout={handleLogout}
          activeSessionCode={activeSessionId}
        />
      )}
      <main className="flex-1 flex flex-col">{renderRoute()}</main>
    </div>
  );
}
