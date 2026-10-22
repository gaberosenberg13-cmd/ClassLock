import React, { useState, useEffect } from 'react';
import {
  Presentation,
  Slide,
  Question,
  QuestionType,
  QuestionOption,
} from '../types/index.ts';
import {
  Save,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Image as ImageIcon,
  HelpCircle,
  Play,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Sparkles,
  Upload,
  Layers,
  Download,
} from 'lucide-react';
import { sessionStore } from '../services/storage.ts';
import { SlideImportModal } from '../components/SlideImportModal.tsx';
import { downloadDeckAsJson, ImportedDeckResult } from '../services/slideImporter.ts';

interface SlideEditorPageProps {
  presentationId: string;
  onNavigate: (route: string) => void;
  onStartSession: (presentationId: string) => void;
}

const STOCK_IMAGES = [
  { label: 'Deep Space Planets', url: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Biology Microscope', url: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=1200&q=80' },
  { label: 'DNA Double Helix', url: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Laboratory Science', url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Classroom & Books', url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Historical Map', url: 'https://images.unsplash.com/photo-1524654458049-e36be0721fa2?auto=format&fit=crop&w=1200&q=80' },
];

export const SlideEditorPage: React.FC<SlideEditorPageProps> = ({
  presentationId,
  onNavigate,
  onStartSession,
}) => {
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [hasSavedToast, setHasSavedToast] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  useEffect(() => {
    const pres = sessionStore.getPresentationById(presentationId);
    if (pres) {
      setPresentation(JSON.parse(JSON.stringify(pres)));
    } else {
      onNavigate('/dashboard');
    }
  }, [presentationId, onNavigate]);

  const handleImportComplete = (imported: ImportedDeckResult) => {
    if (!presentation) return;
    const startIndex = presentation.slides.length;
    const mergedSlides = [...presentation.slides, ...imported.slides];
    const updatedPres: Presentation = {
      ...presentation,
      slides: mergedSlides,
      updatedAt: new Date().toISOString(),
    };
    setPresentation(updatedPres);
    sessionStore.savePresentation(updatedPres);
    setSelectedSlideIndex(startIndex);
    setHasSavedToast(true);
    setTimeout(() => setHasSavedToast(false), 2500);
  };

  if (!presentation) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Loading presentation editor...
      </div>
    );
  }

  const currentSlide = presentation.slides[selectedSlideIndex] || presentation.slides[0];

  const handleSave = () => {
    if (!presentation) return;
    sessionStore.savePresentation(presentation);
    setHasSavedToast(true);
    setTimeout(() => setHasSavedToast(false), 2000);
  };

  const handleUpdateCurrentSlide = (updates: Partial<Slide>) => {
    setPresentation(prev => {
      if (!prev) return null;
      const updatedSlides = [...prev.slides];
      updatedSlides[selectedSlideIndex] = {
        ...updatedSlides[selectedSlideIndex],
        ...updates,
      };
      return { ...prev, slides: updatedSlides };
    });
  };

  const handleAddSlide = () => {
    const newSlide: Slide = {
      id: `slide-${Date.now()}`,
      title: 'New Key Concept',
      content: ['Introduce foundational idea or definition.', 'Engage students with a discussion prompt.'],
    };
    setPresentation(prev => {
      if (!prev) return null;
      return {
        ...prev,
        slides: [...prev.slides, newSlide],
      };
    });
    setSelectedSlideIndex(presentation.slides.length);
  };

  const handleDeleteSlide = (index: number) => {
    if (presentation.slides.length <= 1) {
      alert('A presentation must have at least one slide.');
      return;
    }
    setPresentation(prev => {
      if (!prev) return null;
      const newSlides = prev.slides.filter((_, i) => i !== index);
      return {
        ...prev,
        slides: newSlides,
      };
    });
    setSelectedSlideIndex(Math.max(0, selectedSlideIndex - 1));
  };

  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= presentation.slides.length) return;

    setPresentation(prev => {
      if (!prev) return null;
      const slides = [...prev.slides];
      const temp = slides[index];
      slides[index] = slides[targetIndex];
      slides[targetIndex] = temp;
      return { ...prev, slides };
    });
    setSelectedSlideIndex(targetIndex);
  };

  const handleBulletChange = (idx: number, text: string) => {
    const newContent = [...currentSlide.content];
    newContent[idx] = text;
    handleUpdateCurrentSlide({ content: newContent });
  };

  const handleAddBullet = () => {
    handleUpdateCurrentSlide({ content: [...currentSlide.content, 'New bullet point'] });
  };

  const handleRemoveBullet = (idx: number) => {
    const newContent = currentSlide.content.filter((_, i) => i !== idx);
    handleUpdateCurrentSlide({ content: newContent });
  };

  const handleToggleQuestion = () => {
    if (currentSlide.question) {
      handleUpdateCurrentSlide({ question: undefined });
    } else {
      const defaultQ: Question = {
        id: `q-${Date.now()}`,
        type: 'multiple_choice',
        prompt: 'Check for understanding question:',
        points: 10,
        timeLimitSeconds: 30,
        options: [
          { id: 'opt-1', text: 'Correct Answer', isCorrect: true },
          { id: 'opt-2', text: 'Alternative Option B', isCorrect: false },
          { id: 'opt-3', text: 'Alternative Option C', isCorrect: false },
        ],
      };
      handleUpdateCurrentSlide({ question: defaultQ });
    }
  };

  const handleUpdateQuestion = (updates: Partial<Question>) => {
    if (!currentSlide.question) return;
    handleUpdateCurrentSlide({
      question: {
        ...currentSlide.question,
        ...updates,
      },
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          handleUpdateCurrentSlide({ imageUrl: reader.result, imageAlt: file.name });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              handleSave();
              onNavigate('/dashboard');
            }}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Back to Dashboard"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <input
              type="text"
              value={presentation.title}
              onChange={e => setPresentation({ ...presentation, title: e.target.value })}
              className="text-base font-bold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-indigo-600 focus:outline-hidden bg-transparent px-1"
            />
            <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
              <span>{presentation.subject}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{presentation.slides.length} slides</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {hasSavedToast && (
            <span className="text-xs font-mono font-semibold text-emerald-600 flex items-center gap-1 animate-fade-in mr-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Saved
            </span>
          )}

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#171614] hover:bg-[#f2ece2] text-[#171614] font-mono text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer shadow-[2px_2px_0px_0px_#171614]"
            title="Import slides from PowerPoint, Google Slides, or Markdown"
          >
            <Upload className="w-3 h-3 text-[#eb4b26]" />
            <span>Import</span>
          </button>

          <button
            onClick={() => downloadDeckAsJson(presentation)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e5e0d8] hover:border-[#171614] text-[#171614] font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
            title="Export deck as JSON file"
          >
            <Download className="w-3 h-3 text-[#6e6961]" />
            <span>Export</span>
          </button>

          <button
            onClick={handleSave}
            className="px-3.5 py-1.5 bg-white border border-[#171614] hover:bg-[#171614] hover:text-white text-[#171614] font-mono text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer"
          >
            Save Deck
          </button>

          <button
            onClick={() => {
              handleSave();
              onStartSession(presentation.id);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#eb4b26] hover:bg-[#cb3815] text-white font-mono text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer shadow-[2px_2px_0px_0px_#171614]"
          >
            <Play className="w-3 h-3 fill-white" />
            <span>Launch Live</span>
          </button>
        </div>
      </header>

      {/* Editor Body */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Sidebar: Slide Thumbnails */}
        <div className="w-full md:w-72 bg-white border-r border-[#e5e0d8] flex flex-col h-auto md:h-[calc(100vh-4rem)] p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#6e6961]">
              Slides ({presentation.slides.length})
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-[#e5e0d8] hover:border-[#171614] text-[#171614] text-[11px] font-mono uppercase transition-colors cursor-pointer"
                title="Import slides into this deck"
              >
                <Upload className="w-2.5 h-2.5 text-[#eb4b26]" />
                <span>Import</span>
              </button>
              <button
                onClick={handleAddSlide}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#171614] hover:bg-[#2d2b27] text-white text-[11px] font-mono uppercase font-semibold transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>
            </div>
          </div>

          <div className="space-y-2 flex-1">
            {presentation.slides.map((s, idx) => {
              const isSelected = idx === selectedSlideIndex;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSlideIndex(idx)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all relative group ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-500/20'
                      : 'bg-white border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-bold text-slate-400 tabular-nums">
                      #{idx + 1}
                    </span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMoveSlide(idx, 'up'); }}
                        disabled={idx === 0}
                        aria-label="Move up"
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMoveSlide(idx, 'down'); }}
                        disabled={idx === presentation.slides.length - 1}
                        aria-label="Move down"
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteSlide(idx); }}
                        aria-label="Delete"
                        className="p-1 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-900 truncate">
                    {s.title || 'Untitled Slide'}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                    {s.imageUrl && <span>Image</span>}
                    {s.imageUrl && s.question && <span aria-hidden="true">·</span>}
                    {s.question && <span className="text-amber-600 font-medium">Question</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center: Slide Content Canvas & Controls */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-4xl mx-auto w-full">
          {/* Main Slide Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8 mb-6">
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Slide Header / Title
              </label>
              <input
                type="text"
                value={currentSlide.title}
                onChange={e => handleUpdateCurrentSlide({ title: e.target.value })}
                placeholder="Slide Title..."
                className="w-full text-2xl font-bold text-slate-900 border-b border-slate-200 focus:border-indigo-600 focus:outline-hidden py-1"
              />
            </div>

            {/* Bullets / Paragraphs Editor */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Bullet Points &amp; Content
                </label>
                <button
                  type="button"
                  onClick={handleAddBullet}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Point
                </button>
              </div>

              <div className="space-y-2">
                {currentSlide.content.map((point, pIdx) => (
                  <div key={pIdx} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                    <input
                      type="text"
                      value={point}
                      onChange={e => handleBulletChange(pIdx, e.target.value)}
                      placeholder="Bullet point text..."
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveBullet(pIdx)}
                      aria-label="Remove bullet point"
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Image Selector & Uploader */}
            <div className="mb-6 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Slide Media &amp; Illustration
                </label>
                {currentSlide.imageUrl && (
                  <button
                    onClick={() => handleUpdateCurrentSlide({ imageUrl: undefined })}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove Image
                  </button>
                )}
              </div>

              {currentSlide.imageUrl && (
                <div className="rounded-xl border border-slate-200 overflow-hidden mb-3 max-h-56 bg-slate-900">
                  <img
                    src={currentSlide.imageUrl}
                    alt={currentSlide.imageAlt || 'Slide illustration'}
                    className="w-full h-52 object-cover"
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>

                <span className="text-xs text-slate-400">or presets:</span>

                {STOCK_IMAGES.map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleUpdateCurrentSlide({ imageUrl: preset.url, imageAlt: preset.label })}
                    className="px-2.5 py-1 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200 rounded-md text-xs font-medium"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Teacher Notes */}
            <div className="pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Presenter Notes (Only Visible to Teacher)
              </label>
              <textarea
                rows={2}
                value={currentSlide.notes || ''}
                onChange={e => handleUpdateCurrentSlide({ notes: e.target.value })}
                placeholder="Add talking points, pacing reminders, or questions to ask the room..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500 focus:bg-white resize-none"
              />
            </div>
          </div>

          {/* Interactive Question Builder Block */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Embedded Checkpoint Question</h3>
                  <p className="text-xs text-slate-500">
                    Push to student devices to check understanding or conduct instant polls.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleQuestion}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  currentSlide.question
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-indigo-600 text-white hover:bg-indigo-500'
                }`}
              >
                {currentSlide.question ? 'Remove Question' : '+ Add Question to Slide'}
              </button>
            </div>

            {currentSlide.question && (
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Question Type
                    </label>
                    <select
                      value={currentSlide.question.type}
                      onChange={e => {
                        const type = e.target.value as QuestionType;
                        let opts: QuestionOption[] = currentSlide.question!.options;
                        if (type === 'true_false') {
                          opts = [
                            { id: 'tf-1', text: 'True', isCorrect: true },
                            { id: 'tf-2', text: 'False', isCorrect: false },
                          ];
                        }
                        handleUpdateQuestion({ type, options: opts });
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                    >
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="true_false">True / False</option>
                      <option value="short_answer">Short Answer</option>
                      <option value="poll">Classroom Poll (No wrong answer)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Points
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={currentSlide.question.points}
                      onChange={e => handleUpdateQuestion({ points: Number(e.target.value) || 10 })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-semibold tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Timer Countdown
                    </label>
                    <select
                      value={currentSlide.question.timeLimitSeconds || 0}
                      onChange={e => handleUpdateQuestion({ timeLimitSeconds: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                    >
                      <option value={0}>Untimed (Manual close)</option>
                      <option value={15}>15 Seconds</option>
                      <option value={20}>20 Seconds</option>
                      <option value={30}>30 Seconds</option>
                      <option value={45}>45 Seconds</option>
                      <option value={60}>60 Seconds</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Question Prompt
                  </label>
                  <input
                    type="text"
                    value={currentSlide.question.prompt}
                    onChange={e => handleUpdateQuestion({ prompt: e.target.value })}
                    placeholder="Enter the question prompt..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold"
                  />
                </div>

                {(currentSlide.question.type === 'multiple_choice' || currentSlide.question.type === 'poll') && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Options {currentSlide.question.type === 'multiple_choice' && '(Mark radio for correct answer)'}
                    </label>

                    {currentSlide.question.options.map((opt, oIdx) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        {currentSlide.question!.type === 'multiple_choice' && (
                          <input
                            type="radio"
                            name="correct-option"
                            checked={!!opt.isCorrect}
                            onChange={() => {
                              const newOpts = currentSlide.question!.options.map(o => ({
                                ...o,
                                isCorrect: o.id === opt.id,
                              }));
                              handleUpdateQuestion({ options: newOpts });
                            }}
                            className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        )}
                        <input
                          type="text"
                          value={opt.text}
                          onChange={e => {
                            const newOpts = [...currentSlide.question!.options];
                            newOpts[oIdx].text = e.target.value;
                            handleUpdateQuestion({ options: newOpts });
                          }}
                          placeholder={`Option ${oIdx + 1}`}
                          className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                        />
                        {currentSlide.question!.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newOpts = currentSlide.question!.options.filter((_, i) => i !== oIdx);
                              handleUpdateQuestion({ options: newOpts });
                            }}
                            className="p-1 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        const newOpt: QuestionOption = {
                          id: `opt-${Date.now()}`,
                          text: `Option ${currentSlide.question!.options.length + 1}`,
                          isCorrect: false,
                        };
                        handleUpdateQuestion({ options: [...currentSlide.question!.options, newOpt] });
                      }}
                      className="text-xs text-indigo-600 font-semibold hover:underline"
                    >
                      + Add Option
                    </button>
                  </div>
                )}

                {currentSlide.question.type === 'short_answer' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Expected Correct Answer (Case-insensitive)
                    </label>
                    <input
                      type="text"
                      value={currentSlide.question.correctAnswerText || ''}
                      onChange={e => handleUpdateQuestion({ correctAnswerText: e.target.value })}
                      placeholder="e.g. Mitochondria, Oxygen, 1776"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Answer Explanation / Review Note
                  </label>
                  <input
                    type="text"
                    value={currentSlide.question.explanation || ''}
                    onChange={e => handleUpdateQuestion({ explanation: e.target.value })}
                    placeholder="Brief explanation of why this answer is correct..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slide Import Modal */}
      <SlideImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={handleImportComplete}
        existingPresentationTitle={presentation.title}
        isAppendingSlides={true}
      />
    </div>
  );
};
