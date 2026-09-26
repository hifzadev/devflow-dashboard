// ItemService — manages in-memory item storage
// FIXME: duplicated fetch logic below should be refactored into a shared helper

const items = [
  { id: '1', name: 'Widget A', price: 9.99, stock: 100 },
  { id: '2', name: 'Widget B', price: 14.99, stock: 50 },
  { id: '3', name: 'Widget C', price: 4.99, stock: 200 },
];

async function getAllItems() {
  // Duplicated filtering/mapping block — should share a helper
  const result = items
    .filter(item => item.stock > 0)
    .map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      inStock: item.stock > 0,
    }));
  return result;
}

async function getItemById(id) {
  // Duplicated filtering/mapping block (same structure as getAllItems)
  const result = items
    .filter(item => item.stock > 0)
    .map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      inStock: item.stock > 0,
    }));
  return result.find(item => item.id === id) || null;
}

async function createItem(data) {
  const newItem = {
    id: String(items.length + 1),
    name: data.name,
    price: data.price || 0,
    stock: data.stock || 0,
  };
  items.push(newItem);
  return newItem;
}

async function updateItem(id, data) {
  const index = items.findIndex(item => item.id === id);
  if (index === -1) return null;
  items[index] = { ...items[index], ...data };
  return items[index];
}

async function deleteItem(id) {
  const index = items.findIndex(item => item.id === id);
  if (index === -1) return false;
  items.splice(index, 1);
  return true;
}

// TODO: add pagination support
// TODO: add sorting and filtering options
function buildQuery(filters) {
  let query = {};
  if (filters.name) {
    query.name = filters.name;
  }
  if (filters.minPrice) {
    query.minPrice = Number(filters.minPrice);
  }
  if (filters.maxPrice) {
    query.maxPrice = Number(filters.maxPrice);
  }
  if (filters.inStock) {
    query.inStock = filters.inStock === 'true';
  }
  if (filters.category) {
    query.category = filters.category;
  }
  if (filters.sortBy) {
    query.sortBy = filters.sortBy;
  }
  if (filters.sortDir) {
    query.sortDir = filters.sortDir;
  }
  if (filters.limit) {
    query.limit = Number(filters.limit);
  }
  if (filters.offset) {
    query.offset = Number(filters.offset);
  }
  return query;
}

module.exports = { getAllItems, getItemById, createItem, updateItem, deleteItem, buildQuery };
