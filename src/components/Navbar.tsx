import React, { useState } from 'react';
import { Shield, Volume2, VolumeX, ArrowRight, Menu, X } from 'lucide-react';
import { TeacherProfile } from '../types/index.ts';
import { isSoundEnabled, setSoundEnabled } from '../utils/soundEffects.ts';

interface NavbarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  teacher: TeacherProfile | null;
  onLogout: () => void;
  activeSessionCode?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRoute,
  onNavigate,
  teacher,
  onLogout,
  activeSessionCode,
}) => {
  const [quickCode, setQuickCode] = useState('');
  const [sound, setSound] = useState(isSoundEnabled());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCode.trim()) return;
    const clean = quickCode.trim().toUpperCase();
    onNavigate(`/play/${clean}`);
    setQuickCode('');
    setIsMobileMenuOpen(false);
  };

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    setSoundEnabled(next);
  };

  return (
    <header className="bg-[#faf8f5] border-b border-[#e5e0d8] sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 sm:px-10">
        <div className="flex items-center justify-between gap-8 h-18">
          {/* Zone 1: Handcrafted Studio Wordmark */}
          <a
            href="/"
            onClick={(e) => { e.preventDefault(); onNavigate('/'); }}
            className="flex items-center gap-3 text-[#171614] whitespace-nowrap shrink-0 group focus:outline-hidden"
          >
            <div className="w-7 h-7 bg-[#171614] text-[#faf8f5] flex items-center justify-center rounded-sm font-mono text-xs font-semibold tracking-wider">
              CL
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-serif italic text-2xl tracking-tight text-[#171614]">
                ClassLock
              </span>
              <span className="hidden sm:inline-block font-mono text-[10px] tracking-wider uppercase text-[#6e6961]">
                ed. 04
              </span>
            </div>
          </a>

          {/* Zone 2: Editorial Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-mono uppercase tracking-wider text-[#6e6961]">
            <button
              onClick={() => onNavigate('/dashboard')}
              className={`hover:text-[#171614] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                currentRoute.startsWith('/dashboard') || currentRoute.startsWith('/presentations')
                  ? 'text-[#171614] font-semibold border-b border-[#eb4b26] pb-0.5'
                  : ''
              }`}
            >
              Presentations
            </button>
            <button
              onClick={() => onNavigate('/games')}
              className={`hover:text-[#171614] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                currentRoute === '/games' ? 'text-[#171614] font-semibold border-b border-[#eb4b26] pb-0.5' : ''
              }`}
            >
              Games
            </button>
            <button
              onClick={() => onNavigate('/join')}
              className={`hover:text-[#171614] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                currentRoute === '/join' ? 'text-[#171614] font-semibold border-b border-[#eb4b26] pb-0.5' : ''
              }`}
            >
              Join Session
            </button>
          </nav>

          {/* Zone 3: Studio Utility Actions */}
          <div className="hidden md:flex items-center gap-4 shrink-0">
            {/* Quick Code Form with utilitarian hairline input */}
            <form onSubmit={handleJoinSubmit} className="flex items-center">
              <div className="relative">
                <input
                  type="text"
                  maxLength={8}
                  placeholder="CODE"
                  value={quickCode}
                  onChange={e => setQuickCode(e.target.value)}
                  className="w-28 pl-3 pr-7 py-1.5 text-xs font-mono font-normal uppercase bg-[#ffffff] border border-[#e5e0d8] focus:border-[#eb4b26] rounded-none focus:outline-hidden transition-all text-[#171614] placeholder:font-mono placeholder:text-[#a09a8f]"
                />
                <button
                  type="submit"
                  aria-label="Submit code"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-[#6e6961] hover:text-[#eb4b26] cursor-pointer"
                >
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </form>

            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              className="p-2 text-[#6e6961] hover:text-[#171614] hover:bg-[#ede8df] transition-colors cursor-pointer rounded-none"
              title={sound ? 'Mute audio' : 'Enable audio'}
              aria-label={sound ? 'Mute audio' : 'Enable audio'}
            >
              {sound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-[#a09a8f]" />}
            </button>

            {activeSessionCode && (
              <button
                onClick={() => onNavigate(`/session/${activeSessionCode}/present`)}
                className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-[#eb4b26] border border-[#eb4b26] hover:bg-[#eb4b26] hover:text-white transition-colors cursor-pointer"
              >
                Return to Live
              </button>
            )}

            {teacher ? (
              <div className="flex items-center gap-3 pl-3 border-l border-[#e5e0d8]">
                <span className="text-xs font-mono text-[#171614] truncate max-w-[120px]">
                  {teacher.name}
                </span>
                <button
                  onClick={onLogout}
                  className="text-xs font-mono uppercase text-[#a09a8f] hover:text-[#171614] transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => onNavigate('/login')}
                className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-[#faf8f5] bg-[#171614] hover:bg-[#2d2b27] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-[#171614] hover:bg-[#ede8df]"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-[#e5e0d8] bg-[#faf8f5] px-6 py-4 space-y-3 font-mono text-xs">
          <form onSubmit={handleJoinSubmit}>
            <div className="relative">
              <input
                type="text"
                placeholder="ENTER 6-CHAR CODE"
                value={quickCode}
                onChange={e => setQuickCode(e.target.value)}
                className="w-full px-3 py-2 font-mono uppercase bg-white border border-[#e5e0d8] focus:border-[#eb4b26] focus:outline-hidden"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#6e6961]"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          <div className="flex flex-col gap-2 pt-2 border-t border-[#e5e0d8]">
            <button
              onClick={() => { onNavigate('/dashboard'); setIsMobileMenuOpen(false); }}
              className="text-left py-2 uppercase hover:text-[#eb4b26]"
            >
              Presentations
            </button>
            <button
              onClick={() => { onNavigate('/games'); setIsMobileMenuOpen(false); }}
              className="text-left py-2 uppercase hover:text-[#eb4b26]"
            >
              Games
            </button>
            <button
              onClick={() => { onNavigate('/join'); setIsMobileMenuOpen(false); }}
              className="text-left py-2 uppercase hover:text-[#eb4b26]"
            >
              Join Session
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
