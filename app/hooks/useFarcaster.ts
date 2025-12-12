'use client';

import { useEffect, useState } from 'react';

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
    // Check if we're in a Farcaster environment
    if (typeof window !== 'undefined') {
      // Try to get user data from Farcaster context
      // This will be available when running in Farcaster client
      const farcasterContext = (window as any).farcaster;
      
      if (farcasterContext) {
        // Get user data from Farcaster SDK
        farcasterContext.getUser?.()
          .then((userData: FarcasterUser) => {
            setUser(userData);
            setLoading(false);
          })
          .catch(() => {
            setLoading(false);
          });
      } else {
        // Fallback for development/testing
        // In production, this would come from Farcaster
        setUser({
          fid: 1,
          username: 'you',
          displayName: 'You',
        });
        setLoading(false);
      }
    }
  }, []);

  return { user, loading };
}

