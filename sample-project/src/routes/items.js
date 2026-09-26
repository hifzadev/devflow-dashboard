const express = require('express');
const router = express.Router();
const itemService = require('../services/itemService');

// GET /items — list all items
router.get('/', async (req, res) => {
  const items = await itemService.getAllItems();
  res.json(items);
});

// GET /items/:id — get single item
// Missing try/catch — if itemService throws, the server will crash
router.get('/:id', async (req, res) => {
  const item = await itemService.getItemById(req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }
  res.json(item);
});

// POST /items — create item
// Uses DB_URL env var but it is not documented anywhere
router.post('/', async (req, res) => {
  const dbUrl = process.env.DB_URL;
  console.log('DB_URL configured:', !!dbUrl);
  const item = await itemService.createItem(req.body);
  res.status(201).json(item);
});

module.exports = router;
