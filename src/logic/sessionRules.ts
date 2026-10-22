/**
 * Pure domain logic for ClassLock sessions, question evaluation,
 * lockdown violation enforcement, and educational games.
 */

import type { Question, LockMode, LiveSession, StudentResponse } from '../types/index.ts';

// Omit visually ambiguous characters (0, O, 1, I, L)
const SAFE_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Generates a friendly 6-character join code
 */
export function generateJoinCode(randomFn = Math.random): string {
  let result = '';
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(randomFn() * SAFE_CODE_CHARS.length);
    result += SAFE_CODE_CHARS[idx];
  }
  return result;
}

/**
 * Normalizes user input join codes
 */
export function sanitizeJoinCode(code: string): string {
  return (code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Evaluates whether an answer to a question is correct and calculates points.
 */
export function evaluateResponse(
  question: Question,
  submission: { selectedOptionId?: string; textAnswer?: string }
): { isCorrect: boolean; pointsEarned: number } {
  if (question.type === 'poll') {
    // Polls award full participation points regardless of option selected
    const hasAnswered = !!submission.selectedOptionId || (!!submission.textAnswer && submission.textAnswer.trim().length > 0);
    return {
      isCorrect: true,
      pointsEarned: hasAnswered ? (question.points || 10) : 0,
    };
  }

  if (question.type === 'short_answer') {
    const studentText = (submission.textAnswer || '').trim().toLowerCase();
    const correctText = (question.correctAnswerText || '').trim().toLowerCase();
    if (!studentText || !correctText) {
      return { isCorrect: false, pointsEarned: 0 };
    }
    const isCorrect = studentText === correctText;
    return {
      isCorrect,
      pointsEarned: isCorrect ? question.points : 0,
    };
  }

  // Multiple choice or true/false
  const selectedOption = question.options.find(opt => opt.id === submission.selectedOptionId);
  const isCorrect = !!selectedOption?.isCorrect;
  return {
    isCorrect,
    pointsEarned: isCorrect ? question.points : 0,
  };
}

/**
 * Calculates student lockdown / violation status based on strictness mode
 */
export function calculateStudentViolationStatus(
  currentViolationCount: number,
  lockMode: LockMode
): { isLockedOut: boolean; shouldWarn: boolean; remainingStrikes: number } {
  if (lockMode === 'off') {
    return { isLockedOut: false, shouldWarn: false, remainingStrikes: Infinity };
  }

  if (lockMode === 'warn') {
    return {
      isLockedOut: false,
      shouldWarn: currentViolationCount > 0,
      remainingStrikes: Infinity,
    };
  }

  // Strict mode: lock out on 3 violations
  const STRIKE_LIMIT = 3;
  const isLockedOut = currentViolationCount >= STRIKE_LIMIT;
  const remainingStrikes = Math.max(0, STRIKE_LIMIT - currentViolationCount);

  return {
    isLockedOut,
    shouldWarn: currentViolationCount > 0 && !isLockedOut,
    remainingStrikes,
  };
}

/**
 * Calculates Quiz Race progress (0% to 100%)
 */
export function calculateRaceProgress(correctAnswers: number, targetLaps: number = 5): number {
  if (targetLaps <= 0) return 0;
  const progress = (correctAnswers / targetLaps) * 100;
  return Math.min(100, Math.round(progress));
}

export interface MemoryCard {
  id: string;
  pairId: string;
  type: 'term' | 'definition';
  text: string;
  matched: boolean;
}

/**
 * Prepares and shuffles Memory Match deck from vocabulary pairs
 */
export function createMemoryMatchDeck(
  pairs: { id: string; term: string; definition: string }[],
  randomFn = Math.random
): MemoryCard[] {
  const cards: MemoryCard[] = [];
  pairs.forEach(pair => {
    cards.push({
      id: `${pair.id}-term`,
      pairId: pair.id,
      type: 'term',
      text: pair.term,
      matched: false,
    });
    cards.push({
      id: `${pair.id}-def`,
      pairId: pair.id,
      type: 'definition',
      text: pair.definition,
      matched: false,
    });
  });

  // Fisher-Yates shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  return cards;
}

/**
 * Generates CSV export for teacher gradebook
 */
export function exportGradebookCsv(session: LiveSession): string {
  const headers = [
    'Student Name',
    'Student ID',
    'Total Score',
    'Questions Answered',
    'Correct Answers',
    'Accuracy %',
    'Focus Violations',
    'Lockout Status',
    'Joined At',
  ];

  const participantsList = Object.values(session.participants || {});

  const rows = participantsList.map(p => {
    const studentResponses = (session.responses || []).filter(r => r.studentId === p.id);
    const answeredCount = studentResponses.length;
    const correctCount = studentResponses.filter(r => r.isCorrect).length;
    const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
    const status = p.isLockedOut ? 'Locked Out' : p.connected ? 'Active' : 'Disconnected';

    return [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${(p.studentIdNumber || 'N/A').replace(/"/g, '""')}"`,
      p.score,
      answeredCount,
      correctCount,
      `${accuracy}%`,
      p.violationCount,
      status,
      `"${new Date(p.joinedAt).toLocaleString().replace(/"/g, '""')}"`,
    ];
  });

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
