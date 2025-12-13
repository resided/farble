import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fids = searchParams.get('fids');

  if (!fids || fids.trim() === '') {
    return NextResponse.json({ 
      error: 'FIDs required',
      message: 'Please provide fids as a query parameter: ?fids=1,2,3'
    }, { status: 400 });
  }

  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) {
    console.error('NEYNAR_API_KEY not found in environment variables');
    return NextResponse.json({ error: 'Neynar API key not configured' }, { status: 500 });
  }

  try {
    // Fetch casts for each FID
    const fidArray = fids.split(',').map(f => f.trim()).filter(f => f);
    const castsByFid: Record<string, any[]> = {};

    for (const fid of fidArray) {
      try {
        const response = await fetch(
          `https://api.neynar.com/v2/farcaster/cast/user?fid=${fid}&limit=10`,
          {
            headers: {
              'api_key': apiKey,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          castsByFid[fid] = data.result?.casts || [];
        }
      } catch (error) {
        console.error(`Error fetching casts for FID ${fid}:`, error);
        castsByFid[fid] = [];
      }
    }

    return NextResponse.json({ castsByFid });
  } catch (error) {
    console.error('Error fetching casts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

