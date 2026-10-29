const TIMEOUT_MS = 8000;

const fetchJson = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

const clean = (value) => (typeof value === 'string' ? value.trim() : '');

const firstCategory = (value) => {
  const text = clean(value);
  if (!text) return '';
  const parts = text
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part && !part.startsWith('en:') && !part.startsWith('pt:'));
  return parts[0] || '';
};

const fromOpenFoodFacts = async (barcode) => {
  const data = await fetchJson(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,brands,categories,quantity,image_url`
  );
  const product = data && data.status === 1 ? data.product : null;
  if (!product) return null;

  const name = clean(product.product_name) || clean(product.brands);
  if (!name) return null;

  const descriptionParts = [];
  if (clean(product.brands)) descriptionParts.push(`Brand: ${clean(product.brands)}`);
  if (clean(product.quantity)) descriptionParts.push(`Size: ${clean(product.quantity)}`);

  return {
    barcode,
    name,
    description: descriptionParts.join('\n'),
    category: firstCategory(product.categories),
    imageUrl: clean(product.image_url) || null,
    source: 'Open Food Facts',
  };
};

const fromOpenLibrary = async (barcode) => {
  const isbn = barcode.replace(/[^0-9Xx]/g, '');
  if (!isbn) return null;

  const data = await fetchJson(`https://openlibrary.org/isbn/${encodeURIComponent(isbn)}.json`);
  if (!data || !clean(data.title)) return null;

  const title = clean(data.title);
  const descriptionParts = [];
  if (clean(data.subtitle)) descriptionParts.push(clean(data.subtitle));
  if (Array.isArray(data.publishers) && data.publishers.length) {
    descriptionParts.push(`Publisher: ${clean(data.publishers[0])}`);
  }
  if (clean(data.publish_date)) descriptionParts.push(`Published: ${clean(data.publish_date)}`);

  const coverId = Array.isArray(data.covers) ? data.covers[0] : null;

  return {
    barcode,
    name: title,
    description: descriptionParts.join('\n'),
    category: 'Books',
    imageUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null,
    source: 'Open Library',
  };
};

const fromUpcItemDb = async (barcode) => {
  const data = await fetchJson(
    `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(barcode)}`
  );
  const item = data && Array.isArray(data.items) ? data.items[0] : null;
  if (!item) return null;

  const name = clean(item.title);
  if (!name) return null;

  const imageUrl = Array.isArray(item.images) && item.images.length ? clean(item.images[0]) : null;

  return {
    barcode,
    name,
    description: clean(item.description),
    category: firstCategory(item.category),
    imageUrl: imageUrl || null,
    source: 'UPCitemdb',
  };
};

export const lookupProduct = async (barcode) => {
  const code = String(barcode || '').trim();
  if (!/^[0-9]{8,14}$/.test(code)) return null;

  const isBook = /^97[89]/.test(code);
  const sources = isBook
    ? [fromOpenLibrary, fromOpenFoodFacts, fromUpcItemDb]
    : [fromOpenFoodFacts, fromUpcItemDb, fromOpenLibrary];

  for (const source of sources) {
    const result = await source(code);
    if (result) return result;
  }

  return null;
};
