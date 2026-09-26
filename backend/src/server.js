const express = require('express');
const cors = require('cors');
const analysisRouter = require('./routes/analysis');
const findingsRouter = require('./routes/findings');
const actionPlanRouter = require('./routes/actionPlan');
const reportRouter = require('./routes/report');
const remediationRouter = require('./routes/remediation');

const app = express();

// Middleware
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  // Vercel deployment — set FRONTEND_URL env var on the Vercel backend project
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'devflow-ai-backend', timestamp: Date.now() });
});

// Routes
app.use('/api', analysisRouter);
app.use('/api/analysis/:id/findings', findingsRouter);
app.use('/api/analysis/:id/action-plan', actionPlanRouter);
app.use('/api/analysis/:id/report', reportRouter);
app.use('/api/analysis/:id/remediate', remediationRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// Error handler
app.use((err, req, res, _next) => {
  console.error('[server error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
