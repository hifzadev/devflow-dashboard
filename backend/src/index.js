const app = require('./server');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`[devflow-ai] Backend API running on http://localhost:${PORT}`);
  console.log(`[devflow-ai] Health: http://localhost:${PORT}/api/health`);
});
