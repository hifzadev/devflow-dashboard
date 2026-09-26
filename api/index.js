// Vercel serverless entry point — wraps the Express app
// Vercel calls this file as a serverless function for all /api/* routes.
const app = require('../backend/src/server');

module.exports = app;
