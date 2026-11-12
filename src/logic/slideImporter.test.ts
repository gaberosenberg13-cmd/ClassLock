import test from 'node:test';
import assert from 'node:assert';
import {
  parseGoogleSlidesUrl,
  createSlidesFromGoogleSlides,
  getSlideEmbedUrl,
  parseMarkdownToSlides,
  parseJsonDeck,
} from '../services/slideImporter.ts';

test('getSlideEmbedUrl correctly sets slide number parameter', () => {
  const base = 'https://docs.google.com/presentation/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/embed?start=false&loop=false';
  assert.strictEqual(getSlideEmbedUrl(base, 0), `${base}&slide=1`);
  assert.strictEqual(getSlideEmbedUrl(base, 2), `${base}&slide=3`);

  // Updating existing slide parameter
  const withSlide = 'https://docs.google.com/presentation/d/123/embed?slide=1&delayms=3000';
  const updated = getSlideEmbedUrl(withSlide, 4);
  assert.ok(updated.includes('slide=5'));
  assert.ok(!updated.includes('slide=1'));
});

test('parseGoogleSlidesUrl extracts presentation ID and formats embed URL', () => {
  const url = 'https://docs.google.com/presentation/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#slide=id.p';
  const result = parseGoogleSlidesUrl(url);

  assert.ok(result);
  assert.strictEqual(result?.docId, '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
  assert.ok(result?.embedUrl.includes('/embed?start=false'));
  assert.strictEqual(result?.isPublished, false);

  // Published to web format
  const pubUrl = 'https://docs.google.com/presentation/d/e/2PACX-1vT5K919293848/pub';
  const pubResult = parseGoogleSlidesUrl(pubUrl);
  assert.ok(pubResult);
  assert.strictEqual(pubResult?.isPublished, true);
  assert.ok(pubResult?.embedUrl.includes('/presentation/d/e/2PACX-1vT5K919293848/embed'));
});

test('parseGoogleSlidesUrl returns null for invalid URL', () => {
  const badUrl = 'https://google.com/search?q=slides';
  assert.strictEqual(parseGoogleSlidesUrl(badUrl), null);
});

test('createSlidesFromGoogleSlides generates synchronized slides with checkpoint and embedUrl', () => {
  const url = 'https://docs.google.com/presentation/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit';
  const result = createSlidesFromGoogleSlides('Cellular Respiration', url, 4, 'Krebs Cycle & ATP');

  assert.strictEqual(result.title, 'Cellular Respiration');
  assert.strictEqual(result.slides.length, 4);
  assert.ok(result.slides[0].embedUrl?.includes('/embed?start=false'));
  assert.strictEqual(result.slides[0].sourceUrl, 'https://docs.google.com/presentation/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit');
  const questionSlide = result.slides.find(s => s.question !== undefined);
  assert.ok(questionSlide, 'Should include at least one checkpoint question slide');
});

test('parseMarkdownToSlides parses slides separated by --- with questions', () => {
  const markdown = `
# Photosynthesis Overview
- Chloroplasts absorb solar photons
- Water and carbon dioxide are converted to glucose

---
# Light-Dependent Reactions
- Occur within the thylakoid membrane
- Generate ATP and NADPH

Question: Where do light-dependent reactions occur?
A) Thylakoid membrane (correct)
B) Stroma
C) Outer membrane
  `;

  const result = parseMarkdownToSlides(markdown, 'Biology 101');
  assert.strictEqual(result.slides.length, 2);
  assert.strictEqual(result.slides[0].title, 'Photosynthesis Overview');
  assert.strictEqual(result.slides[0].content.length, 2);
  assert.strictEqual(result.slides[1].title, 'Light-Dependent Reactions');
  assert.ok(result.slides[1].question);
  assert.strictEqual(result.slides[1].question?.options.length, 3);
});

test('parseJsonDeck validates and maps deck correctly', () => {
  const json = JSON.stringify({
    title: 'Atomic Structure',
    subject: 'Chemistry',
    slides: [
      {
        title: 'Protons and Neutrons',
        content: ['Located in the nucleus.'],
      },
      {
        title: 'Electron Cloud',
        content: ['Orbitals surround the nucleus.'],
      },
    ],
  });

  const result = parseJsonDeck(json);
  assert.strictEqual(result.title, 'Atomic Structure');
  assert.strictEqual(result.slides.length, 2);
  assert.strictEqual(result.slides[0].title, 'Protons and Neutrons');
});
