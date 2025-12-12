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

    if (cleanUsernames.length === 0) {
      console.log('No usernames to fetch (all are "you")');
      return profiles;
    }

    // Fetch profiles through our API route (server-side, uses NEYNAR_API_KEY)
    const usernamesParam = cleanUsernames.join(',');
    console.log('Fetching Neynar profiles for:', usernamesParam);
    
    if (!usernamesParam || usernamesParam.trim() === '') {
      console.warn('No usernames to fetch after cleaning');
      return profiles;
    }
    
    try {
      const response = await fetch(
        `/api/neynar/profiles?usernames=${encodeURIComponent(usernamesParam)}`
      );

      if (response.ok) {
        const data = await response.json();
        console.log('Neynar API response:', data);
        if (data.profiles) {
          Object.assign(profiles, data.profiles);
          console.log('Loaded profiles:', profiles);
        } else if (data.error) {
          console.error('Neynar API error:', data.error);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.warn('Neynar API request failed:', response.status, response.statusText, errorData);
      }
    } catch (error) {
      console.error('Network error fetching Neynar profiles:', error);
    }
  } catch (error) {
    console.error('Error fetching Neynar profiles:', error);
  }

  return profiles;
}

