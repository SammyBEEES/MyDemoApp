const EBAY_PROXY_URL = __DEV__ ? 'http://localhost:4000' : 'http://YOUR_PROXY_URL';

export const getEbayListings = async () => {
  const res = await fetch(`${EBAY_PROXY_URL}/api/ebay/listings`);
  if (!res.ok) throw new Error('Failed to fetch listings');
  return res.json();
};

export const getEbayItem = async (itemId) => {
  const res = await fetch(`${EBAY_PROXY_URL}/api/ebay/item/${itemId}`);
  if (!res.ok) throw new Error('Failed to fetch item');
  return res.json();
};

export const reviseEbayInventory = async (itemId, quantity) => {
  const res = await fetch(`${EBAY_PROXY_URL}/api/ebay/revise`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId, quantity }),
  });
  if (!res.ok) throw new Error('Failed to revise');
  return res.json();
};
