# eBay Proxy (Local)

This is a tiny local proxy for the eBay Trading API using Auth'n'Auth. You need to run this on your computer so your Expo app can call it without CORS/security issues.

## 1) Get your Auth'n'Auth token
1. Go to [developer.ebay.com](https://developer.ebay.com/) > My Account > User Tokens
2. Select environment (Sandbox first, then Production)
3. Select Auth'n'Auth and generate a token for your app
4. Copy the token

## 2) Configure
1. Copy `.env.example` to `.env`
2. Put your token in `EBAY_AUTH_TOKEN`
3. If using OAuth-style headers isn't needed for Auth'n'Auth, the defaults above work. For some accounts you might also need App/Dev/Cert IDs - put them in env if needed.

## 3) Run
```bash
npm install
npm start
```

It runs on http://localhost:4000

## Endpoints
- `GET /api/ebay/listings` - Get active listings from your account
- `GET /api/ebay/item/:itemId` - Get item details
- `POST /api/ebay/revise` - Revise inventory status (body: {itemId, quantity})
