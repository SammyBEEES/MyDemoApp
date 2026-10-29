import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

let db = null;

export const initDB = async () => {
  if (Platform.OS === 'web') {
    return { type: 'web' };
  }
  try {
    if (!db) {
      if (SQLite.openDatabaseSync) {
        db = SQLite.openDatabaseSync('inventory.db');
      } else {
        db = SQLite.openDatabase('inventory.db');
      }
      if (db && db.execSync) {
        db.execSync(
          `CREATE TABLE IF NOT EXISTS boxes (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            createdAt INTEGER,
            updatedAt INTEGER
          );`
        );
        db.execSync(
          `CREATE TABLE IF NOT EXISTS items (
            id TEXT PRIMARY KEY NOT NULL,
            boxId TEXT,
            name TEXT NOT NULL,
            description TEXT,
            quantity INTEGER DEFAULT 1,
            location TEXT,
            category TEXT,
            barcode TEXT,
            imageUri TEXT,
            createdAt INTEGER,
            updatedAt INTEGER,
            synced INTEGER DEFAULT 0,
            ebayItemId TEXT,
            ebaySku TEXT,
            FOREIGN KEY(boxId) REFERENCES boxes(id)
          );`
        );
        const itemColumns = db.getAllSync('PRAGMA table_info(items)').map((column) => column.name);
        if (!itemColumns.includes('ebayItemId')) {
          db.execSync('ALTER TABLE items ADD COLUMN ebayItemId TEXT');
        }
        if (!itemColumns.includes('ebaySku')) {
          db.execSync('ALTER TABLE items ADD COLUMN ebaySku TEXT');
        }
        if (!itemColumns.includes('barcode')) {
          db.execSync('ALTER TABLE items ADD COLUMN barcode TEXT');
        }
      } else if (db && db.transaction) {
        db.transaction((tx) => {
          tx.executeSql(
            `CREATE TABLE IF NOT EXISTS boxes (
              id TEXT PRIMARY KEY NOT NULL,
              name TEXT NOT NULL,
              description TEXT,
              createdAt INTEGER,
              updatedAt INTEGER
            );`
          );
          tx.executeSql(
            `CREATE TABLE IF NOT EXISTS items (
              id TEXT PRIMARY KEY NOT NULL,
              boxId TEXT,
              name TEXT NOT NULL,
              description TEXT,
              quantity INTEGER DEFAULT 1,
              location TEXT,
              category TEXT,
              barcode TEXT,
              imageUri TEXT,
              createdAt INTEGER,
              updatedAt INTEGER,
              synced INTEGER DEFAULT 0,
              ebayItemId TEXT,
              ebaySku TEXT
            );`
          );
          tx.executeSql('PRAGMA table_info(items)', [], (_, { rows }) => {
            const names = [];
            for (let i = 0; i < rows.length; i++) names.push(rows.item(i).name);
            if (!names.includes('ebayItemId')) {
              tx.executeSql('ALTER TABLE items ADD COLUMN ebayItemId TEXT');
            }
            if (!names.includes('ebaySku')) {
              tx.executeSql('ALTER TABLE items ADD COLUMN ebaySku TEXT');
            }
            if (!names.includes('barcode')) {
              tx.executeSql('ALTER TABLE items ADD COLUMN barcode TEXT');
            }
          });
        });
      }
    }
    return { type: 'native', db };
  } catch (e) {
    console.log('DB init error', e);
    return { type: 'web' };
  }
};

export const getDB = () => db;
export const generateId = async () => {
  try {
    return await Crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
};
