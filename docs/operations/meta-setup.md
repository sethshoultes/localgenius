# Meta (Facebook + Instagram) Integration Setup

This guide covers setting up Meta Graph API integration for publishing content to Facebook Pages and Instagram accounts.

## Overview

LocalGenius connects to Meta (Facebook + Instagram) via OAuth 2.0 to:
- Publish posts to Facebook Pages
- Publish content to Instagram Business Accounts
- Sync engagement metrics (reach, impressions, likes, comments, shares)
- Store encrypted tokens with 60-day refresh cycle

Rate limits: 200 API calls/user/hour, 25 content publishes/day/user.

## Important: Image Requirements

**Instagram requires a publicly accessible image URL** before publishing. Images must be:
- Uploaded to R2 (or another public CDN) before calling the publish function
- Fully qualified URLs (e.g., `https://cdn.example.com/image.jpg`)
- Not local file paths

Text-only posts are supported on Facebook but NOT on Instagram.

## Step 1: Create a Meta Developer App

1. Go to [Meta Developers](https://developers.facebook.com)
2. Click **My Apps → Create App**
3. Select **App Type**: Business
4. Fill in app details:
   - **App Name**: LocalGenius
   - **App Contact Email**: your email
   - **Business Account**: Create or select your business account
   - **App Purpose**: Select "Manage Pages" and "Manage Instagram"
5. Click **Create App**

## Step 2: Add Products to Your App

1. From your app dashboard, find **Add Products**
2. Add the **Instagram Graph API** product
3. Add the **Facebook Graph API** product

This gives your app access to both platforms.

## Step 3: Get App Credentials

1. Go to **Settings → Basic**
2. Copy these values:
   - **App ID** (numeric)
   - **App Secret** (keep secure — don't commit to git)

These are used to authenticate OAuth requests and token exchanges.

## Step 4: Configure OAuth Redirect URI

OAuth redirect URI tells Meta where to send users after they approve access.

1. Go to **Settings → Basic** in your app dashboard
2. Under **App Domains**, add:
   ```
   localgenius.company
   ```

3. Go to **Roles → Test Users** (or **Settings → Basic → OAuth Redirect URIs**)
4. Add your redirect URI:
   ```
   https://localgenius.company/api/integrations/meta/callback
   ```
   For local development, use ngrok:
   ```
   https://your-ngrok-url.ngrok.io/api/integrations/meta/callback
   ```

5. Make sure to add the base domain under **App Domains** for the redirect to work

## Step 5: Configure Environment Variables

Add the following to your `.env.local` file:

```bash
# Meta (Facebook + Instagram) OAuth
META_APP_ID=your-app-id                    # Numeric app ID from Settings → Basic
META_APP_SECRET=your-app-secret            # App secret from Settings → Basic
META_REDIRECT_URI=https://localgenius.company/api/integrations/meta/callback
```

### Where to find each value:

| Variable | Location | Notes |
|----------|----------|-------|
| `META_APP_ID` | Settings → Basic → App ID | Numeric value |
| `META_APP_SECRET` | Settings → Basic → App Secret | Keep secure, never commit |
| `META_REDIRECT_URI` | Your configured redirect URI | Must match Settings → Basic OAuth config |

## Step 6: Required OAuth Scopes

The app requests these permissions from users during OAuth:

```
instagram_basic         — Read Instagram profile info
instagram_content_publish — Publish to Instagram
pages_read_engagement   — Read Facebook page engagement metrics
pages_manage_posts      — Publish to Facebook Pages
```

Users approve these scopes when connecting their account. The app verifies these permissions before publishing.

## Step 7: Test OAuth Flow

### Start Local Development

1. Set up ngrok to expose your local server:
   ```bash
   ngrok http 3000
   ```
   Copy the URL (e.g., `https://abc123.ngrok.io`)

2. Update your `.env.local`:
   ```bash
   META_REDIRECT_URI=https://abc123.ngrok.io/api/integrations/meta/callback
   ```

3. Update your Meta app settings:
   - **Settings → Basic → App Domains**: Add `ngrok.io` domain
   - **OAuth Redirect URIs**: Update to ngrok URL

4. Start the app:
   ```bash
   npm run dev
   ```

### Connect Your Account

1. Navigate to the integrations page
2. Click **Connect Meta** (Facebook + Instagram)
3. You'll be redirected to Meta login
4. Approve the requested permissions
5. Select your Facebook Page (the app uses the first connected page)
6. You'll be redirected back with a success message

### Verify Connection

1. Check database:
   ```sql
   SELECT * FROM business_settings 
   WHERE platform = 'meta' 
   AND connection_status = 'active';
   ```

2. Test publishing:
   - Create a post with text only → Publishes to Facebook
   - Create a post with text + image (from CDN) → Publishes to both Facebook and Instagram

## Step 8: Token Management

The app automatically:
- Stores encrypted tokens in `business_settings` table
- Refreshes tokens 7 days before expiry (Meta tokens last 60 days)
- Updates `tokenExpiresAt` after refresh
- Marks connection as `expired` if token fully expires

### Token Lifecycle

1. **OAuth Callback**: Long-lived token (60-day expiry) stored encrypted
2. **Before Expiry**: Token auto-refreshed 7 days before expiry
3. **After Expiry**: Connection marked `expired`, user must reconnect

## Step 9: Publishing Content

### Publish to Facebook

```javascript
// POST /api/posts
{
  "platform": "facebook",
  "text": "Check out our latest update!",
  "imageUrl": "https://cdn.example.com/image.jpg"  // Optional
}
```

- Publishes to the connected Facebook Page
- Supports text-only or text + image
- Image URL must be publicly accessible

### Publish to Instagram

```javascript
// POST /api/posts
{
  "platform": "instagram",
  "text": "Check out our latest update!",
  "imageUrl": "https://cdn.example.com/image.jpg"  // Required
}
```

**IMPORTANT**: Instagram requires `imageUrl` (text-only not supported). Image must be:
- Publicly accessible URL (not localhost)
- HTTP or HTTPS protocol
- Valid image format (JPG, PNG, WebP)
- Hosted on a public CDN (R2, Cloudinary, etc.)

### All Posts Include Watermark

Every published post automatically appends:
```
Posted by LocalGenius
```

## Step 10: Sync Engagement Metrics

The app has a cron job (`/api/cron/meta-sync`) that periodically syncs:
- Reach
- Impressions
- Likes
- Comments
- Shares
- Saves (Instagram)

Metrics are stored in `analyticsEvents` table with:
- `eventType`: `social_engagement`
- `source`: `meta_facebook_insights` or `meta_instagram_insights`
- `metadata`: Engagement data

## Environment Variables Reference

All Meta environment variables are **optional** — the app works without them, but Meta integration is disabled.

```bash
# Required for Meta integration to work
META_APP_ID=your-app-id
META_APP_SECRET=your-app-secret
META_REDIRECT_URI=https://localgenius.company/api/integrations/meta/callback
```

## OAuth Flow Details

### Step-by-Step Process

1. **Initiate**: User clicks "Connect Meta"
   - GET `/api/integrations/meta/connect`
   - Returns Meta OAuth URL with HMAC-signed state

2. **Authorize**: User logs in to Meta and approves permissions
   - Meta redirects to `META_REDIRECT_URI` with authorization code

3. **Exchange Code**: Backend exchanges code for tokens
   - Code → short-lived token (hours)
   - Short-lived → long-lived token (60 days)
   - Long-lived token encrypted and stored in database

4. **Get Page Info**: Fetch connected Facebook Pages and Instagram Business Account ID
   - Use long-lived token to query pages
   - Extract first page and Instagram account

5. **Store Connection**: Save encrypted tokens + page info
   - `accessToken`: Encrypted long-lived token
   - `platformBusinessId`: Facebook Page ID
   - `platformUserId`: Instagram Business Account ID
   - `connectionStatus`: "active"
   - `tokenExpiresAt`: Expiry date (60 days from now)

### State Parameter

State is **HMAC-signed** to prevent CSRF attacks:
- Contains: `businessId`, `organizationId`
- Signature verified on callback
- Prevents tampering with user/business context

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/integrations/meta/connect` | GET | Initiate OAuth flow, return Meta login URL |
| `/api/integrations/meta/callback` | GET | OAuth callback, exchange code for token |
| `/api/cron/meta-sync` | POST | Sync engagement metrics (called by cron) |

## Troubleshooting

### "No active Meta connection"

1. User hasn't connected their Meta account yet
2. Connection has expired (> 60 days since token issued)
3. User disconnected or revoked permissions in Meta settings

**Fix**: User must reconnect via `/api/integrations/meta/connect`

### "No Facebook Pages found"

1. User's Meta account has no Facebook Pages
2. User didn't approve `pages_manage_posts` scope

**Fix**:
- Create a Facebook Page in Meta Business Suite
- Reconnect and ensure all permissions are approved

### "No Instagram Business Account connected"

1. Facebook Page doesn't have a linked Instagram account
2. Instagram account exists but isn't a Business Account

**Fix**: In Meta Business Suite:
1. Go to Accounts → Instagram Accounts
2. Link your Instagram account to the Facebook Page
3. Reconnect the Meta integration

### "Instagram requires a public image URL"

Instagram doesn't support text-only posts. Images must be:
- Publicly accessible (not localhost)
- Valid URL (http/https)
- Uploaded to a CDN (R2, Cloudinary, etc.)

**Fix**: Upload images before publishing to Instagram

### Token refresh fails

If token is expired:
- User sees "Connection expired" error
- Must reconnect via OAuth
- Previous token is marked as `expired` in database

If token is still valid but refresh fails:
- Current token is still usable
- Retry will happen at next sync

## Related Files

- `src/services/meta-social.ts` — Meta Graph API integration (OAuth, publishing, insights)
- `src/app/api/integrations/meta/connect/route.ts` — OAuth initiation endpoint
- `src/app/api/integrations/meta/callback/route.ts` — OAuth callback handler
- `src/lib/encryption.ts` — Token encryption/decryption
- `src/lib/oauth-state.ts` — State parameter signing/verification
- `src/lib/env.ts` — Environment variable validation

## Next Steps

1. Create Meta Developer app
2. Add Instagram Graph API and Facebook Graph API products
3. Get App ID and App Secret from Settings → Basic
4. Configure OAuth Redirect URI
5. Add environment variables to `.env.local`
6. Test OAuth flow with ngrok in local development
7. Verify connection in database
8. Test publishing to both Facebook and Instagram
9. Monitor engagement metrics sync via cron

## Rate Limits

- **API Calls**: 200 calls/user/hour
- **Content Publishes**: 25 posts/day/user
- **Token Refresh**: Allowed anytime before expiry (60-day window)

If you hit rate limits:
- Publish queue backs off and retries
- Metrics sync is throttled
- Users are notified of rate limit status
