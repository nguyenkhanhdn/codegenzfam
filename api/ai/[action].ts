import express from 'express';
import { registerAiRoutes } from '../../server/aiRoutes.js';

// Separate from server.ts: no SQLite, disk writes, Vite or app.listen on Vercel.
const app = express();
app.use(express.json({ limit: '128kb' }));
app.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
registerAiRoutes(app);
export default app;
