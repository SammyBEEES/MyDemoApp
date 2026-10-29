import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const KEY = 'inventory_data_v1';
const OLD_KEY = 'inventory_items_v1';
const now = () => Date.now();

const load = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (!data.boxes) data.boxes = [];
      if (!data.items) data.items = [];
      if (!data.ebayLinks) data.ebayLinks = [];
      return data;
    }
    const oldRaw = await AsyncStorage.getItem(OLD_KEY);
    if (oldRaw) {
      const oldItems = JSON.parse(oldRaw) || [];
      const migrated = { boxes: [], items: oldItems, ebayLinks: [] };
      await AsyncStorage.setItem(KEY, JSON.stringify(migrated));
      return migrated;
    }
    return { boxes: [], items: [], ebayLinks: [] };
  } catch {
    return { boxes: [], items: [], ebayLinks: [] };
  }
};

const save = async (data) => {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
};

const genId = async () => {
  try {
    return await Crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
};

export const webGetAllBoxes = async () => {
  const data = await load();
  return [...(data.boxes || [])].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
};

export const webAddBox = async (box) => {
  const data = await load();
  const id = box.id || (await genId());
  const ts = now();
  const newBox = {
    id,
    name: box.name || 'Untitled Box',
    description: box.description || '',
    createdAt: box.createdAt || ts,
    updatedAt: ts,
  };
  data.boxes = data.boxes || [];
  data.boxes.push(newBox);
  await save(data);
  return id;
};

export const webGetBoxById = async (id) => {
  const data = await load();
  return (data.boxes || []).find((b) => b.id === id) || null;
};

export const webGetItemsByBoxId = async (boxId) => {
  const data = await load();
  const items = (data.items || []).filter((i) => i.boxId === boxId);
  return [...items].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
};

export const webGetAllItems = async () => {
  const data = await load();
  return [...(data.items || [])].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
};

export const webAddItem = async (item) => {
  const data = await load();
  let id = item.id;
  if (!id) id = await genId();
  const ts = now();
  const newItem = {
    id,
    boxId: item.boxId || null,
    name: item.name || '',
    description: item.description || '',
    quantity: item.quantity ?? 1,
    location: item.location || '',
    category: item.category || '',
    barcode: item.barcode || null,
    imageUri: item.imageUri || null,
    ebayItemId: item.ebayItemId || null,
    ebaySku: item.ebaySku || null,
    createdAt: item.createdAt || ts,
    updatedAt: ts,
    synced: 0,
  };
  data.items = data.items || [];
  data.items.push(newItem);
  await save(data);
  return id;
};

export const webGetItemById = async (id) => {
  const data = await load();
  return (data.items || []).find((i) => i.id === id) || null;
};

export const webUpdateItem = async (id, updates) => {
  const data = await load();
  const items = data.items || [];
  const idx = items.findIndex((i) => i.id === id);
  if (idx >= 0) {
    items[idx] = { ...items[idx], ...updates, updatedAt: now() };
    data.items = items;
    await save(data);
  }
};

export const webDeleteItem = async (id) => {
  const data = await load();
  data.items = (data.items || []).filter((i) => i.id !== id);
  await save(data);
};

export const webLinkItemToEbay = async (itemId, ebayItemId, ebaySku) => {
  const data = await load();
  const items = data.items || [];
  const idx = items.findIndex((i) => i.id === itemId);
  if (idx >= 0) {
    items[idx] = { ...items[idx], ebayItemId, ebaySku: ebaySku || null, updatedAt: now() };
    data.items = items;
    await save(data);
  }
};
