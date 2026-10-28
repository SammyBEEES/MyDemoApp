import { Platform } from 'react-native';
import { getDB, generateId } from '../db/init';
import {
  webGetAllBoxes,
  webAddBox,
  webGetBoxById,
  webGetItemsByBoxId,
  webGetAllItems,
  webAddItem,
  webGetItemById,
  webUpdateItem,
  webDeleteItem,
  webLinkItemToEbay,
} from './webStore';

const now = () => Date.now();

export const getAllBoxes = async () => {
  if (Platform.OS === 'web') return webGetAllBoxes();
  const db = getDB();
  if (!db) return webGetAllBoxes();
  try {
    if (db.getAllSync) return db.getAllSync('SELECT * FROM boxes ORDER BY createdAt DESC');
  } catch {}
  return new Promise((resolve) => {
    db.transaction((tx) => {
      tx.executeSql('SELECT * FROM boxes ORDER BY createdAt DESC', [], (_, { rows }) => resolve(rows._array || []), () => { resolve([]); return false; });
    });
  });
};

export const addBox = async (box) => {
  if (Platform.OS === 'web') return webAddBox(box);
  const db = getDB();
  if (!db) return webAddBox(box);
  const id = box.id || (await generateId());
  const ts = now();
  try {
    if (db.runSync) {
      db.runSync('INSERT INTO boxes (id, name, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [id, box.name || 'Untitled Box', box.description || '', box.createdAt || ts, ts]);
      return id;
    }
  } catch {
    return webAddBox({ ...box, id });
  }
  return new Promise((resolve) => {
    db.transaction((tx) => {
      tx.executeSql('INSERT INTO boxes (id, name, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [id, box.name || 'Untitled Box', box.description || '', box.createdAt || ts, ts], () => resolve(id), () => { resolve(webAddBox({ ...box, id })); return false; });
    });
  });
};

export const getBoxById = async (id) => {
  if (Platform.OS === 'web') return webGetBoxById(id);
  const db = getDB();
  if (!db) return webGetBoxById(id);
  try {
    if (db.getFirstSync) return db.getFirstSync('SELECT * FROM boxes WHERE id = ?', [id]);
  } catch {}
  return new Promise((resolve) => {
    db.transaction((tx) => {
      tx.executeSql('SELECT * FROM boxes WHERE id = ?', [id], (_, { rows }) => resolve(rows.length > 0 ? rows.item(0) : null), () => { resolve(null); return false; });
    });
  });
};

export const getItemsByBoxId = async (boxId) => {
  if (Platform.OS === 'web') return webGetItemsByBoxId(boxId);
  const db = getDB();
  if (!db) return webGetItemsByBoxId(boxId);
  try {
    if (db.getAllSync) return db.getAllSync('SELECT * FROM items WHERE boxId = ? ORDER BY createdAt DESC', [boxId]);
  } catch {}
  return new Promise((resolve) => {
    db.transaction((tx) => {
      tx.executeSql('SELECT * FROM items WHERE boxId = ? ORDER BY createdAt DESC', [boxId], (_, { rows }) => resolve(rows._array || []), () => { resolve([]); return false; });
    });
  });
};

export const getAllItems = async () => {
  if (Platform.OS === 'web') return webGetAllItems();
  const db = getDB();
  if (!db) return webGetAllItems();
  try {
    if (db.getAllSync) return db.getAllSync('SELECT * FROM items ORDER BY createdAt DESC');
  } catch {}
  return new Promise((resolve) => {
    db.transaction((tx) => {
      tx.executeSql('SELECT * FROM items ORDER BY createdAt DESC', [], (_, { rows }) => resolve(rows._array || []), () => { resolve([]); return false; });
    });
  });
};

export const addItem = async (item) => {
  if (Platform.OS === 'web') return webAddItem(item);
  const db = getDB();
  if (!db) return webAddItem(item);
  const id = item.id || (await generateId());
  const ts = now();
  const values = [
    id,
    item.boxId || null,
    item.name || '',
    item.description || '',
    item.quantity ?? 1,
    item.location || '',
    item.category || '',
    item.imageUri || null,
    item.createdAt || ts,
    item.updatedAt || ts,
    0,
    item.ebayItemId || null,
    item.ebaySku || null,
  ];
  try {
    if (db.runSync) {
      db.runSync(
        `INSERT INTO items (id, boxId, name, description, quantity, location, category, imageUri, createdAt, updatedAt, synced, ebayItemId, ebaySku)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        values
      );
      return id;
    }
  } catch {
    return webAddItem({ ...item, id });
  }
  return new Promise((resolve) => {
    db.transaction((tx) => {
      tx.executeSql(
        `INSERT INTO items (id, boxId, name, description, quantity, location, category, imageUri, createdAt, updatedAt, synced, ebayItemId, ebaySku)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        values,
        () => resolve(id),
        () => { resolve(webAddItem({ ...item, id })); return false; }
      );
    });
  });
};

export const getItemById = async (id) => {
  if (Platform.OS === 'web') return webGetItemById(id);
  const db = getDB();
  if (!db) return webGetItemById(id);
  try {
    if (db.getFirstSync) return db.getFirstSync('SELECT * FROM items WHERE id = ?', [id]);
  } catch {}
  return new Promise((resolve) => {
    db.transaction((tx) => {
      tx.executeSql('SELECT * FROM items WHERE id = ?', [id], (_, { rows }) => resolve(rows.length > 0 ? rows.item(0) : null), () => { resolve(null); return false; });
    });
  });
};

export const updateItem = async (id, updates) => {
  if (Platform.OS === 'web') return webUpdateItem(id, updates);
  const db = getDB();
  if (!db) return webUpdateItem(id, updates);
  const ts = now();
  const fields = [];
  const values = [];
  const allowed = ['name', 'description', 'quantity', 'location', 'category', 'imageUri', 'boxId', 'synced', 'ebayItemId', 'ebaySku'];
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(updates[key]);
    }
  }
  if (fields.length === 0) return;
  fields.push('updatedAt = ?');
  values.push(ts);
  values.push(id);
  const sql = `UPDATE items SET ${fields.join(', ')} WHERE id = ?`;
  try {
    if (db.runSync) {
      db.runSync(sql, values);
      return;
    }
  } catch {
    return webUpdateItem(id, updates);
  }
  return new Promise((resolve) => {
    db.transaction((tx) => {
      tx.executeSql(sql, values, () => resolve(), () => { webUpdateItem(id, updates); resolve(); return false; });
    });
  });
};

export const linkItemToEbay = async (itemId, ebayItemId, ebaySku) => {
  if (Platform.OS === 'web') return webLinkItemToEbay(itemId, ebayItemId, ebaySku);
  const db = getDB();
  if (!db) return webLinkItemToEbay(itemId, ebayItemId, ebaySku);
  const ts = now();
  try {
    if (db.runSync) {
      db.runSync('UPDATE items SET ebayItemId = ?, ebaySku = ?, updatedAt = ? WHERE id = ?', [ebayItemId, ebaySku || null, ts, itemId]);
      return;
    }
  } catch {
    return webLinkItemToEbay(itemId, ebayItemId, ebaySku);
  }
  return new Promise((resolve) => {
    db.transaction((tx) => {
      tx.executeSql('UPDATE items SET ebayItemId = ?, ebaySku = ?, updatedAt = ? WHERE id = ?', [ebayItemId, ebaySku || null, ts, itemId], () => resolve(), () => { webLinkItemToEbay(itemId, ebayItemId, ebaySku); resolve(); return false; });
    });
  });
};

export const moveAllItemsFromBox = async (fromBoxId, toBoxId) => {
  if (!fromBoxId || !toBoxId || fromBoxId === toBoxId) return;
  if (Platform.OS === 'web') {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const KEY = 'inventory_data_v1';
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      const items = data.items || [];
      const ts = Date.now();
      for (let i = 0; i < items.length; i++) {
        if (items[i].boxId === fromBoxId) {
          items[i].boxId = toBoxId;
          items[i].updatedAt = ts;
        }
      }
      data.items = items;
      await AsyncStorage.setItem(KEY, JSON.stringify(data));
    } catch {}
    return;
  }
  const db = getDB();
  if (!db) return;
  const ts = now();
  try {
    if (db.runSync) {
      db.runSync('UPDATE items SET boxId = ?, updatedAt = ? WHERE boxId = ?', [toBoxId, ts, fromBoxId]);
      return;
    }
  } catch {}
  return new Promise((resolve) => {
    db.transaction((tx) => {
      tx.executeSql('UPDATE items SET boxId = ?, updatedAt = ? WHERE boxId = ?', [toBoxId, ts, fromBoxId], () => resolve(), () => { resolve(); return false; });
    });
  });
};

export const deleteItem = async (id) => {
  if (Platform.OS === 'web') return webDeleteItem(id);
  const db = getDB();
  if (!db) return webDeleteItem(id);
  try {
    if (db.runSync) {
      db.runSync('DELETE FROM items WHERE id = ?', [id]);
      return;
    }
  } catch {
    return webDeleteItem(id);
  }
  return new Promise((resolve) => {
    db.transaction((tx) => {
      tx.executeSql('DELETE FROM items WHERE id = ?', [id], () => resolve(), () => { webDeleteItem(id); resolve(); return false; });
    });
  });
};
