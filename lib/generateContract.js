import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

const TEMPLATE_PATH = path.join(process.cwd(), 'templates', 'aktas.docx');
let templateContent;

try {
  templateContent = fs.readFileSync(TEMPLATE_PATH, 'binary');
} catch (error) {
  throw new Error(`Nerastas DOCX šablonas: ${TEMPLATE_PATH}`);
}

const safeString = (value) => (value ?? '').toString();
const yesNo = (value) => (value ? 'Taip' : 'Ne');

const formatDateTime = (now = new Date()) =>
  `${now.getFullYear()}.` +
  `${String(now.getMonth() + 1).padStart(2, '0')}.` +
  `${String(now.getDate()).padStart(2, '0')} ` +
  `${String(now.getHours()).padStart(2, '0')}:` +
  `${String(now.getMinutes()).padStart(2, '0')}`;

export function generateContract(data) {
  const zip = new PizZip(templateContent);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  doc.render({
    data: formatDateTime(),
    gamintojas: safeString(data.gamintojas),
    modelis: safeString(data.modelis),
    serijinis: safeString(data.serijinis),
    vardas: safeString(data.vardas),
    pavarde: safeString(data.pavarde),
    imone: safeString(data.imone),
    telefonas: safeString(data.telefonas),
    email: safeString(data.email),
    gedimas: safeString(data.gedimas),
    issueKey: safeString(data.issueKey),
    kontaktinis_asmuo: safeString(data.kontaktinis_asmuo),
    maitinimo_laidas: yesNo(data.maitinimo_laidas),
    usb_laidas: yesNo(data.usb_laidas),
    invoiceNeeded: yesNo(data.invoiceNeeded),
    invoiceCompanyName: safeString(data.invoiceCompanyName),
    invoiceCode: safeString(data.invoiceCode),
    invoiceVatCode: safeString(data.invoiceVatCode),
  });

  return doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });
}
