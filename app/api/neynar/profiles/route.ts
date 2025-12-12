import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const usernames = searchParams.get('usernames');

  if (!usernames) {
    return NextResponse.json({ error: 'Usernames required' }, { status: 400 });
  }

  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Neynar API key not configured' }, { status: 500 });
  }

  try {
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk/by_username?usernames=${usernames}`,
      {
        headers: {
          'api_key': apiKey,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch profiles' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const users = data.result?.users || [];
    
    const profiles: Record<string, string> = {};
    users.forEach((user: any) => {
      if (user.username && user.pfp_url) {
        profiles[`@${user.username}`] = user.pfp_url;
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

