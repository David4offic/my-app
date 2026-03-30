import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { generateContract } from '../../../lib/generateContract';
import { convertDocxToPdf } from '../../../lib/convertDocxToPdf';
import { sendRepairCreatedEmail } from '../../../lib/mail';

const AUTO_PRINT_DIR = process.env.AUTO_PRINT_DIR || '/home/pi/AutoPrint/Inbox';
const fsPromises = fs.promises;
const REPORT_PATH = path.join(process.cwd(), 'generated', 'ataskaita.txt');

const getDurationMs = (start) => Number(process.hrtime.bigint() - start) / 1_000_000;
const formatMs = (value) => `${value.toFixed(1)} ms`;

function logTimingSummary(issueKey, timings) {
  const summary = timings
    .map(
      (entry) =>
        `${entry.step}=${entry.duration.toFixed(1)}ms${entry.error ? ` ERROR:${entry.error}` : ''}`
    )
    .join(' | ');

  console.log(`[repair-registration timings ${issueKey}] ${summary}`);
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
    throw new Error('Trūksta JIRA_EMAIL arba JIRA_API_TOKEN .env faile');
  }

  return `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`;
}

async function createJiraIssue(formData) {
  const jiraBaseUrl = process.env.JIRA_BASE_URL;

  if (!jiraBaseUrl) {
    throw new Error('Trūksta JIRA_BASE_URL .env faile');
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

async function finalizeContractProcessing({
  contractBuffer,
  filePath,
  jiraIssueKey,
  email,
  resolvedCompanyName,
  deviceModel,
  timings,
}) {
  const reportLines = [];
  const reportTimestamp = new Date().toISOString();
  let stepStart;

  try {
    stepStart = process.hrtime.bigint();
    await ensureDirectory(path.dirname(filePath));
    await fsPromises.writeFile(filePath, contractBuffer);
    timings.push({ step: 'writeDocx', duration: getDurationMs(stepStart) });

    stepStart = process.hrtime.bigint();
    const convertedPdfPath = await convertDocxToPdf(filePath);
    timings.push({ step: 'convertDocxToPdf', duration: getDurationMs(stepStart) });

    stepStart = process.hrtime.bigint();
    const targetPdfPath = path.join(AUTO_PRINT_DIR, `${jiraIssueKey}.pdf`);
    await ensureDirectory(AUTO_PRINT_DIR);
    await fsPromises.copyFile(convertedPdfPath, targetPdfPath);
    timings.push({ step: 'copyPdf', duration: getDurationMs(stepStart) });
    console.log('Kopija įrašyta:', targetPdfPath);

    stepStart = process.hrtime.bigint();
    const pdfBuffer = await tryReadFile(convertedPdfPath);
    await sendRepairCreatedEmail({
      to: email,
      issueKey: jiraIssueKey,
      companyName: resolvedCompanyName,
      deviceModel,
      pdfBuffer,
    });
    timings.push({ step: 'sendRepairCreatedEmail', duration: getDurationMs(stepStart) });
  } catch (error) {
    console.error('Foninis apdorojimas nepavyko:', error);
    timings.push({ step: 'finalizeError', duration: 0, error: String(error) });
  } finally {
    reportLines.push(`=== ${reportTimestamp} issue=${jiraIssueKey}`);
    for (const entry of timings) {
      reportLines.push(
        `${entry.step}: ${formatMs(entry.duration)}${entry.error ? ' ERROR: ' + entry.error : ''}`
      );
    }
    reportLines.push('---');
    try {
      await appendReport(reportLines);
    } catch (reportError) {
      console.error('Ataskaitos rašymo klaida:', reportError);
    }
  }
}

export async function POST(request) {
  const requestStart = process.hrtime.bigint();

  try {
    const timings = [];

    let stepStart = process.hrtime.bigint();
    const body = await request.json();
    timings.push({ step: 'requestJson', duration: getDurationMs(stepStart) });

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
          message: 'Užpildykite visus privalomus laukus.',
        },
        { status: 400 }
      );
    }

    if (invoiceNeeded) {
      if (!invoiceCompanyName || !invoiceCode || !invoiceVatCode) {
        return NextResponse.json(
          {
            success: false,
            message: 'Užpildykite sąskaitos faktūros laukus.',
          },
          { status: 400 }
        );
      }
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
    timings.push({ step: 'createJiraIssue', duration: getDurationMs(stepStart) });

    stepStart = process.hrtime.bigint();

    const now = new Date();
    const metai = String(now.getFullYear());
    const data = `${String(now.getDate()).padStart(2, '0')}.${String(
      now.getMonth() + 1
    ).padStart(2, '0')}`;
    const pilna_data = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const generatedDir = path.join(process.cwd(), 'generated');

    let contract = null;

    try {
      const contractBuffer = generateContract({
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
        issueKey: jiraIssue.key || '',
        kontaktinis_asmuo: contactPerson || '',
        maitinimo_laidas: !!powerCable,
        usb_laidas: !!usbCable,
        invoiceNeeded: !!invoiceNeeded,
        invoiceCompanyName: invoiceCompanyName || '',
        invoiceCode: invoiceCode || '',
        invoiceVatCode: invoiceVatCode || '',
      });
      timings.push({ step: 'generateContract', duration: getDurationMs(stepStart) });

      const fileName = `priemimo-perdavimo-aktas-${jiraIssue.key}.docx`;
      const filePath = path.join(generatedDir, fileName);

      contract = {
        fileName,
        filePath,
        pdfPath: null,
        pdfPending: true,
      };

      await appendReport([
        `=== START ${new Date().toISOString()} issue=${jiraIssue.key}`,
      ]);

      void finalizeContractProcessing({
        contractBuffer,
        filePath,
        jiraIssueKey: jiraIssue.key,
        email,
        resolvedCompanyName,
        deviceModel,
        timings,
      });
    } catch (docError) {
      console.error('DOCX generavimo klaida:', docError);
    }

    timings.push({ step: 'total', duration: getDurationMs(requestStart) });
    logTimingSummary(jiraIssue.key, timings);

    return NextResponse.json({
      success: true,
      message: 'Užklausa sėkmingai sukurta.',
      issueKey: jiraIssue.key,
      jiraIssueId: jiraIssue.id,
      contract,
    });
  } catch (error) {
    console.error(
      `[repair-registration timings error] total=${formatMs(getDurationMs(requestStart))}`
    );
    console.error('repair-registration klaida:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Nepavyko sukurti užklausos Jira sistemoje.',
        error: error.message || 'Nežinoma klaida',
      },
      { status: 500 }
    );
  }
}
