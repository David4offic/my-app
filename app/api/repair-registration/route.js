import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { generateContract } from '../../../lib/generateContract';
import { convertDocxToPdf } from '../../../lib/convertDocxToPdf';
import { sendClientEmail } from '../../../lib/sendClientEmail';

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

export async function POST(request) {
  try {
    const body = await request.json();

    const {
      companyName,
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

    if (!companyName || !phone || !email || !deviceModel || !issueDescription) {
      return NextResponse.json(
        {
          success: false,
          message: 'Užpildykite visus privalomus laukus.',
        },
        { status: 400 }
      );
    }

    const jiraIssue = await createJiraIssue({
      companyName,
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
    if (!fs.existsSync(generatedDir)) {
      fs.mkdirSync(generatedDir, { recursive: true });
    }

    let contract = null;
    let pdfPath = null;

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
        imone: companyName || '',
        telefonas: phone || '',
        email: email || '',
        gedimas: issueDescription || '',
        issueKey: jiraIssue.key || '',
        kontaktinis_asmuo: contactPerson || '',
        maitinimo_laidas: !!powerCable,
        usb_laidas: !!usbCable,
      });

      const fileName = `priemimo-perdavimo-aktas-${jiraIssue.key}.docx`;
      const filePath = path.join(generatedDir, fileName);

      fs.writeFileSync(filePath, contractBuffer);

      try {
        pdfPath = await convertDocxToPdf(filePath);
      } catch (pdfError) {
        console.error('PDF generavimo klaida:', pdfError);
      }

      contract = {
        fileName,
        filePath,
        pdfPath,
      };
    } catch (docError) {
      console.error('DOCX generavimo klaida:', docError);
    }

    try {
      await sendClientEmail({
        to: email,
        issueKey: jiraIssue.key,
        companyName,
        deviceModel,
        pdfPath,
      });
    } catch (mailError) {
      console.error('El. laiško siuntimo klaida:', mailError);
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
