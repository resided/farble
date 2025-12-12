'use client';

import { useState, useEffect } from 'react';

interface NeynarUser {
  pfp_url?: string;
  username?: string;
  display_name?: string;
}

export function useNeynarProfile(username: string) {
  const [pfpUrl, setPfpUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!username || username === 'you') {
        setLoading(false);
        return;
      }

      try {
        // Remove @ if present
        const cleanUsername = username.replace('@', '');
        
        // Fetch from our API route (server-side, uses NEYNAR_API_KEY)
        const response = await fetch(
          `/api/neynar/profiles?usernames=${cleanUsername}`
        );

        if (response.ok) {
          const data = await response.json();
          const profiles = data.profiles || {};
          if (profiles[`@${cleanUsername}`]) {
            setPfpUrl(profiles[`@${cleanUsername}`]);
          }
        }
      } catch (error) {
        console.error('Error fetching Neynar profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  return { pfpUrl, loading };
}

export async function fetchNeynarProfiles(usernames: string[]): Promise<Record<string, string>> {
  const profiles: Record<string, string> = {};

  try {
    // Remove @ from usernames and filter out 'you'
    const cleanUsernames = usernames
      .map(u => u.replace('@', ''))
      .filter(u => u !== 'you');

    if (cleanUsernames.length === 0) return profiles;

    // Fetch profiles through our API route (server-side, uses NEYNAR_API_KEY)
    const usernamesParam = cleanUsernames.join(',');
    const response = await fetch(
      `/api/neynar/profiles?usernames=${usernamesParam}`
    );

    if (response.ok) {
      const data = await response.json();
      Object.assign(profiles, data.profiles || {});
    } else {
      console.warn('Neynar API request failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Error fetching Neynar profiles:', error);
  }

  return profiles;
}

