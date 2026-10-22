import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  Link as LinkIcon,
  Sparkles,
  Check,
  AlertCircle,
  FileCode,
  Layers,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { Slide } from '../types/index.ts';
import {
  parsePptxFile,
  parseMarkdownToSlides,
  createSlidesFromGoogleSlides,
  parseJsonDeck,
  parseGoogleSlidesUrl,
  ImportedDeckResult,
} from '../services/slideImporter.ts';

interface SlideImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (result: ImportedDeckResult) => void;
  existingPresentationTitle?: string;
  isAppendingSlides?: boolean;
}

export const SlideImportModal: React.FC<SlideImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  existingPresentationTitle,
  isAppendingSlides = false,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'google' | 'text' | 'templates'>('upload');
  
  // File upload state
  const [dragActive, setDragActive] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [fileError, setFileError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Google Slides state
  const [googleUrl, setGoogleUrl] = useState('');
  const [googleTitle, setGoogleTitle] = useState(existingPresentationTitle || 'Google Slides Lecture');
  const [googleSlideCount, setGoogleSlideCount] = useState(6);
  const [googleError, setGoogleError] = useState('');

  // Paste Text state
  const [pastedText, setPastedText] = useState('');
  const [textTitle, setTextTitle] = useState(existingPresentationTitle || 'Lecture Outline');
  const [textError, setTextError] = useState('');

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    setIsLoadingFile(true);
    setFileError('');

    try {
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.pptx')) {
        const result = await parsePptxFile(file);
        onImportComplete(result);
        onClose();
      } else if (fileName.endsWith('.json')) {
        const text = await file.text();
        const result = parseJsonDeck(text);
        onImportComplete(result);
        onClose();
      } else if (fileName.endsWith('.md') || fileName.endsWith('.txt')) {
        const text = await file.text();
        const deckTitle = file.name.replace(/\.(md|txt)$/i, '');
        const result = parseMarkdownToSlides(text, deckTitle);
        onImportComplete(result);
        onClose();
      } else {
        setFileError('Unsupported file type. Please upload a PowerPoint (.pptx), Markdown (.md), Text (.txt), or ClassLock JSON (.json) file.');
      }
    } catch (err: any) {
      setFileError(err?.message || 'Failed to parse presentation file. Please check format.');
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleGoogleImport = (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleError('');

    if (!googleUrl.trim()) {
      setGoogleError('Please paste a Google Slides URL.');
      return;
    }

    const parsed = parseGoogleSlidesUrl(googleUrl.trim());
    if (!parsed) {
      setGoogleError('Invalid Google Slides URL. Expected a link like: https://docs.google.com/presentation/d/...');
      return;
    }

    const result = createSlidesFromGoogleSlides(googleTitle, googleUrl.trim(), googleSlideCount);
    onImportComplete(result);
    onClose();
  };

  const handleTextImport = (e: React.FormEvent) => {
    e.preventDefault();
    setTextError('');

    if (!pastedText.trim()) {
      setTextError('Please paste some text, bullet points, or markdown.');
      return;
    }

    const result = parseMarkdownToSlides(pastedText, textTitle);
    onImportComplete(result);
    onClose();
  };

  const handleLoadSampleOutline = (subject: 'ob' | 'biology' | 'history') => {
    if (subject === 'ob') {
      setTextTitle('OB 300: Team Dynamics & Psychological Safety');
      setPastedText(`# Foundations of Team Effectiveness
- Google Project Aristotle: Study of 180+ teams found psychological safety as factor #1
- Interpersonal risk-taking: Asking "naive" questions without fear of mockery
- High standards paired with high psychological safety creates the Learning Zone

---
# Motivation in the Workplace: Herzberg Two-Factor
- Hygiene factors (pay, safe conditions) merely reduce employee dissatisfaction
- True motivators: Autonomy, mastery, recognition, and task significance
- Daniel Pink's Drive model: Autonomy, Mastery, Purpose

Question: Which factor produces true intrinsic motivation according to Herzberg?
A) Autonomous project responsibility and growth (correct)
B) Company parking permit
C) Air-conditioned conference rooms
D) Standard company health insurance

---
# Groupthink: When Consensus Becomes Lethal
- Irving Janis analysis of NASA Challenger & Bay of Pigs failures
- Symptoms: Illusion of invulnerability, self-censorship, mindguards
- Antidotes: Appointing a formal Devil's Advocate and leader withholding their preference upfront`);
    } else if (subject === 'biology') {
      setTextTitle('Cellular Mitosis & Division');
      setPastedText(`# Cellular Mitosis & The Cell Cycle
- Interphase: Cell growth and DNA replication (G1, S, G2 phases)
- Chromatin condenses into visible chromosomes
- Centrosomes move to opposite cellular poles

---
# Mitotic Phases: Prophase to Anaphase
- Prophase: Nuclear envelope breaks down
- Metaphase: Chromosomes align along the metaphase plate
- Anaphase: Sister chromatids pulled apart by spindle fibers

Question: During which phase do sister chromatids separate?
A) Anaphase (correct)
B) Metaphase
C) Telophase
D) Prophase

---
# Telophase & Cytokinesis
- Nuclear membranes re-form around daughter nuclei
- Cleavage furrow pinches animal cells into two distinct cells
- Cell cycle regulation checkpoints ensure genetic fidelity`);
    } else {
      setTextTitle('The American Revolution');
      setPastedText(`# Causes of the Revolutionary War
- Stamp Act of 1765 and taxation without representation
- Boston Massacre (1770) and Boston Tea Party (1773)
- Passage of the Intolerable Acts uniting colonial resistance

---
# The Declaration of Independence (1776)
- Authored primarily by Thomas Jefferson in Philadelphia
- Enumeration of natural rights and governmental grievances
- Formal separation from Great Britain

Question: Who was the primary author of the Declaration of Independence?
A) Thomas Jefferson (correct)
B) Benjamin Franklin
C) John Adams
D) George Washington

---
# Decisive Battles & The Treaty of Paris
- Battle of Saratoga (1777): French alliance secured
- Siege of Yorktown (1781): General Cornwallis surrenders
- Treaty of Paris (1783): Britain recognizes American sovereignty`);
    }
  };

  const handleLoadTemplate = (templateId: string) => {
    if (templateId === 'ob') {
      onImportComplete({
        title: 'Organizational Behavior: Motivation, Safety & Culture',
        subject: 'Organizational Behavior',
        description: 'Core OB frameworks: Maslow & Herzberg, Amy Edmondson psychological safety, and Groupthink avoidance.',
        slides: [
          {
            id: 'tpl-ob-1',
            title: 'What Is Organizational Behavior?',
            content: [
              'The systematic study of individual actions, group interactions, and systemic structures within organizations.',
              'Micro Level: Individual personality, motivation, cognition, and perception.',
              'Meso Level: Team dynamics, psychological safety, and conflict resolution.',
              'Macro Level: Organizational culture, power structures, and strategic change.',
            ],
            imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
          },
          {
            id: 'tpl-ob-2',
            title: 'Amy Edmondson: Psychological Safety',
            content: [
              'Shared belief that a team is safe for interpersonal risk-taking.',
              'Team members feel comfortable sharing early mistakes, candid feedback, and unpolished ideas.',
              'Google Project Aristotle identified it as the #1 predictor of team effectiveness.',
            ],
            imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80',
            question: {
              id: 'q-tpl-ob-1',
              type: 'true_false',
              prompt: 'True or False: Psychological safety requires relaxing performance expectations so teams avoid stress.',
              points: 10,
              options: [
                { id: 'ob-tf-1', text: 'True', isCorrect: false },
                { id: 'ob-tf-2', text: 'False', isCorrect: true },
              ],
              explanation: 'False! True psychological safety pairs high accountability with psychological safety to build a high-performance learning zone.',
            },
          },
          {
            id: 'tpl-ob-3',
            title: 'Group Decision Traps: Janis Groupthink',
            content: [
              'When the drive for consensus suppresses realistic evaluation of alternative courses of action.',
              'Classic symptoms: Illusion of invulnerability, self-censorship, and pressure on dissenters.',
              'Remedies: Assigning a formal Devil’s Advocate and holding second-chance reviews.',
            ],
            imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
          },
        ],
      });
    } else if (templateId === 'physics') {
      onImportComplete({
        title: 'Quantum Physics: Wave-Particle Duality',
        subject: 'Physics',
        description: 'Synchronized study of photoelectric effect and de Broglie wavelengths.',
        slides: [
          {
            id: `tpl-1`,
            title: 'The Photoelectric Effect',
            content: [
              'Discovered by Heinrich Hertz and explained by Albert Einstein in 1905.',
              'Light incident on metal surfaces ejects electrons only above a threshold frequency.',
              'Proved that electromagnetic energy is quantized into discrete packets (photons).',
            ],
            imageUrl: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=1200&q=80',
          },
          {
            id: `tpl-2`,
            title: 'Checkpoint: Photon Frequency',
            content: ['Review of Planck-Einstein relation E = hf.'],
            question: {
              id: `q-tpl-1`,
              type: 'multiple_choice',
              prompt: 'If the frequency of incident light is doubled, what happens to individual photon energy?',
              points: 10,
              options: [
                { id: 'opt-a', text: 'It doubles (E = hf)', isCorrect: true },
                { id: 'opt-b', text: 'It remains constant', isCorrect: false },
                { id: 'opt-c', text: 'It is quadrupled', isCorrect: false },
              ],
            },
          },
          {
            id: `tpl-3`,
            title: 'De Broglie Matter Waves',
            content: [
              'Louis de Broglie hypothesized that all matter possesses wave-like properties: λ = h / p.',
              'Confirmed experimentally by Davisson and Germer electron diffraction.',
            ],
          },
        ],
      });
    } else {
      onImportComplete({
        title: 'Computer Science: Algorithms & Big-O',
        subject: 'Computer Science',
        description: 'Analyzing computational efficiency, sorting algorithms, and space-time complexity.',
        slides: [
          {
            id: `tpl-cs-1`,
            title: 'Algorithmic Efficiency & Big-O Notation',
            content: [
              'Big-O describes the asymptotic worst-case execution time of an algorithm.',
              'Constant O(1), Logarithmic O(log n), Linear O(n), and Quadratic O(n²).',
              'Dominant terms dictate behavior as input size n approaches infinity.',
            ],
            imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
          },
          {
            id: `tpl-cs-2`,
            title: 'Checkpoint: Binary Search Complexity',
            content: ['Halving search space at each iteration.'],
            question: {
              id: `q-tpl-cs-1`,
              type: 'multiple_choice',
              prompt: 'What is the worst-case time complexity of binary search on a sorted array of n items?',
              points: 10,
              options: [
                { id: 'cs-a', text: 'O(log n)', isCorrect: true },
                { id: 'cs-b', text: 'O(n)', isCorrect: false },
                { id: 'cs-c', text: 'O(n²)', isCorrect: false },
              ],
            },
          },
        ],
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 sm:p-6 overflow-y-auto font-normal">
      <div className="bg-[#faf8f5] text-[#171614] border border-[#171614] shadow-[8px_8px_0px_0px_#171614] w-full max-w-2xl my-8 overflow-hidden">
        
        {/* Modal Top Bar */}
        <div className="bg-[#171614] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#eb4b26]" />
            <span className="font-mono text-xs uppercase tracking-wider font-semibold">
              {isAppendingSlides ? 'Import Additional Slides' : 'Import Slide Deck'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#a09a8f] hover:text-white transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#e5e0d8] bg-white font-mono text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-5 py-3 border-r border-[#e5e0d8] flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'upload'
                ? 'bg-[#faf8f5] text-[#171614] font-semibold border-b-2 border-b-[#eb4b26]'
                : 'text-[#6e6961] hover:text-[#171614]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>PowerPoint / Files</span>
          </button>

          <button
            onClick={() => setActiveTab('google')}
            className={`px-5 py-3 border-r border-[#e5e0d8] flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'google'
                ? 'bg-[#faf8f5] text-[#171614] font-semibold border-b-2 border-b-[#eb4b26]'
                : 'text-[#6e6961] hover:text-[#171614]'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5 text-[#eb4b26]" />
            <span>Google Slides URL</span>
          </button>

          <button
            onClick={() => setActiveTab('text')}
            className={`px-5 py-3 border-r border-[#e5e0d8] flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'text'
                ? 'bg-[#faf8f5] text-[#171614] font-semibold border-b-2 border-b-[#eb4b26]'
                : 'text-[#6e6961] hover:text-[#171614]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Paste Outline / Markdown</span>
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            className={`px-5 py-3 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'templates'
                ? 'bg-[#faf8f5] text-[#171614] font-semibold border-b-2 border-b-[#eb4b26]'
                : 'text-[#6e6961] hover:text-[#171614]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Pre-made Decks</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 sm:p-8">
          
          {/* TAB 1: FILE UPLOAD (.pptx, .json, .md, .txt) */}
          {activeTab === 'upload' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-serif italic text-2xl text-[#171614] mb-1">
                  Upload PowerPoint or Slide Files
                </h3>
                <p className="font-mono text-xs text-[#6e6961]">
                  Select or drag in a .pptx, .md, or .json file. Slides and bullet points are extracted instantly in your browser.
                </p>
              </div>

              {/* Drag & Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                  dragActive
                    ? 'border-[#eb4b26] bg-[#faf8f5]'
                    : 'border-[#d0c9bd] hover:border-[#171614] bg-white'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pptx,.md,.txt,.json"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-sm bg-[#faf8f5] border border-[#e5e0d8] flex items-center justify-center text-[#171614]">
                    <Upload className="w-5 h-5 text-[#eb4b26]" />
                  </div>

                  <div>
                    <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#171614]">
                      {isLoadingFile ? 'Parsing presentation slides...' : 'Click to browse or drop file here'}
                    </span>
                    <p className="font-mono text-[11px] text-[#6e6961] mt-1">
                      Supports PowerPoint (.pptx), Markdown (.md), Plain Text (.txt), and ClassLock (.json)
                    </p>
                  </div>
                </div>
              </div>

              {fileError && (
                <div className="p-3 bg-white border border-[#eb4b26] font-mono text-xs text-[#eb4b26] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{fileError}</span>
                </div>
              )}

              <div className="border-t border-[#e5e0d8] pt-4 font-mono text-[11px] text-[#6e6961] flex items-center justify-between">
                <span>100% Client-side · No cloud upload or telemetry</span>
                <span className="text-[#171614]">Instant Extraction</span>
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE SLIDES URL */}
          {activeTab === 'google' && (
            <form onSubmit={handleGoogleImport} className="space-y-5">
              <div>
                <h3 className="font-serif italic text-2xl text-[#171614] mb-1">
                  Import from Google Slides
                </h3>
                <p className="font-mono text-xs text-[#6e6961]">
                  Paste a share link or edit link from Google Slides. Generates a live synchronized deck with checkpoint gates.
                </p>
              </div>

              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-[#6e6961] mb-1.5">
                  Google Slides URL
                </label>
                <input
                  type="url"
                  value={googleUrl}
                  onChange={e => { setGoogleUrl(e.target.value); setGoogleError(''); }}
                  placeholder="https://docs.google.com/presentation/d/1BxiMVs0XRA5n.../edit"
                  className="w-full px-3.5 py-2.5 font-mono text-xs bg-white border border-[#e5e0d8] focus:border-[#eb4b26] text-[#171614] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-[#6e6961] mb-1.5">
                    Presentation Title
                  </label>
                  <input
                    type="text"
                    value={googleTitle}
                    onChange={e => setGoogleTitle(e.target.value)}
                    placeholder="e.g. History Lecture 4"
                    className="w-full px-3.5 py-2.5 font-sans text-xs bg-white border border-[#e5e0d8] focus:border-[#eb4b26] text-[#171614] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-[#6e6961] mb-1.5">
                    Estimated Slide Count
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={googleSlideCount}
                    onChange={e => setGoogleSlideCount(parseInt(e.target.value, 10) || 5)}
                    className="w-full px-3.5 py-2.5 font-mono text-xs bg-white border border-[#e5e0d8] focus:border-[#eb4b26] text-[#171614] focus:outline-hidden"
                  />
                </div>
              </div>

              {googleError && (
                <div className="p-3 bg-white border border-[#eb4b26] font-mono text-xs text-[#eb4b26]">
                  {googleError}
                </div>
              )}

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setGoogleUrl('https://docs.google.com/presentation/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit');
                    setGoogleTitle('Sample Astronomy Lecture');
                  }}
                  className="font-mono text-xs text-[#eb4b26] underline hover:text-[#cb3815] cursor-pointer"
                >
                  Use sample Google Slides URL
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#eb4b26] hover:bg-[#cb3815] text-white font-mono text-xs uppercase tracking-wider font-semibold transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span>Generate Deck</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: PASTE OUTLINE / MARKDOWN */}
          {activeTab === 'text' && (
            <form onSubmit={handleTextImport} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif italic text-2xl text-[#171614] mb-1">
                    Paste Lecture Outline or Markdown
                  </h3>
                  <p className="font-mono text-xs text-[#6e6961]">
                    Paste formatted notes or markdown. Use <code className="text-[#171614] font-semibold">---</code> between slides.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => handleLoadSampleOutline('ob')}
                    className="text-[#eb4b26] font-semibold underline hover:text-[#cb3815] cursor-pointer"
                  >
                    Sample OB (Team Dynamics)
                  </button>
                  <span className="text-[#d0c9bd]">·</span>
                  <button
                    type="button"
                    onClick={() => handleLoadSampleOutline('biology')}
                    className="text-[#6e6961] underline hover:text-[#171614] cursor-pointer"
                  >
                    Bio
                  </button>
                  <span className="text-[#d0c9bd]">·</span>
                  <button
                    type="button"
                    onClick={() => handleLoadSampleOutline('history')}
                    className="text-[#6e6961] underline hover:text-[#171614] cursor-pointer"
                  >
                    History
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-[#6e6961] mb-1.5">
                  Deck Title
                </label>
                <input
                  type="text"
                  value={textTitle}
                  onChange={e => setTextTitle(e.target.value)}
                  placeholder="Lecture Title"
                  className="w-full px-3.5 py-2 font-sans text-xs bg-white border border-[#e5e0d8] focus:border-[#eb4b26] text-[#171614] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-[#6e6961] mb-1.5">
                  Slide Content (Markdown or Raw Text)
                </label>
                <textarea
                  rows={8}
                  value={pastedText}
                  onChange={e => { setPastedText(e.target.value); setTextError(''); }}
                  placeholder={`# Slide 1 Title\n- First key point\n- Second point\n\n---\n# Slide 2: Interactive Question\n- Context for question\n\nQuestion: Which choice is correct?\nA) First answer (correct)\nB) Second answer`}
                  className="w-full p-3 font-mono text-xs bg-white border border-[#e5e0d8] focus:border-[#eb4b26] text-[#171614] focus:outline-hidden leading-relaxed"
                />
              </div>

              {textError && (
                <div className="p-3 bg-white border border-[#eb4b26] font-mono text-xs text-[#eb4b26]">
                  {textError}
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#eb4b26] hover:bg-[#cb3815] text-white font-mono text-xs uppercase tracking-wider font-semibold transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span>Build Slides from Text</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: PRE-MADE DECK TEMPLATES */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-serif italic text-2xl text-[#171614] mb-1">
                  Start with a Pre-made Classroom Deck
                </h3>
                <p className="font-mono text-xs text-[#6e6961]">
                  Instantly load a fully structured presentation with synchronized slides and integrated checkpoint questions.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => handleLoadTemplate('ob')}
                  className="text-left p-5 bg-white border border-[#171614] hover:shadow-[4px_4px_0px_0px_#171614] transition-all cursor-pointer flex flex-col justify-between sm:col-span-2 bg-[#faf8f5]"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] uppercase text-[#eb4b26] font-semibold">
                        ORGANIZATIONAL BEHAVIOR · 3 SLIDES · CASE CHECKS
                      </span>
                      <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 bg-[#eb4b26] text-white font-semibold">
                        Recommended
                      </span>
                    </div>
                    <h4 className="font-serif italic text-2xl text-[#171614] mb-2">
                      Organizational Behavior: Motivation, Safety & Culture
                    </h4>
                    <p className="text-xs text-[#6e6961] leading-relaxed mb-4">
                      Micro/Meso/Macro OB levels, Amy Edmondson’s psychological safety checkpoint, and Janis Groupthink decision traps.
                    </p>
                  </div>
                  <span className="font-mono text-xs text-[#171614] font-semibold flex items-center gap-1 text-[#eb4b26]">
                    Load OB Deck <ArrowRight className="w-3 h-3" />
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleLoadTemplate('physics')}
                  className="text-left p-5 bg-white border border-[#171614] hover:shadow-[4px_4px_0px_0px_#171614] transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <span className="font-mono text-[10px] uppercase text-[#eb4b26] font-semibold block mb-1">
                      PHYSICS · 3 SLIDES
                    </span>
                    <h4 className="font-serif italic text-xl text-[#171614] mb-2">
                      Quantum Physics: Wave-Particle Duality
                    </h4>
                    <p className="text-xs text-[#6e6961] leading-relaxed mb-4">
                      Photoelectric effect, photon quantization, and De Broglie matter waves with question gate.
                    </p>
                  </div>
                  <span className="font-mono text-xs text-[#171614] font-semibold flex items-center gap-1">
                    Load Deck <ArrowRight className="w-3 h-3" />
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleLoadTemplate('cs')}
                  className="text-left p-5 bg-white border border-[#171614] hover:shadow-[4px_4px_0px_0px_#171614] transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <span className="font-mono text-[10px] uppercase text-[#eb4b26] font-semibold block mb-1">
                      COMPUTER SCIENCE · 2 SLIDES
                    </span>
                    <h4 className="font-serif italic text-xl text-[#171614] mb-2">
                      Algorithms & Big-O Notation
                    </h4>
                    <p className="text-xs text-[#6e6961] leading-relaxed mb-4">
                      Asymptotic analysis, worst-case execution time, and binary search complexity check.
                    </p>
                  </div>
                  <span className="font-mono text-xs text-[#171614] font-semibold flex items-center gap-1">
                    Load Deck <ArrowRight className="w-3 h-3" />
                  </span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
