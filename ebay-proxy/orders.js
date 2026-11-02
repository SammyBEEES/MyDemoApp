import { parseStringPromise } from 'xml2js';

export const parseEbayOrdersResponse = async (xmlText) => {
  const parsed = await parseStringPromise(xmlText, { explicitArray: false, ignoreAttrs: true });
  const response = parsed?.GetOrdersResponse;

  if (!response) {
    return { orders: [], hasMoreOrders: false };
  }

  const orderArray = response.OrderArray?.Order;
  if (!orderArray) {
    return { orders: [], hasMoreOrders: false };
  }

  const orders = Array.isArray(orderArray) ? orderArray : [orderArray];

  const hasMoreOrders = response.PaginationResult?.HasMoreOrders === 'true' || response.PaginationResult?.HasMoreOrders === true;

  const result = orders.map((order) => {
    const txArray = order.TransactionArray?.Transaction;
    const txs = txArray ? (Array.isArray(txArray) ? txArray : [txArray]) : [];

    return txs.map((tx) => {
      const item = tx.Item || {};
      const price = tx.TransactionPrice?._ || tx.TransactionPrice || null;
      const quantity = Number(tx.QuantityPurchased) || 1;

      return {
        orderId: order.OrderID,
        transactionId: tx.TransactionID,
        itemId: item.ItemID,
        title: item.Title,
        sku: item.SKU || null,
        quantity,
        price: price ? Number(price) : null,
        buyer: tx.Buyer?.UserID || null,
        createdDate: tx.CreatedTime ? new Date(tx.CreatedTime).getTime() : null,
        shippingStatus: tx.ShippingDetails?.ShippedTime ? 'shipped' : 'pending',
        picture: item.PictureDetails?.GalleryURL ? item.PictureDetails.GalleryURL.replace(/\/s-l\d+\./, '/s-l500.') : null,
      };
    });
  }).flat();

  return { orders: result, hasMoreOrders };
};
