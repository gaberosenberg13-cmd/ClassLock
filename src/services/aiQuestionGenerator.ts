import { Slide, Question } from '../types/index.ts';

export interface GenerateQuestionsResponse {
  success: boolean;
  questions: Array<{
    slideIndex: number;
    slideId?: string;
    question: Question;
  }>;
  message?: string;
}

/**
 * Calls the server-side Gemini 3.8 Flash API to read through slides and generate
 * conceptual, engaging checkpoint questions.
 */
export async function generateAiQuestionsForSlides(
  slides: Slide[],
  onlyIndicesWithoutQuestions = false
): Promise<Array<{ slideIndex: number; question: Question }>> {
  if (!slides || slides.length === 0) return [];

  const targetSlides = slides
    .map((slide, index) => ({ slide, index }))
    .filter(({ slide }) => !onlyIndicesWithoutQuestions || !slide.question);

  if (targetSlides.length === 0) return [];

  const payload = {
    slides: targetSlides.map(({ slide, index }) => ({
      index,
      id: slide.id,
      title: slide.title,
      content: slide.content,
      notes: slide.notes,
    })),
  };

  try {
    const res = await fetch('/api/ai/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Failed to generate questions: ${res.statusText}`);
    }

    const data: GenerateQuestionsResponse = await res.json();
    if (data.success && Array.isArray(data.questions)) {
      return data.questions.map(q => ({
        slideIndex: q.slideIndex,
        question: q.question,
      }));
    }
    return [];
  } catch (err: any) {
    console.error('Error in generateAiQuestionsForSlides:', err);
    throw err;
  }
}

/**
 * Generates an AI checkpoint question for a single slide.
 */
export async function generateAiQuestionForSingleSlide(
  slide: Slide,
  index = 0
): Promise<Question | null> {
  const results = await generateAiQuestionsForSlides([slide], false);
  return results[0]?.question || null;
}
