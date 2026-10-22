import {
  Presentation,
  LiveSession,
  TeacherProfile,
  Participant,
  StudentViolation,
  StudentResponse,
  LockMode,
  Question,
  GameSession,
} from '../types/index.ts';
import { generateJoinCode, evaluateResponse, calculateStudentViolationStatus } from '../logic/sessionRules.ts';

const DEMO_TEACHER: TeacherProfile = {
  id: 'teacher-demo-1',
  email: 'teacher@classlock.edu',
  name: 'Prof. Sarah Jenkins',
  school: 'Roosevelt High Science Dept',
};

export const INITIAL_PRESENTATIONS: Presentation[] = [
  {
    id: 'pres-org-behavior-1',
    teacherId: 'teacher-demo-1',
    title: 'Organizational Behavior: Motivation, Group Dynamics & Culture',
    subject: 'Organizational Behavior (OB 300)',
    description: 'Foundations of OB: Maslow & Herzberg motivation theories, Amy Edmondson psychological safety, Janis Groupthink traps, and Thomas-Kilmann conflict modes.',
    createdAt: '2026-10-18T10:00:00Z',
    updatedAt: '2026-10-22T08:00:00Z',
    slides: [
      {
        id: 'ob-slide-1',
        title: 'Foundations of Organizational Behavior (OB)',
        content: [
          'Micro-Level: Individual motivation, personality traits (Big Five), cognitive biases, and perceptual traps.',
          'Meso-Level: Group dynamics, team psychological safety, social loafing, and conflict resolution.',
          'Macro-Level: Organizational culture, power structures, organizational change, and system design.',
          'Core Objective: Understand, explain, predict, and influence human behavior in organizations to enhance performance and employee well-being.',
        ],
        imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
        imageAlt: 'Diverse business team collaborating intensely around a strategy table',
        notes: 'Ask the room: When a team underperforms, is it usually a people problem or a system/process problem?',
      },
      {
        id: 'ob-slide-2',
        title: "Work Motivation: Herzberg's Two-Factor & Expectancy Theory",
        content: [
          'Herzberg Hygiene Factors: Salary, company policies, and working conditions prevent dissatisfaction, but do not generate motivation.',
          'Herzberg Motivators: Challenging work, recognition, responsibility, and personal growth drive genuine engagement.',
          "Vroom's Expectancy Theory: Motivation = Expectancy (Effort → Performance) × Instrumentality (Performance → Reward) × Valence (Value of Reward).",
          'Hackman & Oldham Job Characteristics: Autonomy, skill variety, task identity, task significance, and feedback.',
        ],
        imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80',
        imageAlt: 'Leadership workshop team strategizing at a whiteboard',
        notes: 'Highlight why cash bonuses alone often fail to solve disengagement in knowledge workers.',
        question: {
          id: 'q-herzberg-factors',
          type: 'multiple_choice',
          prompt: "According to Herzberg's Two-Factor Theory, which of the following is a true 'Motivator' (and not merely a hygiene factor)?",
          points: 10,
          timeLimitSeconds: 25,
          options: [
            { id: 'ob-opt-1', text: 'Annual baseline salary adjustment', isCorrect: false },
            { id: 'ob-opt-2', text: 'Autonomous responsibility and challenging project work', isCorrect: true },
            { id: 'ob-opt-3', text: 'Comfortable ergonomic office desk and chair', isCorrect: false },
            { id: 'ob-opt-4', text: 'Company organizational chart policy document', isCorrect: false },
          ],
          explanation: 'Herzberg showed that hygiene factors (pay, equipment) only eliminate dissatisfaction. Genuine motivation stems from intrinsic factors like autonomy, mastery, and meaningful responsibility.',
        },
      },
      {
        id: 'ob-slide-3',
        title: 'Team Dynamics & Psychological Safety',
        content: [
          'Harvard Prof. Amy Edmondson defined Psychological Safety as the shared belief that a team is safe for interpersonal risk-taking.',
          "Google's Project Aristotle (analyzing 180+ teams) discovered psychological safety is the single #1 predictor of team performance.",
          'High safety environments encourage early error reporting, questioning assumptions, and candid dissenting feedback.',
          'Contrasted with impression management: holding back questions out of fear of looking incompetent.',
        ],
        imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80',
        imageAlt: 'Colleagues engaged in an open psychological safety dialogue',
        notes: 'Reinforce that psychological safety is NOT simply being nice or lowering standards.',
        question: {
          id: 'q-psych-safety-tf',
          type: 'true_false',
          prompt: 'True or False: Establishing psychological safety requires lowering performance standards so team members feel comfortable.',
          points: 10,
          timeLimitSeconds: 20,
          options: [
            { id: 'tf-ob-true', text: 'True', isCorrect: false },
            { id: 'tf-ob-false', text: 'False', isCorrect: true },
          ],
          explanation: 'False! Edmondson emphasizes that psychological safety paired with high performance standards creates the "Learning & High-Performance Zone". Without high standards, high safety only produces a "Comfort Zone".',
        },
      },
      {
        id: 'ob-slide-4',
        title: "Group Decision Traps: Janis's Groupthink & Asch Conformity",
        content: [
          'Irving Janis defined Groupthink: Deterioration of mental efficiency and moral judgment from excessive desire for group harmony.',
          'Key Symptoms: Illusion of invulnerability, collective rationalization, self-censorship, and self-appointed "mindguards".',
          'Historic Case Studies: NASA Challenger launch pressure, Bay of Pigs invasion, and Enron executive blindspots.',
          "Proven Antidotes: Appointing a formal Devil's Advocate, second-chance review meetings, and leaders withholding their opinions upfront.",
        ],
        imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
        imageAlt: 'Executive committee in a deliberation meeting',
        notes: 'Have students reflect on whether they have ever self-censored in a group project.',
        question: {
          id: 'q-groupthink-sa',
          type: 'short_answer',
          prompt: 'What 10-letter term describes when peer pressure and a desire for consensus causes critical doubts to be suppressed?',
          points: 15,
          timeLimitSeconds: 30,
          options: [],
          correctAnswerText: 'Groupthink',
          explanation: 'Groupthink suppresses divergent thinking. Assigning a Devil\'s Advocate or anonymous polling directly mitigates this trap.',
        },
      },
      {
        id: 'ob-slide-5',
        title: 'Live Class Pulse: Thomas-Kilmann Conflict Modes (TKI)',
        content: [
          'Assesses conflict behavior along two dimensions: Assertiveness (own concerns) and Cooperativeness (others concerns).',
          'Competing (High Assert, Low Coop): Decisive action required during emergencies or unpopular essential rules.',
          'Collaborating (High Assert, High Coop): Integrative win-win solution where both concerns are too important to compromise.',
          'Compromising (Moderate Assert & Coop): Expedient middle ground when under time pressure.',
          'Avoiding (Low Assert, Low Coop) & Accommodating (Low Assert, High Coop).',
        ],
        imageUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=80',
        imageAlt: 'Negotiation table with cross-functional managers',
        notes: 'Every style has appropriate contexts; the goal is behavioral flexibility rather than defaulting to avoidance.',
        question: {
          id: 'q-tki-poll',
          type: 'poll',
          prompt: 'In a high-stakes group project deadlock, what is your primary instinctive conflict mode?',
          points: 5,
          timeLimitSeconds: 25,
          options: [
            { id: 'tki-collab', text: 'Collaborating (Digging deep to find a win-win consensus)' },
            { id: 'tki-compete', text: 'Competing (Advocating firmly for the best logical solution)' },
            { id: 'tki-compromise', text: 'Compromising (Splitting differences to keep moving forward)' },
            { id: 'tki-accommodate', text: 'Accommodating (Yielding to preserve interpersonal cohesion)' },
            { id: 'tki-avoid', text: 'Avoiding (Stepping back and letting others resolve it)' },
          ],
          explanation: 'Adaptive managers select their conflict style based on issue importance, relationship value, and time constraints.',
        },
      },
      {
        id: 'ob-slide-6',
        title: "Organizational Culture: Edgar Schein's Three Levels",
        content: [
          'Level 1 - Visible Artifacts: Office architecture, dress codes, rituals, language, and technology.',
          'Level 2 - Espoused Values: Stated missions, formal strategies, corporate codes of conduct, and philosophy.',
          'Level 3 - Basic Underlying Assumptions: Unconscious, taken-for-granted beliefs and mental models that truly dictate behavior.',
          '"Culture eats strategy for breakfast" — Edgar Schein showed that real culture lives in Level 3 assumptions, not Level 1 posters.',
        ],
        imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
        imageAlt: 'Modern innovative corporate architecture with open collaborative spaces',
        notes: 'Challenge students to compare a company mission statement with its actual behavioral norms.',
      },
    ],
  },
  {
    id: 'pres-astronomy-1',
    teacherId: 'teacher-demo-1',
    title: 'Planetary Systems & The Cosmos',
    subject: 'Astronomy & Physics',
    description: 'Explore our solar system, orbital mechanics, planetary atmospheres, and the search for exoplanets.',
    createdAt: '2026-10-10T09:00:00Z',
    updatedAt: '2026-10-15T07:00:00Z',
    slides: [
      {
        id: 'slide-1',
        title: 'Mission Overview: Our Solar Neighborhood',
        content: [
          'Welcome to ClassLock Astronomy 301!',
          'Today we investigate how planetary structure dictates atmosphere and potential habitability.',
          'Keep your device in Fullscreen Focus Mode throughout the lecture.',
          'Interactive checkpoints and Quiz Race challenge will launch between key modules.',
        ],
        imageUrl: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=1200&q=80',
        imageAlt: 'Solar system planet array in deep space',
        notes: 'Remind students that participation points count toward their lab grade.',
      },
      {
        id: 'slide-2',
        title: 'The Terrestrial Planets & Greenhouse Effects',
        content: [
          'Mercury: Zero significant atmosphere, extreme temperature delta (-180°C to 430°C).',
          'Venus: 96.5% CO2 atmosphere, runaway greenhouse effect generating 465°C surface heat.',
          'Earth: Perfect nitrogen-oxygen balance shielding liquid surface oceans.',
          'Mars: Thin CO2 veil (0.6% Earth pressure); frozen water ice caps with ancient river deltas.',
        ],
        imageUrl: 'https://images.unsplash.com/photo-1614728423169-3f65fd722b7e?auto=format&fit=crop&w=1200&q=80',
        imageAlt: 'Mars and terrestrial planet surfaces',
        notes: 'Emphasize the contrast between Mercury and Venus heat retention.',
        question: {
          id: 'q-venus-temp',
          type: 'multiple_choice',
          prompt: 'Which terrestrial planet has the highest average surface temperature?',
          points: 10,
          timeLimitSeconds: 25,
          options: [
            { id: 'opt-merc', text: 'Mercury (Closest to Sun)', isCorrect: false },
            { id: 'opt-venus', text: 'Venus (Dense CO2 greenhouse effect)', isCorrect: true },
            { id: 'opt-earth', text: 'Earth', isCorrect: false },
            { id: 'opt-mars', text: 'Mars', isCorrect: false },
          ],
          explanation: 'Venus traps solar radiation under an oppressive carbon dioxide blanket with 93 times Earth atmospheric pressure, making it hotter than Mercury!',
        },
      },
      {
        id: 'slide-3',
        title: 'Gas Giants & Jovian Magnetospheres',
        content: [
          'Jupiter contains 2.5 times more mass than all other planets in the system combined.',
          'The Great Red Spot is an anticyclonic storm older than 350 years.',
          'Saturn rings consist of 99% pure water ice particles from micrometers to meters.',
          'Metallic hydrogen mantle generates planetary magnetic fields millions of Gauss strong.',
        ],
        imageUrl: 'https://images.unsplash.com/photo-1614732484003-ef9881555dc3?auto=format&fit=crop&w=1200&q=80',
        imageAlt: 'Jupiter planet and storms',
        notes: 'Check if all students can see the cloud band details.',
        question: {
          id: 'q-jupiter-tf',
          type: 'true_false',
          prompt: 'True or False: Jupiter has more mass than all other solar system planets combined.',
          points: 10,
          timeLimitSeconds: 20,
          options: [
            { id: 'tf-true', text: 'True', isCorrect: true },
            { id: 'tf-false', text: 'False', isCorrect: false },
          ],
          explanation: 'True! Jupiter has approximately 318 times the mass of Earth, dominating planetary orbital dynamics.',
        },
      },
      {
        id: 'slide-4',
        title: 'The Habitable Zone & Exoplanet Detection',
        content: [
          'The circumstellar habitable zone allows liquid water on a rocky planet surface.',
          'Transit Photometry (Kepler & TESS): detects dips in stellar flux as planets pass in front.',
          'Radial Velocity: measures Doppler shifts in star light caused by gravitational tugs.',
          'James Webb Space Telescope (JWST) now analyzes atmospheric biosignatures like methane & ozone.',
        ],
        imageUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=80',
        imageAlt: 'Deep space stars and distant exoplanets',
        question: {
          id: 'q-goldilocks',
          type: 'short_answer',
          prompt: 'What popular 10-letter nickname is given to the circumstellar habitable zone?',
          points: 15,
          timeLimitSeconds: 30,
          options: [],
          correctAnswerText: 'Goldilocks',
          explanation: 'The "Goldilocks Zone" refers to temperatures that are "not too hot, not too cold, but just right" for liquid water.',
        },
      },
      {
        id: 'slide-5',
        title: 'Class Pulse: Next Generation Exploration',
        content: [
          'NASA and ESA are prioritizing deep ocean worlds and return samples.',
          'Cast your vote on where our next flagship robotic mission should touch down.',
          'Results will be graphed live on the classroom projector screen.',
        ],
        imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
        imageAlt: 'Earth and space probe',
        question: {
          id: 'q-exploration-poll',
          type: 'poll',
          prompt: 'Which robotic mission should receive the highest funding priority?',
          points: 5,
          timeLimitSeconds: 25,
          options: [
            { id: 'poll-europa', text: 'Europa Clipper & Subsurface Ocean Submersible' },
            { id: 'poll-mars', text: 'Mars Sample Return with Ascent Rocket' },
            { id: 'poll-titan', text: 'Titan Dragonfly Rotorcraft Exploration' },
            { id: 'poll-venus', text: 'Venus Atmospheric Cloud Habitability Probe' },
          ],
          explanation: 'All four missions represent cutting-edge frontiers in modern astrobiology!',
        },
      },
    ],
  },
  {
    id: 'pres-biology-2',
    teacherId: 'teacher-demo-1',
    title: 'Cellular Architecture & Genetics',
    subject: 'AP Biology',
    description: 'Structure and function of eukaryotic organelles, ATP synthesis, DNA replication, and cellular transport.',
    createdAt: '2026-10-12T11:00:00Z',
    updatedAt: '2026-10-15T06:30:00Z',
    slides: [
      {
        id: 'bio-slide-1',
        title: 'The Fluid Mosaic Model of Membranes',
        content: [
          'Phospholipid bilayer: Hydrophilic phosphate heads facing aqueous environments; hydrophobic fatty acid tails sequestered.',
          'Cholesterol buffers membrane fluidity across varying temperature ranges.',
          'Transmembrane proteins: Channels, carriers, receptors, and cell-recognition glycoproteins.',
        ],
        imageUrl: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=1200&q=80',
        imageAlt: 'Microscopic cellular structures',
      },
      {
        id: 'bio-slide-2',
        title: 'Bioenergetics: Mitochondria & ATP Generation',
        content: [
          'Inner folded cristae exponentially expand membrane surface area for electron transport chains.',
          'Proton motive force drives ATP Synthase rotation.',
          'Yields ~30 to 32 ATP per oxidized glucose molecule.',
        ],
        imageUrl: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=1200&q=80',
        imageAlt: 'Cell biology laboratory specimen',
        question: {
          id: 'q-bio-atp',
          type: 'multiple_choice',
          prompt: 'Which component directly drives the catalytic rotary synthesis of ATP?',
          points: 10,
          timeLimitSeconds: 25,
          options: [
            { id: 'b1', text: 'Proton gradient across the inner membrane', isCorrect: true },
            { id: 'b2', text: 'Direct sunlight absorption', isCorrect: false },
            { id: 'b3', text: 'Passive lipid breakdown', isCorrect: false },
            { id: 'b4', text: 'Carbon dioxide diffusion', isCorrect: false },
          ],
        },
      },
    ],
  },
];

export const VOCABULARY_PAIRS = [
  // Organizational Behavior Master Vocabulary
  { id: 'ob-v1', term: 'Psychological Safety', definition: 'Shared belief that a team is safe for interpersonal risk-taking and error reporting.' },
  { id: 'ob-v2', term: 'Groupthink', definition: 'Deterioration of decision quality when desire for consensus suppresses critical dissent.' },
  { id: 'ob-v3', term: 'Herzberg Motivators', definition: 'Intrinsic job factors (autonomy, responsibility) that create genuine engagement.' },
  { id: 'ob-v4', term: 'Social Loafing', definition: 'Tendency for individuals to expend less effort when working collectively in a group.' },
  { id: 'ob-v5', term: 'Transformational Leadership', definition: 'Inspiring followers to transcend self-interest for the collective mission.' },
  { id: 'ob-v6', term: 'TKI Collaborating', definition: 'High assertiveness and high cooperativeness seeking an integrative win-win solution.' },
  // General Science / Biology Pairs
  { id: 'v1', term: 'Mitochondria', definition: 'Organelle generating ATP via cellular respiration' },
  { id: 'v2', term: 'Chloroplast', definition: 'Site of photosynthesis containing thylakoids & chlorophyll' },
  { id: 'v3', term: 'Ribosome', definition: 'Molecular machine that synthesizes polypeptide chains' },
  { id: 'v4', term: 'Endoplasmic Reticulum', definition: 'Membrane network synthesizing proteins and lipids' },
];

const BROADCAST_CHANNEL_NAME = 'classlock_live_channel_v1';
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  } catch (e) {
    console.warn('BroadcastChannel not supported in this context', e);
  }
}

export type StorageListener = (session: LiveSession) => void;

class SessionStore {
  private sessions: Map<string, LiveSession> = new Map();
  private listeners: Set<StorageListener> = new Set();
  private currentTeacher: TeacherProfile | null = DEMO_TEACHER;

  constructor() {
    this.loadFromStorage();

    if (broadcastChannel) {
      broadcastChannel.onmessage = (event) => {
        if (event.data?.type === 'SESSION_UPDATE' && event.data.session) {
          const incoming: LiveSession = event.data.session;
          this.sessions.set(incoming.id, incoming);
          this.sessions.set(incoming.joinCode, incoming);
          this.notifyListeners(incoming);
        }
      };
    }
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('classlock_sessions');
      if (stored) {
        const parsed: LiveSession[] = JSON.parse(stored);
        parsed.forEach(sess => {
          this.sessions.set(sess.id, sess);
          this.sessions.set(sess.joinCode, sess);
        });
      }

      // Add a demo completed session if none exists
      if (!this.sessions.has('demo-session')) {
        const demoSession: LiveSession = {
          id: 'demo-session',
          joinCode: 'DEMO88',
          presentationId: 'pres-astronomy-1',
          presentationTitle: 'Planetary Systems & The Cosmos',
          teacherId: 'teacher-demo-1',
          teacherName: 'Prof. Sarah Jenkins',
          status: 'ended',
          currentSlideIndex: 4,
          lockMode: 'strict',
          isLockPaused: false,
          startedAt: new Date(Date.now() - 3600000).toISOString(),
          endedAt: new Date().toISOString(),
          participants: {
            'stu-1': {
              id: 'stu-1',
              name: 'Alex Rivera',
              studentIdNumber: 'STU-9021',
              joinedAt: new Date(Date.now() - 3500000).toISOString(),
              connected: false,
              isLockedOut: false,
              violationCount: 0,
              score: 45,
              lastActive: new Date().toISOString(),
              avatarColor: '#4F46E5',
            },
            'stu-2': {
              id: 'stu-2',
              name: 'Maya Lin',
              studentIdNumber: 'STU-9044',
              joinedAt: new Date(Date.now() - 3400000).toISOString(),
              connected: false,
              isLockedOut: false,
              violationCount: 1,
              score: 35,
              lastActive: new Date().toISOString(),
              avatarColor: '#10B981',
            },
            'stu-3': {
              id: 'stu-3',
              name: 'Tyler Vance',
              studentIdNumber: 'STU-9102',
              joinedAt: new Date(Date.now() - 3300000).toISOString(),
              connected: false,
              isLockedOut: true,
              violationCount: 3,
              score: 15,
              lastActive: new Date().toISOString(),
              avatarColor: '#EC4899',
            },
          },
          violations: [
            {
              id: 'viol-1',
              studentId: 'stu-2',
              studentName: 'Maya Lin',
              timestamp: new Date(Date.now() - 2000000).toISOString(),
              type: 'tab_switched',
              details: 'Left classroom tab',
            },
            {
              id: 'viol-2',
              studentId: 'stu-3',
              studentName: 'Tyler Vance',
              timestamp: new Date(Date.now() - 2500000).toISOString(),
              type: 'fullscreen_exited',
              details: 'Exited fullscreen mode',
            },
            {
              id: 'viol-3',
              studentId: 'stu-3',
              studentName: 'Tyler Vance',
              timestamp: new Date(Date.now() - 2200000).toISOString(),
              type: 'tab_switched',
              details: 'Switched window',
            },
            {
              id: 'viol-4',
              studentId: 'stu-3',
              studentName: 'Tyler Vance',
              timestamp: new Date(Date.now() - 1800000).toISOString(),
              type: 'shortcut_attempt',
              details: 'Blocked shortcut Ctrl+T (Strike 3 - Locked Out)',
            },
          ],
          responses: [
            {
              id: 'r-1',
              sessionId: 'demo-session',
              questionId: 'q-venus-temp',
              studentId: 'stu-1',
              studentName: 'Alex Rivera',
              selectedOptionId: 'opt-venus',
              isCorrect: true,
              pointsEarned: 10,
              submittedAt: new Date(Date.now() - 3000000).toISOString(),
            },
            {
              id: 'r-2',
              sessionId: 'demo-session',
              questionId: 'q-venus-temp',
              studentId: 'stu-2',
              studentName: 'Maya Lin',
              selectedOptionId: 'opt-venus',
              isCorrect: true,
              pointsEarned: 10,
              submittedAt: new Date(Date.now() - 3000000).toISOString(),
            },
            {
              id: 'r-3',
              sessionId: 'demo-session',
              questionId: 'q-venus-temp',
              studentId: 'stu-3',
              studentName: 'Tyler Vance',
              selectedOptionId: 'opt-merc',
              isCorrect: false,
              pointsEarned: 0,
              submittedAt: new Date(Date.now() - 3000000).toISOString(),
            },
          ],
        };
        this.sessions.set('demo-session', demoSession);
        this.sessions.set('DEMO88', demoSession);
      }

      const storedTeacher = localStorage.getItem('classlock_teacher');
      if (storedTeacher) {
        this.currentTeacher = JSON.parse(storedTeacher);
      }
    } catch (e) {
      console.error('Error loading sessions from localStorage', e);
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      // Gather unique sessions by id
      const uniqueSessions = Array.from(new Set(Array.from(this.sessions.values())));
      localStorage.setItem('classlock_sessions', JSON.stringify(uniqueSessions));
    } catch (e) {
      console.error('Error saving sessions to localStorage', e);
    }
  }

  private notifyListeners(session: LiveSession) {
    this.listeners.forEach(fn => fn(session));
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({
          type: 'SESSION_UPDATE',
          session,
        });
      } catch (err) {
        // ignore clone error if any
      }
    }

    // Sync to backend server so any external browser/device receives this immediately
    if (typeof window !== 'undefined' && session?.joinCode) {
      const pres = this.getPresentationById(session.presentationId);
      fetch(`/api/sessions/${session.joinCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, presentation: pres }),
      }).catch(() => {});
    }
  }

  public async fetchServerSession(code: string): Promise<{ session: LiveSession; presentation?: Presentation } | null> {
    const cleanCode = code.toUpperCase();
    try {
      const res = await fetch(`/api/sessions/${cleanCode}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.session) {
        this.sessions.set(data.session.id, data.session);
        this.sessions.set(cleanCode, data.session);
        if (data.presentation) {
          this.savePresentation(data.presentation);
        }
        return data;
      }
    } catch (e) {
      console.warn('Could not fetch session from server', e);
    }
    return null;
  }

  public updateSessionLocally(session: LiveSession) {
    this.sessions.set(session.id, session);
    this.sessions.set(session.joinCode, session);
    this.saveToStorage();
    this.listeners.forEach(fn => fn(session));
  }

  public subscribe(listener: StorageListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getTeacher(): TeacherProfile | null {
    return this.currentTeacher;
  }

  public setTeacher(teacher: TeacherProfile | null) {
    this.currentTeacher = teacher;
    if (typeof window !== 'undefined') {
      if (teacher) {
        localStorage.setItem('classlock_teacher', JSON.stringify(teacher));
      } else {
        localStorage.removeItem('classlock_teacher');
      }
    }
  }

  public getPresentations(): Presentation[] {
    if (typeof window === 'undefined') return INITIAL_PRESENTATIONS;
    try {
      const stored = localStorage.getItem('classlock_presentations');
      if (stored) {
        const parsed: Presentation[] = JSON.parse(stored);
        const existingIds = new Set(parsed.map(p => p.id));
        const missingDefaults = INITIAL_PRESENTATIONS.filter(p => !existingIds.has(p.id));
        if (missingDefaults.length > 0) {
          const merged = [...missingDefaults, ...parsed];
          localStorage.setItem('classlock_presentations', JSON.stringify(merged));
          return merged;
        }
        return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_PRESENTATIONS;
  }

  public savePresentation(presentation: Presentation) {
    const list = this.getPresentations();
    const idx = list.findIndex(p => p.id === presentation.id);
    if (idx >= 0) {
      list[idx] = { ...presentation, updatedAt: new Date().toISOString() };
    } else {
      list.unshift(presentation);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('classlock_presentations', JSON.stringify(list));
    }
  }

  public deletePresentation(id: string) {
    const list = this.getPresentations().filter(p => p.id !== id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('classlock_presentations', JSON.stringify(list));
    }
  }

  public getPresentationById(id: string): Presentation | undefined {
    return this.getPresentations().find(p => p.id === id);
  }

  public createSession(presentationId: string, customJoinCode?: string): LiveSession {
    const pres = this.getPresentationById(presentationId) || INITIAL_PRESENTATIONS[0];
    const teacher = this.currentTeacher || DEMO_TEACHER;
    const joinCode = customJoinCode ? customJoinCode.toUpperCase() : generateJoinCode();
    const id = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const newSession: LiveSession = {
      id,
      joinCode,
      presentationId: pres.id,
      presentationTitle: pres.title,
      teacherId: teacher.id,
      teacherName: teacher.name,
      status: 'live',
      currentSlideIndex: 0,
      lockMode: 'strict',
      isLockPaused: false,
      participants: {},
      violations: [],
      responses: [],
      startedAt: new Date().toISOString(),
    };

    this.sessions.set(id, newSession);
    this.sessions.set(joinCode, newSession);
    this.saveToStorage();
    this.notifyListeners(newSession);
    return newSession;
  }

  public getSession(idOrCode: string): LiveSession | undefined {
    return this.sessions.get(idOrCode) || this.sessions.get(idOrCode.toUpperCase());
  }

  public joinSession(joinCode: string, studentName: string, studentIdNumber?: string): { session?: LiveSession; studentId?: string; error?: string } {
    const normalized = joinCode.trim().toUpperCase();
    const session = this.getSession(normalized);
    if (!session) {
      return { error: 'Invalid join code. Please check with your teacher.' };
    }
    if (session.status === 'ended') {
      return { error: 'This presentation session has ended.' };
    }

    const studentId = `stu-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const avatarColors = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'];
    const avatarColor = avatarColors[Object.keys(session.participants).length % avatarColors.length];

    const newParticipant: Participant = {
      id: studentId,
      name: studentName.trim() || 'Anonymous Student',
      studentIdNumber: studentIdNumber?.trim(),
      joinedAt: new Date().toISOString(),
      connected: true,
      isLockedOut: false,
      violationCount: 0,
      score: 0,
      lastActive: new Date().toISOString(),
      avatarColor,
    };

    session.participants[studentId] = newParticipant;
    this.sessions.set(session.id, session);
    this.sessions.set(session.joinCode, session);
    this.saveToStorage();
    this.notifyListeners(session);

    return { session, studentId };
  }

  public updateSlide(sessionId: string, newSlideIndex: number) {
    const session = this.getSession(sessionId);
    if (!session) return;
    const pres = this.getPresentationById(session.presentationId);
    const maxIndex = pres ? pres.slides.length - 1 : 0;
    session.currentSlideIndex = Math.max(0, Math.min(newSlideIndex, maxIndex));
    // Clear active question when moving slides unless teacher re-pushes
    session.activeQuestion = undefined;
    session.activeGame = undefined;
    this.saveToStorage();
    this.notifyListeners(session);
  }

  public pushQuestion(sessionId: string, question: Question) {
    const session = this.getSession(sessionId);
    if (!session) return;

    const startedAt = Date.now();
    const expiresAt = question.timeLimitSeconds && question.timeLimitSeconds > 0
      ? startedAt + question.timeLimitSeconds * 1000
      : undefined;

    session.activeQuestion = {
      question,
      startedAt,
      expiresAt,
      revealed: false,
      acceptingAnswers: true,
    };
    this.saveToStorage();
    this.notifyListeners(session);
  }

  public revealQuestion(sessionId: string) {
    const session = this.getSession(sessionId);
    if (!session || !session.activeQuestion) return;
    session.activeQuestion.revealed = true;
    session.activeQuestion.acceptingAnswers = false;
    this.saveToStorage();
    this.notifyListeners(session);
  }

  public closeQuestion(sessionId: string) {
    const session = this.getSession(sessionId);
    if (!session || !session.activeQuestion) return;
    session.activeQuestion.acceptingAnswers = false;
    this.saveToStorage();
    this.notifyListeners(session);
  }

  public dismissQuestion(sessionId: string) {
    const session = this.getSession(sessionId);
    if (!session) return;
    session.activeQuestion = undefined;
    this.saveToStorage();
    this.notifyListeners(session);
  }

  public submitResponse(
    sessionId: string,
    studentId: string,
    submission: { selectedOptionId?: string; textAnswer?: string }
  ): StudentResponse | null {
    const session = this.getSession(sessionId) || Array.from(this.sessions.values()).find(s => s.id === sessionId || s.joinCode === sessionId.toUpperCase());
    if (!session || !session.activeQuestion) return null;

    const student = session.participants[studentId];
    if (!student) return null;

    // Check if already submitted
    const existingIdx = session.responses.findIndex(
      r => r.sessionId === session.id && r.questionId === session.activeQuestion!.question.id && r.studentId === studentId
    );

    const evalResult = evaluateResponse(session.activeQuestion.question, submission);

    const response: StudentResponse = {
      id: `resp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sessionId: session.id,
      questionId: session.activeQuestion.question.id,
      studentId,
      studentName: student.name,
      selectedOptionId: submission.selectedOptionId,
      textAnswer: submission.textAnswer,
      isCorrect: evalResult.isCorrect,
      pointsEarned: evalResult.pointsEarned,
      submittedAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      const prevPoints = session.responses[existingIdx].pointsEarned;
      student.score = Math.max(0, student.score - prevPoints + evalResult.pointsEarned);
      session.responses[existingIdx] = response;
    } else {
      student.score += evalResult.pointsEarned;
      session.responses.push(response);
    }

    student.lastActive = new Date().toISOString();
    this.saveToStorage();
    this.notifyListeners(session);
    return response;
  }

  public reportViolation(
    sessionId: string,
    studentId: string,
    type: StudentViolation['type'],
    details?: string
  ): StudentViolation | null {
    const session = this.getSession(sessionId) || Array.from(this.sessions.values()).find(s => s.id === sessionId || s.joinCode === sessionId.toUpperCase());
    if (!session) return null;

    const student = session.participants[studentId];
    if (!student) return null;

    if (session.lockMode === 'off' || session.isLockPaused) {
      return null;
    }

    student.violationCount += 1;
    student.lastActive = new Date().toISOString();

    const violation: StudentViolation = {
      id: `viol-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      studentId,
      studentName: student.name,
      timestamp: new Date().toISOString(),
      type,
      details,
    };

    session.violations.unshift(violation);

    const status = calculateStudentViolationStatus(student.violationCount, session.lockMode);
    student.isLockedOut = status.isLockedOut;

    this.saveToStorage();
    this.notifyListeners(session);
    return violation;
  }

  public setLockMode(sessionId: string, mode: LockMode) {
    const session = this.getSession(sessionId);
    if (!session) return;
    session.lockMode = mode;
    // Recompute lock status for all participants
    Object.values(session.participants).forEach(p => {
      const status = calculateStudentViolationStatus(p.violationCount, mode);
      p.isLockedOut = status.isLockedOut;
    });
    this.saveToStorage();
    this.notifyListeners(session);
  }

  public toggleLockPause(sessionId: string) {
    const session = this.getSession(sessionId);
    if (!session) return;
    session.isLockPaused = !session.isLockPaused;
    this.saveToStorage();
    this.notifyListeners(session);
  }

  public unlockStudent(sessionId: string, studentId: string) {
    const session = this.getSession(sessionId);
    if (!session) return;
    const student = session.participants[studentId];
    if (student) {
      student.isLockedOut = false;
      student.violationCount = 0; // Reset violations after teacher pardon
      this.saveToStorage();
      this.notifyListeners(session);
    }
  }

  public removeStudent(sessionId: string, studentId: string) {
    const session = this.getSession(sessionId);
    if (!session) return;
    delete session.participants[studentId];
    this.saveToStorage();
    this.notifyListeners(session);
  }

  public launchGame(sessionId: string, gameId: 'quiz_race' | 'memory_match', gameData?: any) {
    const session = this.getSession(sessionId);
    if (!session) return;
    const gameTitles: Record<string, string> = {
      quiz_race: 'Quiz Race Arena',
      memory_match: 'Vocabulary Memory Match',
    };
    session.activeGame = {
      gameId,
      gameTitle: gameTitles[gameId] || 'Classroom Game',
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      currentQuestionIndex: 0,
      gameData: gameData || {},
    };
    session.activeQuestion = undefined;
    this.saveToStorage();
    this.notifyListeners(session);
  }

  public updateGameScore(sessionId: string, studentId: string, additionalPoints: number) {
    const session = this.getSession(sessionId);
    if (!session) return;
    const student = session.participants[studentId];
    if (student) {
      student.score += additionalPoints;
      this.saveToStorage();
      this.notifyListeners(session);
    }
  }

  public endGame(sessionId: string) {
    const session = this.getSession(sessionId);
    if (!session) return;
    session.activeGame = undefined;
    this.saveToStorage();
    this.notifyListeners(session);
  }

  public sendReaction(
    sessionId: string,
    studentId: string,
    studentName: string,
    type: 'hand_raise' | 'confused' | 'understood' | 'fire'
  ) {
    const session = this.getSession(sessionId);
    if (!session) return;
    if (!session.reactions) session.reactions = [];

    const reaction = {
      id: `react-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      studentId,
      studentName,
      type,
      timestamp: Date.now(),
    };

    session.reactions.push(reaction);
    // Keep reactions from the last 60 seconds
    const cutoff = Date.now() - 60000;
    session.reactions = session.reactions.filter(r => r.timestamp > cutoff);

    this.saveToStorage();
    this.notifyListeners(session);
  }

  public submitStudentQuestion(
    sessionId: string,
    studentId: string,
    studentName: string,
    text: string
  ) {
    const session = this.getSession(sessionId);
    if (!session) return;
    if (!session.studentQuestions) session.studentQuestions = [];

    const item = {
      id: `sq-${Date.now()}`,
      studentId,
      studentName,
      text: text.trim(),
      timestamp: new Date().toISOString(),
      isAnswered: false,
    };

    session.studentQuestions.unshift(item);
    this.saveToStorage();
    this.notifyListeners(session);
  }

  public markQuestionAnswered(sessionId: string, questionId: string) {
    const session = this.getSession(sessionId);
    if (!session || !session.studentQuestions) return;
    const q = session.studentQuestions.find(item => item.id === questionId);
    if (q) {
      q.isAnswered = true;
      this.saveToStorage();
      this.notifyListeners(session);
    }
  }

  public launchQuickPoll(
    sessionId: string,
    prompt: string,
    options: { id: string; text: string }[]
  ) {
    const session = this.getSession(sessionId);
    if (!session) return;

    const quickQ: Question = {
      id: `quick-${Date.now()}`,
      type: 'poll',
      prompt,
      points: 5,
      timeLimitSeconds: 20,
      options,
    };

    this.pushQuestion(session.id, quickQ);
  }

  public endSession(sessionId: string) {
    const session = this.getSession(sessionId);
    if (!session) return;
    session.status = 'ended';
    session.endedAt = new Date().toISOString();
    this.saveToStorage();
    this.notifyListeners(session);
  }
}

export const sessionStore = new SessionStore();
