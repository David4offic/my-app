import { NextResponse } from 'next/server';
import { getNextPrintJob, verifyPrintAgentRequest } from '../../../../lib/printJobs';

export async function GET(request) {
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

    const result = await getNextPrintJob();
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
