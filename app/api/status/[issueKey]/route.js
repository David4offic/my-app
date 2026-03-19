import { NextResponse } from 'next/server';

function jiraAuthHeader() {
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;

  return `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`;
}

function extractTextFromAdf(node) {
  if (!node) return '';

  if (Array.isArray(node)) {
    return node.map(extractTextFromAdf).join('');
  }

  if (node.type === 'text') {
    return node.text || '';
  }

  if (node.content) {
    return extractTextFromAdf(node.content);
  }

  return '';
}

export async function GET(request, context) {
  try {
    const { issueKey } = await context.params;

    const response = await fetch(
      `${process.env.JIRA_BASE_URL}/rest/api/3/issue/${issueKey}?fields=status,summary,created,updated,description,comment,customfield_10105,customfield_10094`,
      {
        method: 'GET',
        headers: {
          Authorization: jiraAuthHeader(),
          Accept: 'application/json',
        },
        cache: 'no-store',
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: 'Nepavyko gauti užsakymo būsenos.',
          jiraError: data,
        },
        { status: response.status }
      );
    }

    const fields = data.fields || {};
    const comments = fields.comment?.comments || [];
    const lastComment = comments.length ? comments[comments.length - 1] : null;

    const technicianNote = lastComment
      ? extractTextFromAdf(lastComment.body)
      : 'Techniko pastabų kol kas nėra.';

    return NextResponse.json({
      success: true,
      issueKey: data.key,
      summary: fields.summary || '',
      status: fields.status?.name || '',
      created: fields.created || null,
      updated: fields.updated || null,
      deviceModel: fields.customfield_10105 || '',
      serialNumber: fields.customfield_10094 || '',
      technicianNote,
      deliveryMethod: 'Atsiėmimas centre',
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
