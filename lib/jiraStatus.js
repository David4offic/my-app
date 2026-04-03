function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Truksta aplinkos kintamojo: ${name}`);
  }

  return value;
}

export function jiraAuthHeader() {
  const email = getRequiredEnv('JIRA_EMAIL');
  const token = getRequiredEnv('JIRA_API_TOKEN');
  getRequiredEnv('JIRA_BASE_URL');

  return `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`;
}

export function extractTextFromAdf(node) {
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

export async function jiraFetch(path, init = {}) {
  const baseUrl = getRequiredEnv('JIRA_BASE_URL');
  const headers = {
    Authorization: jiraAuthHeader(),
    Accept: 'application/json',
    ...init.headers,
  };

  return fetch(`${baseUrl}${path}`, {
    cache: 'no-store',
    ...init,
    headers,
  });
}

export function mapIssueToStatusPayload(data) {
  const fields = data.fields || {};
  const comments = fields.comment?.comments || [];
  const lastComment = comments.length ? comments[comments.length - 1] : null;

  return {
    success: true,
    issueKey: data.key,
    summary: fields.summary || '',
    status: fields.status?.name || '',
    created: fields.created || null,
    updated: fields.updated || null,
    deviceModel: fields.customfield_10105 || '',
    serialNumber: fields.customfield_10094 || '',
    technicianNote: lastComment
      ? extractTextFromAdf(lastComment.body)
      : 'Techniko pastabu kol kas nera.',
    deliveryMethod: 'Atsiemimas centre',
  };
}

export async function getJiraIssue(issueKey, fields) {
  const response = await jiraFetch(
    `/rest/api/3/issue/${issueKey}?fields=${encodeURIComponent(fields.join(','))}`
  );
  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      statusCode: response.status,
      message: 'Nepavyko gauti uzsakymo busenos.',
      jiraError: data,
    };
  }

  return {
    success: true,
    issue: data,
  };
}

export async function getJiraIssueStatus(issueKey) {
  const result = await getJiraIssue(issueKey, [
    'status',
    'summary',
    'created',
    'updated',
    'description',
    'comment',
    'customfield_10105',
    'customfield_10094',
  ]);

  if (!result.success) {
    return result;
  }

  return mapIssueToStatusPayload(result.issue);
}
