# FormApp

> Smart form builder that syncs responses to Airtable with conditional logic

## 🚀 Quick Start

### Backend
```bash
cd server
npm install
# Create .env file (see below)
npm run dev
```

### Frontend
```bash
cd formapp
npm install
npm run dev
```

## ⚙️ Environment Setup

Create `server/.env`:
```env
MONGO_URI=mongodb://localhost:27017/formapp
AIRTABLE_CLIENT_ID=your_client_id
AIRTABLE_CLIENT_SECRET=your_client_secret
AIRTABLE_REDIRECT_URI=http://localhost:5000/api/airtable/callback
JWT_SECRET=your_secret_key
SESSION_SECRET=your_session_secret
PORT=5000
# Webhook URL (use your ngrok URL when testing, or your deployed URL in production)
WEBHOOK_BASE_URL=https://your-ngrok-url.ngrok-free.app
```

## 🔐 Airtable OAuth Setup

1. Go to [Airtable Developer Portal](https://airtable.com/create/oauth)
2. Create OAuth app with redirect URI: `http://localhost:5000/api/airtable/callback`
3. Add scopes: `data.records:read`, `data.records:write`, `schema.bases:read`
4. Copy Client ID & Secret to `.env`

## 📊 Data Models

**Form**: `name`, `ownerId`, `airtableBaseId`, `airtableTableId`, `questions[]`

**Response**: `formId`, `airtableRecordId`, `answers{}`, `deletedInAirtable`, `deletedAt`

**User**: `airtableUserId`, `email`, `accessToken`, `refreshToken`

## 🎯 Conditional Logic

Questions show/hide based on previous answers:

```js
conditionalRules: {
  logic: "AND",  // or "OR"
  conditions: [{
    questionKey: "role",
    operator: "equals",  // equals, notEquals, contains
    value: "Engineer"
  }]
}
```

## 🔔 Webhooks Setup

### What is ngrok?

**ngrok** creates a public URL that tunnels to your local server. Airtable needs a public HTTPS URL to send webhooks, but your `localhost:5000` isn't accessible from the internet. ngrok bridges that gap.

**Think of it like:** Your local server is a house with no address. ngrok gives it a public address so Airtable can "mail" webhooks to it.

### Step-by-Step Webhook Setup:

1. **Install ngrok:**
   ```bash
   # Option 1: Download from ngrok.com
   # Option 2: Using npm
   npm install -g ngrok
   ```

2. **Sign up for ngrok (FREE):**
   - Go to: https://dashboard.ngrok.com/signup
   - Sign up with email (free account works fine)
   - After signup, go to: https://dashboard.ngrok.com/get-started/your-authtoken
   - Copy your authtoken (looks like: `2abc123def456ghi789jkl012mno345pqr678`)

3. **Authenticate ngrok:**
   ```bash
   ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
   ```
   
   Example:
   ```bash
   ngrok config add-authtoken 2abc123def456ghi789jkl012mno345pqr678
   ```

4. **Start your backend server:**
   ```bash
   cd server
   npm run dev
   # Server running on http://localhost:5000
   ```

5. **Start ngrok in a NEW terminal:**
   ```bash
   ngrok http 5000
   ```
   
   You'll see something like:
   ```
   Forwarding  https://abc123.ngrok-free.app -> http://localhost:5000
   ```
   
   **Copy the HTTPS URL** (the `https://abc123.ngrok-free.app` part)

6. **Create webhook via API:**
   ```bash
   POST http://localhost:5000/api/airtable/bases/YOUR_BASE_ID/webhook
   Headers: {
     Authorization: Bearer YOUR_JWT_TOKEN,
     Content-Type: application/json
   }
   Body: {
     "notificationUrl": "https://abc123.ngrok-free.app/api/webhooks/airtable",
     "tableId": "YOUR_TABLE_ID"
   }
   ```

7. **Done!** The webhook is saved to your Form document. When records change in Airtable, they'll sync to MongoDB.

**Note:** Keep ngrok running while testing. If you restart ngrok, you'll get a new URL and need to recreate the webhook.

## 🗑️ Soft Delete

- **Airtable**: Record deleted permanently
- **MongoDB**: Flagged with `deletedInAirtable: true`
- **UI**: Only shows `deletedInAirtable: false` responses

## 📡 API Endpoints

- `POST /api/forms` - Create form
- `GET /api/forms/user/forms` - Get user's forms
- `POST /api/responses` - Submit response
- `GET /api/responses/forms/:formId/responses` - Get responses
- `DELETE /api/responses/:responseId` - Delete response (flag record in mongoDb)
- `POST /api/airtable/bases/:baseId/webhook` - Create webhook

## 🛠 Tech Stack

**Frontend**: React, React Router, Vite  
**Backend**: Node.js, Express, MongoDB, Airtable API

## 📸 Screenshots

[Add your screenshots here]
