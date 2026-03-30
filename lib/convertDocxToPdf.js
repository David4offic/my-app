import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
let cachedLibreOfficePath = undefined;

function getLibreOfficePath() {
  if (cachedLibreOfficePath !== undefined) {
    return cachedLibreOfficePath;
  }

  if (process.platform === 'win32') {
    const possible = [
      'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
      'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
    ];

    for (const p of possible) {
      try {
        fs.accessSync(p);
        cachedLibreOfficePath = p;
        return p;
      } catch {
        // continue searching
      }
    }

    cachedLibreOfficePath = null;
    return null;
  }

  cachedLibreOfficePath = 'libreoffice';
  return cachedLibreOfficePath;
}

export async function convertDocxToPdf(docxPath) {
  const sofficePath = getLibreOfficePath();

  if (!sofficePath) {
    throw new Error(
      'LibreOffice nerastas. Įdiek LibreOffice arba nurodyk soffice.exe kelią.'
    );
  }

  const outDir = path.dirname(docxPath);

  await execFileAsync(sofficePath, [
    '--headless',
    '--convert-to',
    'pdf',
    '--outdir',
    outDir,
    docxPath,
  ]);

  const pdfPath = docxPath.replace(/\.docx$/i, '.pdf');

  try {
    await fs.promises.access(pdfPath);
  } catch {
    throw new Error('PDF failas nebuvo sugeneruotas.');
  }

  return pdfPath;
}
