import { NextResponse } from 'next/server';
import {
  getRemotePrintDocument,
  verifyPrintAgentRequest,
} from '../../../../../lib/printJobs';

export async function GET(request, context) {
  try {
    if (!verifyPrintAgentRequest(request)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Neleistina uzklausa.',
        },
        { status: 401 }
      );
    }

    const { issueKey } = await context.params;
    const result = await getRemotePrintDocument(issueKey);

    if (!result.success) {
      return NextResponse.json(result, { status: result.statusCode || 500 });
    }

    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${result.fileName}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Serverio klaida.',
        error: String(error),
      },
      { status: 500 }
    );
  }
}
