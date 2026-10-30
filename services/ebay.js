import Constants from 'expo-constants';
import { Platform } from 'react-native';

const PROXY_PORT = 4000;

const getProxyHost = () => {
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri ? hostUri.split(':')[0] : '';
  if (host) return host;
  return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
};

export const EBAY_PROXY_URL = __DEV__
  ? `http://${getProxyHost()}:${PROXY_PORT}`
  : 'http://YOUR_PROXY_URL';

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

export const getEbayOrders = async () => {
  const url = `${EBAY_PROXY_URL}/api/ebay/orders`;
  const res = await fetch(url);
  const contentType = res.headers.get('content-type') || 'unknown content type';
  const body = await res.text();
  let data;

  try {
    data = JSON.parse(body);
  } catch {
    throw new Error(
      `The eBay proxy at ${url} returned HTTP ${res.status} with ${contentType}, not JSON. Check that the proxy is running at this address.`
    );
  }

  if (!res.ok) throw new Error(data.error || `eBay proxy request failed (HTTP ${res.status})`);
  return data;
};
