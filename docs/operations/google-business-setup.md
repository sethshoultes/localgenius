# Google Business Profile API Setup

## 1. Overview

The LocalGenius Google Business Profile integration provides:

- **Review sync** -- pulls reviews from connected GBP listings into the LocalGenius database (runs 4x/day via cron).
- **Review response posting** -- posts AI-generated or manual replies back to Google reviews.
- **Insights sync** -- pulls search impressions (direct + indirect), phone calls, direction requests, and website clicks.
- **Profile optimization** -- updates business description, website URL, and phone number on the listing.
- **Push notifications** -- receives real-time webhook alerts when new reviews are posted, triggering immediate sync and notification dispatch.

### Key files

| File | Purpose |
|------|---------|
| `src/services/google-business.ts` | OAuth flow, token management, review sync, insights sync, profile updates |
| `src/app/api/integrations/google/connect/route.ts` | `GET /api/integrations/google/connect` -- initiates OAuth |
| `src/app/api/integrations/google/callback/route.ts` | `GET /api/integrations/google/callback` -- handles OAuth callback |
| `src/app/api/webhooks/google/route.ts` | `POST /api/webhooks/google` -- receives push notifications |
| `src/lib/env.ts` | Environment variable validation |

---

## 2. Google Cloud Console Setup

### 2.1 Create or select a project

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown in the top bar.
3. Click **New Project** (or select an existing one).
4. Name it something like `LocalGenius Production`.
5. Note the **Project ID** -- you will need it later.

### 2.2 Enable required APIs

1. Navigate to **APIs & Services > Library**.
2. Search for and enable each of the following:
   - **Google My Business API** (`mybusiness.googleapis.com`) -- used for reviews and insights via `https://mybusiness.googleapis.com/v4`.
   - **My Business Business Information API** (`mybusinessbusinessinformation.googleapis.com`) -- used for profile updates via `https://mybusinessbusinessinformation.googleapis.com/v1`.
3. Wait for each API to show "Enabled" before proceeding.

### 2.3 Create OAuth 2.0 credentials

1. Navigate to **APIs & Services > Credentials**.
2. Click **Create Credentials > OAuth client ID**.
3. If prompted, configure the **OAuth consent screen** first (see Section 6 below).
4. Select **Application type: Web application**.
5. Name it `LocalGenius Web Client`.
6. Under **Authorized redirect URIs**, add:
   - Production: `https://localgenius.company/api/integrations/google/callback`
   - Development: `http://localhost:3000/api/integrations/google/callback`
7. Click **Create**.
8. Copy the **Client ID** and **Client Secret** from the confirmation dialog. Store them securely.

---

## 3. Environment Variables

Set these in your `.env.local` (development) and in your production environment (Vercel dashboard, etc.).

### Required for Google integration

```bash
# OAuth credentials from Google Cloud Console (Section 2.3)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret

# Redirect URI -- must exactly match what you configured in Google Cloud Console
# Development:
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/google/callback
# Production:
GOOGLE_REDIRECT_URI=https://localgenius.company/api/integrations/google/callback
```

### Required for push notifications (webhook)

```bash
# Generate a secure random token for webhook verification:
#   openssl rand -hex 32
GOOGLE_WEBHOOK_TOKEN=your-64-char-hex-token
```

### Where to set them

| Environment | Location |
|-------------|----------|
| Local dev | `.env.local` in project root |
| Vercel preview | Vercel dashboard > Project > Settings > Environment Variables (Preview) |
| Vercel production | Vercel dashboard > Project > Settings > Environment Variables (Production) |

All four variables (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_WEBHOOK_TOKEN`) are validated as optional in `src/lib/env.ts`. The app starts without them, but the Google integration will report `not_configured` on the health endpoint.

---

## 4. OAuth Scopes

The app requests a single scope during the OAuth flow (defined in `src/services/google-business.ts`):

```
https://www.googleapis.com/auth/business.manage
```

This scope grants full read/write access to the Google Business Profile, including:

- Reading and replying to reviews
- Reading business insights and metrics
- Updating business profile information (description, phone, website)
- Managing business locations

The OAuth URL is constructed with these parameters:

| Parameter | Value |
|-----------|-------|
| `response_type` | `code` |
| `scope` | `https://www.googleapis.com/auth/business.manage` |
| `access_type` | `offline` (ensures a refresh token is returned) |
| `prompt` | `consent` (forces consent screen every time, guaranteeing a refresh token) |

---

## 5. Testing the Connection

### 5.1 Start the dev server

```bash
npm run dev
```

### 5.2 Get an auth token

Log in to the app and obtain a valid JWT. You need to be authenticated because `GET /api/integrations/google/connect` calls `verifyAuth(request)` to extract `businessId` and `organizationId` from your session.

### 5.3 Initiate the OAuth flow

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/integrations/google/connect
```

The response will contain an OAuth URL:

```json
{
  "data": {
    "url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fbusiness.manage&access_type=offline&prompt=consent&state=..."
  },
  "meta": { "timestamp": "..." }
}
```

### 5.4 Complete the OAuth flow

1. Open the URL from the response in a browser.
2. Sign in with a Google account that manages the target Business Profile.
3. Grant the requested permissions.
4. Google redirects to `http://localhost:3000/api/integrations/google/callback?code=...&state=...`.

### 5.5 Verify the connection

On success, the callback returns:

```json
{
  "data": {
    "status": "connected",
    "platform": "google_business",
    "message": "Google Business Profile connected successfully."
  },
  "meta": { "timestamp": "..." }
}
```

The callback handler:
1. Verifies the HMAC-signed `state` parameter to prevent forgery.
2. Exchanges the authorization `code` for access and refresh tokens.
3. Encrypts both tokens and stores them in the `business_settings` table.
4. Sets the connection status to `active`.

You can confirm the stored connection by checking the `business_settings` table for a row with `platform = 'google_business'` and `connection_status = 'active'`.

---

## 6. Production Checklist

### 6.1 Configure the OAuth consent screen

1. In Google Cloud Console, go to **APIs & Services > OAuth consent screen**.
2. Select **User type: External** (unless all users are in your Google Workspace org).
3. Fill in required fields:
   - **App name**: LocalGenius
   - **User support email**: your support email
   - **Developer contact email**: your dev email
   - **App logo**: upload your logo (optional but recommended)
   - **Application home page**: `https://localgenius.company`
   - **Privacy policy link**: `https://localgenius.company/privacy`
   - **Terms of service link**: `https://localgenius.company/terms`
4. Add the scope: `https://www.googleapis.com/auth/business.manage`.
5. Add test users (required while in "Testing" mode).

### 6.2 App verification

The `business.manage` scope is classified as **sensitive** by Google. This means:

- While in **Testing** mode, only users you add as test users (up to 100) can authorize the app.
- To allow any Google user to connect, you must submit the app for **verification**.
- Verification requires:
  - A verified domain for your redirect URI.
  - A privacy policy hosted on that domain.
  - A YouTube video demonstrating how the app uses the requested scopes.
  - Passing Google's security assessment (may take several weeks).

Until verification is approved, keep the app in Testing mode and add your customers as test users.

### 6.3 Redirect URI checklist

- The `GOOGLE_REDIRECT_URI` env var must exactly match what is registered in Google Cloud Console.
- Double-check protocol (`https://` for production), domain, and path.
- The callback route in the app is: `/api/integrations/google/callback`.

### 6.4 Token security

- Access tokens and refresh tokens are encrypted before storage (via `encrypt()` from `src/lib/encryption.ts`).
- Ensure `ENCRYPTION_KEY` is set in production (minimum 32 characters).
- Refresh tokens are long-lived. If a refresh fails, the connection status is set to `expired` and the user must re-authorize.

---

## 7. Push Notifications

Google Business Profile supports push notifications that alert you in real time when reviews are added or updated. The webhook endpoint is `POST /api/webhooks/google`.

### 7.1 How the webhook works

Google sends push notifications with these headers:

| Header | Description |
|--------|-------------|
| `X-Goog-Channel-Token` | The token you set when creating the watch -- verified against `GOOGLE_WEBHOOK_TOKEN` |
| `X-Goog-Resource-State` | `sync` (initial handshake), `update` (review changed), `exists` (new review) |
| `X-Goog-Channel-ID` | Identifier for the notification channel |

The handler:
1. Verifies `X-Goog-Channel-Token` matches the `GOOGLE_WEBHOOK_TOKEN` env var.
2. Acknowledges `sync` notifications without processing.
3. For `update`/`exists` notifications, triggers a review sync for the connected business.
4. Dispatches `review.new` or `review.negative` events (based on rating <= 3) to the notification system.
5. Always returns HTTP 200 to prevent Google from retrying on application errors.

### 7.2 Generate the webhook token

```bash
openssl rand -hex 32
```

Set the output as `GOOGLE_WEBHOOK_TOKEN` in your environment.

### 7.3 Register a watch (API call)

To start receiving notifications, create a watch on the business location's reviews. This is done via the Google My Business API:

```bash
curl -X POST \
  "https://mybusiness.googleapis.com/v4/accounts/{ACCOUNT_ID}/locations/{LOCATION_ID}/reviews:watch" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "localgenius-reviews-UNIQUE_ID",
    "type": "web_hook",
    "address": "https://localgenius.company/api/webhooks/google",
    "token": "YOUR_GOOGLE_WEBHOOK_TOKEN",
    "expiration": "UNIX_TIMESTAMP_IN_MS"
  }'
```

Replace:
- `{ACCOUNT_ID}` and `{LOCATION_ID}` with the connected business's Google account and location IDs (stored in `business_settings.config`).
- `ACCESS_TOKEN` with a valid access token for the business.
- `UNIQUE_ID` with a unique identifier (e.g., the business ID).
- `YOUR_GOOGLE_WEBHOOK_TOKEN` with the value of your `GOOGLE_WEBHOOK_TOKEN` env var.
- `UNIX_TIMESTAMP_IN_MS` with the expiration time (watches expire and must be renewed).

### 7.4 Watch renewal

Google notification watches expire. You must renew them before expiration. Consider adding a cron job that renews watches for all active Google connections periodically (e.g., weekly).

### 7.5 Webhook URL requirements

- Must be HTTPS in production (Google rejects HTTP for webhook addresses).
- Must be publicly accessible (not `localhost`).
- For local development, use a tunnel service (e.g., ngrok) and update the watch address accordingly.
