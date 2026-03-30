import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { fileName } = params;

    const safeFileName = path.basename(fileName);
    const filePath = path.join(process.cwd(), 'generated', safeFileName);

    await fs.promises.access(filePath);
    const fileBuffer = await fs.promises.readFile(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${safeFileName}"`,
      },
    });
  } catch (error) {
    console.error('contracts GET klaida:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Nepavyko atsiųsti failo.',
        error: error.message || 'Nežinoma klaida',
      },
      { status: 500 }
    );
  }
}
