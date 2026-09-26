// Items API - Main application entry point
// TODO: add request logging middleware before deploying
const express = require('express');
const itemRoutes = require('./routes/items');

const app = express();
app.use(express.json());

console.log('Starting Items API server...');

app.use('/items', itemRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Items API running on port ${PORT}`);
});

module.exports = app;
