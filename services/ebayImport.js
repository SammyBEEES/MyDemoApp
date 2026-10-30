import { getEbayListings, getEbayOrders } from './ebay';
import { addBox, addItem, getAllBoxes, getAllItems, addPurchase } from './inventoryRepo';

const UNSORTED_BOX = 'Unsorted';

const findOrCreateUnsortedBox = async () => {
  const boxes = await getAllBoxes();
  const match = (boxes || []).find(
    (box) => (box.name || '').trim().toLowerCase() === UNSORTED_BOX.toLowerCase()
  );
  if (match) return match;
  const id = await addBox({
    name: UNSORTED_BOX,
    description: 'Items imported from eBay',
  });
  return { id, name: UNSORTED_BOX };
};

export const importEbayListingsToUnsorted = async () => {
  const res = await getEbayListings();
  const listings = res.listings || [];
  const box = await findOrCreateUnsortedBox();

  const existing = await getAllItems();
  const alreadyLinked = new Set(
    (existing || [])
      .map((item) => (item.ebayItemId ? String(item.ebayItemId) : ''))
      .filter(Boolean)
  );

  let imported = 0;
  let skipped = 0;

  for (const listing of listings) {
    const ebayItemId = listing.itemId ? String(listing.itemId) : '';
    if (!ebayItemId || alreadyLinked.has(ebayItemId)) {
      skipped++;
      continue;
    }
    await addItem({
      boxId: box.id,
      name: listing.title || `eBay item ${ebayItemId}`,
      description: listing.sku ? `eBay SKU: ${listing.sku}` : '',
      quantity: Number(listing.quantity) || 1,
      location: '',
      category: 'eBay',
      imageUri: listing.picture || null,
      ebayItemId,
      ebaySku: listing.sku || null,
    });
    alreadyLinked.add(ebayItemId);
    imported++;
  }

  return { box, imported, skipped, total: listings.length };
};

const findOrCreateEbayOrdersBox = async () => {
  const boxes = await getAllBoxes();
  const match = (boxes || []).find(
    (box) => (box.name || '').trim().toLowerCase() === 'ebay orders'
  );
  if (match) return match;
  const id = await addBox({
    name: 'eBay Orders',
    description: 'Completed orders imported from eBay',
  });
  return { id, name: 'eBay Orders' };
};

export const importEbayOrders = async () => {
  const res = await getEbayOrders();
  const orders = res.orders || [];
  const box = await findOrCreateEbayOrdersBox();

  const existing = await getAllItems();
  const alreadyLinked = new Set(
    (existing || [])
      .map((item) => (item.ebayItemId ? String(item.ebayItemId) : ''))
      .filter(Boolean)
  );

  let imported = 0;
  let skipped = 0;

  for (const order of orders) {
    const ebayItemId = order.itemId ? String(order.itemId) : '';
    if (!ebayItemId || alreadyLinked.has(ebayItemId)) {
      skipped++;
      continue;
    }
    const itemId = await addItem({
      boxId: box.id,
      name: order.title || `eBay item ${ebayItemId}`,
      description: order.sku ? `eBay SKU: ${order.sku}` : 'Sold on eBay',
      quantity: Number(order.quantity) || 1,
      location: '',
      category: 'eBay',
      imageUri: order.picture || null,
      ebayItemId,
      ebaySku: order.sku || null,
      shippingStatus: order.shippingStatus || 'pending',
    });
    if (order.price != null) {
      const price = Number(order.price);
      if (!isNaN(price) && price > 0) {
        await addPurchase({
          itemId,
          cost: price,
          quantity: Number(order.quantity) || 1,
          purchaseDate: order.createdDate || Date.now(),
          supplier: order.buyer || 'eBay Buyer',
          notes: `Sold on eBay (order ${order.orderId})`,
        });
      }
    }
    alreadyLinked.add(ebayItemId);
    imported++;
  }

  return { box, imported, skipped, total: orders.length };
};
