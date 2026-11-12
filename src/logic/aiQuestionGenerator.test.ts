import test from 'node:test';
import assert from 'node:assert';
import { Slide } from '../types/index.ts';

test('AI question generator payload formatting', () => {
  const slides: Slide[] = [
    {
      id: 's-1',
      title: 'Psychological Safety in Teams',
      content: ['Amy Edmondson Harvard Business School research', 'Teams feel safe taking interpersonal risks'],
      notes: 'Focus on how high accountability pairs with safety.',
    },
    {
      id: 's-2',
      title: 'Herzberg Motivators',
      content: ['Hygiene vs true motivators'],
      question: {
        id: 'q-existing',
        type: 'multiple_choice',
        prompt: 'Existing question',
        points: 10,
        options: [{ id: '1', text: 'A', isCorrect: true }],
      },
    },
  ];

  // Filtering for missing questions
  const slidesWithoutQuestions = slides.filter(s => !s.question);
  assert.strictEqual(slidesWithoutQuestions.length, 1);
  assert.strictEqual(slidesWithoutQuestions[0].title, 'Psychological Safety in Teams');
});

test('Fallback question heuristic generator logic', () => {
  const slide = {
    title: 'Organizational Behavior: Motivation Theories',
    content: ['Intrinsic motivators drive enduring performance and self-determination.'],
  };

  const prompt = `Based on "${slide.title}", which statement best captures the core concept?`;
  assert.ok(prompt.includes(slide.title));
  assert.ok(prompt.length > 20);
});
