import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { generateContract } from '../../../lib/generateContract';
import { convertDocxToPdf } from '../../../lib/convertDocxToPdf';
import { sendRepairCreatedEmail } from '../../../lib/mail';

const AUTO_PRINT_DIR = process.env.AUTO_PRINT_DIR || '/home/pi/AutoPrint/Inbox';
const fsPromises = fs.promises;
const GENERATED_DIR = path.join(process.cwd(), 'generated');
const REPORT_PATH = path.join(GENERATED_DIR, 'ataskaita.txt');

const getDurationMs = (start) => Number(process.hrtime.bigint() - start) / 1_000_000;
const formatMs = (value) => `${value.toFixed(1)} ms`;

function logTimingSummary(label, timings) {
  const summary = timings
    .map(
      (entry) =>
        `${entry.step}=${entry.duration.toFixed(1)}ms${entry.error ? ` ERROR:${entry.error}` : ''}`
    )
    .join(' | ');

  console.log(`[repair-registration ${label}] ${summary}`);
}

function pushTiming(timings, step, startedAt, error) {
  timings.push({
    step,
    duration: getDurationMs(startedAt),
    ...(error ? { error: String(error) } : {}),
  });
}

function toADF(text) {
  return {
    type: 'doc',
    version: 1,
    content: [
      {
        type: 'paragraph',
        content: text
          ? [
              {
                type: 'text',
                text,
              },
            ]
          : [],
      },
    ],
  };
}

function getBasicAuthHeader() {
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;

  if (!email || !token) {
    throw new Error('Truksta JIRA_EMAIL arba JIRA_API_TOKEN .env faile');
  }

  return `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`;
}

async function createJiraIssue(formData) {
  const jiraBaseUrl = process.env.JIRA_BASE_URL;

  if (!jiraBaseUrl) {
    throw new Error('Truksta JIRA_BASE_URL .env faile');
  }

  const summary = `${formData.deviceModel} - ${formData.companyName}`;

  const payload = {
    fields: {
      project: { key: 'IR' },
      issuetype: { id: '10006' },
      summary,
      description: toADF(formData.issueDescription),
      customfield_10080: formData.companyName || '',
      customfield_10069: formData.phone || '',
      customfield_10068: formData.email || '',
      customfield_10105: formData.deviceModel || '',
      customfield_10094: formData.serialNumber || '',
    },
  };

  const response = await fetch(`${jiraBaseUrl}/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      Authorization: getBasicAuthHeader(),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(result, null, 2));
  }

  return result;
}

async function ensureDirectory(directory) {
  await fsPromises.mkdir(directory, { recursive: true });
}

async function appendReport(lines) {
  await ensureDirectory(path.dirname(REPORT_PATH));
  await fsPromises.appendFile(REPORT_PATH, lines.join('\n') + '\n');
}

async function tryReadFile(filePath) {
  try {
    return await fsPromises.readFile(filePath);
  } catch {
    return null;
  }
}

function createContractData({
  manufacturer,
  deviceModel,
  serialNumber,
  firstName,
  lastName,
  resolvedCompanyName,
  phone,
  email,
  issueDescription,
  issueKey,
  contactPerson,
  powerCable,
  usbCable,
  invoiceNeeded,
  invoiceCompanyName,
  invoiceCode,
  invoiceVatCode,
}) {
  const now = new Date();
  const metai = String(now.getFullYear());
  const data = `${String(now.getDate()).padStart(2, '0')}.${String(
    now.getMonth() + 1
  ).padStart(2, '0')}`;
  const pilna_data = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(now.getDate()).padStart(2, '0')}`;

  return {
    metai,
    data,
    pilna_data,
    gamintojas: manufacturer || '',
    modelis: deviceModel || '',
    serijinis: serialNumber || '',
    vardas: firstName || '',
    pavarde: lastName || '',
    imone: resolvedCompanyName || '',
    telefonas: phone || '',
    email: email || '',
    gedimas: issueDescription || '',
    issueKey: issueKey || '',
    kontaktinis_asmuo: contactPerson || '',
    maitinimo_laidas: !!powerCable,
    usb_laidas: !!usbCable,
    invoiceNeeded: !!invoiceNeeded,
    invoiceCompanyName: invoiceCompanyName || '',
    invoiceCode: invoiceCode || '',
    invoiceVatCode: invoiceVatCode || '',
  };
}

async function runBackgroundRegistrationWork({
  issueKey,
  filePath,
  email,
  resolvedCompanyName,
  deviceModel,
  contractData,
  initialTimings,
}) {
  const startedAt = new Date().toISOString();
  const timings = [...initialTimings];

  try {
    let stepStart = process.hrtime.bigint();
    const contractBuffer = generateContract(contractData);
    pushTiming(timings, 'generateContract', stepStart);

    stepStart = process.hrtime.bigint();
    await ensureDirectory(path.dirname(filePath));
    await fsPromises.writeFile(filePath, contractBuffer);
    pushTiming(timings, 'writeDocx', stepStart);

    stepStart = process.hrtime.bigint();
    const convertedPdfPath = await convertDocxToPdf(filePath);
    pushTiming(timings, 'convertDocxToPdf', stepStart);

    stepStart = process.hrtime.bigint();
    const targetPdfPath = path.join(AUTO_PRINT_DIR, `${issueKey}.pdf`);
    await ensureDirectory(AUTO_PRINT_DIR);
    await fsPromises.copyFile(convertedPdfPath, targetPdfPath);
    pushTiming(timings, 'copyPdf', stepStart);

    stepStart = process.hrtime.bigint();
    const pdfBuffer = await tryReadFile(convertedPdfPath);
    await sendRepairCreatedEmail({
      to: email,
      issueKey,
      companyName: resolvedCompanyName,
      deviceModel,
      pdfBuffer,
    });
    pushTiming(timings, 'sendRepairCreatedEmail', stepStart);
  } catch (error) {
    console.error('Foninis apdorojimas nepavyko:', error);
    timings.push({ step: 'backgroundError', duration: 0, error: String(error) });
  } finally {
    const reportLines = [
      `=== ${startedAt} issue=${issueKey}`,
      ...timings.map(
        (entry) =>
          `${entry.step}: ${formatMs(entry.duration)}${entry.error ? ` ERROR: ${entry.error}` : ''}`
      ),
      '---',
    ];

    try {
      await appendReport(reportLines);
    } catch (reportError) {
      console.error('Ataskaitos rasymo klaida:', reportError);
    }

    logTimingSummary(`background ${issueKey}`, timings);
  }
}

export async function POST(request) {
  const requestStart = process.hrtime.bigint();

  try {
    const timings = [];

    let stepStart = process.hrtime.bigint();
    const body = await request.json();
    pushTiming(timings, 'requestJson', stepStart);

    const {
      companyName,
      invoiceNeeded,
      invoiceCompanyName,
      invoiceCode,
      invoiceVatCode,
      phone,
      email,
      deviceModel,
      serialNumber,
      issueDescription,
      manufacturer,
      firstName,
      lastName,
      contactPerson,
      powerCable,
      usbCable,
    } = body;

    if (!phone || !email || !deviceModel || !issueDescription) {
      return NextResponse.json(
        {
          success: false,
          message: 'Uzpildykite visus privalomus laukus.',
        },
        { status: 400 }
      );
    }

    if (invoiceNeeded && (!invoiceCompanyName || !invoiceCode || !invoiceVatCode)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Uzpildykite saskaitos fakturos laukus.',
        },
        { status: 400 }
      );
    }

    const resolvedCompanyName = invoiceNeeded ? invoiceCompanyName : companyName;

    stepStart = process.hrtime.bigint();
    const jiraIssue = await createJiraIssue({
      companyName: resolvedCompanyName,
      phone,
      email,
      deviceModel,
      serialNumber,
      issueDescription,
    });
    pushTiming(timings, 'createJiraIssue', stepStart);

    const fileName = `priemimo-perdavimo-aktas-${jiraIssue.key}.docx`;
    const filePath = path.join(GENERATED_DIR, fileName);

    const contract = {
      fileName,
      filePath,
      pdfPath: null,
      pdfPending: true,
    };

    const contractData = createContractData({
      manufacturer,
      deviceModel,
      serialNumber,
      firstName,
      lastName,
      resolvedCompanyName,
      phone,
      email,
      issueDescription,
      issueKey: jiraIssue.key,
      contactPerson,
      powerCable,
      usbCable,
      invoiceNeeded,
      invoiceCompanyName,
      invoiceCode,
      invoiceVatCode,
    });

    const requestTimings = [
      ...timings,
      {
        step: 'responseReady',
        duration: getDurationMs(requestStart),
      },
    ];

    try {
      await appendReport([
        `=== START ${new Date().toISOString()} issue=${jiraIssue.key}`,
        `reportPath: ${REPORT_PATH}`,
        ...requestTimings.map((entry) => `${entry.step}: ${formatMs(entry.duration)}`),
        'status: queued-background-work',
        '---',
      ]);
    } catch (reportError) {
      console.error('Nepavyko sukurti pradines ataskaitos:', reportError);
    }

    setTimeout(() => {
      void runBackgroundRegistrationWork({
        issueKey: jiraIssue.key,
        filePath,
        email,
        resolvedCompanyName,
        deviceModel,
        contractData,
        initialTimings: requestTimings,
      });
    }, 0);

    logTimingSummary(`request ${jiraIssue.key}`, requestTimings);

    return NextResponse.json({
      success: true,
      message: 'Uzklausa sekmingai sukurta.',
      issueKey: jiraIssue.key,
      jiraIssueId: jiraIssue.id,
      contract,
    });
  } catch (error) {
    console.error(
      `[repair-registration request error] total=${formatMs(getDurationMs(requestStart))}`
    );
    console.error('repair-registration klaida:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Nepavyko sukurti uzklausos Jira sistemoje.',
        error: error.message || 'Nezinoma klaida',
      },
      { status: 500 }
    );
  }
}
