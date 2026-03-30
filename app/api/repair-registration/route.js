import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { generateContract } from '../../../lib/generateContract';
import { convertDocxToPdf } from '../../../lib/convertDocxToPdf';
import { sendRepairCreatedEmail } from '../../../lib/mail';

const AUTO_PRINT_DIR = process.env.AUTO_PRINT_DIR || '/home/pi/AutoPrint/Inbox';
const fsPromises = fs.promises;

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
}) {
  const pdfPath = filePath.replace(/\.docx$/i, '.pdf');

  try {
    await ensureDirectory(path.dirname(filePath));
    await fsPromises.writeFile(filePath, contractBuffer);

    const convertedPdfPath = await convertDocxToPdf(filePath);

    const targetPdfPath = path.join(AUTO_PRINT_DIR, `${jiraIssueKey}.pdf`);
    await ensureDirectory(AUTO_PRINT_DIR);
    await fsPromises.copyFile(convertedPdfPath, targetPdfPath);
    console.log('Kopija įrašyta:', targetPdfPath);

    const pdfBuffer = await tryReadFile(convertedPdfPath);
    await sendRepairCreatedEmail({
      to: email,
      issueKey: jiraIssueKey,
      companyName: resolvedCompanyName,
      deviceModel,
      pdfBuffer,
    });
  } catch (error) {
    console.error('Foninis apdorojimas nepavyko:', error);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

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
      skipJira: skipJiraBody,
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
    const skipJira = process.env.SKIP_JIRA === 'true' || skipJiraBody;

    const jiraIssue = skipJira
      ? { key: `SKIP-${Date.now()}`, id: null }
      : await createJiraIssue({
          companyName: resolvedCompanyName,
          phone,
          email,
          deviceModel,
          serialNumber,
          issueDescription,
        });

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

      const fileName = `priemimo-perdavimo-aktas-${jiraIssue.key}.docx`;
      const filePath = path.join(generatedDir, fileName);

      contract = {
        fileName,
        filePath,
        pdfPath: null,
        pdfPending: true,
      };

      void finalizeContractProcessing({
        contractBuffer,
        filePath,
        jiraIssueKey: jiraIssue.key,
        email,
        resolvedCompanyName,
        deviceModel,
      });
    } catch (docError) {
      console.error('DOCX generavimo klaida:', docError);
    }

    return NextResponse.json({
      success: true,
      message: 'Užklausa sėkmingai sukurta.',
      issueKey: jiraIssue.key,
      jiraIssueId: jiraIssue.id,
      contract,
    });
  } catch (error) {
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
