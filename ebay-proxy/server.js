import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseStringPromise, Builder } from 'xml2js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = [
  process.env.DOTENV_CONFIG_PATH,
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '.env'),
]
  .filter(Boolean)
  .map((candidate) => path.resolve(candidate))
  .find((candidate) => fs.existsSync(candidate));
if (envPath) dotenv.config({ path: envPath });

const app = express();
app.use(cors());
app.use(express.json());

const TOKEN = process.env.EBAY_AUTH_TOKEN || '';
const SITE_ID = process.env.EBAY_SITE_ID || '0';
const ENV = process.env.EBAY_ENV || 'production';
const APP_ID = process.env.EBAY_APP_ID || '';
const DEV_ID = process.env.EBAY_DEV_ID || '';
const CERT_ID = process.env.EBAY_CERT_ID || '';

const getEndpoint = () => {
  if (ENV === 'sandbox') {
    return 'https://api.sandbox.ebay.com/ws/api.dll';
  }
  return 'https://api.ebay.com/ws/api.dll';
};

const upscalePicture = (url) => {
  if (!url) return null;
  return String(url).replace(/\/s-l\d+\./, '/s-l500.');
};

const buildHeaders = (callName) => {
  const headers = {
    'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
    'X-EBAY-API-CALL-NAME': callName,
    'X-EBAY-API-SITEID': SITE_ID,
    'Content-Type': 'text/xml',
  };
  if (DEV_ID) headers['X-EBAY-API-DEV-NAME'] = DEV_ID;
  if (APP_ID) headers['X-EBAY-API-APP-NAME'] = APP_ID;
  if (CERT_ID) headers['X-EBAY-API-CERT-NAME'] = CERT_ID;
  return headers;
};

app.get('/api/debug', async (req, res) => {
  try {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<GeteBayOfficialTimeRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${TOKEN}</eBayAuthToken>
  </RequesterCredentials>
  <Version>967</Version>
</GeteBayOfficialTimeRequest>`;
    const resp = await axios.post(getEndpoint(), xml, { headers: buildHeaders('GeteBayOfficialTime') });
    const parsed = await parseStringPromise(resp.data, { explicitArray: false, ignoreAttrs: true });
    res.json({ ok: parsed?.GeteBayOfficialTimeResponse?.Ack, time: parsed?.GeteBayOfficialTimeResponse?.Timestamp });
  } catch (e) {
    res.status(500).json({ error: e.message, details: e.response?.data?.substring(0, 200) });
  }
});

app.get('/api/debug/myeBay', async (req, res) => {
  try {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<GetMyeBaySellingRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${TOKEN}</eBayAuthToken>
  </RequesterCredentials>
  <ActiveList>
    <Include>true</Include>
    <Pagination>
      <EntriesPerPage>200</EntriesPerPage>
      <PageNumber>1</PageNumber>
    </Pagination>
  </ActiveList>
  <Version>967</Version>
</GetMyeBaySellingRequest>`;
    const resp = await axios.post(getEndpoint(), xml, { headers: buildHeaders('GetMyeBaySelling') });
    const parsed = await parseStringPromise(resp.data, { explicitArray: false, ignoreAttrs: true });
    res.json({ raw: parsed?.GetMyeBaySellingResponse });
  } catch (e) {
    res.status(500).json({ error: e.message, details: e.response?.data?.substring(0, 300) });
  }
});

app.get('/api/ebay/listings', async (req, res) => {
  try {
    if (!TOKEN) {
      return res.status(400).json({ error: 'Missing EBAY_AUTH_TOKEN' });
    }
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<GetMyeBaySellingRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${TOKEN}</eBayAuthToken>
  </RequesterCredentials>
  <ActiveList>
    <Include>true</Include>
    <Pagination>
      <EntriesPerPage>200</EntriesPerPage>
      <PageNumber>1</PageNumber>
    </Pagination>
  </ActiveList>
  <Version>967</Version>
</GetMyeBaySellingRequest>`;
    const resp = await axios.post(getEndpoint(), xml, { headers: buildHeaders('GetMyeBaySelling') });
    const parsed = await parseStringPromise(resp.data, { explicitArray: false, ignoreAttrs: true });
    const items = parsed?.GetMyeBaySellingResponse?.ActiveList?.ItemArray?.Item;
    if (!items) return res.json({ listings: [] });
    const list = Array.isArray(items) ? items : [items];
    const result = list.map((it) => ({
      itemId: it.ItemID,
      title: it.Title,
      sku: it.SKU || null,
      quantity: Number(it.Quantity) || 0,
      price: it.SellingStatus?.CurrentPrice?._ || it.SellingStatus?.CurrentPrice,
      picture: upscalePicture(it.PictureDetails?.GalleryURL),
    }));
    res.json({ listings: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const buildGetItemXML = (itemId) => {
  const builder = new Builder({ headless: true, rootName: 'GetItemRequest' });
  const obj = {
    xmlns: 'urn:ebay:apis:eBLBaseComponents',
    RequesterCredentials: {
      eBayAuthToken: TOKEN,
    },
    ItemID: itemId,
    Version: '967',
  };
  return builder.buildObject(obj);
};

app.get('/api/ebay/item/:itemId', async (req, res) => {
  try {
    if (!TOKEN) return res.status(400).json({ error: 'Missing EBAY_AUTH_TOKEN' });
    const xml = buildGetItemXML(req.params.itemId);
    const resp = await axios.post(getEndpoint(), xml, { headers: buildHeaders('GetItem') });
    const parsed = await parseStringPromise(resp.data, { explicitArray: false, ignoreAttrs: true });
    res.json({ item: parsed?.GetItemResponse?.Item });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/ebay/orders', async (req, res) => {
  try {
    if (!TOKEN) {
      return res.status(400).json({ error: 'Missing EBAY_AUTH_TOKEN' });
    }
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<GetOrdersRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${TOKEN}</eBayAuthToken>
  </RequesterCredentials>
  <OrderStatus>Completed</OrderStatus>
  <Pagination>
    <EntriesPerPage>200</EntriesPerPage>
    <PageNumber>1</PageNumber>
  </Pagination>
  <Version>967</Version>
</GetOrdersRequest>`;
    const resp = await axios.post(getEndpoint(), xml, { headers: buildHeaders('GetOrders') });
    const parsed = await parseStringPromise(resp.data, { explicitArray: false, ignoreAttrs: true });
    const ordersResp = parsed?.GetOrdersResponse;
    const orderArray = ordersResp?.OrderArray?.Order;
    if (!orderArray) return res.json({ orders: [] });
    const list = Array.isArray(orderArray) ? orderArray : [orderArray];

    // Flatten transactions across all orders
    const transactions = [];
    for (const order of list) {
      const txArray = order.TransactionArray?.Transaction;
      if (!txArray) continue;
      const txs = Array.isArray(txArray) ? txArray : [txArray];
      for (const tx of txs) {
        transactions.push({
          orderId: order.OrderID,
          transactionId: tx.TransactionID,
          itemId: tx.Item?.ItemID,
          title: tx.Item?.Title,
          sku: tx.Item?.SKU || null,
          quantity: Number(tx.QuantityPurchased) || 1,
          price: tx.TransactionPrice?._ || tx.TransactionPrice || null,
          buyer: tx.Buyer?.UserID || null,
          createdDate: tx.CreatedTime || null,
          shippingStatus: tx.ShippingDetails?.ShippedBySellerTime ? 'shipped' : 'pending',
          picture: upscalePicture(tx.Item?.PictureDetails?.GalleryURL),
        });
      }
    }
    res.json({ orders: transactions });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const buildReviseInventoryStatusXML = (itemId, quantity) => {
  const builder = new Builder({ headless: true, rootName: 'ReviseInventoryStatusRequest' });
  const obj = {
    xmlns: 'urn:ebay:apis:eBLBaseComponents',
    RequesterCredentials: {
      eBayAuthToken: TOKEN,
    },
    InventoryStatus: {
      ItemID: itemId,
      Quantity: quantity,
    },
    Version: '967',
  };
  return builder.buildObject(obj);
};

app.post('/api/ebay/revise', async (req, res) => {
  try {
    if (!TOKEN) return res.status(400).json({ error: 'Missing EBAY_AUTH_TOKEN' });
    const { itemId, quantity } = req.body;
    const xml = buildReviseInventoryStatusXML(itemId, quantity);
    const resp = await axios.post(getEndpoint(), xml, { headers: buildHeaders('ReviseInventoryStatus') });
    const parsed = await parseStringPromise(resp.data, { explicitArray: false, ignoreAttrs: true });
    res.json({ result: parsed?.ReviseInventoryStatusResponse });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(process.env.PORT || 4000, () => {
  console.log('eBay proxy running on', process.env.PORT || 4000);
});
