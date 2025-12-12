# Farcaster Miniapp Setup

This is a Farcaster miniapp for the Marble Race game. Here's how to set it up and deploy.

## Features

- ✅ Farcaster user integration
- ✅ Mobile-optimized UI
- ✅ Onchain betting (ready for integration)
- ✅ Real-time race visualization
- ✅ Farcaster manifest file

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

**IMPORTANT:** After deploying to https://farble.vercel.app/, you need to:

1. **Sign Your Manifest:**
   - Visit [Base.dev](https://base.dev/) and sign in with your Base account
   - Navigate to Preview → Account Association
   - Enter your app's domain (`farble.vercel.app`)
   - Follow the instructions to sign the message with your wallet
   - Copy the generated `accountAssociation` object into `public/.well-known/farcaster.json` under the `accountAssociation` field
   - Redeploy to Vercel

2. **Test Your Mini App:**
   - Enable Developer Mode in your Farcaster client:
     - Log in to Farcaster on mobile or desktop
     - Visit [https://farcaster.xyz/~/settings/developer-tools](https://farcaster.xyz/~/settings/developer-tools)
     - Toggle on "Developer Mode"
   - This will allow you to preview and test your Mini App within the Farcaster environment

3. **Add App Icon:**
   - Create a 1024×1024 icon and save it as `public/icon.png`
   - The icon should represent your app
   - You can use the [Mini App Asset Generator](https://www.miniappassets.com/) to create compliant assets

## Manifest File

The app includes a Farcaster manifest at `public/.well-known/farcaster.json` that provides:
- App name and description
- Icon URL
- Home URL
- Required chains (Base: eip155:8453)
- Required capabilities

Make sure this file is accessible at: `https://farble.vercel.app/.well-known/farcaster.json`

## Metadata

The app includes Farcaster-specific metadata in `app/layout.tsx`:
- `farcaster:frame` - Frame version
- `farcaster:frame:image` - OG image for sharing

Make sure to add an `og-image.png` to the `public` folder for better sharing.

## Next Steps

- [ ] Sign the manifest using Base.dev
- [ ] Add app icon (`public/icon.png`)
- [ ] Add OG image (`public/og-image.png`)
- [ ] Test in Farcaster client with Developer Mode
- [ ] Add wallet connection for onchain transactions
- [ ] Integrate with smart contract for race logic
- [ ] Add real-time multiplayer support
- [ ] Implement provably fair randomness
- [ ] Add share functionality for race results

## Resources

- [Farcaster Miniapps Documentation](https://miniapps.farcaster.xyz/docs/getting-started)
- [Base Miniapps Documentation](https://docs.base.org/mini-apps)
- [Mini App Asset Generator](https://www.miniappassets.com/)
