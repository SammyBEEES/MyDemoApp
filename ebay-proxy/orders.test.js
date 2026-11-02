import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEbayOrdersResponse } from './orders.js';

test('parses a single eBay order and its line items', async () => {
  const xml = `<?xml version="1.0"?>
<GetOrdersResponse xmlns="urn:ebay:apis:eBLBaseComponents">
  <Ack>Success</Ack>
  <HasMoreOrders>false</HasMoreOrders>
  <OrderArray>
    <Order>
      <OrderID>ORDER-1</OrderID>
      <CreatedTime>2026-10-25T10:00:00.000Z</CreatedTime>
      <PaidTime>2026-10-25T10:05:00.000Z</PaidTime>
      <Buyer><UserID>buyer-one</UserID></Buyer>
      <TransactionArray>
        <Transaction>
          <TransactionID>TX-1</TransactionID>
          <QuantityPurchased>2</QuantityPurchased>
          <TransactionPrice currencyID="USD">19.95</TransactionPrice>
          <Item>
            <ItemID>ITEM-1</ItemID>
            <Title>First item</Title>
            <SKU>SKU-1</SKU>
            <PictureDetails><GalleryURL>https://i.ebayimg.com/images/g/example/s-l160.jpg</GalleryURL></PictureDetails>
          </Item>
        </Transaction>
        <Transaction>
          <TransactionID>TX-2</TransactionID>
          <QuantityPurchased>1</QuantityPurchased>
          <TransactionPrice currencyID="USD">7.50</TransactionPrice>
          <Item><ItemID>ITEM-2</ItemID><Title>Second item</Title></Item>
        </Transaction>
      </TransactionArray>
    </Order>
  </OrderArray>
</GetOrdersResponse>`;

  const result = await parseEbayOrdersResponse(xml);

  assert.equal(result.hasMoreOrders, false);
  assert.equal(result.orders.length, 2);
  assert.deepEqual(result.orders[0], {
    orderId: 'ORDER-1',
    transactionId: 'TX-1',
    itemId: 'ITEM-1',
    title: 'First item',
    sku: 'SKU-1',
    quantity: 2,
    price: '19.95',
    currency: 'USD',
    buyer: 'buyer-one',
    createdDate: '2026-10-25T10:00:00.000Z',
    shippingStatus: 'Paid',
    picture: 'https://i.ebayimg.com/images/g/example/s-l500.jpg',
  });
  assert.equal(result.orders[1].transactionId, 'TX-2');
  assert.equal(result.orders[1].shippingStatus, 'Paid');
});

test('parses a single order response and reports eBay failures', async () => {
  const xml = `<GetOrdersResponse><Ack>Success</Ack><HasMoreOrders>true</HasMoreOrders>
    <OrderArray><Order><OrderID>ORDER-2</OrderID><TransactionArray>
      <Transaction><TransactionID>TX-3</TransactionID><Item><Title>Only item</Title></Item></Transaction>
    </TransactionArray></Order></OrderArray>
  </GetOrdersResponse>`;

  const result = await parseEbayOrdersResponse(xml);
  assert.equal(result.hasMoreOrders, true);
  assert.equal(result.orders.length, 1);
  assert.equal(result.orders[0].orderId, 'ORDER-2');
  assert.equal(result.orders[0].quantity, 1);

  await assert.rejects(
    parseEbayOrdersResponse('<GetOrdersResponse><Ack>Failure</Ack><Errors><LongMessage>Invalid token</LongMessage></Errors></GetOrdersResponse>'),
    /Invalid token/
  );
});
