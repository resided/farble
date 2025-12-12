'use client';

import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

interface FarcasterUser {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl?: string;
}

export function useFarcaster() {
  const [user, setUser] = useState<FarcasterUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeFarcaster = async () => {
      try {
        // Get user data from Farcaster context
        // Note: sdk.actions.ready() is called by FarcasterProvider
        const context = await sdk.context;
        if (context?.user) {
          const userData = context.user;
          setUser({
            fid: userData.fid,
            username: userData.username || userData.displayName?.toLowerCase() || 'user',
            displayName: userData.displayName || userData.username || 'User',
            pfpUrl: (userData as any).pfp?.url,
          });
        } else {
          // Fallback for development/testing or when not in Farcaster client
          setUser({
            fid: 1,
            username: 'you',
            displayName: 'You',
          });
        }
      } catch (error) {
        // If SDK is not available (e.g., not in Farcaster client), use fallback data
        console.log('Farcaster SDK not available, using fallback:', error);
        setUser({
          fid: 1,
          username: 'you',
          displayName: 'You',
        });
      } finally {
        setLoading(false);
      }
    };

    initializeFarcaster();
  }, []);

  return { user, loading };
}

