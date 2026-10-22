import React from 'react';
import { ShieldAlert, Maximize2, AlertTriangle, Lock, Info } from 'lucide-react';
import { LockMode } from '../types/index.ts';

interface LockdownOverlayProps {
  isVisible: boolean;
  violationReason: string;
  violationCount: number;
  lockMode: LockMode;
  isLockedOut: boolean;
  onRequestFullscreen: () => void;
  onDismissWarning?: () => void;
}

export const LockdownOverlay: React.FC<LockdownOverlayProps> = ({
  isVisible,
  violationReason,
  violationCount,
  lockMode,
  isLockedOut,
  onRequestFullscreen,
  onDismissWarning,
}) => {
  if (!isVisible && !isLockedOut) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="lockdown-alert-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-150 select-none"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-red-500/80 rounded-2xl shadow-2xl p-6 sm:p-8 text-center text-white">
        {/* Pulsing Alert Icon */}
        <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 mb-5 animate-pulse">
          {isLockedOut ? (
            <Lock className="w-8 h-8 text-red-500" />
          ) : (
            <ShieldAlert className="w-8 h-8 text-amber-400" />
          )}
        </div>

        <h2 id="lockdown-alert-title" className="text-2xl font-black tracking-tight text-white mb-2">
          {isLockedOut ? 'Screen Locked by Teacher' : 'Attention: Return to Lesson'}
        </h2>

        <p className="text-slate-300 text-sm mb-4 leading-relaxed">
          {isLockedOut ? (
            'You have exceeded the maximum allowed focus violations (3 strikes in Strict Mode). Please notify your instructor to unlock your screen.'
          ) : (
            <>
              <span className="font-semibold text-amber-400">{violationReason}</span>
              <br />
              ClassLock is monitoring focus during this presentation. Please remain in fullscreen on this tab.
            </>
          )}
        </p>

        {/* Violations Strike Count */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 mb-6 inline-flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div className="text-left text-xs">
            <span className="font-semibold text-white block">
              Focus Violations Recorded: {violationCount}
            </span>
            <span className="text-slate-400">
              {lockMode === 'strict'
                ? isLockedOut
                  ? 'Maximum strikes reached (3/3). Awaiting teacher unlock.'
                  : `Strict Mode: ${3 - violationCount} strike${3 - violationCount === 1 ? '' : 's'} remaining until lockout.`
                : 'Warn Mode: Violations are logged to instructor dashboard.'}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-col gap-3">
          {isLockedOut ? (
            <div className="p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-red-300 text-xs">
              Waiting for teacher to unlock from instructor console...
            </div>
          ) : (
            <button
              onClick={onRequestFullscreen}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-xl text-base transition-all shadow-lg shadow-indigo-600/30"
            >
              <Maximize2 className="w-5 h-5" />
              <span>Resume Fullscreen Lesson</span>
            </button>
          )}

          {!isLockedOut && onDismissWarning && (
            <button
              onClick={onDismissWarning}
              className="text-xs text-slate-400 hover:text-slate-200 underline mt-1"
            >
              I understand, keep me in windowed mode
            </button>
          )}
        </div>

        {/* Honest browser enforcement disclaimer as requested */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-start gap-2 text-left text-[11px] text-slate-400">
          <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
          <p>
            <strong className="text-slate-300">ClassLock Integrity Note:</strong> Standard web browsers cannot physically freeze your operating system. ClassLock uses browser visibility and fullscreen events to detect when students leave the lesson and alerts your teacher in real time.
          </p>
        </div>
      </div>
    </div>
  );
};
