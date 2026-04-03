import { extractTextFromAdf, jiraFetch } from './jiraStatus';

function getPrintEnv(name, fallback = '') {
  return process.env[name] || fallback;
}

function getRequiredPrintToken() {
  const token = process.env.PRINT_AGENT_TOKEN;
  if (!token) {
    throw new Error('Truksta PRINT_AGENT_TOKEN aplinkos kintamojo.');
  }

  return token;
}

export function verifyPrintAgentRequest(request) {
  const expected = getRequiredPrintToken();
  const authHeader = request.headers.get('authorization');
  const customHeader = request.headers.get('x-print-agent-token');
  const queryToken = new URL(request.url).searchParams.get('token');

  const provided = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : customHeader || queryToken || '';

  return provided === expected;
}

export async function getNextPrintJob() {
  const pendingLabel = getPrintEnv('JIRA_PRINT_PENDING_LABEL', 'print-pending');
  const fields = [
    'summary',
    'created',
    'updated',
    'status',
    'description',
    'comment',
    'labels',
    'customfield_10105',
    'customfield_10094',
  ];
  const params = new URLSearchParams({
    jql: `labels = "${pendingLabel}" ORDER BY created ASC`,
    maxResults: '1',
    fields: fields.join(','),
  });
  const response = await jiraFetch(`/rest/api/3/search?${params.toString()}`, {
    method: 'GET',
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      statusCode: response.status,
      message: 'Nepavyko gauti spausdinimo uzduociu.',
      jiraError: data,
    };
  }

  const issue = (data.issues || []).find((item) => /^IR-\d+$/i.test(item.key));

  if (!issue) {
    return {
      success: true,
      job: null,
    };
  }

  const fields = issue.fields || {};

  return {
    success: true,
    job: {
      issueKey: issue.key,
      summary: fields.summary || '',
      status: fields.status?.name || '',
      created: fields.created || null,
      updated: fields.updated || null,
      deviceModel: fields.customfield_10105 || '',
      serialNumber: fields.customfield_10094 || '',
      descriptionText: extractTextFromAdf(fields.description) || '',
      labels: fields.labels || [],
    },
  };
}

export async function markPrintJobComplete(issueKey) {
  const pendingLabel = getPrintEnv('JIRA_PRINT_PENDING_LABEL', 'print-pending');
  const doneLabel = getPrintEnv('JIRA_PRINT_DONE_LABEL', 'print-done');

  const response = await jiraFetch(`/rest/api/3/issue/${issueKey}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      update: {
        labels: [
          { remove: pendingLabel },
          { add: doneLabel },
        ],
      },
    }),
  });

  if (!response.ok) {
    const data = await response.json();
    return {
      success: false,
      statusCode: response.status,
      message: 'Nepavyko pazymeti spausdinimo uzduoties kaip ivykdytos.',
      jiraError: data,
    };
  }

  return {
    success: true,
  };
}
