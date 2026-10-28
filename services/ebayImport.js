import { getEbayListings } from './ebay';
import { addBox, addItem, getAllBoxes, getAllItems } from './inventoryRepo';

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
