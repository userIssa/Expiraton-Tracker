import { NextResponse } from 'next/server';
import { generateSampleExcelBuffer } from '@/lib/excel-import';

export async function GET() {
  try {
    const buffer = generateSampleExcelBuffer();

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Genesis_Warehouse_Items_Template.xlsx"',
      },
    });
  } catch (error: any) {
    console.error('Template generation error:', error);
    return NextResponse.json({ error: 'Failed to generate template' }, { status: 500 });
  }
}
