import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

function getLibreOfficePath() {
  if (process.platform === 'win32') {
    const possible = [
      'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
      'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
    ];

    for (const p of possible) {
      if (fs.existsSync(p)) return p;
    }

    return null;
  }

  return 'libreoffice';
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

  if (!fs.existsSync(pdfPath)) {
    throw new Error('PDF failas nebuvo sugeneruotas.');
  }

  return pdfPath;
}
