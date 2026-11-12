import JSZip from 'jszip';
import type { Slide, Question, QuestionOption } from '../types/index.ts';

export interface ImportedDeckResult {
  title: string;
  subject?: string;
  description?: string;
  slides: Slide[];
}

/**
 * Extracts Google Slides ID from URL and builds standard embed & preview URLs.
 */
export function parseGoogleSlidesUrl(inputUrl: string): {
  docId: string;
  embedUrl: string;
  viewUrl: string;
  isPublished: boolean;
} | null {
  if (!inputUrl || typeof inputUrl !== 'string') return null;
  const trimmed = inputUrl.trim();

  // Pattern 1: Published to web link (/d/e/2PACX-.../pub)
  const pubMatch = trimmed.match(/\/presentation\/d\/e\/([a-zA-Z0-9_-]+)/);
  if (pubMatch && pubMatch[1]) {
    const pubId = pubMatch[1];
    return {
      docId: pubId,
      embedUrl: `https://docs.google.com/presentation/d/e/${pubId}/embed?start=false&loop=false&delayms=3000`,
      viewUrl: `https://docs.google.com/presentation/d/e/${pubId}/pub`,
      isPublished: true,
    };
  }

  // Pattern 2: Standard presentation link (/d/<id>/...)
  const docMatch = trimmed.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch && docMatch[1]) {
    const docId = docMatch[1];
    return {
      docId,
      embedUrl: `https://docs.google.com/presentation/d/${docId}/embed?start=false&loop=false&delayms=3000`,
      viewUrl: `https://docs.google.com/presentation/d/${docId}/edit`,
      isPublished: false,
    };
  }

  return null;
}

/**
 * Ensures a Google Slides embed URL targets the exact 1-indexed slide number.
 * Appends or updates `slide=N` parameter so both teacher and student iframes
 * display the exact synchronized slide.
 */
export function getSlideEmbedUrl(baseEmbedUrl: string | undefined, slideIndex: number): string {
  if (!baseEmbedUrl) return '';
  const targetSlideNum = Math.max(1, slideIndex + 1);
  try {
    const url = new URL(baseEmbedUrl);
    url.searchParams.set('slide', String(targetSlideNum));
    return url.toString();
  } catch {
    if (baseEmbedUrl.includes('?')) {
      const clean = baseEmbedUrl.replace(/([?&])slide=[^&]*/, '');
      const separator = clean.includes('?') ? '&' : '?';
      return `${clean}${separator}slide=${targetSlideNum}`;
    }
    return `${baseEmbedUrl}?slide=${targetSlideNum}`;
  }
}

/**
 * Creates slides from a Google Slides URL.
 * Generates initial structured deck with the Google Slides embed reference and checkpoint placeholders.
 */
export function createSlidesFromGoogleSlides(
  title: string,
  url: string,
  slideCount: number = 5,
  topicContext: string = ''
): ImportedDeckResult {
  const parsed = parseGoogleSlidesUrl(url);
  const baseEmbedUrl = parsed ? parsed.embedUrl : url;
  const viewUrl = parsed ? parsed.viewUrl : url;

  const slides: Slide[] = [];
  const safeCount = Math.max(1, Math.min(30, slideCount));
  const effectiveTitle = title.trim() || 'Imported Google Slides';

  for (let i = 1; i <= safeCount; i++) {
    const isQuestionSlide = i === Math.ceil(safeCount / 2);
    const sectionTopic = topicContext ? ` — ${topicContext}` : '';
    const slide: Slide = {
      id: `gslide-${Date.now()}-${i}`,
      title: i === 1 ? effectiveTitle : `Section ${i}: ${effectiveTitle}${sectionTopic}`,
      content: [
        `Google Slides Synced View · Slide ${i} of ${safeCount}`,
        topicContext ? `Topic: ${topicContext}` : 'Synchronized lecture presentation from Google Slides.',
        i === 1 ? 'Embedded presentation via Google Slides integration.' : 'Slide navigation locked to instructor broadcast.',
      ],
      notes: `Google Slides Link: ${url}${topicContext ? ` | Context: ${topicContext}` : ''}`,
      embedUrl: getSlideEmbedUrl(baseEmbedUrl, i - 1),
      sourceUrl: viewUrl,
    };

    if (isQuestionSlide) {
      slide.question = {
        id: `gq-${Date.now()}-${i}`,
        type: 'multiple_choice',
        prompt: `Comprehension Check: What is the primary focus of "${effectiveTitle}" in this section?`,
        points: 10,
        options: [
          { id: 'opt-1', text: 'Core theoretical principle and key mechanisms', isCorrect: true },
          { id: 'opt-2', text: 'Incidental background anecdote', isCorrect: false },
          { id: 'opt-3', text: 'Non-applicable counter-argument', isCorrect: false },
        ],
        explanation: 'Active recall checkpoint ensuring class alignment before advancing.',
      };
    }

    slides.push(slide);
  }

  return {
    title: effectiveTitle,
    subject: topicContext || 'Google Slides Import',
    description: `Presentation imported from Google Slides (${url}).`,
    slides,
  };
}

/**
 * Parses Markdown or formatted text into structured slides.
 * Supports delimiters like '---' or '# Slide Title' or 'Slide 1:'.
 */
export function parseMarkdownToSlides(text: string, defaultTitle: string = 'Imported Lecture'): ImportedDeckResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      title: defaultTitle,
      slides: [
        {
          id: `slide-${Date.now()}-1`,
          title: defaultTitle,
          content: ['Add your slide content here.'],
        },
      ],
    };
  }

  // Split by markdown horizontal rules '---'
  let rawBlocks = trimmed.split(/\n\s*---\s*\n/);
  
  // If no '---' found, try splitting by '# ' top-level headings
  if (rawBlocks.length === 1 && trimmed.includes('# ')) {
    rawBlocks = trimmed.split(/(?=\n#\s+)/);
  }

  // If still 1 block and contains 'Slide [0-9]+:', split by that
  if (rawBlocks.length === 1 && /Slide\s+\d+:/i.test(trimmed)) {
    rawBlocks = trimmed.split(/(?=Slide\s+\d+:)/i);
  }

  const slides: Slide[] = [];
  let detectedTitle = defaultTitle;

  rawBlocks.forEach((block, index) => {
    const lines = block
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length === 0) return;

    let title = `Slide ${index + 1}`;
    const content: string[] = [];
    let detectedQuestion: Question | undefined = undefined;

    // Find title line
    let firstLine = lines[0];
    if (firstLine.startsWith('#')) {
      title = firstLine.replace(/^#+\s*/, '');
      lines.shift();
    } else if (/^Slide\s+\d+:\s*/i.test(firstLine)) {
      title = firstLine.replace(/^Slide\s+\d+:\s*/i, '');
      lines.shift();
    } else if (lines.length > 1 && !firstLine.startsWith('-') && !firstLine.startsWith('*')) {
      title = firstLine;
      lines.shift();
    }

    if (index === 0 && defaultTitle === 'Imported Lecture' && title) {
      detectedTitle = title;
    }

    // Process remaining lines for bullet points or question definitions
    const questionLines: string[] = [];
    let isParsingQuestion = false;

    lines.forEach(line => {
      const cleanBullet = line.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '');

      if (/^(Question|Quiz|Checkpoint|Q):\s*/i.test(line) || isParsingQuestion) {
        isParsingQuestion = true;
        questionLines.push(line);
      } else {
        content.push(cleanBullet);
      }
    });

    // If question markers detected, parse question
    if (questionLines.length > 0) {
      const promptLine = questionLines[0].replace(/^(Question|Quiz|Checkpoint|Q):\s*/i, '');
      const options: QuestionOption[] = [];

      for (let i = 1; i < questionLines.length; i++) {
        const qLine = questionLines[i];
        const optMatch = qLine.match(/^([A-D]|[a-d]|\*|\-)\s*[.):-]?\s*(.*)/);
        if (optMatch) {
          const isMarkedCorrect = qLine.includes('*') || /\[x\]/i.test(qLine) || /\(correct\)/i.test(qLine);
          const optText = optMatch[2].replace(/\s*\((correct)\)\s*/i, '').replace(/\[x\]/i, '').trim();
          options.push({
            id: `opt-${options.length + 1}`,
            text: optText || `Option ${options.length + 1}`,
            isCorrect: isMarkedCorrect || options.length === 0, // default first if none marked
          });
        }
      }

      if (options.length >= 2) {
        detectedQuestion = {
          id: `q-${Date.now()}-${index}`,
          type: 'multiple_choice',
          prompt: promptLine || 'Select the correct answer:',
          points: 10,
          options,
        };
      }
    }

    slides.push({
      id: `slide-${Date.now()}-${index + 1}`,
      title: title.trim() || `Slide ${index + 1}`,
      content: content.length > 0 ? content : ['Key concept overview.'],
      question: detectedQuestion,
    });
  });

  return {
    title: detectedTitle,
    subject: 'General',
    description: `Imported outline with ${slides.length} slides.`,
    slides: slides.length > 0 ? slides : [
      {
        id: `slide-${Date.now()}-1`,
        title: defaultTitle,
        content: ['Imported slide content.'],
      },
    ],
  };
}

/**
 * Parses PowerPoint PPTX files using JSZip.
 * Extracts slides from 'ppt/slides/slide{N}.xml' and extracts text paragraphs.
 */
export async function parsePptxFile(file: File): Promise<ImportedDeckResult> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Find all slide XML files
  const slideFileNames: string[] = [];
  zip.forEach((relativePath) => {
    if (relativePath.match(/^ppt\/slides\/slide\d+\.xml$/i)) {
      slideFileNames.push(relativePath);
    }
  });

  // Natural sort by slide index: slide1.xml, slide2.xml, ..., slide10.xml
  slideFileNames.sort((a, b) => {
    const numA = parseInt(a.replace(/[^0-9]/g, ''), 10) || 0;
    const numB = parseInt(b.replace(/[^0-9]/g, ''), 10) || 0;
    return numA - numB;
  });

  if (slideFileNames.length === 0) {
    throw new Error('No slide XML entries found inside PowerPoint (.pptx) file.');
  }

  const parser = new DOMParser();
  const slides: Slide[] = [];
  let deckTitle = file.name.replace(/\.pptx$/i, '').replace(/[-_]/g, ' ');

  for (let idx = 0; idx < slideFileNames.length; idx++) {
    const fileName = slideFileNames[idx];
    const xmlText = await zip.file(fileName)!.async('text');
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    // Extract all text paragraphs
    const paragraphs = xmlDoc.getElementsByTagName('a:p');
    const extractedParagraphs: string[] = [];

    for (let p = 0; p < paragraphs.length; p++) {
      const pNode = paragraphs[p];
      const textNodes = pNode.getElementsByTagName('a:t');
      let fullParaText = '';
      for (let t = 0; t < textNodes.length; t++) {
        fullParaText += textNodes[t].textContent || '';
      }
      const trimmed = fullParaText.trim();
      if (trimmed.length > 0) {
        extractedParagraphs.push(trimmed);
      }
    }

    let slideTitle = `Slide ${idx + 1}`;
    let content: string[] = [];

    if (extractedParagraphs.length > 0) {
      slideTitle = extractedParagraphs[0];
      content = extractedParagraphs.slice(1);
    }

    if (idx === 0 && slideTitle && deckTitle.toLowerCase().includes('presentation')) {
      deckTitle = slideTitle;
    }

    // Check if the slide contains question patterns
    let question: Question | undefined = undefined;
    const questionIndex = extractedParagraphs.findIndex(p => p.endsWith('?') || /^(question|quiz|checkpoint):/i.test(p));

    if (questionIndex !== -1 && extractedParagraphs.length > questionIndex + 2) {
      const prompt = extractedParagraphs[questionIndex];
      const optionParas = extractedParagraphs.slice(questionIndex + 1);
      const options: QuestionOption[] = optionParas.slice(0, 4).map((text, oIdx) => ({
        id: `opt-${oIdx + 1}`,
        text: text.replace(/^[A-D]\s*[.):-]?\s*/i, ''),
        isCorrect: oIdx === 0,
      }));

      if (options.length >= 2) {
        question = {
          id: `q-pptx-${Date.now()}-${idx}`,
          type: 'multiple_choice',
          prompt,
          points: 10,
          options,
        };
      }
    }

    slides.push({
      id: `slide-pptx-${Date.now()}-${idx + 1}`,
      title: slideTitle || `Slide ${idx + 1}`,
      content: content.length > 0 ? content : ['Key concept from slide.'],
      question,
    });
  }

  return {
    title: deckTitle || file.name.replace(/\.pptx$/i, ''),
    subject: 'PowerPoint Import',
    description: `Imported from ${file.name} (${slides.length} slides).`,
    slides,
  };
}

/**
 * Parses JSON formatted presentation deck.
 */
export function parseJsonDeck(jsonString: string): ImportedDeckResult {
  const parsed = JSON.parse(jsonString);
  if (!parsed || !Array.isArray(parsed.slides)) {
    throw new Error('Invalid JSON deck format: Expected an object containing a "slides" array.');
  }

  return {
    title: parsed.title || 'Imported Deck',
    subject: parsed.subject || 'General',
    description: parsed.description || 'Imported JSON presentation.',
    slides: parsed.slides.map((s: any, idx: number) => ({
      id: s.id || `slide-${Date.now()}-${idx + 1}`,
      title: s.title || `Slide ${idx + 1}`,
      content: Array.isArray(s.content) ? s.content : [String(s.content || '')],
      imageUrl: s.imageUrl,
      imageAlt: s.imageAlt,
      notes: s.notes,
      question: s.question,
    })),
  };
}

/**
 * Triggers browser download of a Presentation as a JSON file.
 */
export function downloadDeckAsJson(presentation: { title: string; slides: Slide[]; subject?: string; description?: string }) {
  const data = JSON.stringify(presentation, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const safeTitle = (presentation.title || 'presentation')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');
  anchor.href = url;
  anchor.download = `${safeTitle}.classlock.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
