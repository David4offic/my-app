import { NextResponse } from 'next/server';
import { getJiraIssueStatus } from '../../../../lib/jiraStatus';

export async function GET(request, context) {
  try {
    const { issueKey } = await context.params;
    const result = await getJiraIssueStatus(issueKey);

    if (!result.success) {
      return NextResponse.json(result, { status: result.statusCode || 500 });
    }

    return NextResponse.json(result);
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
