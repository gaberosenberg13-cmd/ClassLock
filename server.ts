import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

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
    const { session, presentation } = req.body;
    if (session) {
      const existing = serverSessions.get(code);
      if (existing?.session) {
        // Merge participants, responses, and violations so student actions and teacher controls never overwrite each other
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
      }
      serverSessions.set(code, { session, presentation: presentation || existing?.presentation });
      broadcastToSession(code, { type: 'SESSION_UPDATE', session, presentation: presentation || existing?.presentation });
    }
    res.json({ success: true });
  });

  // SSE Stream endpoint for real-time live sessions
  app.get('/api/sessions/:code/stream', (req: Request, res: Response) => {
    const code = req.params.code.toUpperCase();

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

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
    }, 20000);

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
