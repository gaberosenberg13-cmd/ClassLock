import React, { useState } from 'react';
import {
  Presentation,
  TeacherProfile,
} from '../types/index.ts';
import {
  Plus,
  Play,
  Edit3,
  Trash2,
  X,
  Upload,
  Download,
} from 'lucide-react';
import { sessionStore } from '../services/storage.ts';
import { SlideImportModal } from '../components/SlideImportModal.tsx';
import { downloadDeckAsJson, ImportedDeckResult } from '../services/slideImporter.ts';

interface DashboardPageProps {
  teacher: TeacherProfile | null;
  onNavigate: (route: string) => void;
  onStartSession: (presentationId: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  teacher,
  onNavigate,
  onStartSession,
}) => {
  const [presentations, setPresentations] = useState<Presentation[]>(() =>
    sessionStore.getPresentations()
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('General Science');
  const [newDescription, setNewDescription] = useState('');

  const refreshList = () => {
    setPresentations(sessionStore.getPresentations());
  };

  const handleImportComplete = (imported: ImportedDeckResult) => {
    const newPres: Presentation = {
      id: `pres-${Date.now()}`,
      teacherId: teacher?.id || 'teacher-demo-1',
      title: imported.title || 'Imported Presentation',
      subject: imported.subject || 'General',
      description: imported.description || `Imported deck with ${imported.slides.length} slides.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      slides: imported.slides,
    };

    sessionStore.savePresentation(newPres);
    refreshList();
    onNavigate(`/presentations/${newPres.id}/edit`);
  };

  const handleCreatePresentation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newPres: Presentation = {
      id: `pres-${Date.now()}`,
      teacherId: teacher?.id || 'teacher-demo-1',
      title: newTitle.trim(),
      subject: newSubject.trim(),
      description: newDescription.trim() || 'Classroom slide presentation with interactive checkpoints.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      slides: [
        {
          id: `slide-${Date.now()}-1`,
          title: 'Introduction & Key Objectives',
          content: [
            'Welcome to today\'s lesson.',
            'Please enter fullscreen mode to maintain attendance credit.',
            'Keep an eye out for interactive questions.',
          ],
          imageUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80',
          imageAlt: 'School books and learning materials',
        },
        {
          id: `slide-${Date.now()}-2`,
          title: 'Core Concepts & Definition',
          content: [
            'Break down foundational principles.',
            'Connect ideas to previous modules.',
          ],
          question: {
            id: `q-${Date.now()}`,
            type: 'multiple_choice',
            prompt: 'Which of the following best describes this foundational concept?',
            points: 10,
            timeLimitSeconds: 30,
            options: [
              { id: 'opt-a', text: 'Option A (Core principle)', isCorrect: true },
              { id: 'opt-b', text: 'Option B (Secondary factor)', isCorrect: false },
              { id: 'opt-c', text: 'Option C (Unrelated element)', isCorrect: false },
            ],
          },
        },
      ],
    };

    sessionStore.savePresentation(newPres);
    refreshList();
    setIsCreateModalOpen(false);
    setNewTitle('');
    setNewDescription('');
    onNavigate(`/presentations/${newPres.id}/edit`);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this presentation?')) {
      sessionStore.deletePresentation(id);
      refreshList();
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#171614] py-14 px-6 sm:px-10">
      <div className="max-w-5xl mx-auto">
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10 pb-6 border-b border-[#e5e0d8]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-[#eb4b26] uppercase tracking-widest">§ Instructor Archive</span>
              <span className="text-[#a09a8f]">/</span>
              <span className="font-mono text-xs text-[#6e6961]">Active Decks</span>
            </div>
            <h1 className="font-serif italic text-3xl sm:text-4xl text-[#171614] tracking-tight">
              Classroom Presentations
            </h1>
            <p className="text-xs font-mono text-[#6e6961] mt-1">
              Author slides, establish checkpoint gates, and broadcast synchronously.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-[#171614] hover:bg-[#f2ece2] text-[#171614] font-mono text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer shadow-[2px_2px_0px_0px_#171614]"
            >
              <Upload className="w-3.5 h-3.5 text-[#eb4b26]" />
              <span>Import Slides</span>
            </button>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#eb4b26] hover:bg-[#cb3815] text-white font-mono text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer shadow-[2px_2px_0px_0px_#171614]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Presentation</span>
            </button>
          </div>
        </div>

        {/* Presentations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {presentations.map(pres => {
            const questionCount = pres.slides.reduce(
              (acc, s) => acc + (s.question ? 1 : 0),
              0
            );

            return (
              <div
                key={pres.id}
                className="bg-white border border-[#171614] shadow-[4px_4px_0px_0px_#171614] p-6 sm:p-7 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-3 pb-2 border-b border-[#e5e0d8]">
                    <span className="text-[#171614] font-semibold uppercase">
                      [{pres.subject || 'GENERAL'}]
                    </span>
                    <span className="text-[#6e6961] text-[11px]">
                      {pres.slides.length} slides · {questionCount} questions
                    </span>
                  </div>

                  <h3 className="font-serif italic text-2xl text-[#171614] mb-2">
                    {pres.title}
                  </h3>
                  <p className="text-xs text-[#3d3a34] font-normal line-clamp-2 leading-relaxed mb-6">
                    {pres.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#f0ede6] flex items-center justify-between gap-2.5">
                  <button
                    onClick={() => onStartSession(pres.id)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-[#171614] hover:bg-[#2e2c28] text-white font-mono text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Launch Live</span>
                  </button>

                  <button
                    onClick={() => onNavigate(`/presentations/${pres.id}/edit`)}
                    aria-label={`Edit ${pres.title}`}
                    className="p-2 border border-[#e5e0d8] text-[#171614] hover:border-[#171614] transition-colors cursor-pointer"
                    title="Edit Slides"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => downloadDeckAsJson(pres)}
                    aria-label={`Export ${pres.title} as JSON`}
                    className="p-2 border border-[#e5e0d8] text-[#171614] hover:border-[#171614] transition-colors cursor-pointer"
                    title="Download Deck (.json)"
                  >
                    <Download className="w-3.5 h-3.5 text-[#6e6961]" />
                  </button>

                  <button
                    onClick={(e) => handleDelete(pres.id, e)}
                    aria-label={`Delete ${pres.title}`}
                    className="p-2 border border-[#e5e0d8] text-[#6e6961] hover:text-[#eb4b26] hover:border-[#eb4b26] transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Create Presentation Modal */}
        {isCreateModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-pres-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-xs p-4 animate-in fade-in"
          >
            <div className="relative w-full max-w-md bg-white rounded-2xl border border-zinc-200 p-8 shadow-xl">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                aria-label="Close modal"
                className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 id="create-pres-title" className="text-lg font-semibold text-zinc-950 mb-1">
                New Presentation
              </h3>
              <p className="text-xs text-zinc-500 font-normal mb-6">
                Add slides and embedded questions in the editor.
              </p>

              <form onSubmit={handleCreatePresentation} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Molecular Chemistry & Bonding"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-zinc-300 rounded-lg text-sm font-normal focus:outline-hidden focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Subject / Course
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AP Chemistry"
                    value={newSubject}
                    onChange={e => setNewSubject(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-zinc-300 rounded-lg text-sm font-normal focus:outline-hidden focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Brief description..."
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-zinc-300 rounded-lg text-sm font-normal focus:outline-hidden focus:border-blue-600 resize-none"
                  />
                </div>

                <div className="pt-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setIsImportModalOpen(true);
                    }}
                    className="font-mono text-xs text-[#eb4b26] underline hover:text-[#cb3815] cursor-pointer"
                  >
                    or Import from PPTX / Google Slides
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="px-3 py-1.5 text-zinc-500 hover:text-zinc-800 text-xs font-normal"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#eb4b26] hover:bg-[#cb3815] text-white font-mono text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer"
                    >
                      Create Deck
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Slide Import Modal */}
        <SlideImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImportComplete={handleImportComplete}
        />
      </div>
    </div>
  );
};
