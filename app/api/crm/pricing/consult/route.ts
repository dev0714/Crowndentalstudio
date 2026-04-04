import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { calculateConsultQuote } from '@/lib/pricing/consult-pricing';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const datetime = searchParams.get('datetime');

    if (!datetime) {
      return NextResponse.json({ error: 'datetime is required' }, { status: 400 });
    }

    return NextResponse.json({ data: calculateConsultQuote(datetime) });
  } catch (error) {
    console.error('Error calculating consult quote:', error);
    return NextResponse.json({ error: 'Failed to calculate consult quote' }, { status: 500 });
  }
}
