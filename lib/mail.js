import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendRepairCreatedEmail({
  to,
  issueKey,
  companyName,
  deviceModel,
  pdfBuffer,
  attachmentBuffer,
  attachmentFileName,
  attachmentContentType,
}) {
  const statusUrl = `${process.env.APP_BASE_URL}/status/${issueKey}`;

  const finalAttachmentBuffer = attachmentBuffer || pdfBuffer || null;
  const finalAttachmentFileName =
    attachmentFileName || (pdfBuffer ? `registracija-${issueKey}.pdf` : null);
  const finalAttachmentContentType =
    attachmentContentType || (pdfBuffer ? 'application/pdf' : null);

  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: `Jūsų remonto užklausa užregistruota (${issueKey})`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h2>Užklausa sėkmingai užregistruota</h2>
        <p>Sveiki,</p>
        <p>Jūsų įrangos remonto užklausa buvo sėkmingai užregistruota.</p>
        <p><strong>Užklausos numeris:</strong> ${issueKey}</p>
        <p><strong>Klientas:</strong> ${companyName}</p>
        <p><strong>Įrenginys:</strong> ${deviceModel}</p>
        <p>
          Būseną galite stebėti čia:<br />
          <a href="${statusUrl}">${statusUrl}</a>
        </p>
        <p>Ačiū,<br />4office komanda</p>
      </div>
    `,
    attachments: finalAttachmentBuffer && finalAttachmentFileName
      ? [
          {
            filename: finalAttachmentFileName,
            content: finalAttachmentBuffer,
            contentType: finalAttachmentContentType || undefined,
          },
        ]
      : [],
  });

  console.log('MAIL SENT:', info.messageId);
}
