import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Flag, Trophy, CheckCircle, XCircle, Zap, RefreshCw, ArrowRight } from 'lucide-react';
import { LiveSession, Participant, Question } from '../../types/index.ts';
import { calculateRaceProgress } from '../../logic/sessionRules.ts';
import { sessionStore } from '../../services/storage.ts';

interface QuizRaceGameProps {
  session: LiveSession;
  isTeacher: boolean;
  currentStudentId?: string;
  onAnswerSubmit?: (questionId: string, optionId: string) => void;
  onTeacherNextQuestion?: () => void;
  onTeacherEndGame?: () => void;
}

const RACE_QUESTIONS: Question[] = [
  {
    id: 'race-ob-1',
    type: 'multiple_choice',
    prompt: 'In Herzberg’s Two-Factor theory, which factor directly drives intrinsic motivation and job satisfaction?',
    points: 20,
    options: [
      { id: 'ro-ob1', text: 'Challenging work and responsibility', isCorrect: true },
      { id: 'ro-ob2', text: 'Baseline salary adjustments', isCorrect: false },
      { id: 'ro-ob3', text: 'Company parking policies', isCorrect: false },
      { id: 'ro-ob4', text: 'Ergonomic office cubicles', isCorrect: false },
    ],
  },
  {
    id: 'race-ob-2',
    type: 'multiple_choice',
    prompt: 'What was Google Project Aristotle’s #1 key finding for high-performing teams?',
    points: 20,
    options: [
      { id: 'ro-ob5', text: 'Individual IQ of team engineers', isCorrect: false },
      { id: 'ro-ob6', text: 'Psychological Safety', isCorrect: true },
      { id: 'ro-ob7', text: 'Seniority-based leadership hierarchy', isCorrect: false },
      { id: 'ro-ob8', text: 'Strict adherence to initial project timelines', isCorrect: false },
    ],
  },
  {
    id: 'race-ob-3',
    type: 'multiple_choice',
    prompt: 'Which symptom is a classic warning sign of Groupthink in executive deliberations?',
    points: 20,
    options: [
      { id: 'ro-ob9', text: 'Self-censorship and mindguarding', isCorrect: true },
      { id: 'ro-ob10', text: 'Excessive dissenting opinions', isCorrect: false },
      { id: 'ro-ob11', text: 'Formal Devil\'s advocate reviews', isCorrect: false },
      { id: 'ro-ob12', text: 'Transparent anonymous feedback surveys', isCorrect: false },
    ],
  },
  {
    id: 'race-q1',
    type: 'multiple_choice',
    prompt: 'Which planet is famous for having a runaway greenhouse effect and 460°C heat?',
    points: 20,
    options: [
      { id: 'ro1', text: 'Mercury', isCorrect: false },
      { id: 'ro2', text: 'Venus', isCorrect: true },
      { id: 'ro3', text: 'Mars', isCorrect: false },
      { id: 'ro4', text: 'Neptune', isCorrect: false },
    ],
  },
  {
    id: 'race-q2',
    type: 'multiple_choice',
    prompt: 'What organelle produces ATP through cellular respiration?',
    points: 20,
    options: [
      { id: 'ro5', text: 'Mitochondria', isCorrect: true },
      { id: 'ro6', text: 'Ribosome', isCorrect: false },
      { id: 'ro7', text: 'Golgi Apparatus', isCorrect: false },
      { id: 'ro8', text: 'Endoplasmic Reticulum', isCorrect: false },
    ],
  },
];

export const QuizRaceGame: React.FC<QuizRaceGameProps> = ({
  session,
  isTeacher,
  currentStudentId,
  onAnswerSubmit,
  onTeacherNextQuestion,
  onTeacherEndGame,
}) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; revealed: boolean } | null>(null);

  const presentation = sessionStore.getPresentationById(session.presentationId);
  const presentationQuestions: Question[] = (presentation?.slides || [])
    .map(s => s.question)
    .filter((q): q is Question => Boolean(q && q.options && q.options.length > 0));

  const questionsPool = presentationQuestions.length >= 2 ? presentationQuestions : RACE_QUESTIONS;

  const gameData = session.activeGame?.gameData || {};
  const currentQIndex = session.activeGame?.currentQuestionIndex ?? 0;
  const currentQuestion = questionsPool[currentQIndex % questionsPool.length];

  const participantsList = Object.values(session.participants || []);

  // Determine racer stats
  const racerStats = participantsList.map(p => {
    // Correct answers count in this game or total score
    const correctCount = Math.floor(p.score / 15);
    const progress = calculateRaceProgress(correctCount, 5);
    return {
      ...p,
      correctCount,
      progress,
    };
  }).sort((a, b) => b.progress - a.progress);

  const winner = racerStats.find(r => r.progress >= 100);

  useEffect(() => {
    if (winner) {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // ignore
      }
    }
  }, [winner]);

  // Reset local answer selection when question index changes
  useEffect(() => {
    setSelectedOptionId(null);
    setFeedback(null);
  }, [currentQIndex]);

  const handleStudentSelect = (optionId: string) => {
    if (feedback?.revealed) return;
    setSelectedOptionId(optionId);
    const chosen = currentQuestion.options.find(o => o.id === optionId);
    const isCorrect = !!chosen?.isCorrect;

    setFeedback({
      isCorrect,
      revealed: true,
    });

    if (onAnswerSubmit) {
      onAnswerSubmit(currentQuestion.id, optionId);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
      {/* Background racetrack glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black tracking-tight text-white">Quiz Race Arena</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Live Challenge
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Answer questions correctly to accelerate your racer across the finish line!
            </p>
          </div>
        </div>

        {isTeacher && (
          <div className="flex items-center gap-2">
            <button
              onClick={onTeacherNextQuestion}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              <span>Next Lap Question</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onTeacherEndGame}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            >
              Return to Slides
            </button>
          </div>
        )}
      </div>

      {/* Racetrack Visual Area */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-6 mb-8">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-3 uppercase tracking-wider">
          <div className="flex items-center gap-1">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Starting Grid</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-400">
            <Flag className="w-4 h-4" />
            <span>Finish Line 🏁</span>
          </div>
        </div>

        {/* Track Lanes */}
        <div className="space-y-3">
          {racerStats.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">
              Waiting for students to join the race grid...
            </div>
          ) : (
            racerStats.map((racer, idx) => {
              const isCurrent = racer.id === currentStudentId;
              return (
                <div key={racer.id} className="relative">
                  <div className="flex items-center justify-between text-xs font-semibold mb-1 text-slate-300">
                    <span className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: racer.avatarColor || '#3B82F6' }}
                      />
                      <span>{racer.name} {isCurrent && '(You)'}</span>
                      {idx === 0 && racer.progress > 0 && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 font-mono">
                          1st Place
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-slate-400">{racer.progress}%</span>
                  </div>

                  {/* Lane bar */}
                  <div className="h-8 w-full bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden flex items-center px-1">
                    {/* Track markings */}
                    <div className="absolute inset-0 flex justify-between px-6 pointer-events-none opacity-20">
                      <div className="w-px h-full bg-slate-500" />
                      <div className="w-px h-full bg-slate-500" />
                      <div className="w-px h-full bg-slate-500" />
                    </div>

                    {/* Progress Fill */}
                    <div
                      className="absolute left-0 top-0 bottom-0 opacity-20 transition-all duration-700 ease-out"
                      style={{
                        width: `${Math.max(5, racer.progress)}%`,
                        backgroundColor: racer.avatarColor || '#3B82F6',
                      }}
                    />

                    {/* Moving Car / Racer Avatar */}
                    <div
                      className="relative z-10 transition-all duration-700 ease-out flex items-center"
                      style={{ left: `${Math.min(94, Math.max(0, racer.progress * 0.92))}%` }}
                    >
                      <div
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-md flex items-center gap-1.5 border border-white/20"
                        style={{ backgroundColor: racer.avatarColor || '#3B82F6' }}
                      >
                        <span className="text-sm">🏎️</span>
                        <span className="text-[11px] truncate max-w-[80px]">{racer.name.split(' ')[0]}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Winner Banner if someone won */}
      {winner && (
        <div className="mb-6 p-4 bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border-2 border-amber-400/60 rounded-2xl text-center animate-bounce">
          <div className="text-2xl font-black text-amber-300">
            🏆 {winner.name} Wins the Quiz Race! 🏆
          </div>
          <div className="text-xs text-amber-200 mt-1">
            Phenomenal speed and accuracy! Congratulations!
          </div>
        </div>
      )}

      {/* Question Interaction Area (for student or teacher preview) */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6">
        <div className="flex items-center justify-between text-xs text-indigo-400 font-semibold uppercase tracking-wider mb-2">
          <span>Question {((currentQIndex) % RACE_QUESTIONS.length) + 1} of {RACE_QUESTIONS.length}</span>
          <span className="text-amber-400 font-bold">+20 Turbo Points</span>
        </div>

        <h3 className="text-lg sm:text-xl font-bold text-white mb-6">
          {currentQuestion.prompt}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {currentQuestion.options.map((opt, i) => {
            const isSelected = selectedOptionId === opt.id;
            const letter = String.fromCharCode(65 + i);

            let btnStyle = 'bg-slate-900 border-slate-700 hover:border-indigo-500 text-slate-200';
            if (feedback?.revealed) {
              if (opt.isCorrect) {
                btnStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-100 ring-2 ring-emerald-500/30';
              } else if (isSelected && !opt.isCorrect) {
                btnStyle = 'bg-red-950/80 border-red-500 text-red-200';
              } else {
                btnStyle = 'bg-slate-900/50 border-slate-800 text-slate-500';
              }
            } else if (isSelected) {
              btnStyle = 'bg-indigo-900/60 border-indigo-400 text-white';
            }

            return (
              <button
                key={opt.id}
                disabled={feedback?.revealed || isTeacher}
                onClick={() => handleStudentSelect(opt.id)}
                className={`flex items-center gap-3 p-4 rounded-xl border text-left font-medium text-sm transition-all ${btnStyle}`}
              >
                <span className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs flex-shrink-0 text-slate-300">
                  {letter}
                </span>
                <span className="flex-1">{opt.text}</span>
                {feedback?.revealed && opt.isCorrect && (
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                )}
                {feedback?.revealed && isSelected && !opt.isCorrect && (
                  <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {feedback?.revealed && (
          <div className={`mt-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            feedback.isCorrect ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800' : 'bg-red-950/60 text-red-300 border border-red-800'
          }`}>
            {feedback.isCorrect ? (
              <>
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>Correct! Nitro boost applied! Your car moves ahead!</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 flex-shrink-0" />
                <span>Incorrect. Keep your eyes on the track for the next question!</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
