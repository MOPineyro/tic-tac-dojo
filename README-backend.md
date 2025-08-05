# Tic-Tac-Dojo Backend API

This is the TypeScript Vercel serverless backend for the Tic-Tac-Dojo game, implementing Fluid Compute architecture for optimal performance and cost efficiency.

## Setup Instructions

### 1. Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy the project
vercel --prod
```

### 2. Environment Variables

Set up the following environment variables in your Vercel dashboard:

- `FIREBASE_PROJECT_ID`: Your Firebase project ID
- `FIREBASE_PRIVATE_KEY`: Firebase service account private key
- `FIREBASE_CLIENT_EMAIL`: Firebase service account email
- `UPSTASH_REDIS_REST_URL`: Your Upstash Redis REST URL
- `UPSTASH_REDIS_REST_TOKEN`: Your Upstash Redis token

### 3. Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Firestore Database
3. Create a service account and download the JSON key
4. Extract the required fields for environment variables

### 4. Upstash Setup

1. Create an account at https://upstash.com/
2. Create a new Redis database
3. Copy the REST URL and token for environment variables

## API Endpoints

### Authentication
- `POST /api/auth/session` - Create anonymous session

### Game Management
- `POST /api/game/create` - Create new game
- `PUT /api/game/move` - Make a move
- `GET /api/game/state/[id]` - Get game state

### AI
- `POST /api/ai/calculate-move` - Calculate AI move

### Leaderboard
- `GET /api/leaderboard/rankings` - Get player rankings

## Architecture Features

- **Rate Limiting**: Built-in rate limiting using Upstash Redis
- **Security**: Input validation and sanitization
- **Performance**: Optimized for Vercel Fluid Compute
- **Scalability**: Designed to handle millions of concurrent games
- **Anti-Cheat**: Server-side validation and move verification

## Development

```bash
# Install dependencies
npm install

# Type checking
npm run type-check

# Start local development (requires vercel dev)
npm run dev
# or
vercel dev
```

## Testing

Test the API endpoints using curl or your preferred HTTP client:

```bash
# Create a session
curl -X POST http://localhost:3000/api/auth/session \
  -H "Content-Type: application/json" \
  -d '{"sessionType": "anonymous", "playerName": "Test Player"}'

# Create a game
curl -X POST http://localhost:3000/api/game/create \
  -H "Content-Type: application/json" \
  -d '{"playerId": "your-player-id", "gameMode": "ai", "difficulty": "medium"}'
```