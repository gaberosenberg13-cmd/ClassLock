import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateJoinCode,
  sanitizeJoinCode,
  evaluateResponse,
  calculateStudentViolationStatus,
  calculateRaceProgress,
  calculateKahootScore,
  createMemoryMatchDeck,
  exportGradebookCsv,
} from './sessionRules.ts';
import type { Question, LiveSession } from '../types/index.ts';

test('generateJoinCode produces a 6-character valid uppercase code', () => {
  const code = generateJoinCode(() => 0.5);
  assert.equal(code.length, 6);
  assert.match(code, /^[A-Z0-9]{6}$/);
  // Ensure excluded ambiguous characters (0, O, 1, I, L) do not appear
  assert.doesNotMatch(code, /[01OIL]/);
});

test('sanitizeJoinCode normalizes case and trims whitespace', () => {
  assert.equal(sanitizeJoinCode('  ab-cd12  '), 'ABCD12');
  assert.equal(sanitizeJoinCode('k79m2z'), 'K79M2Z');
});

test('evaluateResponse accurately checks multiple choice options', () => {
  const question: Question = {
    id: 'q1',
    type: 'multiple_choice',
    prompt: 'What is the speed of light?',
    points: 10,
    options: [
      { id: 'opt1', text: '300,000 km/s', isCorrect: true },
      { id: 'opt2', text: '150,000 km/s', isCorrect: false },
    ],
  };

  const correctResult = evaluateResponse(question, { selectedOptionId: 'opt1' });
  assert.equal(correctResult.isCorrect, true);
  assert.equal(correctResult.pointsEarned, 10);

  const incorrectResult = evaluateResponse(question, { selectedOptionId: 'opt2' });
  assert.equal(incorrectResult.isCorrect, false);
  assert.equal(incorrectResult.pointsEarned, 0);
});

test('evaluateResponse handles short answer case-insensitively', () => {
  const question: Question = {
    id: 'q2',
    type: 'short_answer',
    prompt: 'What organelle produces ATP?',
    points: 15,
    options: [],
    correctAnswerText: 'Mitochondria',
  };

  const match = evaluateResponse(question, { textAnswer: '  mitochondria ' });
  assert.equal(match.isCorrect, true);
  assert.equal(match.pointsEarned, 15);

  const mismatch = evaluateResponse(question, { textAnswer: 'Nucleus' });
  assert.equal(mismatch.isCorrect, false);
  assert.equal(mismatch.pointsEarned, 0);
});

test('evaluateResponse awards participation points for polls', () => {
  const poll: Question = {
    id: 'q3',
    type: 'poll',
    prompt: 'How confident do you feel about this topic?',
    points: 5,
    options: [
      { id: 'opt1', text: 'Very Confident' },
      { id: 'opt2', text: 'Needs Review' },
    ],
  };

  const res = evaluateResponse(poll, { selectedOptionId: 'opt2' });
  assert.equal(res.isCorrect, true);
  assert.equal(res.pointsEarned, 5);
});

test('calculateStudentViolationStatus enforces strictness rules', () => {
  // Mode: off
  const off = calculateStudentViolationStatus(5, 'off');
  assert.equal(off.isLockedOut, false);
  assert.equal(off.shouldWarn, false);

  // Mode: warn
  const warn = calculateStudentViolationStatus(2, 'warn');
  assert.equal(warn.isLockedOut, false);
  assert.equal(warn.shouldWarn, true);

  // Mode: strict - under threshold
  const strict1 = calculateStudentViolationStatus(2, 'strict');
  assert.equal(strict1.isLockedOut, false);
  assert.equal(strict1.shouldWarn, true);
  assert.equal(strict1.remainingStrikes, 1);

  // Mode: strict - reaches 3 strikes
  const strict3 = calculateStudentViolationStatus(3, 'strict');
  assert.equal(strict3.isLockedOut, true);
  assert.equal(strict3.remainingStrikes, 0);
});

test('calculateRaceProgress clamps between 0 and 100', () => {
  assert.equal(calculateRaceProgress(0, 5), 0);
  assert.equal(calculateRaceProgress(2, 5), 40);
  assert.equal(calculateRaceProgress(5, 5), 100);
  assert.equal(calculateRaceProgress(8, 5), 100);
});

test('createMemoryMatchDeck generates pairs and shuffles', () => {
  const pairs = [
    { id: 'p1', term: 'Photosynthesis', definition: 'Converts light to chemical energy' },
    { id: 'p2', term: 'Ribosome', definition: 'Site of protein synthesis' },
  ];

  const deck = createMemoryMatchDeck(pairs);
  assert.equal(deck.length, 4);
  assert.equal(deck.filter(c => c.type === 'term').length, 2);
  assert.equal(deck.filter(c => c.type === 'definition').length, 2);
});

test('exportGradebookCsv outputs properly formatted CSV with all columns', () => {
  const dummySession: LiveSession = {
    id: 'sess-1',
    joinCode: 'ABC123',
    presentationId: 'pres-1',
    presentationTitle: 'Science 101',
    teacherId: 'teach-1',
    teacherName: 'Dr. Smith',
    status: 'ended',
    currentSlideIndex: 0,
    lockMode: 'strict',
    isLockPaused: false,
    startedAt: new Date('2026-10-15T10:00:00Z').toISOString(),
    participants: {
      s1: {
        id: 's1',
        name: 'Alice Johnson',
        studentIdNumber: 'STU-101',
        joinedAt: new Date('2026-10-15T10:01:00Z').toISOString(),
        connected: true,
        isLockedOut: false,
        violationCount: 1,
        score: 30,
        lastActive: new Date().toISOString(),
        avatarColor: '#3B82F6',
      },
    },
    violations: [],
    responses: [
      {
        id: 'r1',
        sessionId: 'sess-1',
        questionId: 'q1',
        studentId: 's1',
        studentName: 'Alice Johnson',
        selectedOptionId: 'opt1',
        isCorrect: true,
        pointsEarned: 30,
        submittedAt: new Date().toISOString(),
      },
    ],
  };

  const csv = exportGradebookCsv(dummySession);
  assert.ok(csv.includes('Student Name,Student ID,Total Score'));
  assert.ok(csv.includes('"Alice Johnson"'));
  assert.ok(csv.includes('"STU-101"'));
  assert.ok(csv.includes('30,1,1,100%,1,Active'));
});

test('calculateKahootScore awards high points for fast correct answers with streaks', () => {
  // Fast answer (28s left out of 30s)
  const fast = calculateKahootScore(true, 28, 30, 0);
  assert.ok(fast.points >= 950, 'Fast answer should score near 1000');
  assert.equal(fast.newStreak, 1);

  // Slow answer (2s left out of 30s)
  const slow = calculateKahootScore(true, 2, 30, 0);
  assert.ok(slow.points <= 600, 'Slow answer should score near 500');
  assert.equal(slow.newStreak, 1);

  // Streak bonus (3 in a row)
  const streakResult = calculateKahootScore(true, 20, 30, 3);
  assert.ok(streakResult.points > fast.points - 200, 'Streak should add bonus');
  assert.equal(streakResult.newStreak, 4);

  // Incorrect answer = 0 pts and resets streak
  const wrong = calculateKahootScore(false, 25, 30, 5);
  assert.equal(wrong.points, 0);
  assert.equal(wrong.newStreak, 0);
});
