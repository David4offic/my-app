import { NextResponse } from 'next/server';
import {
  markRemotePrintComplete,
  verifyPrintAgentRequest,
} from '../../../../../lib/printJobs';

export async function POST(request, context) {
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
    const result = await markRemotePrintComplete(issueKey);

    return NextResponse.json(result, { status: result.statusCode || 200 });
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
