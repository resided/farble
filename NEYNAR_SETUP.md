# Neynar API Setup

This app uses the Neynar API to fetch profile pictures for players in the marble race.

## Setup

1. Get your Neynar API key from [Neynar Dashboard](https://neynar.com)

2. Add it to your environment variables:
   - Create a `.env.local` file in the root directory
   - Add: `NEYNAR_API_KEY=your_api_key_here`

3. For Vercel deployment:
   - Go to your Vercel project settings
   - Add the environment variable `NEYNAR_API_KEY` with your API key
   
   **Note:** The API key is used server-side only for security, so it doesn't need the `NEXT_PUBLIC_` prefix.

## How it works

- When players join the lobby, the app fetches their profile pictures from Neynar
- Profile pictures are displayed as:
  - Marble textures during the race
  - Avatars in the lobby
  - Winner display in results
- Falls back to colored marbles if profile pictures aren't available

## API Endpoints Used

- `GET /v2/farcaster/user/bulk/by_username` - Batch fetch multiple user profiles
- The API key is sent in the `api_key` header

