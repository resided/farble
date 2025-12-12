'use client';

import { useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

/**
 * FarcasterProvider ensures sdk.actions.ready() is called as early as possible
 * to hide the splash screen. This is required for Farcaster miniapps.
 */
export function FarcasterProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Call ready() immediately when component mounts
    // This is required to hide the splash screen in Farcaster clients
    sdk.actions.ready().catch((error) => {
      // If SDK is not available (e.g., not in Farcaster client), that's okay
      // The app will still work in regular browsers
      console.log('Farcaster SDK ready() called (may not be in Farcaster client):', error);
    });
  }, []);

  return <>{children}</>;
}

