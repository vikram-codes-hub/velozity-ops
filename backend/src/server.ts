

import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Server as SocketIOServer } from 'socket.io';

import { errorHandler } from './middleware/errorHandler';
import { initSocket } from './sockets'; // room setup, presence, auth handshake
import { startOverdueTaskCron } from './jobs/overdueJob';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import clientRoutes from './routes/client.routes';
import projectRoutes from './routes/project.routes';
import taskRoutes from './routes/task.routes';
import notificationRoutes from './routes/notification.routes';
import activityRoutes from './routes/activity.routes';
import aiRoutes from './routes/ai.routes';

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const rawClientOrigins = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
const allowedOrigins = rawClientOrigins
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const checkCorsOrigin = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
) => {
  // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
  if (!origin) return callback(null, true);

  const isAllowed =
    allowedOrigins.includes(origin) ||
    allowedOrigins.includes('*') ||
    /\.vercel\.app$/.test(origin);

  if (isAllowed) {
    return callback(null, true);
  }

  // Permissive fallback so production Vercel apps never get CORS blocked
  return callback(null, true);
};

const app = express();
const httpServer = http.createServer(app);



app.use(
  cors({
    origin: checkCorsOrigin,
    credentials: true, 
  })
);
app.use(cookieParser());
app.use(express.json());

// health check

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

//routes

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/ai', aiRoutes);



app.use('/api', (_req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Route not found.' },
  });
});



app.use(errorHandler);

// WebSocket layer

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: checkCorsOrigin,
    credentials: true,
  },
});

app.set('io', io);

initSocket(io); // handles JWT auth on connection, room joins, presence, feed emits

// background jobs

startOverdueTaskCron(io); // io is passed so a flagged task can also emit a feed event

//boot

httpServer.listen(PORT, () => {
  console.log(`API + WebSocket server listening on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down.');
  httpServer.close(() => process.exit(0));
});

export { app, io };