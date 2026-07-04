import { NextResponse } from 'next/server';
import handler from '@/netlify/functions/nightly-update';

export async function GET(request: Request) {
  try {
    const result = await handler();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Test nightly route error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
