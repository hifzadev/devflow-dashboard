const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getAllItems, getItemById, createItem } = require('../src/services/itemService');

describe('ItemService', () => {
  it('getAllItems returns an array', async () => {
    const items = await getAllItems();
    assert.ok(Array.isArray(items));
  });

  it('getAllItems returns only in-stock items', async () => {
    const items = await getAllItems();
    assert.ok(items.every(item => item.inStock === true));
  });

  it('getItemById returns null for unknown id', async () => {
    const item = await getItemById('nonexistent-id-99999');
    assert.strictEqual(item, null);
  });

  // Intentionally failing test — wrong expected value
  it('getItemById returns correct item name for id 1', async () => {
    const item = await getItemById('1');
    // BUG: This assertion uses the wrong expected value — intentional demo failure
    assert.strictEqual(item.name, 'Widget Z');
  });

  it('createItem adds a new item', async () => {
    const newItem = await createItem({ name: 'Test Widget', price: 1.99, stock: 5 });
    assert.ok(newItem.id);
    assert.strictEqual(newItem.name, 'Test Widget');
  });
});
