import { NextResponse } from 'next/server';
import handler from '@/netlify/functions/nightly-update';

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Nightly test endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    const result = await handler();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Test nightly route error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
