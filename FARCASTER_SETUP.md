# Farcaster Miniapp Setup

This is a Farcaster miniapp for the Marble Race game. Here's how to set it up and deploy.

## Features

- ✅ Farcaster user integration
- ✅ Mobile-optimized UI
- ✅ Onchain betting (ready for integration)
- ✅ Real-time race visualization

## Development

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Farcaster Integration

The app uses the `useFarcaster` hook to get user data when running in a Farcaster client. In development, it falls back to mock data.

### User Data

The hook provides:
- `user.fid` - Farcaster ID
- `user.username` - Username
- `user.displayName` - Display name
- `user.pfpUrl` - Profile picture URL

### Adding Onchain Functionality

To add onchain betting:

1. Install wallet connection library (e.g., `@coinbase/wallet-sdk` or `viem`)
2. Add transaction handlers for:
   - Joining a race (buy-in)
   - Claiming winnings
   - Contract interactions

Example:
```typescript
import { useFarcaster } from './hooks/useFarcaster';

const { user } = useFarcaster();
// Use user.fid for onchain operations
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Deploy

The app is configured for Farcaster miniapp embedding.

### Farcaster Miniapp Registration

1. Register your miniapp in the Farcaster developer portal
2. Set your deployment URL
3. Configure metadata (title, description, image)

## Metadata

The app includes Farcaster-specific metadata in `app/layout.tsx`:
- `farcaster:frame` - Frame version
- `farcaster:frame:image` - OG image for sharing

Make sure to add an `og-image.png` to the `public` folder.

## Next Steps

- [ ] Add wallet connection for onchain transactions
- [ ] Integrate with smart contract for race logic
- [ ] Add real-time multiplayer support
- [ ] Implement provably fair randomness
- [ ] Add share functionality for race results

