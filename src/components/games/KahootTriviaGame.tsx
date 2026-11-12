import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Flame,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Users,
  Award,
  Crown,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { LiveSession, Participant, Question } from '../../types/index.ts';
import { KAHOOT_SHAPES, calculateKahootScore } from '../../logic/sessionRules.ts';
import { sessionStore } from '../../services/storage.ts';
import { playChime, playSuccess, playKahootFanfare, playKahootTap, playCountdownTick } from '../../utils/soundEffects.ts';

interface KahootTriviaGameProps {
  session: LiveSession;
  isTeacher: boolean;
  currentStudentId?: string;
  onAnswerSubmit?: (questionId: string, optionId: string, pointsEarned: number) => void;
  onTeacherNextQuestion?: () => void;
  onTeacherEndGame?: () => void;
}

const DEFAULT_KAHOOT_QUESTIONS: Question[] = [
  {
    id: 'kahoot-ob-1',
    type: 'multiple_choice',
    prompt: 'In Herzberg’s Motivation-Hygiene theory, what directly provides long-term intrinsic motivation?',
    points: 20,
    timeLimitSeconds: 20,
    options: [
      { id: 'k-opt-1', text: 'Challenging work, autonomy, and personal growth', isCorrect: true },
      { id: 'k-opt-2', text: 'Annual baseline salary adjustments', isCorrect: false },
      { id: 'k-opt-3', text: 'Company parking privileges', isCorrect: false },
      { id: 'k-opt-4', text: 'Air-conditioned conference rooms', isCorrect: false },
    ],
    explanation: 'Hygiene factors (pay, conditions) merely prevent dissatisfaction. True motivators stem from responsibility, growth, and achievement.',
  },
  {
    id: 'kahoot-ob-2',
    type: 'multiple_choice',
    prompt: 'According to Google Project Aristotle, what is the single #1 predictor of team effectiveness?',
    points: 20,
    timeLimitSeconds: 20,
    options: [
      { id: 'k-opt-5', text: 'Average individual engineer IQ', isCorrect: false },
      { id: 'k-opt-6', text: 'Psychological Safety', isCorrect: true },
      { id: 'k-opt-7', text: 'Hierarchical leadership and seniority', isCorrect: false },
      { id: 'k-opt-8', text: 'Rigid adherence to initial project plans', isCorrect: false },
    ],
    explanation: 'Psychological safety—where teammates feel safe taking interpersonal risks without fear of mockery—far outweighed all other variables.',
  },
  {
    id: 'kahoot-ob-3',
    type: 'multiple_choice',
    prompt: 'Which symptom is a classic warning sign of Groupthink in decision making?',
    points: 20,
    timeLimitSeconds: 20,
    options: [
      { id: 'k-opt-9', text: 'Illusion of invulnerability & self-censorship', isCorrect: true },
      { id: 'k-opt-10', text: 'Inviting external objective audit reviewers', isCorrect: false },
      { id: 'k-opt-11', text: 'Appointing a formal Devil’s Advocate', isCorrect: false },
      { id: 'k-opt-12', text: 'Thorough evaluation of opposing risks', isCorrect: false },
    ],
    explanation: 'Groupthink is marked by self-censorship, mindguards, and an illusion of invulnerability that quashes critical dissent.',
  },
  {
    id: 'kahoot-ob-4',
    type: 'multiple_choice',
    prompt: 'Under Edgar Schein’s Three Levels of Culture, where does true organizational culture primarily reside?',
    points: 20,
    timeLimitSeconds: 20,
    options: [
      { id: 'k-opt-13', text: 'Visible artifacts (dress codes, office snacks)', isCorrect: false },
      { id: 'k-opt-14', text: 'Espoused values printed on posters', isCorrect: false },
      { id: 'k-opt-15', text: 'Basic underlying assumptions & mental models', isCorrect: true },
      { id: 'k-opt-16', text: 'Quarterly financial reports', isCorrect: false },
    ],
    explanation: 'Basic underlying assumptions are the deeply ingrained, often unconscious beliefs that truly dictate how employees act.',
  },
];

export const KahootTriviaGame: React.FC<KahootTriviaGameProps> = ({
  session,
  isTeacher,
  currentStudentId,
  onAnswerSubmit,
  onTeacherNextQuestion,
  onTeacherEndGame,
}) => {
  // Extract questions from current presentation slides if available
  const presentation = sessionStore.getPresentationById(session.presentationId);
  const slideQuestions: Question[] = (presentation?.slides || [])
    .map(s => s.question)
    .filter((q): q is Question => Boolean(q && q.options && q.options.length >= 2));

  const questionsPool = slideQuestions.length >= 2 ? slideQuestions : DEFAULT_KAHOOT_QUESTIONS;

  const currentQIndex = session.activeGame?.currentQuestionIndex ?? 0;
  const currentQuestion = questionsPool[currentQIndex % questionsPool.length];
  const isLastQuestion = currentQIndex >= questionsPool.length - 1;

  // Question timer
  const timeLimit = currentQuestion?.timeLimitSeconds || 20;
  const [timeLeft, setTimeLeft] = useState<number>(timeLimit);
  const [phase, setPhase] = useState<'question' | 'reveal' | 'leaderboard' | 'podium'>('question');
  
  // Student local state
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [studentStreak, setStudentStreak] = useState<number>(0);
  const [lastPointsEarned, setLastPointsEarned] = useState<number>(0);

  const participantsList = Object.values(session.participants || {});
  const responsesForCurrentQ = (session.responses || []).filter(
    r => r.questionId === currentQuestion?.id
  );

  // Sync phase from teacher's session state if stored in gameData
  const activePhase = session.activeGame?.gameData?.phase || phase;

  // Sound cues on phase changes
  const prevPhaseRef = useRef(activePhase);
  useEffect(() => {
    if (prevPhaseRef.current !== activePhase) {
      if (activePhase === 'reveal') {
        playSuccess();
      } else if (activePhase === 'leaderboard' || activePhase === 'podium') {
        playKahootFanfare();
        if (activePhase === 'podium') {
          confetti({
            particleCount: 120,
            spread: 90,
            origin: { y: 0.6 },
          });
        }
      }
      prevPhaseRef.current = activePhase;
    }
  }, [activePhase]);

  // Reset when slide/question changes
  useEffect(() => {
    setTimeLeft(timeLimit);
    setPhase('question');
    setSelectedOptionId(null);
    setHasSubmitted(false);
    playChime();
  }, [currentQIndex, currentQuestion?.id]);

  // Teacher timer countdown
  useEffect(() => {
    if (activePhase !== 'question') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          if (isTeacher) {
            handleAutoReveal();
          }
          return 0;
        }
        if (prev <= 5) {
          playCountdownTick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activePhase, isTeacher]);

  // When all connected participants have answered, teacher auto-reveals
  useEffect(() => {
    if (
      isTeacher &&
      activePhase === 'question' &&
      participantsList.length > 0 &&
      responsesForCurrentQ.length >= participantsList.length
    ) {
      handleAutoReveal();
    }
  }, [responsesForCurrentQ.length, participantsList.length, activePhase, isTeacher]);

  const handleAutoReveal = () => {
    setPhase('reveal');
    sessionStore.launchGame(session.id, 'kahoot_trivia', {
      ...session.activeGame?.gameData,
      phase: 'reveal',
    });
  };

  const handleTeacherGoToLeaderboard = () => {
    if (isLastQuestion) {
      setPhase('podium');
      sessionStore.launchGame(session.id, 'kahoot_trivia', {
        ...session.activeGame?.gameData,
        phase: 'podium',
      });
    } else {
      setPhase('leaderboard');
      sessionStore.launchGame(session.id, 'kahoot_trivia', {
        ...session.activeGame?.gameData,
        phase: 'leaderboard',
      });
    }
  };

  const handleTeacherNextQuestionInternal = () => {
    if (onTeacherNextQuestion) {
      onTeacherNextQuestion();
    } else {
      const nextIdx = currentQIndex + 1;
      sessionStore.launchGame(session.id, 'kahoot_trivia', {
        phase: 'question',
      });
    }
  };

  // Student selects an option (Kahoot speed scoring)
  const handleStudentSelectOption = (optId: string) => {
    if (hasSubmitted || activePhase !== 'question') return;

    setSelectedOptionId(optId);
    setHasSubmitted(true);
    playKahootTap();

    const chosenOption = currentQuestion.options.find(o => o.id === optId);
    const isCorrect = Boolean(chosenOption?.isCorrect);

    const scoreResult = calculateKahootScore(isCorrect, timeLeft, timeLimit, studentStreak);
    setStudentStreak(scoreResult.newStreak);
    setLastPointsEarned(scoreResult.points);

    if (currentStudentId) {
      // Award points and save response in storage
      sessionStore.submitResponse(session.id, currentStudentId, {
        selectedOptionId: optId,
      });

      if (scoreResult.points > 0) {
        sessionStore.updateGameScore(session.id, currentStudentId, scoreResult.points);
      }
    }

    if (onAnswerSubmit) {
      onAnswerSubmit(currentQuestion.id, optId, scoreResult.points);
    }
  };

  // Sorted participants for leaderboard / podium
  const sortedLeaderboard = [...participantsList].sort((a, b) => b.score - a.score);
  const topFive = sortedLeaderboard.slice(0, 5);

  // Response count distribution per option
  const optionResponseCounts: Record<string, number> = {};
  currentQuestion.options.forEach(opt => {
    optionResponseCounts[opt.id] = responsesForCurrentQ.filter(r => r.selectedOptionId === opt.id).length;
  });

  // Calculate timer percent
  const timerPercent = Math.max(0, Math.min(100, (timeLeft / timeLimit) * 100));

  // -------------------------------------------------------------
  // RENDER: PODIUM / FINAL CELEBRATION (End of Quiz)
  // -------------------------------------------------------------
  if (activePhase === 'podium') {
    const first = sortedLeaderboard[0];
    const second = sortedLeaderboard[1];
    const third = sortedLeaderboard[2];

    return (
      <div className="w-full max-w-4xl mx-auto p-6 sm:p-10 text-center animate-in fade-in duration-300">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full font-mono text-xs uppercase tracking-widest font-bold mb-4">
          <Crown className="w-4 h-4 text-amber-400" />
          <span>Kahoot Championship Podium</span>
        </div>

        <h2 className="font-serif italic text-4xl sm:text-5xl text-white mb-2">
          Quiz Completed!
        </h2>
        <p className="text-zinc-400 text-sm max-w-md mx-auto mb-10 font-normal">
          Top speeds and highest retention across all {questionsPool.length} questions.
        </p>

        {/* 3D Olympic Podium */}
        <div className="flex items-end justify-center gap-3 sm:gap-6 mb-12 max-w-2xl mx-auto pt-8">
          {/* 2nd Place */}
          {second && (
            <div className="flex-1 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-slate-300 text-slate-900 font-bold flex items-center justify-center text-lg mb-2 shadow-lg border-2 border-white">
                2
              </div>
              <div className="text-sm font-bold text-white truncate max-w-[120px] mb-1">
                {second.name}
              </div>
              <div className="text-xs font-mono text-amber-300 font-bold mb-2">
                {second.score} pts
              </div>
              <div className="w-full h-32 sm:h-40 bg-gradient-to-t from-slate-700 to-slate-500 rounded-t-xl border-t border-slate-400 flex items-center justify-center text-white font-mono font-bold text-xl shadow-xl">
                2nd
              </div>
            </div>
          )}

          {/* 1st Place */}
          {first && (
            <div className="flex-1 flex flex-col items-center -mt-6">
              <Crown className="w-8 h-8 text-amber-400 animate-bounce mb-1" />
              <div className="w-16 h-16 rounded-full bg-amber-400 text-amber-950 font-black flex items-center justify-center text-2xl mb-2 shadow-2xl border-4 border-amber-200">
                1
              </div>
              <div className="text-base font-extrabold text-amber-300 truncate max-w-[140px] mb-1">
                {first.name}
              </div>
              <div className="text-sm font-mono text-amber-400 font-black mb-2">
                {first.score} pts
              </div>
              <div className="w-full h-44 sm:h-56 bg-gradient-to-t from-amber-600 to-amber-500 rounded-t-xl border-t-2 border-amber-300 flex items-center justify-center text-white font-mono font-black text-3xl shadow-2xl">
                1st
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {third && (
            <div className="flex-1 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-amber-700 text-amber-100 font-bold flex items-center justify-center text-lg mb-2 shadow-lg border-2 border-amber-400">
                3
              </div>
              <div className="text-sm font-bold text-white truncate max-w-[120px] mb-1">
                {third.name}
              </div>
              <div className="text-xs font-mono text-amber-300 font-bold mb-2">
                {third.score} pts
              </div>
              <div className="w-full h-24 sm:h-28 bg-gradient-to-t from-amber-900 to-amber-800 rounded-t-xl border-t border-amber-600 flex items-center justify-center text-white font-mono font-bold text-lg shadow-xl">
                3rd
              </div>
            </div>
          )}
        </div>

        {isTeacher && (
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={onTeacherEndGame}
              className="px-6 py-3 bg-[#eb4b26] hover:bg-[#cb3815] text-white rounded-xl font-mono text-xs uppercase tracking-wider font-bold transition-all shadow-[4px_4px_0px_0px_#171614] cursor-pointer"
            >
              Finish & Return to Presentation
            </button>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: LEADERBOARD SCREEN (Between questions)
  // -------------------------------------------------------------
  if (activePhase === 'leaderboard') {
    return (
      <div className="w-full max-w-3xl mx-auto p-6 sm:p-8 animate-in fade-in duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-6">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="font-serif italic text-2xl text-white">Scoreboard</h3>
          </div>
          <span className="font-mono text-xs text-zinc-400 uppercase tracking-wider">
            Question {currentQIndex + 1} of {questionsPool.length}
          </span>
        </div>

        <div className="space-y-3 mb-8">
          {topFive.map((p, idx) => {
            const isMe = p.id === currentStudentId;
            return (
              <div
                key={p.id}
                className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                  isMe
                    ? 'bg-amber-500/15 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                    : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full font-mono font-black text-sm flex items-center justify-center ${
                      idx === 0
                        ? 'bg-amber-400 text-amber-950'
                        : idx === 1
                        ? 'bg-slate-300 text-slate-900'
                        : idx === 2
                        ? 'bg-amber-700 text-amber-100'
                        : 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{p.name}</span>
                      {isMe && (
                        <span className="text-[10px] bg-amber-500 text-slate-950 font-bold px-1.5 py-0.2 rounded font-mono uppercase">
                          You
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-mono text-base font-extrabold text-amber-400 tabular-nums">
                    {p.score} pts
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {isTeacher && (
          <div className="flex justify-end">
            <button
              onClick={handleTeacherNextQuestionInternal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-mono text-xs uppercase tracking-wider font-bold transition-all cursor-pointer shadow-lg"
            >
              <span>{isLastQuestion ? 'Final Results & Podium' : 'Next Question'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: TEACHER PROJECTOR VIEW (Question + Reveal)
  // -------------------------------------------------------------
  if (isTeacher) {
    return (
      <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-between min-h-[500px]">
        {/* Top Info Bar: Question Counter, Live Timer, and Response Meter */}
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-6">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded font-mono text-xs font-bold uppercase tracking-wider">
                Kahoot Mode
              </span>
              <span className="font-mono text-xs text-zinc-400">
                Question {currentQIndex + 1} of {questionsPool.length}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 font-mono text-xs text-zinc-300">
                <Users className="w-4 h-4 text-blue-400" />
                <span>
                  {responsesForCurrentQ.length} / {participantsList.length} Answers
                </span>
              </div>

              {activePhase === 'question' && (
                <div
                  className={`w-12 h-12 rounded-full border-3 flex items-center justify-center font-mono font-black text-xl tabular-nums transition-colors ${
                    timeLeft <= 5
                      ? 'border-red-500 text-red-400 animate-pulse bg-red-500/10'
                      : 'border-blue-500 text-blue-400 bg-blue-500/10'
                  }`}
                >
                  {timeLeft}
                </div>
              )}
            </div>
          </div>

          {/* Timer Progress Bar */}
          {activePhase === 'question' && (
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mb-6">
              <div
                className={`h-full transition-all duration-1000 ease-linear ${
                  timeLeft <= 5 ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ width: `${timerPercent}%` }}
              />
            </div>
          )}

          {/* Big Projector Question Prompt */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 sm:p-8 rounded-2xl mb-8 shadow-xl text-center">
            <h2 className="font-serif italic text-2xl sm:text-3xl text-white leading-snug">
              {currentQuestion.prompt}
            </h2>
          </div>
        </div>

        {/* 4 Colored Shape Option Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {currentQuestion.options.slice(0, 4).map((opt, idx) => {
            const shape = KAHOOT_SHAPES[idx % KAHOOT_SHAPES.length];
            const isCorrect = Boolean(opt.isCorrect);
            const count = optionResponseCounts[opt.id] || 0;
            const percentage = responsesForCurrentQ.length > 0
              ? Math.round((count / responsesForCurrentQ.length) * 100)
              : 0;

            const isRevealed = activePhase === 'reveal';

            return (
              <div
                key={opt.id}
                className={`relative p-5 rounded-2xl border transition-all flex flex-col justify-between min-h-[110px] overflow-hidden ${
                  shape.bgClass
                } ${
                  isRevealed
                    ? isCorrect
                      ? 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-zinc-950 scale-[1.02] shadow-2xl'
                      : 'opacity-40 grayscale-[40%]'
                    : 'shadow-lg'
                }`}
              >
                {/* Background response bar on reveal */}
                {isRevealed && (
                  <div
                    className="absolute inset-0 bg-black/25 pointer-events-none transition-all duration-700"
                    style={{ width: `${percentage}%` }}
                  />
                )}

                <div className="relative z-10 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-black drop-shadow-md leading-none">
                      {shape.symbol}
                    </span>
                    <span className="text-white font-bold text-base sm:text-lg leading-snug drop-shadow-sm">
                      {opt.text}
                    </span>
                  </div>

                  {isRevealed && isCorrect && (
                    <span className="p-1.5 bg-emerald-500 text-white rounded-full shrink-0 shadow-md">
                      <CheckCircle2 className="w-5 h-5" />
                    </span>
                  )}
                </div>

                {/* Response Count Bar */}
                {isRevealed && (
                  <div className="relative z-10 flex items-center justify-between text-xs font-mono font-bold text-white/90 pt-3 border-t border-white/20 mt-2">
                    <span>{count} Student{count === 1 ? '' : 's'}</span>
                    <span>{percentage}%</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Explanation and Teacher Navigation Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-800">
          <div className="text-xs text-zinc-400 max-w-xl">
            {activePhase === 'reveal' && currentQuestion.explanation && (
              <div className="p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-300">
                <span className="text-amber-400 font-bold font-mono uppercase mr-2">Pedagogical Review:</span>
                {currentQuestion.explanation}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {activePhase === 'question' ? (
              <button
                onClick={handleAutoReveal}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl font-mono text-xs uppercase font-bold transition-colors cursor-pointer"
              >
                Skip / Reveal Answers
              </button>
            ) : (
              <button
                onClick={handleTeacherGoToLeaderboard}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-mono text-xs uppercase tracking-wider font-bold transition-all shadow-lg cursor-pointer"
              >
                <span>Scoreboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: STUDENT MOBILE / LAPTOP INTERFACE (4 Giant Touch Buttons)
  // -------------------------------------------------------------
  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col justify-between min-h-[520px]">
      {/* Student Header: Timer & Streak */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-700/60 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-mono font-bold text-xs">
            #{currentQIndex + 1}
          </div>
          <span className="font-mono text-xs text-slate-300 font-bold uppercase">
            Question {currentQIndex + 1} / {questionsPool.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {studentStreak > 1 && (
            <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
              <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{studentStreak} in a row</span>
            </div>
          )}

          {activePhase === 'question' && (
            <div
              className={`font-mono font-black text-lg px-2.5 py-0.5 rounded-lg border ${
                timeLeft <= 5
                  ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
                  : 'bg-slate-800 border-slate-700 text-slate-200'
              }`}
            >
              {timeLeft}s
            </div>
          )}
        </div>
      </div>

      {/* When Submitted, show holding state */}
      {hasSubmitted && activePhase === 'question' && (
        <div className="my-auto py-12 px-6 text-center bg-slate-900 border border-slate-800 rounded-3xl shadow-xl">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/40">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="font-serif italic text-2xl text-white mb-2">Answer Locked In!</h3>
          <p className="font-mono text-xs text-slate-400">
            Waiting for class timer to expire... Look at the teacher’s screen for results.
          </p>
        </div>
      )}

      {/* Reveal Feedback for Student */}
      {activePhase === 'reveal' && (
        <div className="my-auto py-8 px-6 text-center bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl animate-in zoom-in-95">
          {selectedOptionId && currentQuestion.options.find(o => o.id === selectedOptionId)?.isCorrect ? (
            <div>
              <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto mb-3 shadow-lg">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="font-serif italic text-3xl text-emerald-400 mb-1">Brilliant!</h3>
              <p className="font-mono text-lg font-black text-amber-400 mb-2">
                +{lastPointsEarned} Points
              </p>
              {studentStreak > 1 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full font-mono text-xs font-bold border border-amber-500/30">
                  <Flame className="w-4 h-4 fill-amber-400" />
                  <span>Answer Streak: {studentStreak} 🔥</span>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center mx-auto mb-3 shadow-lg">
                <XCircle className="w-10 h-10" />
              </div>
              <h3 className="font-serif italic text-3xl text-red-400 mb-1">Incorrect</h3>
              <p className="font-mono text-xs text-slate-400">
                Streak reset. Keep going—speed counts on the next prompt!
              </p>
            </div>
          )}
        </div>
      )}

      {/* 4 Iconic Touch Buttons (when actively answering) */}
      {activePhase === 'question' && !hasSubmitted && (
        <div className="grid grid-cols-2 gap-3.5 flex-1 my-auto">
          {currentQuestion.options.slice(0, 4).map((opt, idx) => {
            const shape = KAHOOT_SHAPES[idx % KAHOOT_SHAPES.length];
            return (
              <button
                key={opt.id}
                onClick={() => handleStudentSelectOption(opt.id)}
                className={`w-full h-36 sm:h-44 rounded-2xl flex flex-col items-center justify-center gap-3 transition-transform active:scale-95 shadow-xl cursor-pointer ${
                  shape.bgClass
                } ${shape.hoverClass}`}
              >
                <span className="text-5xl sm:text-6xl text-white font-black drop-shadow-md leading-none">
                  {shape.symbol}
                </span>
                <span className="text-white text-xs sm:text-sm font-bold text-center px-2 line-clamp-2">
                  {opt.text}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="text-center pt-3 text-[11px] font-mono text-slate-400">
        ClassLock Kahoot Live Engine · Speed &amp; Accuracy Scoring
      </div>
    </div>
  );
};
