import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.APP_PORT || (process.env.PORT && process.env.PORT !== '8080' ? process.env.PORT : 3000));

// In-memory server session store across all connected clients & devices
const serverSessions: Map<string, { session: any; presentation?: any }> = new Map();

// SSE Client list per joinCode
const sseClients: Map<string, Set<Response>> = new Map();

function broadcastToSession(joinCode: string, payload: any) {
  const clients = sseClients.get(joinCode.toUpperCase());
  if (clients) {
    const dataString = `data: ${JSON.stringify(payload)}\n\n`;
    clients.forEach(client => {
      try {
        client.write(dataString);
      } catch (err) {
        // client disconnected
        clients.delete(client);
      }
    });
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Fetch session by room code across any device/browser
  app.get('/api/sessions/:code', (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    const code = req.params.code.toUpperCase();
    const data = serverSessions.get(code);
    if (!data) {
      return res.status(404).json({ error: 'Session not found or has ended' });
    }
    res.json(data);
  });

  // Store or update live session state and broadcast to all connected devices
  app.post('/api/sessions/:code', (req: Request, res: Response) => {
    const code = req.params.code.toUpperCase();
    const { session, presentation, role } = req.body;
    if (session) {
      const existing = serverSessions.get(code);
      if (existing?.session) {
        // Merge student-generated collections so teacher and student updates never drop student submissions
        session.participants = {
          ...(existing.session.participants || {}),
          ...(session.participants || {}),
        };

        const existingResponses = existing.session.responses || [];
        const incomingResponses = session.responses || [];
        const mergedResponses = [...existingResponses, ...incomingResponses];
        session.responses = mergedResponses.filter(
          (r, idx, arr) => arr.findIndex(item => item.id === r.id) === idx
        );

        const existingViolations = existing.session.violations || [];
        const incomingViolations = session.violations || [];
        const mergedViolations = [...existingViolations, ...incomingViolations];
        session.violations = mergedViolations.filter(
          (v, idx, arr) => arr.findIndex(item => item.id === v.id) === idx
        );

        const existingReactions = existing.session.reactions || [];
        const incomingReactions = session.reactions || [];
        session.reactions = [...incomingReactions, ...existingReactions].slice(0, 50);

        const existingQuestions = existing.session.studentQuestions || [];
        const incomingQuestions = session.studentQuestions || [];
        session.studentQuestions = [...incomingQuestions, ...existingQuestions].filter(
          (q, idx, arr) => arr.findIndex(item => item.id === q.id) === idx
        );

        // CRITICAL: Protect teacher-authoritative state if incoming update is from a student device
        if (role === 'student') {
          session.currentSlideIndex = existing.session.currentSlideIndex;
          session.lockMode = existing.session.lockMode;
          session.isLockPaused = existing.session.isLockPaused;
          session.activeQuestion = existing.session.activeQuestion;
          session.activeGame = existing.session.activeGame;
          session.laserPointer = existing.session.laserPointer;
          session.status = existing.session.status;
          session.presentationId = existing.session.presentationId;
        }
      }

      serverSessions.set(code, { session, presentation: presentation || existing?.presentation });
      broadcastToSession(code, { type: 'SESSION_UPDATE', session, presentation: presentation || existing?.presentation });
    }
    res.json({ success: true });
  });

  // Dedicated low-latency laser pointer broadcast endpoint
  app.post('/api/sessions/:code/laser', (req: Request, res: Response) => {
    const code = req.params.code.toUpperCase();
    const { laser } = req.body;
    if (laser) {
      const existing = serverSessions.get(code);
      if (existing?.session) {
        existing.session.laserPointer = laser;
      }
      broadcastToSession(code, { type: 'LASER_MOVE', laser });
    }
    res.json({ success: true });
  });

  // SSE Stream endpoint for real-time live sessions
  app.get('/api/sessions/:code/stream', (req: Request, res: Response) => {
    const code = req.params.code.toUpperCase();

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform, private',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    const active = serverSessions.get(code);
    res.write(`data: ${JSON.stringify({
      type: 'CONNECTED',
      code,
      timestamp: Date.now(),
      session: active?.session,
      presentation: active?.presentation
    })}\n\n`);

    if (!sseClients.has(code)) {
      sseClients.set(code, new Set());
    }
    const clients = sseClients.get(code)!;
    clients.add(res);

    const pingInterval = setInterval(() => {
      try {
        res.write(`: ping\n\n`);
      } catch (e) {
        clearInterval(pingInterval);
      }
    }, 10000);

    req.on('close', () => {
      clearInterval(pingInterval);
      clients.delete(res);
      if (clients.size === 0) {
        sseClients.delete(code);
      }
    });
  });

  // Relay broadcast endpoint
  app.post('/api/sessions/:code/broadcast', (req: Request, res: Response) => {
    const code = req.params.code.toUpperCase();
    const event = req.body;
    if (event?.session) {
      serverSessions.set(code, { session: event.session, presentation: event.presentation });
    }
    broadcastToSession(code, event);
    res.json({ success: true });
  });

  // AI Checkpoint Question Generation Endpoint via Gemini
  app.post('/api/ai/generate-questions', async (req: Request, res: Response) => {
    try {
      const { slides } = req.body;
      if (!slides || !Array.isArray(slides) || slides.length === 0) {
        return res.status(400).json({ error: 'Please provide at least one slide to analyze.' });
      }

      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      let generatedList: any[] = [];

      if (apiKey) {
        // Initialize Gemini SDK with telemetry header
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const questionSchema = {
          type: Type.OBJECT,
          properties: {
            slideIndex: {
              type: Type.INTEGER,
              description: 'The index of the slide corresponding to this question (0-indexed)',
            },
            prompt: {
              type: Type.STRING,
              description: 'The question text presented to students',
            },
            type: {
              type: Type.STRING,
              description: 'Question type: multiple_choice, true_false, or short_answer',
            },
            points: {
              type: Type.INTEGER,
              description: 'Points awarded for correct answer (e.g. 10 or 15)',
            },
            timeLimitSeconds: {
              type: Type.INTEGER,
              description: 'Countdown time limit in seconds (e.g. 20, 25, or 30)',
            },
            options: {
              type: Type.ARRAY,
              description: 'List of options for multiple choice or true/false (at least 2, 4 for multiple choice)',
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: 'Unique option identifier, e.g. opt-1' },
                  text: { type: Type.STRING, description: 'Option text' },
                  isCorrect: { type: Type.BOOLEAN, description: 'True if this is the correct answer' },
                },
                required: ['id', 'text', 'isCorrect'],
              },
            },
            correctAnswerText: {
              type: Type.STRING,
              description: 'For short answer questions, the expected answer text',
            },
            explanation: {
              type: Type.STRING,
              description: 'Brief pedagogical explanation of why the correct answer is right',
            },
          },
          required: ['slideIndex', 'prompt', 'type', 'points', 'timeLimitSeconds', 'options', 'explanation'],
        };

        const prompt = `You are a master educator and instructional designer.
Analyze the following lecture slide(s) and generate a conceptual, active-recall checkpoint question for each slide.
For each slide:
- Test core understanding, analysis, or application of the concepts presented (avoid trivial trivia).
- Favor 'multiple_choice' (4 options, exactly 1 marked isCorrect: true) or 'true_false' (2 options, exactly 1 marked isCorrect: true).
- Provide a clear, instructive explanation that will help students learn when answers are revealed.
- Assign 10 or 15 points and 25-30 seconds timer.

Slides to analyze:
${slides.map((s: any, idx: number) => `Slide #${s.index !== undefined ? s.index + 1 : idx + 1} (Slide Index: ${s.index !== undefined ? s.index : idx}):
Title: ${s.title || 'Untitled'}
Content:
${Array.isArray(s.content) ? s.content.map((c: string) => `- ${c}`).join('\n') : s.content || ''}
${s.notes ? `Presenter Notes: ${s.notes}` : ''}`).join('\n\n--- \n\n')}
`;

        const modelsToTry = ['gemini-3.8-flash', 'gemini-flash-latest'];

        for (const modelName of modelsToTry) {
          try {
            const generatePromise = ai.models.generateContent({
              model: modelName,
              contents: prompt,
              config: {
                systemInstruction: 'You are an expert instructional designer who writes clear, fair, thought-provoking active recall checkpoint questions for classroom presentations.',
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.ARRAY,
                  items: questionSchema,
                },
              },
            });

            // Set a strict 6-second timeout so the user UI never stalls
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('AI request timeout')), 6000)
            );

            const response: any = await Promise.race([generatePromise, timeoutPromise]);

            if (response && response.text) {
              const parsed = JSON.parse(response.text.trim());
              if (Array.isArray(parsed) && parsed.length > 0) {
                generatedList = parsed;
                break;
              }
            }
          } catch (genErr: any) {
            console.warn(`Model ${modelName} attempt:`, genErr?.message || genErr);
          }
        }
      }

      // If AI model returned questions, format and return them
      if (generatedList.length > 0) {
        const formatted = generatedList.map((item, i) => {
          const targetSlide = slides[i] || slides.find((s: any) => s.index === item.slideIndex) || slides[0];
          const slideIndex = item.slideIndex !== undefined ? item.slideIndex : (targetSlide.index ?? i);
          
          return {
            slideIndex,
            slideId: targetSlide.id,
            question: {
              id: `q-ai-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
              type: item.type || 'multiple_choice',
              prompt: item.prompt,
              points: item.points || 10,
              timeLimitSeconds: item.timeLimitSeconds || 25,
              options: (item.options || []).map((opt: any, oIdx: number) => ({
                id: opt.id || `opt-${oIdx + 1}`,
                text: opt.text,
                isCorrect: Boolean(opt.isCorrect),
              })),
              correctAnswerText: item.correctAnswerText,
              explanation: item.explanation || 'Review the slide notes and key concepts above.',
            },
          };
        });

        return res.json({ success: true, questions: formatted, source: 'gemini' });
      }

      // Smart fallback heuristic generator if API quota or temporary service unavailability
      const fallbackQuestions = slides.map((s: any, idx: number) => {
        const title = s.title || 'Key Concept';
        const bullets: string[] = Array.isArray(s.content) ? s.content : (s.content ? [s.content] : []);
        const primaryConcept = bullets[0] || title;
        const slideIndex = s.index !== undefined ? s.index : idx;

        return {
          slideIndex,
          slideId: s.id,
          question: {
            id: `q-gen-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            type: 'multiple_choice' as const,
            prompt: `Based on "${title}", which statement best reflects the central takeaway?`,
            points: 10,
            timeLimitSeconds: 25,
            options: [
              {
                id: 'opt-1',
                text: primaryConcept.length > 90 ? primaryConcept.substring(0, 90) + '...' : primaryConcept,
                isCorrect: true,
              },
              {
                id: 'opt-2',
                text: 'The concept is purely theoretical and does not apply to live organizations or systems.',
                isCorrect: false,
              },
              {
                id: 'opt-3',
                text: 'It only operates under isolated laboratory conditions without practical relevance.',
                isCorrect: false,
              },
              {
                id: 'opt-4',
                text: 'It has been completely superseded by historical precedence.',
                isCorrect: false,
              },
            ],
            explanation: `Correct! ${primaryConcept} represents the key principle outlined on this slide.`,
          },
        };
      });

      return res.json({ success: true, questions: fallbackQuestions, source: 'heuristic-fallback' });
    } catch (err: any) {
      console.error('Unhandled error in /api/ai/generate-questions:', err);
      res.status(500).json({ error: err?.message || 'Failed to generate questions' });
    }
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ClassLock server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
