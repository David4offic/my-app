import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import puppeteer from 'puppeteer';

const TEMPLATE_PATH = path.join(process.cwd(), 'templates', 'aktas.html');

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatField(value) {
  return escapeHtml(value).replaceAll('\n', '<br />');
}

function buildTemplateData(data) {
  return {
    issueKey: data.issueKey || '',
    data: data.data || '',
    vardas: data.vardas || '',
    pavarde: data.pavarde || '',
    email: data.email || '',
    telefonas: data.telefonas || '',
    invoiceCode: data.invoiceCode || data.imone || '',
    gamintojas: data.gamintojas || '',
    modelis: data.modelis || '',
    serijinis: data.serijinis || '',
    maitinimo_laidas: data.maitinimo_laidas ? 'Taip' : 'Ne',
    usb_laidas: data.usb_laidas ? 'Taip' : 'Ne',
    gedimas: data.gedimas || '',
  };
}

function renderHtml(template, data) {
  let html = template.replace(
    '<head>',
    `<head><base href="${pathToFileURL(path.dirname(TEMPLATE_PATH) + path.sep).href}">`
  );

  for (const [key, value] of Object.entries(buildTemplateData(data))) {
    html = html.replaceAll(`{${key}}`, formatField(value));
  }

  return html;
}

async function launchBrowser() {
  const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROMIUM_PATH || undefined;

  return puppeteer.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

export async function generatePdf(data) {
  const template = await fs.promises.readFile(TEMPLATE_PATH, 'utf8');
  const html = renderHtml(template, data);
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: ['load', 'domcontentloaded', 'networkidle0'],
    });

    return await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });
  } finally {
    await browser.close();
  }
}
