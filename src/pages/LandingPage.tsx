import React, { useState } from 'react';
import { ArrowRight, Play, Check, CornerDownRight, Upload } from 'lucide-react';
import { sessionStore } from '../services/storage.ts';
import { SlideImportModal } from '../components/SlideImportModal.tsx';
import { ImportedDeckResult } from '../services/slideImporter.ts';
import { Presentation } from '../types/index.ts';

interface LandingPageProps {
  onNavigate: (route: string) => void;
  onStartLiveDemo: (presentationId: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigate,
  onStartLiveDemo,
}) => {
  const [code, setCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [joinError, setJoinError] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Interactive Live Preview State
  const [simSlide, setSimSlide] = useState(1); // default on question slide to show feature instantly
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const handleImportComplete = (imported: ImportedDeckResult) => {
    const newPres: Presentation = {
      id: `pres-${Date.now()}`,
      teacherId: 'teacher-demo-1',
      title: imported.title || 'Imported Presentation',
      subject: imported.subject || 'General',
      description: imported.description || `Imported deck with ${imported.slides.length} slides.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      slides: imported.slides,
    };
    sessionStore.savePresentation(newPres);
    onNavigate(`/presentations/${newPres.id}/edit`);
  };

  const sampleSlides = [
    {
      index: '01',
      title: 'Orbital Mechanics & Planetary Motion',
      type: 'LECTURE',
      body: 'Kepler’s Third Law: The square of an orbital period is proportional to the cube of its semi-major axis (T² ∝ a³).',
      hasCheckpoint: false,
    },
    {
      index: '02',
      title: 'Checkpoint: Keplerian Orbits',
      type: 'QUESTION GATE',
      body: 'If an exoplanet is 4 AU from its host star, what is its orbital period in Earth years?',
      hasCheckpoint: true,
      options: [
        { id: 'a', label: '4 Earth years', correct: false },
        { id: 'b', label: '8 Earth years', correct: true },
        { id: 'c', label: '16 Earth years', correct: false },
      ],
    },
    {
      index: '03',
      title: 'Active Focus Guard',
      type: 'INTEGRITY MONITOR',
      body: 'Student tab switches are detected in real time and flagged on the teacher console.',
      hasCheckpoint: false,
    },
  ];

  const handleStudentJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setJoinError('Enter a room code.');
      return;
    }
    const cleanCode = code.trim().toUpperCase();
    if (studentName.trim()) {
      localStorage.setItem('classlock_temp_student_name', studentName.trim());
    }
    onNavigate(`/play/${cleanCode}`);
  };

  const handleQuickDemoSession = () => {
    const pres = sessionStore.getPresentations()[0];
    if (pres) {
      onStartLiveDemo(pres.id);
    }
  };

  const handlePrefillCode = (prefillCode: string) => {
    const pres = sessionStore.getPresentations()[0];
    sessionStore.createSession(pres.id, prefillCode);
    setCode(prefillCode);
    setStudentName('Julian Miller');
    setJoinError('');
  };

  const handleAnswerSelect = (optionId: string) => {
    setSelectedOption(optionId);
    setIsAnswered(true);
  };

  const currentSlide = sampleSlides[simSlide];

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#171614] flex flex-col font-normal antialiased selection:bg-[#171614] selection:text-[#faf8f5]">
      
      {/* Studio Monograph Bar */}
      <div className="border-b border-[#e5e0d8] bg-[#f4efe6]/50">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-2 flex items-center justify-between text-xs font-mono text-[#6e6961]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#eb4b26]" />
            <span>ClassLock · Synchronous Classroom Display</span>
          </div>
          <span className="hidden sm:inline text-[#a09a8f]">No student accounts required</span>
        </div>
      </div>

      {/* Hero Section: Asymmetric, Clean, Punchy */}
      <section className="pt-16 sm:pt-24 pb-16 sm:pb-24 border-b border-[#e5e0d8]">
        <div className="max-w-6xl mx-auto px-6 sm:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-start">
            
            {/* Left 7 Columns: Hero & Entry */}
            <div className="lg:col-span-7">
              <h1 className="font-serif italic text-5xl sm:text-6xl lg:text-7xl leading-[1.05] text-[#171614] tracking-tight mb-6">
                Your slides. <br />
                <span className="not-italic font-normal">Their screens.</span> <br />
                <span className="text-[#eb4b26]">Locked together.</span>
              </h1>

              <p className="text-base sm:text-lg text-[#3d3a34] max-w-lg mb-8 font-normal leading-relaxed">
                When you advance, every student laptop follows. When you ask a question, their screens lock until they submit.
              </p>

              {/* Simplified Room Entry Form */}
              <div className="border border-[#171614] bg-white p-6 sm:p-7 max-w-lg shadow-[4px_4px_0px_0px_#171614]">
                <form onSubmit={handleStudentJoin} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-mono text-[11px] uppercase tracking-wider text-[#6e6961] mb-1">
                        Room Code
                      </label>
                      <input
                        type="text"
                        maxLength={8}
                        value={code}
                        onChange={e => { setCode(e.target.value); setJoinError(''); }}
                        placeholder="e.g. BIO101"
                        className="w-full px-3 py-2 font-mono uppercase bg-[#faf8f5] border border-[#e5e0d8] focus:border-[#eb4b26] text-sm text-[#171614] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[11px] uppercase tracking-wider text-[#6e6961] mb-1">
                        Your Name
                      </label>
                      <input
                        type="text"
                        value={studentName}
                        onChange={e => setStudentName(e.target.value)}
                        placeholder="e.g. Alex Rivera"
                        className="w-full px-3 py-2 font-sans bg-[#faf8f5] border border-[#e5e0d8] focus:border-[#eb4b26] text-sm text-[#171614] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {joinError && (
                    <div className="font-mono text-xs text-[#eb4b26]">
                      {joinError}
                    </div>
                  )}

                  <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <button
                      type="submit"
                      className="flex-1 px-5 py-2.5 bg-[#eb4b26] hover:bg-[#cb3815] text-white font-mono text-xs uppercase tracking-wider font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Join as Student</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={handleQuickDemoSession}
                      className="px-5 py-2.5 bg-[#171614] hover:bg-[#2e2c28] text-white font-mono text-xs uppercase tracking-wider font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Start Teacher Session</span>
                    </button>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setIsImportModalOpen(true)}
                      className="inline-flex items-center gap-1.5 font-mono text-xs text-[#171614] hover:text-[#eb4b26] underline underline-offset-4 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#eb4b26]" />
                      <span>Import Slides (PowerPoint / Google Slides / Text)</span>
                    </button>
                  </div>
                </form>

                {/* Pre-seeded demo shortcuts */}
                <div className="mt-4 pt-3 border-t border-[#f0ede6] flex items-center gap-2 text-xs font-mono text-[#6e6961]">
                  <span>Try room:</span>
                  <button
                    type="button"
                    onClick={() => handlePrefillCode('BIO101')}
                    className="text-[#eb4b26] underline hover:text-[#cb3815] cursor-pointer"
                  >
                    BIO101
                  </button>
                  <span className="text-[#d8d3ca]">·</span>
                  <button
                    type="button"
                    onClick={() => handlePrefillCode('PHYS42')}
                    className="text-[#eb4b26] underline hover:text-[#cb3815] cursor-pointer"
                  >
                    PHYS42
                  </button>
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Interactive Sandbox Preview */}
            <div className="lg:col-span-5">
              <div className="border border-[#171614] bg-white shadow-[6px_6px_0px_0px_#171614]">
                
                {/* Simulator Bar */}
                <div className="bg-[#171614] text-white px-4 py-2.5 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#eb4b26]" />
                    <span>STUDENT VIEW SIMULATOR</span>
                  </div>
                  <span className="text-[#a09a8f] text-[11px]">ROOM: PHYS42</span>
                </div>

                {/* Simulated Screen */}
                <div className="p-6 bg-[#faf8f5] border-b border-[#e5e0d8]">
                  <div className="flex items-center justify-between font-mono text-xs text-[#6e6961] mb-2">
                    <span>SLIDE {currentSlide.index} / 03</span>
                    <span className="text-[#eb4b26] font-semibold">{currentSlide.type}</span>
                  </div>

                  <h3 className="font-serif italic text-2xl text-[#171614] mb-2">
                    {currentSlide.title}
                  </h3>

                  <p className="text-xs text-[#3d3a34] leading-relaxed mb-4">
                    {currentSlide.body}
                  </p>

                  {/* Interactive Question */}
                  {currentSlide.hasCheckpoint && (
                    <div className="space-y-2 pt-2 border-t border-[#e5e0d8]">
                      {currentSlide.options?.map(opt => {
                        const isSelected = selectedOption === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleAnswerSelect(opt.id)}
                            className={`w-full text-left p-2.5 text-xs transition-colors flex items-center justify-between border cursor-pointer ${
                              isSelected
                                ? 'border-[#eb4b26] bg-white text-[#171614] font-semibold'
                                : 'border-[#e5e0d8] bg-white hover:border-[#171614] text-[#3d3a34]'
                            }`}
                          >
                            <span className="font-mono text-[11px] mr-2">[{opt.id.toUpperCase()}]</span>
                            <span className="flex-1 font-sans">{opt.label}</span>
                            {isSelected && (
                              <span className="font-mono text-[10px] text-[#eb4b26]">
                                {opt.correct ? 'CORRECT' : 'SUBMITTED'}
                              </span>
                            )}
                          </button>
                        );
                      })}
                      {isAnswered && (
                        <div className="p-2 bg-white border border-[#e5e0d8] font-mono text-[11px] text-[#171614] flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-[#eb4b26]" />
                          <span>Recorded on teacher console.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Slide Switcher */}
                <div className="p-4 bg-white font-mono text-xs">
                  <div className="text-[#6e6961] text-[11px] mb-2">
                    Switch slide to test behavior:
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {sampleSlides.map((s, idx) => (
                      <button
                        key={s.index}
                        type="button"
                        onClick={() => {
                          setSimSlide(idx);
                          setSelectedOption(null);
                          setIsAnswered(false);
                        }}
                        className={`py-1.5 px-2 text-center border text-[11px] transition-colors cursor-pointer ${
                          simSlide === idx
                            ? 'border-[#171614] bg-[#171614] text-white font-semibold'
                            : 'border-[#e5e0d8] hover:border-[#171614] text-[#6e6961]'
                        }`}
                      >
                        Slide {s.index}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              <div className="mt-3 font-mono text-[11px] text-[#6e6961] flex items-center gap-1.5">
                <CornerDownRight className="w-3.5 h-3.5 text-[#eb4b26]" />
                <span>Try clicking an option above to see how students respond.</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3 Simple Pillars: Crisp, Non-wordy */}
      <section className="py-14 sm:py-20 border-b border-[#e5e0d8]">
        <div className="max-w-6xl mx-auto px-6 sm:px-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
            
            <div className="border-t-2 border-[#171614] pt-5">
              <span className="font-mono text-xs text-[#eb4b26] font-semibold block mb-2">
                01 / REAL-TIME SYNC
              </span>
              <h3 className="font-serif italic text-2xl text-[#171614] mb-2">
                Zero lag across thirty screens.
              </h3>
              <p className="text-xs text-[#6e6961] leading-relaxed">
                When you advance a slide, every student device moves at the exact same moment. No extensions, accounts, or logins needed.
              </p>
            </div>

            <div className="border-t-2 border-[#171614] pt-5">
              <span className="font-mono text-xs text-[#eb4b26] font-semibold block mb-2">
                02 / CHECKPOINT LOCK
              </span>
              <h3 className="font-serif italic text-2xl text-[#171614] mb-2">
                Screens freeze until they answer.
              </h3>
              <p className="text-xs text-[#6e6961] leading-relaxed">
                Question slides lock student screens until their response is submitted, with real-time participation tracking on the podium.
              </p>
            </div>

            <div className="border-t-2 border-[#171614] pt-5">
              <span className="font-mono text-xs text-[#eb4b26] font-semibold block mb-2">
                03 / CLEAN CSV EXPORT
              </span>
              <h3 className="font-serif italic text-2xl text-[#171614] mb-2">
                Instant gradebook at the bell.
              </h3>
              <p className="text-xs text-[#6e6961] leading-relaxed">
                Download a clean spreadsheet with student names, answer choices, scores, and tab-focus flags ready for your gradebook.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Simple CTA Bar */}
      <section className="py-14 sm:py-16 bg-[#171614] text-white">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h2 className="font-serif italic text-3xl sm:text-4xl text-white mb-1">
              Start your next lesson in ten seconds.
            </h2>
            <p className="font-mono text-xs text-[#a09a8f]">
              Pick an existing presentation or build one slide by slide.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('/dashboard')}
              className="px-5 py-2.5 bg-[#eb4b26] hover:bg-[#cb3815] text-white font-mono text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer"
            >
              Open Studio
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/games')}
              className="px-5 py-2.5 border border-white/30 hover:border-white text-white font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Review Games
            </button>
          </div>
        </div>
      </section>

      {/* Simple Minimal Footer */}
      <footer className="py-8 bg-[#faf8f5] text-xs font-mono text-[#6e6961]">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif italic text-lg text-[#171614]">ClassLock</span>
            <span className="text-[#a09a8f]">/</span>
            <span>Handcrafted classroom sync</span>
          </div>

          <div className="flex items-center gap-6 text-[11px] text-[#a09a8f]">
            <button onClick={() => onNavigate('/dashboard')} className="hover:text-[#171614] uppercase cursor-pointer">
              Presentations
            </button>
            <button onClick={() => onNavigate('/games')} className="hover:text-[#171614] uppercase cursor-pointer">
              Games
            </button>
            <button onClick={() => onNavigate('/join')} className="hover:text-[#171614] uppercase cursor-pointer">
              Join
            </button>
          </div>
        </div>
      </footer>

      {/* Slide Import Modal */}
      <SlideImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
};
