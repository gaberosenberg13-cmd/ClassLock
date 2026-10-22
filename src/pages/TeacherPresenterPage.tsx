import React, { useState, useEffect } from 'react';
import {
  LiveSession,
  Presentation,
  Question,
  LockMode,
  StudentQuestionItem,
} from '../types/index.ts';
import {
  ChevronLeft,
  ChevronRight,
  QrCode,
  Users,
  Shield,
  Pause,
  Play,
  CheckCircle2,
  Eye,
  LogOut,
  Maximize2,
  Minimize2,
  Layers,
  Sparkles,
  UserX,
  Unlock,
  MessageSquare,
  Zap,
  MousePointer2,
  Edit2,
  Check,
} from 'lucide-react';
import { sessionStore } from '../services/storage.ts';
import { QRCodeModal } from '../components/QRCodeModal.tsx';
import { SlideCanvas } from '../components/SlideCanvas.tsx';
import { QuizRaceGame } from '../components/games/QuizRaceGame.tsx';
import { MemoryMatchGame } from '../components/games/MemoryMatchGame.tsx';
import { playChime, playSuccess } from '../utils/soundEffects.ts';

interface TeacherPresenterPageProps {
  sessionIdOrCode: string;
  onNavigate: (route: string) => void;
}

export const TeacherPresenterPage: React.FC<TeacherPresenterPageProps> = ({
  sessionIdOrCode,
  onNavigate,
}) => {
  const [session, setSession] = useState<LiveSession | undefined>(() =>
    sessionStore.getSession(sessionIdOrCode)
  );
  const [presentation, setPresentation] = useState<Presentation | undefined>();
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isRosterOpen, setIsRosterOpen] = useState(true);
  const [isSlideDrawerOpen, setIsSlideDrawerOpen] = useState(false);
  const [isQuickPollModalOpen, setIsQuickPollModalOpen] = useState(false);
  const [isQAModalOpen, setIsQAModalOpen] = useState(false);
  const [canvasMode, setCanvasMode] = useState<'off' | 'laser' | 'pen'>('off');
  const [penColor, setPenColor] = useState<string>('#2563eb');
  const [isFullscreenProjector, setIsFullscreenProjector] = useState(false);

  useEffect(() => {
    const sess = sessionStore.getSession(sessionIdOrCode);
    if (sess) {
      setSession(sess);
      const pres = sessionStore.getPresentationById(sess.presentationId);
      setPresentation(pres);
      if (typeof window !== 'undefined' && sess.joinCode) {
        fetch(`/api/sessions/${sess.joinCode}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: sess, presentation: pres }),
        }).catch(() => {});
      }
    } else {
      onNavigate('/dashboard');
    }

    const unsubscribe = sessionStore.subscribe(updated => {
      if (updated.id === sess?.id || updated.joinCode === sess?.joinCode) {
        setSession({ ...updated });
      }
    });

    let eventSource: EventSource | null = null;
    if (sess?.joinCode) {
      try {
        eventSource = new EventSource(`/api/sessions/${sess.joinCode}/stream`);
        eventSource.onmessage = (e) => {
          try {
            const payload = JSON.parse(e.data);
            if ((payload.type === 'SESSION_UPDATE' || payload.type === 'CONNECTED') && payload.session) {
              setSession({ ...payload.session });
              sessionStore.updateSessionLocally(payload.session);
            }
          } catch (err) {
            // ignore
          }
        };
      } catch (err) {
        // ignore
      }
    }

    return () => {
      unsubscribe();
      if (eventSource) eventSource.close();
    };
  }, [sessionIdOrCode, onNavigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      if (session?.activeGame) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        handleNextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevSlide();
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFullscreenProjector();
      } else if (e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setCanvasMode(prev => prev === 'laser' ? 'off' : 'laser');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!session || !presentation) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center font-normal text-sm">
        Loading presentation...
      </div>
    );
  }

  const currentSlide = presentation.slides[session.currentSlideIndex] || presentation.slides[0];
  const participantsList = Object.values(session.participants || {});
  const activeQuestion = session.activeQuestion;
  const reactionsList = session.reactions || [];
  const studentQuestions = session.studentQuestions || [];
  const unansweredCount = studentQuestions.filter(q => !q.isAnswered).length;

  const recentReactions = reactionsList.filter(r => Date.now() - r.timestamp < 30000);
  const handsRaised = recentReactions.filter(r => r.type === 'hand_raise').length;
  const confusedCount = recentReactions.filter(r => r.type === 'confused').length;

  const handleNextSlide = () => {
    if (session.currentSlideIndex < presentation.slides.length - 1) {
      sessionStore.updateSlide(session.id, session.currentSlideIndex + 1);
    }
  };

  const handlePrevSlide = () => {
    if (session.currentSlideIndex > 0) {
      sessionStore.updateSlide(session.id, session.currentSlideIndex - 1);
    }
  };

  const handleSelectSlide = (idx: number) => {
    sessionStore.updateSlide(session.id, idx);
    setIsSlideDrawerOpen(false);
  };

  const handlePushQuestion = () => {
    if (currentSlide.question) {
      sessionStore.pushQuestion(session.id, currentSlide.question);
      playChime();
    }
  };

  const handleRevealAnswer = () => {
    sessionStore.revealQuestion(session.id);
    playSuccess();
  };

  const handleCloseQuestion = () => {
    sessionStore.closeQuestion(session.id);
  };

  const handleDismissQuestion = () => {
    sessionStore.dismissQuestion(session.id);
  };

  const handleLaunchGame = (gameId: 'quiz_race' | 'memory_match') => {
    sessionStore.launchGame(session.id, gameId);
  };

  const handleEndGame = () => {
    sessionStore.endGame(session.id);
  };

  const handleLaunchQuickPoll = (type: 'abcd' | 'yesno' | 'confidence') => {
    if (type === 'abcd') {
      sessionStore.launchQuickPoll(session.id, 'Question Comprehension Check:', [
        { id: 'opt-a', text: 'Option A' },
        { id: 'opt-b', text: 'Option B' },
        { id: 'opt-c', text: 'Option C' },
        { id: 'opt-d', text: 'Option D' },
      ]);
    } else if (type === 'yesno') {
      sessionStore.launchQuickPoll(session.id, 'Pulse: Clear or need review?', [
        { id: 'opt-yes', text: 'Yes / Understood' },
        { id: 'opt-no', text: 'No / Need Review' },
      ]);
    } else {
      sessionStore.launchQuickPoll(session.id, 'Rate your confidence (1 to 5):', [
        { id: 'c-high', text: '5 - Complete mastery' },
        { id: 'c-med', text: '3 - Moderate understanding' },
        { id: 'c-low', text: '1 - Explain again' },
      ]);
    }
    setIsQuickPollModalOpen(false);
    playChime();
  };

  const toggleFullscreenProjector = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreenProjector(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreenProjector(false);
    }
  };

  const handleEndSession = () => {
    if (confirm('End this live presentation session and review gradebook results?')) {
      sessionStore.endSession(session.id);
      onNavigate(`/results/${session.id}`);
    }
  };

  const currentQuestionResponses = (session.responses || []).filter(
    r => r.questionId === activeQuestion?.question.id
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col select-none overflow-x-hidden">
      {/* Top Header */}
      <header className="bg-zinc-900 border-b border-zinc-800/80 px-6 py-3 flex items-center justify-between z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsQRModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="font-mono tracking-widest uppercase">{session.joinCode}</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs font-normal text-zinc-400">
            <span className="text-zinc-200 font-semibold">{presentation.title}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              Slide {session.currentSlideIndex + 1} of {presentation.slides.length}
            </span>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-2 text-xs font-normal">
          {handsRaised > 0 && (
            <span className="text-blue-400 font-mono hidden xl:inline">
              {handsRaised} Hand{handsRaised === 1 ? '' : 's'} raised
            </span>
          )}

          {/* Strictness segmented control */}
          <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-lg p-0.5">
            {(['off', 'warn', 'strict'] as LockMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => sessionStore.setLockMode(session.id, mode)}
                className={`px-2.5 py-1 rounded text-xs capitalize transition-colors cursor-pointer ${
                  session.lockMode === mode
                    ? 'bg-zinc-800 text-white font-semibold'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Pause Lock */}
          <button
            onClick={() => sessionStore.toggleLockPause(session.id)}
            title={session.isLockPaused ? 'Resume Lock' : 'Pause Lock'}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg border border-zinc-800 cursor-pointer"
          >
            {session.isLockPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          {/* Student Q&A */}
          <button
            onClick={() => setIsQAModalOpen(!isQAModalOpen)}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer relative ${
              isQAModalOpen ? 'border-blue-600 text-blue-400' : 'border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Questions"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {unansweredCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-600 text-white text-[9px] font-semibold rounded-full flex items-center justify-center">
                {unansweredCount}
              </span>
            )}
          </button>

          {/* Connected Roster Toggle */}
          <button
            onClick={() => setIsRosterOpen(!isRosterOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-mono tabular-nums">{participantsList.length} Connected</span>
          </button>

          {/* Fullscreen Projector Toggle */}
          <button
            onClick={toggleFullscreenProjector}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
            title="Fullscreen (F)"
          >
            {isFullscreenProjector ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* End Session */}
          <button
            onClick={handleEndSession}
            className="p-1.5 text-zinc-400 hover:text-red-400 rounded-lg cursor-pointer"
            title="End Session"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        <main className="flex-1 flex flex-col p-6 lg:p-10 overflow-y-auto">
          {session.activeGame ? (
            <div className="my-auto">
              {session.activeGame.gameId === 'quiz_race' ? (
                <QuizRaceGame
                  session={session}
                  isTeacher={true}
                  onTeacherNextQuestion={() => {
                    const currentIdx = session.activeGame?.currentQuestionIndex ?? 0;
                    sessionStore.launchGame(session.id, 'quiz_race', {
                      ...session.activeGame?.gameData,
                    });
                    setSession(prev => prev ? {
                      ...prev,
                      activeGame: {
                        ...prev.activeGame!,
                        currentQuestionIndex: currentIdx + 1,
                      },
                    } : prev);
                  }}
                  onTeacherEndGame={handleEndGame}
                />
              ) : (
                <MemoryMatchGame
                  session={session}
                  isTeacher={true}
                  onTeacherEndGame={handleEndGame}
                />
              )}
            </div>
          ) : (
            <div className="my-auto max-w-4xl mx-auto w-full">
              <SlideCanvas mode={canvasMode} penColor={penColor}>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 sm:p-12 min-h-[460px] flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono text-zinc-500 uppercase tracking-wider mb-4">
                      <span>{presentation.subject}</span>
                      <span className="tabular-nums">
                        Slide {session.currentSlideIndex + 1} of {presentation.slides.length}
                      </span>
                    </div>

                    <h2 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight mb-8">
                      {currentSlide.title}
                    </h2>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                      <div className={currentSlide.imageUrl ? 'lg:col-span-7' : 'lg:col-span-12'}>
                        <ul className="space-y-4">
                          {currentSlide.content.map((point, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-zinc-300 text-base leading-relaxed font-normal">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2.5 flex-shrink-0" />
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {currentSlide.imageUrl && (
                        <div className="lg:col-span-5 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950">
                          <img
                            src={currentSlide.imageUrl}
                            alt={currentSlide.imageAlt || currentSlide.title}
                            className="w-full h-56 object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {currentSlide.notes && (
                    <div className="mt-8 pt-4 border-t border-zinc-800 text-xs font-normal text-zinc-400">
                      <span className="text-zinc-300 font-semibold">Note: </span>
                      <span>{currentSlide.notes}</span>
                    </div>
                  )}
                </div>
              </SlideCanvas>

              {/* Active Question Box */}
              {activeQuestion && (
                <div className="mt-6 bg-zinc-900 border border-blue-600 rounded-2xl p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-zinc-800">
                    <div>
                      <div className="text-xs font-normal text-blue-400 mb-1">
                        Active Checkpoint · <span className="font-mono tabular-nums">{currentQuestionResponses.length} / {participantsList.length} answered</span>
                      </div>
                      <h4 className="text-base font-semibold text-white">
                        {activeQuestion.question.prompt}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      {!activeQuestion.revealed ? (
                        <>
                          <button
                            onClick={handleRevealAnswer}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                          >
                            Reveal Answer
                          </button>
                          <button
                            onClick={handleCloseQuestion}
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-normal transition-colors cursor-pointer"
                          >
                            Close
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={handleDismissQuestion}
                          className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold rounded-lg text-xs cursor-pointer"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Minimal Response Bar Chart */}
                  <div className="space-y-2.5">
                    {activeQuestion.question.options.map((opt, i) => {
                      const count = currentQuestionResponses.filter(r => r.selectedOptionId === opt.id).length;
                      const percentage = currentQuestionResponses.length > 0
                        ? Math.round((count / currentQuestionResponses.length) * 100)
                        : 0;
                      const isCorrect = opt.isCorrect;
                      const letter = String.fromCharCode(65 + i);

                      return (
                        <div key={opt.id}>
                          <div className="flex items-center justify-between text-xs mb-1 text-zinc-300 font-normal">
                            <span className="flex items-center gap-2">
                              <span className="font-mono text-zinc-500">{letter}.</span>
                              <span>{opt.text}</span>
                              {activeQuestion.revealed && isCorrect && (
                                <span className="text-blue-400 font-semibold text-[11px]">
                                  (Correct)
                                </span>
                              )}
                            </span>
                            <span className="font-mono text-zinc-500 tabular-nums">
                              {count} ({percentage}%)
                            </span>
                          </div>

                          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom Toolbar */}
          <div className="mt-8 pt-4 border-t border-zinc-900 flex flex-wrap items-center justify-between gap-4">
            {/* Slide Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevSlide}
                disabled={session.currentSlideIndex === 0}
                className="p-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 rounded-lg text-zinc-300 transition-colors cursor-pointer"
                aria-label="Previous Slide"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsSlideDrawerOpen(!isSlideDrawerOpen)}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 rounded-lg text-xs font-mono font-normal text-zinc-300 transition-colors cursor-pointer tabular-nums"
              >
                {session.currentSlideIndex + 1} / {presentation.slides.length}
              </button>

              <button
                onClick={handleNextSlide}
                disabled={session.currentSlideIndex === presentation.slides.length - 1}
                className="p-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 rounded-lg text-zinc-300 transition-colors cursor-pointer"
                aria-label="Next Slide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Presenter Tools */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCanvasMode(prev => prev === 'laser' ? 'off' : 'laser')}
                className={`px-3 py-1.5 rounded-lg text-xs font-normal transition-colors cursor-pointer ${
                  canvasMode === 'laser' ? 'bg-blue-600 text-white font-semibold' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                Laser (L)
              </button>

              <button
                onClick={() => setCanvasMode(prev => prev === 'pen' ? 'off' : 'pen')}
                className={`px-3 py-1.5 rounded-lg text-xs font-normal transition-colors cursor-pointer ${
                  canvasMode === 'pen' ? 'bg-blue-600 text-white font-semibold' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                Draw
              </button>

              <button
                onClick={() => setIsQuickPollModalOpen(true)}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-blue-400 rounded-lg text-xs font-normal transition-colors cursor-pointer"
              >
                Quick Poll
              </button>

              {currentSlide.question && !activeQuestion && !session.activeGame && (
                <button
                  onClick={handlePushQuestion}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Push Question
                </button>
              )}

              {!session.activeGame ? (
                <button
                  onClick={() => handleLaunchGame('quiz_race')}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg text-xs font-normal transition-colors cursor-pointer"
                >
                  Game
                </button>
              ) : (
                <button
                  onClick={handleEndGame}
                  className="px-3 py-1.5 bg-zinc-900 text-zinc-400 hover:text-white rounded-lg text-xs font-normal cursor-pointer"
                >
                  End Game
                </button>
              )}
            </div>
          </div>
        </main>

        {/* Right Side: Roster & Focus Panel */}
        {isRosterOpen && (
          <aside className="w-80 bg-zinc-900 border-l border-zinc-800/80 flex flex-col h-[calc(100vh-3.5rem)] p-6 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-6">
              <span className="text-xs font-semibold text-white">Focus &amp; Roster</span>
              <span className="text-[11px] font-normal text-zinc-500 uppercase">
                {session.lockMode} mode
              </span>
            </div>

            {/* Violation List */}
            <div className="mb-8">
              <div className="text-xs font-semibold text-zinc-400 mb-2">
                Violations ({session.violations.length})
              </div>
              {session.violations.length === 0 ? (
                <p className="text-xs text-zinc-600 font-normal">All students focused.</p>
              ) : (
                <div className="space-y-2">
                  {session.violations.slice(0, 6).map(v => (
                    <div key={v.id} className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-normal">
                      <div className="flex justify-between text-zinc-300 font-semibold">
                        <span>{v.studentName}</span>
                        <span className="font-mono text-zinc-500 text-[10px] tabular-nums">
                          {new Date(v.timestamp).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-zinc-500 text-[11px] mt-0.5">{v.type}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Connected Students List */}
            <div className="flex-1">
              <div className="text-xs font-semibold text-zinc-400 mb-2">
                Participants ({participantsList.length})
              </div>
              {participantsList.length === 0 ? (
                <p className="text-xs text-zinc-600 font-normal">No students connected.</p>
              ) : (
                <div className="space-y-2">
                  {participantsList.map(p => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs flex items-center justify-between"
                    >
                      <span className="font-normal text-zinc-200">{p.name}</span>
                      <div className="flex items-center gap-2 font-mono text-[11px] tabular-nums text-zinc-400">
                        <span>{p.score} pts</span>
                        {p.isLockedOut ? (
                          <button
                            onClick={() => sessionStore.unlockStudent(session.id, p.id)}
                            className="text-blue-400 hover:underline cursor-pointer"
                          >
                            Unlock
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        joinCode={session.joinCode}
        presentationTitle={presentation.title}
      />

      {/* Quick Poll Modal */}
      {isQuickPollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-xs p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <h3 className="text-sm font-semibold text-white mb-2">Instant Quick Poll</h3>
            <p className="text-xs font-normal text-zinc-400 mb-6">
              Push an instant question to student devices:
            </p>
            <div className="space-y-2">
              <button
                onClick={() => handleLaunchQuickPoll('abcd')}
                className="w-full p-3 bg-zinc-950 hover:bg-zinc-800 text-left border border-zinc-800 rounded-lg text-xs font-normal text-zinc-200 transition-colors"
              >
                Multiple Choice (A, B, C, D)
              </button>
              <button
                onClick={() => handleLaunchQuickPoll('yesno')}
                className="w-full p-3 bg-zinc-950 hover:bg-zinc-800 text-left border border-zinc-800 rounded-lg text-xs font-normal text-zinc-200 transition-colors"
              >
                Yes / No Check
              </button>
              <button
                onClick={() => handleLaunchQuickPoll('confidence')}
                className="w-full p-3 bg-zinc-950 hover:bg-zinc-800 text-left border border-zinc-800 rounded-lg text-xs font-normal text-zinc-200 transition-colors"
              >
                Confidence Scale (1 to 5)
              </button>
            </div>
            <div className="mt-6 text-right">
              <button
                onClick={() => setIsQuickPollModalOpen(false)}
                className="text-xs text-zinc-500 hover:text-zinc-300 font-normal"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide Drawer Modal */}
      {isSlideDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/60 backdrop-blur-xs p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Select Slide</h3>
              <button
                onClick={() => setIsSlideDrawerOpen(false)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
              {presentation.slides.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => handleSelectSlide(idx)}
                  className={`p-3 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                    idx === session.currentSlideIndex
                      ? 'border-blue-600 bg-blue-950/20 text-white font-semibold'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span className="font-mono text-zinc-500 block mb-1">#{idx + 1}</span>
                  <div className="truncate">{s.title}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Q&A Modal */}
      {isQAModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-xs p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800">
              <h3 className="text-sm font-semibold text-white">Student Questions</h3>
              <button
                onClick={() => setIsQAModalOpen(false)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Close
              </button>
            </div>

            {studentQuestions.length === 0 ? (
              <p className="text-xs text-zinc-500 font-normal py-6 text-center">
                No student questions yet.
              </p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {studentQuestions.map(q => (
                  <div key={q.id} className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs">
                    <div className="flex justify-between text-zinc-400 mb-1">
                      <span className="text-zinc-200 font-semibold">{q.studentName}</span>
                      <span className="font-mono text-[10px] tabular-nums">
                        {new Date(q.timestamp).toLocaleTimeString([], { minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-zinc-300 mb-2 font-normal">{q.text}</p>
                    {!q.isAnswered ? (
                      <button
                        onClick={() => sessionStore.markQuestionAnswered(session.id, q.id)}
                        className="text-[11px] text-blue-400 hover:underline font-semibold"
                      >
                        Mark as answered
                      </button>
                    ) : (
                      <span className="text-[11px] text-zinc-500 font-normal">Answered</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
