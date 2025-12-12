import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const usernames = searchParams.get('usernames');
  const fids = searchParams.get('fids'); // Support FID lookup as well

  if ((!usernames || usernames.trim() === '') && (!fids || fids.trim() === '')) {
    return NextResponse.json({ 
      error: 'Usernames or FIDs required',
      message: 'Please provide usernames or fids as a query parameter: ?usernames=username1,username2 or ?fids=1,2,3'
    }, { status: 400 });
  }

  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) {
    console.error('NEYNAR_API_KEY not found in environment variables');
    return NextResponse.json({ error: 'Neynar API key not configured' }, { status: 500 });
  }

  try {
    let response;
    let users: any[] = [];
    
    // Try fetching by usernames first, then by FIDs if needed
    if (usernames && usernames.trim() !== '') {
      response = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk/by_username?usernames=${usernames}`,
        {
          headers: {
            'api_key': apiKey,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        users = data.result?.users || [];
        console.log(`Fetched ${users.length} users from Neynar by username`);
      }
    }
    
    // If usernames didn't work or we have FIDs, try FID lookup
    if ((!response || !response.ok) && fids && fids.trim() !== '') {
      response = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fids}`,
        {
          headers: {
            'api_key': apiKey,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        users = data.result?.users || [];
        console.log(`Fetched ${users.length} users from Neynar by FID`);
      }
    }

    if (!response || !response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch profiles from Neynar' },
        { status: response?.status || 500 }
      );
    }
    
    const profiles: Record<string, string> = {};
    users.forEach((user: any) => {
      if (user.username && user.pfp_url) {
        profiles[`@${user.username}`] = user.pfp_url;
        console.log(`Profile for @${user.username}: ${user.pfp_url}`);
      }
      // Also map by FID if available
      if (user.fid && user.pfp_url) {
        profiles[`fid:${user.fid}`] = user.pfp_url;
      }
    });

    return NextResponse.json({ profiles });
  } catch (error) {
    console.error('Error fetching Neynar profiles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

