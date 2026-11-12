import React from 'react';
import { Play, ArrowRight, CornerDownRight } from 'lucide-react';
import { sessionStore } from '../services/storage.ts';

interface GamesLibraryPageProps {
  onNavigate: (route: string) => void;
  onStartSessionWithGame?: (gameId: 'quiz_race' | 'memory_match' | 'kahoot_trivia') => void;
}

export const GamesLibraryPage: React.FC<GamesLibraryPageProps> = ({
  onNavigate,
}) => {
  const handleLaunchGameDemo = (gameId: 'quiz_race' | 'memory_match' | 'kahoot_trivia') => {
    const presentations = sessionStore.getPresentations();
    const pres = presentations[0];
    const session = sessionStore.createSession(pres.id);
    sessionStore.launchGame(session.id, gameId);
    onNavigate(`/session/${session.id}/present`);
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#171614] py-16 sm:py-24 px-6 sm:px-10 font-normal">
      <div className="max-w-5xl mx-auto">
        {/* Editorial Header */}
        <div className="max-w-2xl mb-16">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-mono text-xs text-[#eb4b26] uppercase tracking-widest">
              § Checkpoint Activities
            </span>
            <span className="text-[#a09a8f]">/</span>
            <span className="font-mono text-xs text-[#6e6961]">
              Review Engines
            </span>
          </div>

          <h1 className="font-serif italic text-4xl sm:text-5xl text-[#171614] leading-tight mb-4">
            Focused classroom games, without the arcade chaos.
          </h1>
          <p className="text-[#3d3a34] text-base leading-relaxed">
            Review games designed to test recall and retention between lecture slides. Scores stream straight to the session spreadsheet without requiring accounts.
          </p>
        </div>

        {/* Featured Card: Kahoot Live Arena */}
        <div className="bg-[#171614] text-white p-8 sm:p-10 mb-8 border border-[#171614] shadow-[6px_6px_0px_0px_#eb4b26]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 mb-6 border-b border-white/15">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs text-amber-400 mb-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="uppercase tracking-widest font-bold">NEW FEATURE · POPULAR</span>
              </div>
              <h2 className="font-serif italic text-3xl sm:text-4xl text-white">
                Kahoot-Style Live Trivia Arena
              </h2>
            </div>
            <button
              type="button"
              onClick={() => handleLaunchGameDemo('kahoot_trivia')}
              className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono text-xs uppercase tracking-wider font-extrabold transition-all cursor-pointer shrink-0 shadow-lg"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Launch Kahoot Arena</span>
            </button>
          </div>

          <p className="text-zinc-300 text-sm leading-relaxed mb-6 max-w-3xl">
            Project high-yield questions on the podium screen while student phones and laptops transform into the iconic 4-shape response pad (▲ Red, ◆ Blue, ● Yellow, ■ Green). Includes speed-weighted accuracy points, suspense countdown timers, live response bar charts, answer streaks, and a final 3D podium.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs text-zinc-400 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold">▲ ◆ ● ■</span>
              <span>4-quadrant tactile touchpads</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold">⚡ 1,000 pts</span>
              <span>Speed bonus + streak multiplier</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold">🏆 Podium</span>
              <span>Top 5 leaderboard &amp; gradebook sync</span>
            </div>
          </div>
        </div>

        {/* Asymmetrical Studio Game Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          {/* Game 1: Quiz Race */}
          <div className="bg-white border border-[#171614] p-8 flex flex-col justify-between shadow-[4px_4px_0px_0px_#171614]">
            <div>
              <div className="flex items-center justify-between font-mono text-[11px] text-[#6e6961] pb-3 mb-6 border-b border-[#e5e0d8]">
                <span className="text-[#171614] font-semibold uppercase">GAME [ 01 ]</span>
                <span className="text-[#eb4b26]">SYNCHRONOUS MULTIPLAYER</span>
              </div>

              <h2 className="font-serif italic text-3xl text-[#171614] mb-3">
                Quiz Race Track
              </h2>
              <p className="text-sm text-[#3d3a34] leading-relaxed mb-6 font-normal">
                Students answer review prompts on their Chromebooks. Each verified response moves that student’s marker down a clean, multi-lane track projected at the front of the room.
              </p>

              <div className="space-y-2.5 font-mono text-xs text-[#6e6961] mb-8 border-t border-[#f0ede6] pt-4">
                <div className="flex items-center gap-2">
                  <span className="text-[#eb4b26]">→</span>
                  <span>Instant position updates via local state bus</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#eb4b26]">→</span>
                  <span>Supports 5 to 60+ concurrent student devices</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#eb4b26]">→</span>
                  <span>Final scores written into the session gradebook</span>
                </div>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => handleLaunchGameDemo('quiz_race')}
                className="w-full inline-flex items-center justify-center gap-2 py-3 bg-[#eb4b26] hover:bg-[#cb3815] text-white font-mono text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Launch Quiz Race in Live Room</span>
              </button>
            </div>
          </div>

          {/* Game 2: Memory Match */}
          <div className="bg-white border border-[#171614] p-8 flex flex-col justify-between shadow-[4px_4px_0px_0px_#171614]">
            <div>
              <div className="flex items-center justify-between font-mono text-[11px] text-[#6e6961] pb-3 mb-6 border-b border-[#e5e0d8]">
                <span className="text-[#171614] font-semibold uppercase">GAME [ 02 ]</span>
                <span className="text-[#6e6961]">COGNITIVE RETRIEVAL</span>
              </div>

              <h2 className="font-serif italic text-3xl text-[#171614] mb-3">
                Vocabulary Memory Match
              </h2>
              <p className="text-sm text-[#3d3a34] leading-relaxed mb-6 font-normal">
                A paired card grid generated automatically from terms in your current slide deck. Students pair terms with concise definitions at their own pace.
              </p>

              <div className="space-y-2.5 font-mono text-xs text-[#6e6961] mb-8 border-t border-[#f0ede6] pt-4">
                <div className="flex items-center gap-2">
                  <span className="text-[#eb4b26]">→</span>
                  <span>Pulls vocabulary directly from active slides</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#eb4b26]">→</span>
                  <span>Turn count and accuracy recorded per student</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#eb4b26]">→</span>
                  <span>Quiet retrieval practice without buzzer stress</span>
                </div>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => handleLaunchGameDemo('memory_match')}
                className="w-full inline-flex items-center justify-center gap-2 py-3 bg-[#171614] hover:bg-[#2d2b27] text-white font-mono text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Launch Memory Match in Live Room</span>
              </button>
            </div>
          </div>
        </div>

        {/* Studio Architecture Notes */}
        <div className="pt-10 border-t border-[#e5e0d8] font-mono text-xs text-[#6e6961]">
          <div className="flex items-baseline justify-between mb-4">
            <span className="text-[#171614] font-semibold uppercase tracking-wider">
              [ 03 ] Extensible Game Protocol
            </span>
            <span className="text-[11px] text-[#a09a8f]">MODULAR DRIVERS</span>
          </div>
          <p className="max-w-2xl text-xs leading-relaxed text-[#3d3a34]">
            Games in ClassLock are pure state reducers. They inherit the room code, broadcast student states, and serialize their final scores into standard CSV columns without requiring third-party plugins.
          </p>
        </div>
      </div>
    </div>
  );
};
