import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Trophy, RotateCcw, Check, Clock, Brain } from 'lucide-react';
import { LiveSession } from '../../types/index.ts';
import { VOCABULARY_PAIRS } from '../../services/storage.ts';
import { createMemoryMatchDeck, MemoryCard } from '../../logic/sessionRules.ts';

interface MemoryMatchGameProps {
  session: LiveSession;
  isTeacher: boolean;
  currentStudentId?: string;
  onMatchSuccess?: (points: number) => void;
  onTeacherEndGame?: () => void;
}

export const MemoryMatchGame: React.FC<MemoryMatchGameProps> = ({
  session,
  isTeacher,
  currentStudentId,
  onMatchSuccess,
  onTeacherEndGame,
}) => {
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState<number>(0);
  const [matches, setMatches] = useState<number>(0);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [gameCompleted, setGameCompleted] = useState<boolean>(false);

  useEffect(() => {
    // Generate starter deck using first 4 pairs (8 cards) for quick, punchy classroom matches
    const selectedPairs = VOCABULARY_PAIRS.slice(0, 4);
    setCards(createMemoryMatchDeck(selectedPairs));
    setFlippedIndices([]);
    setMoves(0);
    setMatches(0);
    setGameCompleted(false);
  }, []);

  const handleCardClick = (index: number) => {
    if (isChecking) return;
    if (cards[index].matched) return;
    if (flippedIndices.includes(index)) return;
    if (flippedIndices.length >= 2) return;

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(prev => prev + 1);
      setIsChecking(true);

      const firstCard = cards[newFlipped[0]];
      const secondCard = cards[newFlipped[1]];

      if (firstCard.pairId === secondCard.pairId && firstCard.type !== secondCard.type) {
        // MATCH!
        setTimeout(() => {
          setCards(prev =>
            prev.map((card, i) =>
              i === newFlipped[0] || i === newFlipped[1] ? { ...card, matched: true } : card
            )
          );
          setFlippedIndices([]);
          setIsChecking(false);
          const newMatchCount = matches + 1;
          setMatches(newMatchCount);

          if (onMatchSuccess) {
            onMatchSuccess(15);
          }

          if (newMatchCount === cards.length / 2) {
            setGameCompleted(true);
            try {
              confetti({ particleCount: 80, spread: 60 });
            } catch (e) {
              // ignore
            }
          }
        }, 600);
      } else {
        // NO MATCH
        setTimeout(() => {
          setFlippedIndices([]);
          setIsChecking(false);
        }, 1100);
      }
    }
  };

  const handleReset = () => {
    const selectedPairs = VOCABULARY_PAIRS.slice(0, 4);
    setCards(createMemoryMatchDeck(selectedPairs));
    setFlippedIndices([]);
    setMoves(0);
    setMatches(0);
    setGameCompleted(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-2xl">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-white">Vocabulary Memory Match</h2>
            <p className="text-xs text-slate-400">
              Match biological organelles & celestial concepts with their scientific definitions!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Shuffle New Board</span>
          </button>
          {isTeacher && (
            <button
              onClick={onTeacherEndGame}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Return to Slides
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-around bg-slate-950/60 border border-slate-800 rounded-2xl p-4 mb-6 text-center">
        <div>
          <span className="text-xs text-slate-400 uppercase tracking-wider block">Matches Found</span>
          <span className="text-2xl font-extrabold text-purple-400">
            {matches} / {cards.length / 2}
          </span>
        </div>
        <div className="w-px h-8 bg-slate-800" />
        <div>
          <span className="text-xs text-slate-400 uppercase tracking-wider block">Total Attempts</span>
          <span className="text-2xl font-extrabold text-amber-400 font-mono">{moves}</span>
        </div>
        <div className="w-px h-8 bg-slate-800" />
        <div>
          <span className="text-xs text-slate-400 uppercase tracking-wider block">Bonus Points</span>
          <span className="text-2xl font-extrabold text-emerald-400 font-mono">+{matches * 15}</span>
        </div>
      </div>

      {/* Completion message */}
      {gameCompleted && (
        <div className="mb-6 p-4 bg-emerald-950/60 border-2 border-emerald-500/80 rounded-2xl text-center animate-in zoom-in-95">
          <div className="text-xl font-black text-emerald-300 flex items-center justify-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            <span>Memory Match Complete in {moves} Moves!</span>
          </div>
          <p className="text-xs text-emerald-200 mt-1">
            Excellent recall! +{matches * 15} total points added to your score.
          </p>
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {cards.map((card, idx) => {
          const isFlipped = card.matched || flippedIndices.includes(idx);
          const isMatchingAttempt = flippedIndices.includes(idx);

          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(idx)}
              disabled={card.matched || isChecking}
              className={`h-36 sm:h-40 rounded-2xl p-3 text-center transition-all duration-300 relative flex flex-col items-center justify-center border text-xs sm:text-sm font-semibold select-none ${
                card.matched
                  ? 'bg-emerald-950/50 border-emerald-500/80 text-emerald-200 ring-2 ring-emerald-500/30'
                  : isFlipped
                  ? 'bg-indigo-950/80 border-indigo-400 text-white shadow-lg'
                  : 'bg-slate-800/90 border-slate-700 hover:border-slate-600 text-slate-400 hover:text-slate-200 cursor-pointer shadow'
              }`}
            >
              {isFlipped ? (
                <div className="flex flex-col items-center justify-center h-full px-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider mb-1 text-indigo-300 block">
                    {card.type === 'term' ? 'Concept Term' : 'Definition'}
                  </span>
                  <span className="leading-snug text-white font-medium text-xs sm:text-sm">
                    {card.text}
                  </span>
                  {card.matched && (
                    <span className="mt-2 inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                      <Check className="w-3.5 h-3.5" /> Matched
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-xl bg-slate-700/60 flex items-center justify-center mb-2 text-indigo-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <span className="text-xs text-slate-400 font-mono">Card #{idx + 1}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
