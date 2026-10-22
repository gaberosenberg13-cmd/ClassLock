import React, { useState, useEffect, useRef } from 'react';
import {
  LiveSession,
  Presentation,
  Question,
  LockMode,
  StudentViolation,
  StudentReactionType,
} from '../types/index.ts';
import {
  ShieldAlert,
  ShieldCheck,
  Maximize2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Lock,
  Trophy,
  MessageSquare,
  Send,
  X,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { sessionStore } from '../services/storage.ts';
import { LockdownOverlay } from '../components/LockdownOverlay.tsx';
import { QuizRaceGame } from '../components/games/QuizRaceGame.tsx';
import { MemoryMatchGame } from '../components/games/MemoryMatchGame.tsx';
import { playChime, playSuccess, playViolationTone, isSoundEnabled, setSoundEnabled } from '../utils/soundEffects.ts';

interface StudentPlayPageProps {
  joinCode: string;
  onNavigate: (route: string) => void;
}

export const StudentPlayPage: React.FC<StudentPlayPageProps> = ({
  joinCode,
  onNavigate,
}) => {
  const [session, setSession] = useState<LiveSession | undefined>(() =>
    sessionStore.getSession(joinCode)
  );
  const [presentation, setPresentation] = useState<Presentation | undefined>();
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(() => !sessionStore.getSession(joinCode));
  const [studentId, setStudentId] = useState<string>(() => {
    return localStorage.getItem(`classlock_student_${joinCode.toUpperCase()}`) || '';
  });
  const [studentNameInput, setStudentNameInput] = useState<string>(() => {
    return localStorage.getItem('classlock_temp_student_name') || '';
  });
  const [studentIdNumberInput, setStudentIdNumberInput] = useState<string>('');
  const [joinError, setJoinError] = useState<string>('');

  // Lockdown & Violation state
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [violationReason, setViolationReason] = useState('Please stay inside the presentation window.');
  const [hasEnteredFullscreen, setHasEnteredFullscreen] = useState(false);

  // Question submission state
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [shortAnswerText, setShortAnswerText] = useState('');
  const [hasSubmittedAnswer, setHasSubmittedAnswer] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);

  // Student Reaction & Q&A
  const [lastSentReaction, setLastSentReaction] = useState<string | null>(null);
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const [questionInput, setQuestionInput] = useState('');
  const [questionSentToast, setQuestionSentToast] = useState(false);
  const [sound, setSound] = useState(isSoundEnabled());

  // Sync session state from sessionStore & SSE stream
  useEffect(() => {
    const cleanCode = joinCode.toUpperCase();
    const current = sessionStore.getSession(cleanCode);
    if (current) {
      setSession(current);
      const pres = sessionStore.getPresentationById(current.presentationId);
      setPresentation(pres);
      setIsLoadingSession(false);
    } else {
      setIsLoadingSession(true);
      sessionStore.fetchServerSession(cleanCode).then(res => {
        if (res?.session) {
          setSession(res.session);
          setPresentation(res.presentation || sessionStore.getPresentationById(res.session.presentationId));
        }
        setIsLoadingSession(false);
      });
    }

    const unsubscribe = sessionStore.subscribe(updated => {
      if (updated.joinCode === cleanCode || updated.id === current?.id) {
        setSession({ ...updated });
        const pres = sessionStore.getPresentationById(updated.presentationId);
        setPresentation(pres);
        setIsLoadingSession(false);
      }
    });

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/sessions/${cleanCode}/stream`);
      eventSource.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if ((payload.type === 'SESSION_UPDATE' || payload.type === 'CONNECTED') && payload.session) {
            setSession({ ...payload.session });
            sessionStore.updateSessionLocally(payload.session);
            if (payload.presentation) {
              setPresentation(payload.presentation);
            }
            setIsLoadingSession(false);
          }
        } catch (err) {
          // ignore
        }
      };
    } catch (e) {
      // handled
    }

    return () => {
      unsubscribe();
      if (eventSource) eventSource.close();
    };
  }, [joinCode]);

  // Handle Question Timer Countdown
  useEffect(() => {
    if (!session?.activeQuestion || !session.activeQuestion.expiresAt) {
      setRemainingTime(null);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const left = Math.max(0, Math.ceil((session.activeQuestion!.expiresAt! - now) / 1000));
      setRemainingTime(left);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [session?.activeQuestion]);

  // Reset student answer form when new question appears
  useEffect(() => {
    setSelectedOptionId(null);
    setShortAnswerText('');
    setHasSubmittedAnswer(false);
    if (session?.activeQuestion) {
      playChime();
    }
  }, [session?.activeQuestion?.question.id]);

  // Fullscreen and Visibility API listeners for Lockdown Mode
  useEffect(() => {
    if (!hasEnteredFullscreen || !studentId || !session) return;
    if (session.lockMode === 'off' || session.isLockPaused) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation('tab_switched', 'Student left presentation tab or minimized browser window.');
      }
    };

    const handleWindowBlur = () => {
      triggerViolation('window_blur', 'Window lost active focus.');
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        triggerViolation('fullscreen_exited', 'Student exited fullscreen mode.');
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      triggerViolation('shortcut_attempt', 'Right-click menu disabled by ClassLock.');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        ['p', 's', 'c', 'u'].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
        triggerViolation('shortcut_attempt', `Blocked shortcut key: ${e.key.toUpperCase()}`);
      }
      if (e.key === 'F12') {
        e.preventDefault();
        triggerViolation('shortcut_attempt', 'Developer tools shortcut blocked.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [hasEnteredFullscreen, studentId, session?.lockMode, session?.isLockPaused, session?.id]);

  const triggerViolation = (type: StudentViolation['type'], reason: string) => {
    if (!session || !studentId) return;
    if (session.lockMode === 'off' || session.isLockPaused) return;

    setViolationReason(reason);
    setIsOverlayVisible(true);
    playViolationTone();
    sessionStore.reportViolation(session.id, studentId, type, reason);
  };

  const requestFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      setHasEnteredFullscreen(true);
      setIsOverlayVisible(false);
    } catch (err) {
      setHasEnteredFullscreen(true);
      setIsOverlayVisible(false);
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentNameInput.trim()) {
      setJoinError('Please enter your name to connect.');
      return;
    }

    const res = sessionStore.joinSession(joinCode, studentNameInput, studentIdNumberInput);
    if (res.error) {
      setJoinError(res.error);
      return;
    }

    if (res.studentId) {
      setStudentId(res.studentId);
      localStorage.setItem(`classlock_student_${joinCode.toUpperCase()}`, res.studentId);
      requestFullscreen();
    }
  };

  const handleAnswerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.activeQuestion || !studentId) return;

    const submission = {
      selectedOptionId: selectedOptionId || undefined,
      textAnswer: shortAnswerText.trim() || undefined,
    };

    const resp = sessionStore.submitResponse(session.id, studentId, submission);
    setHasSubmittedAnswer(true);
    if (resp?.isCorrect) {
      playSuccess();
    }
  };

  const handleSendReaction = (type: StudentReactionType) => {
    if (!studentId || !session) return;
    const currentParticipant = session.participants[studentId];
    sessionStore.sendReaction(session.id, studentId, currentParticipant?.name || 'Student', type);
    setLastSentReaction(type);
    setTimeout(() => setLastSentReaction(null), 2000);
  };

  const handleAskQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionInput.trim() || !studentId || !session) return;
    const currentParticipant = session.participants[studentId];
    sessionStore.submitStudentQuestion(
      session.id,
      studentId,
      currentParticipant?.name || 'Student',
      questionInput.trim()
    );
    setQuestionInput('');
    setIsAskModalOpen(false);
    setQuestionSentToast(true);
    setTimeout(() => setQuestionSentToast(false), 3000);
  };

  if (isLoadingSession && !session) {
    return (
      <div className="min-h-screen bg-[#faf8f5] text-[#171614] flex items-center justify-center p-6 font-normal">
        <div className="max-w-md w-full bg-white border border-[#171614] p-8 text-center shadow-[4px_4px_0px_0px_#171614]">
          <div className="w-8 h-8 border-2 border-[#171614] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="font-serif italic text-2xl text-[#171614] mb-2">Connecting to Room {joinCode}...</h2>
          <p className="font-mono text-xs text-[#6e6961]">
            Contacting the classroom podium.
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#faf8f5] text-[#171614] flex items-center justify-center p-6 font-normal">
        <div className="max-w-md w-full bg-white border border-[#171614] p-8 sm:p-10 text-center shadow-[6px_6px_0px_0px_#171614]">
          <div className="w-12 h-12 bg-[#faf8f5] border border-[#eb4b26] text-[#eb4b26] flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-6 h-6" />
          </div>
          <span className="font-mono text-xs text-[#eb4b26] uppercase tracking-wider block mb-1">
            § Status 404
          </span>
          <h2 className="font-serif italic text-3xl font-normal text-[#171614] mb-2">Room Not Found</h2>
          <p className="font-mono text-xs text-[#6e6961] mb-6 leading-relaxed">
            Could not locate an active presentation with room code <strong className="font-mono text-[#eb4b26]">{joinCode}</strong>. Ask your instructor to verify the room is active.
          </p>
          <button
            onClick={() => onNavigate('/')}
            className="w-full py-3 bg-[#eb4b26] hover:bg-[#cb3815] text-white font-mono text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer"
          >
            Back to Room Entry
          </button>
        </div>
      </div>
    );
  }

  // Join Screen: prompt for student name if not registered
  if (!studentId || !session.participants[studentId]) {
    return (
      <div className="min-h-screen bg-white text-zinc-900 flex items-center justify-center p-6 font-normal">
        <div className="max-w-md w-full bg-white border border-zinc-200/90 rounded-2xl p-8 sm:p-10 shadow-xs">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-widest text-zinc-400 font-normal mb-2">
              Class Session · {session.joinCode}
            </p>
            <h1 className="text-2xl font-semibold text-zinc-950 tracking-tight">
              Connect to Class
            </h1>
            <p className="text-xs text-zinc-500 mt-2 font-normal truncate">
              {session.presentationTitle}
            </p>
          </div>

          {joinError && (
            <div className="mb-4 p-3 bg-zinc-50 border border-red-300 rounded-xl text-xs text-red-600 font-normal">
              {joinError}
            </div>
          )}

          <form onSubmit={handleJoinSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-normal text-zinc-600 mb-1.5">
                Your Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Jordan Lee"
                value={studentNameInput}
                onChange={e => setStudentNameInput(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-zinc-300 focus:border-blue-600 rounded-xl text-zinc-900 text-sm font-normal focus:outline-hidden transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-normal text-zinc-600 mb-1.5">
                Student ID (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. STU-204"
                value={studentIdNumberInput}
                onChange={e => setStudentIdNumberInput(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-zinc-300 focus:border-blue-600 rounded-xl text-zinc-900 text-sm font-normal focus:outline-hidden transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors cursor-pointer"
            >
              <span>Enter Presentation</span>
              <Maximize2 className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-8 pt-5 border-t border-zinc-200/80 text-center text-xs text-zinc-400 font-normal leading-relaxed">
            ClassLock monitors tab focus and fullscreen presence. Please stay on this tab during the session.
          </div>
        </div>
      </div>
    );
  }

  const currentParticipant = session.participants[studentId];
  const currentSlide = presentation?.slides[session.currentSlideIndex];
  const activeQuestion = session.activeQuestion;
  const isLockedOut = !!currentParticipant?.isLockedOut;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col select-none overflow-x-hidden">
      {/* Student Top Header */}
      <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: currentParticipant.avatarColor || '#3B82F6' }}
            />
            <span className="font-bold text-sm text-white">
              {currentParticipant.name}
            </span>
          </div>
          <span className="text-slate-600">·</span>
          <span className="text-xs font-mono font-bold text-indigo-400">
            {session.joinCode}
          </span>
        </div>

        {/* Focus Mode & Score Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold font-mono tabular-nums">
            <Trophy className="w-3.5 h-3.5" />
            <span>{currentParticipant.score} Pts</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Focus Locked</span>
          </div>

          <button
            onClick={() => {
              const next = !sound;
              setSound(next);
              setSoundEnabled(next);
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            title={sound ? 'Sound enabled' : 'Sound muted'}
          >
            {sound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Student Stage */}
      <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full my-auto">
        {session.activeGame ? (
          <div>
            {session.activeGame.gameId === 'quiz_race' ? (
              <QuizRaceGame
                session={session}
                isTeacher={false}
                currentStudentId={studentId}
                onAnswerSubmit={(qId, optId) => {
                  sessionStore.submitResponse(session.id, studentId, { selectedOptionId: optId });
                }}
              />
            ) : (
              <MemoryMatchGame
                session={session}
                isTeacher={false}
                currentStudentId={studentId}
                onMatchSuccess={(pts) => {
                  sessionStore.updateGameScore(session.id, studentId, pts);
                }}
              />
            )}
          </div>
        ) : (
          /* Synchronized Slide Viewer */
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden min-h-[420px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-indigo-400 uppercase tracking-widest mb-3">
                <span>Instructor Sync</span>
                <span className="tabular-nums">Slide {session.currentSlideIndex + 1} of {presentation?.slides.length || 1}</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-6">
                {currentSlide?.title || 'Slide Title'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className={currentSlide?.imageUrl ? 'md:col-span-7' : 'md:col-span-12'}>
                  <ul className="space-y-4">
                    {currentSlide?.content.map((bullet, i) => (
                      <li key={i} className="flex items-start gap-3 text-slate-200 text-base leading-relaxed">
                        <span className="w-2 h-2 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {currentSlide?.imageUrl && (
                  <div className="md:col-span-5 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
                    <img
                      src={currentSlide.imageUrl}
                      alt={currentSlide.imageAlt || currentSlide.title}
                      className="w-full h-56 object-cover"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>Teacher controlled slide deck. Synchronized in real time.</span>
              <span className="font-mono text-indigo-400 font-bold">LIVE SYNC ON</span>
            </div>
          </div>
        )}
      </main>

      {/* Student Interactive Reactions & Ask Teacher Floating Bar */}
      <div className="p-3 bg-slate-900/90 backdrop-blur-md border-t border-slate-800/80 sticky bottom-0 z-20 flex items-center justify-between max-w-4xl mx-auto w-full rounded-t-2xl">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline mr-1">
            Reactions:
          </span>
          <button
            onClick={() => handleSendReaction('hand_raise')}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-semibold rounded-lg transition-transform flex items-center gap-1"
            title="Raise Hand"
          >
            <span>✋</span>
            <span className="hidden sm:inline">Hand</span>
          </button>
          <button
            onClick={() => handleSendReaction('confused')}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-semibold rounded-lg transition-transform flex items-center gap-1"
            title="Confused / Slow Down"
          >
            <span>⚡</span>
            <span className="hidden sm:inline">Slow Down</span>
          </button>
          <button
            onClick={() => handleSendReaction('understood')}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-semibold rounded-lg transition-transform flex items-center gap-1"
            title="Got it!"
          >
            <span>💡</span>
            <span className="hidden sm:inline">Got It</span>
          </button>
          <button
            onClick={() => handleSendReaction('fire')}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-semibold rounded-lg transition-transform"
            title="Awesome!"
          >
            <span>🔥</span>
          </button>
          {lastSentReaction && (
            <span className="text-[11px] text-indigo-300 font-semibold animate-fade-in">
              Sent!
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {questionSentToast && (
            <span className="text-xs text-emerald-400 font-semibold animate-fade-in hidden sm:inline">
              Question Sent to Teacher!
            </span>
          )}
          <button
            onClick={() => setIsAskModalOpen(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Ask Instructor</span>
          </button>
        </div>
      </div>

      {/* Ask Instructor Modal */}
      {isAskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <span>Ask Question to Instructor</span>
              </h3>
              <button
                onClick={() => setIsAskModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Your question will be delivered privately to the teacher&apos;s console without interrupting other students.
            </p>
            <form onSubmit={handleAskQuestionSubmit} className="space-y-4">
              <textarea
                rows={3}
                required
                value={questionInput}
                onChange={e => setQuestionInput(e.target.value)}
                placeholder="Type your question or clarification request..."
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-hidden focus:border-indigo-500 resize-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAskModalOpen(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Question</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full-Screen Interactive Question Prompt Modal */}
      {activeQuestion && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="question-modal-title"
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in zoom-in-95 duration-200"
        >
          <div className="relative w-full max-w-xl bg-slate-900 border-2 border-indigo-500 rounded-3xl p-6 sm:p-8 shadow-2xl text-white">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                <HelpCircle className="w-4 h-4" />
                <span>Live Checkpoint</span>
              </div>

              {remainingTime !== null && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 tabular-nums">
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  <span>{remainingTime}s left</span>
                </div>
              )}
            </div>

            <h3 id="question-modal-title" className="text-xl sm:text-2xl font-black text-white mb-6">
              {activeQuestion.question.prompt}
            </h3>

            {activeQuestion.revealed ? (
              <div className="space-y-4">
                <div className="space-y-2.5">
                  {activeQuestion.question.options.map(opt => {
                    const isStudentChoice = selectedOptionId === opt.id;
                    const isCorrect = opt.isCorrect;

                    let cardClass = 'bg-slate-800/60 border-slate-700 text-slate-300';
                    if (isCorrect) {
                      cardClass = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/30';
                    } else if (isStudentChoice && !isCorrect) {
                      cardClass = 'bg-red-950/80 border-red-500 text-red-200';
                    }

                    return (
                      <div
                        key={opt.id}
                        className={`p-4 rounded-xl border flex items-center justify-between text-sm font-semibold ${cardClass}`}
                      >
                        <div className="flex items-center gap-3">
                          <span>{opt.text}</span>
                          {isStudentChoice && (
                            <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-white uppercase">
                              Your Answer
                            </span>
                          )}
                        </div>
                        {isCorrect ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1 text-xs">
                            <CheckCircle2 className="w-4 h-4" /> Correct
                          </span>
                        ) : isStudentChoice ? (
                          <span className="text-red-400 font-bold flex items-center gap-1 text-xs">
                            <XCircle className="w-4 h-4" /> Incorrect
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {activeQuestion.question.explanation && (
                  <div className="p-4 bg-indigo-950/40 border border-indigo-800 rounded-2xl text-xs text-indigo-200">
                    <strong className="text-white block mb-1">Instructor Review Note:</strong>
                    {activeQuestion.question.explanation}
                  </div>
                )}
              </div>
            ) : hasSubmittedAnswer ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/30 animate-pulse">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-bold text-white mb-2">Answer Recorded!</h4>
                <p className="text-xs text-slate-400">
                  Waiting for instructor to close responses and reveal the solution...
                </p>
              </div>
            ) : (
              <form onSubmit={handleAnswerSubmit} className="space-y-4">
                {(activeQuestion.question.type === 'multiple_choice' ||
                  activeQuestion.question.type === 'true_false' ||
                  activeQuestion.question.type === 'poll') && (
                  <div className="space-y-2.5">
                    {activeQuestion.question.options.map((opt, i) => {
                      const isSelected = selectedOptionId === opt.id;
                      const letter = String.fromCharCode(65 + i);

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedOptionId(opt.id)}
                          className={`w-full p-4 rounded-xl border text-left font-medium text-sm flex items-center gap-3 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600/30 border-indigo-400 text-white ring-2 ring-indigo-500/40'
                              : 'bg-slate-800/80 border-slate-700 hover:border-slate-600 text-slate-200'
                          }`}
                        >
                          <span className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs flex-shrink-0 text-slate-300">
                            {letter}
                          </span>
                          <span className="flex-1">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {activeQuestion.question.type === 'short_answer' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Type your answer:
                    </label>
                    <input
                      type="text"
                      required
                      value={shortAnswerText}
                      onChange={e => setShortAnswerText(e.target.value)}
                      placeholder="Enter answer..."
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!selectedOptionId && !shortAnswerText.trim()}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  Submit Answer
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Lockdown Violation Overlay */}
      <LockdownOverlay
        isVisible={isOverlayVisible}
        violationReason={violationReason}
        violationCount={currentParticipant.violationCount}
        lockMode={session.lockMode}
        isLockedOut={isLockedOut}
        onRequestFullscreen={requestFullscreen}
        onDismissWarning={() => setIsOverlayVisible(false)}
      />
    </div>
  );
};
