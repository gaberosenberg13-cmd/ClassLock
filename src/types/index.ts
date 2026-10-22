export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'poll';

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  options: QuestionOption[];
  correctAnswerText?: string; // For short answer
  points: number;
  timeLimitSeconds?: number; // 0 or undefined = untimed
  explanation?: string;
}

export interface Slide {
  id: string;
  title: string;
  content: string[]; // Bullet points or paragraphs
  imageUrl?: string;
  imageAlt?: string;
  notes?: string;
  question?: Question;
}

export interface Presentation {
  id: string;
  teacherId: string;
  title: string;
  subject: string;
  description: string;
  slides: Slide[];
  createdAt: string;
  updatedAt: string;
}

export type LockMode = 'off' | 'warn' | 'strict';

export interface StudentViolation {
  id: string;
  studentId: string;
  studentName: string;
  timestamp: string;
  type: 'tab_switched' | 'fullscreen_exited' | 'window_blur' | 'shortcut_attempt';
  details?: string;
}

export interface Participant {
  id: string;
  name: string;
  studentIdNumber?: string;
  joinedAt: string;
  connected: boolean;
  isLockedOut: boolean;
  violationCount: number;
  score: number;
  lastActive: string;
  avatarColor: string;
}

export interface StudentResponse {
  id: string;
  sessionId: string;
  questionId: string;
  studentId: string;
  studentName: string;
  selectedOptionId?: string;
  textAnswer?: string;
  isCorrect: boolean;
  pointsEarned: number;
  submittedAt: string;
}

export interface GameSession {
  gameId: 'quiz_race' | 'memory_match';
  gameTitle: string;
  status: 'lobby' | 'in_progress' | 'completed';
  startedAt?: string;
  currentQuestionIndex?: number;
  gameData?: any;
}

export type StudentReactionType = 'hand_raise' | 'confused' | 'understood' | 'fire';

export interface StudentReaction {
  id: string;
  studentId: string;
  studentName: string;
  type: StudentReactionType;
  timestamp: number;
}

export interface StudentQuestionItem {
  id: string;
  studentId: string;
  studentName: string;
  text: string;
  timestamp: string;
  isAnswered: boolean;
}

export interface LiveSession {
  id: string;
  joinCode: string;
  presentationId: string;
  presentationTitle: string;
  teacherId: string;
  teacherName: string;
  status: 'live' | 'paused' | 'ended';
  currentSlideIndex: number;
  lockMode: LockMode;
  isLockPaused: boolean;
  activeQuestion?: {
    question: Question;
    startedAt: number;
    expiresAt?: number;
    revealed: boolean;
    acceptingAnswers: boolean;
  };
  activeGame?: GameSession;
  participants: Record<string, Participant>;
  violations: StudentViolation[];
  responses: StudentResponse[];
  reactions?: StudentReaction[];
  studentQuestions?: StudentQuestionItem[];
  startedAt: string;
  endedAt?: string;
}

export interface TeacherProfile {
  id: string;
  email: string;
  name: string;
  school?: string;
}
