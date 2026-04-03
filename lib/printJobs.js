import { generateContract } from './generateContract';

const PRINT_PROPERTY_KEY = process.env.JIRA_PRINT_PROPERTY_KEY || 'four_office_print_job';

function getEnv(name, fallback = '') {
  return process.env[name] || fallback;
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Truksta aplinkos kintamojo: ${name}`);
  }

  return value;
}

function jiraAuthHeader() {
  const email = getRequiredEnv('JIRA_EMAIL');
  const token = getRequiredEnv('JIRA_API_TOKEN');

  return `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`;
}

async function jiraFetch(path, init = {}) {
  const baseUrl = getRequiredEnv('JIRA_BASE_URL');

  return fetch(`${baseUrl}${path}`, {
    cache: 'no-store',
    ...init,
    headers: {
      Authorization: jiraAuthHeader(),
      Accept: 'application/json',
      ...init.headers,
    },
  });
}

export function getPrintDeliveryMode() {
  return getEnv('PRINT_DELIVERY_MODE', 'local-queue');
}

export function getPendingPrintLabel() {
  return getEnv('JIRA_PRINT_PENDING_LABEL', 'print-pending');
}

export function getDonePrintLabel() {
  return getEnv('JIRA_PRINT_DONE_LABEL', 'print-done');
}

export function isRemotePrintEnabled() {
  return getPrintDeliveryMode() === 'jira-agent';
}

export function verifyPrintAgentRequest(request) {
  const expectedToken = getRequiredEnv('PRINT_AGENT_TOKEN');
  const authHeader = request.headers.get('authorization');
  const headerToken = request.headers.get('x-print-agent-token');
  const queryToken = new URL(request.url).searchParams.get('token');

  const providedToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : headerToken || queryToken || '';

  return providedToken === expectedToken;
}

export async function createRemotePrintJob(issueKey, contractData) {
  const response = await jiraFetch(`/rest/api/3/issue/${issueKey}/properties/${PRINT_PROPERTY_KEY}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contractData,
      createdAt: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(`Nepavyko issaugoti print job Jira: ${JSON.stringify(data)}`);
  }
}

export async function findNextPrintJob() {
  const params = new URLSearchParams({
    jql: `labels = "${getPendingPrintLabel()}" ORDER BY created ASC`,
    maxResults: '1',
    fields: ['summary', 'created', 'status', 'customfield_10105', 'customfield_10094', 'labels'].join(','),
  });

  const response = await jiraFetch(`/rest/api/3/search/jql?${params.toString()}`, {
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

  const issue = (data.issues || [])[0];
  if (!issue) {
    return {
      success: true,
      job: null,
    };
  }

  const issueFields = issue.fields || {};

  return {
    success: true,
    job: {
      issueKey: issue.key,
      summary: issueFields.summary || '',
      created: issueFields.created || null,
      status: issueFields.status?.name || '',
      deviceModel: issueFields.customfield_10105 || '',
      serialNumber: issueFields.customfield_10094 || '',
    },
  };
}

export async function getRemotePrintDocument(issueKey) {
  const response = await jiraFetch(`/rest/api/3/issue/${issueKey}/properties/${PRINT_PROPERTY_KEY}`, {
    method: 'GET',
  });
  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      statusCode: response.status,
      message: 'Nepavyko gauti print job dokumento duomenu.',
      jiraError: data,
    };
  }

  const contractData = data.value?.contractData;
  if (!contractData) {
    return {
      success: false,
      statusCode: 404,
      message: 'Print job duomenys nerasti.',
    };
  }

  return {
    success: true,
    fileName: `${issueKey}.docx`,
    buffer: generateContract(contractData),
  };
}

export async function markRemotePrintComplete(issueKey) {
  const response = await jiraFetch(`/rest/api/3/issue/${issueKey}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      update: {
        labels: [
          { remove: getPendingPrintLabel() },
          { add: getDonePrintLabel() },
        ],
      },
    }),
  });

  if (!response.ok) {
    const data = await response.json();
    return {
      success: false,
      statusCode: response.status,
      message: 'Nepavyko pazymeti print job kaip uzbaigto.',
      jiraError: data,
    };
  }

  return {
    success: true,
  };
}
