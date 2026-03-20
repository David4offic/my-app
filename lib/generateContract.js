import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

export function generateContract(data) {
  const templatePath = path.join(process.cwd(), 'templates', 'aktas.docx');

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Nerastas DOCX šablonas: ${templatePath}`);
  }

  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  const now = new Date();

  const formattedDate =
    `${now.getFullYear()}.` +
    `${String(now.getMonth() + 1).padStart(2, '0')}.` +
    `${String(now.getDate()).padStart(2, '0')} ` +
    `${String(now.getHours()).padStart(2, '0')}:` +
    `${String(now.getMinutes()).padStart(2, '0')}`;

  doc.render({
    data: formattedDate,
    gamintojas: data.gamintojas || '',
    modelis: data.modelis || '',
    serijinis: data.serijinis || '',
    vardas: data.vardas || '',
    pavarde: data.pavarde || '',
    imone: data.imone || '',
    telefonas: data.telefonas || '',
    email: data.email || '',
    gedimas: data.gedimas || '',
    issueKey: data.issueKey || '',
    kontaktinis_asmuo: data.kontaktinis_asmuo || '',
    maitinimo_laidas: data.maitinimo_laidas ? 'Taip' : 'Ne',
    usb_laidas: data.usb_laidas ? 'Taip' : 'Ne',
    invoiceNeeded: data.invoiceNeeded ? 'Taip' : 'Ne',
    invoiceCompanyName: data.invoiceCompanyName || '',
    invoiceCode: data.invoiceCode || '',
    invoiceVatCode: data.invoiceVatCode || '',
  });

  return doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });
}
