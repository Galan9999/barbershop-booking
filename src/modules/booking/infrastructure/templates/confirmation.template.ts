/** Booking confirmation email. Pure functions of their data: no I/O, no env. */

export interface ConfirmationEmailData {
  clientName: string;
  barberName: string;
  businessName: string;
  businessAddress: string;
  formattedDateTime: string;
  googleCalendarUrl: string;
  cancelUrl: string;
}

export function renderConfirmationSubject(data: ConfirmationEmailData): string {
  return `Cita confirmada — ${data.formattedDateTime}`;
}

export function renderConfirmationText(data: ConfirmationEmailData): string {
  return [
    `Hola ${data.clientName},`,
    '',
    `Tu cita en ${data.businessName} está confirmada:`,
    '',
    `  Cuándo:  ${data.formattedDateTime}`,
    `  Barbero: ${data.barberName}`,
    `  Dónde:   ${data.businessAddress}`,
    '',
    `Añadir a Google Calendar: ${data.googleCalendarUrl}`,
    '',
    `¿No puedes venir? Cancela aquí: ${data.cancelUrl}`,
    '',
    `— ${data.businessName}`,
  ].join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Inline styles and table layout are required here: email clients strip
 * stylesheets. This is the one place in the codebase where that is correct.
 */
export function renderConfirmationHtml(data: ConfirmationEmailData): string {
  const safe = {
    clientName: escapeHtml(data.clientName),
    barberName: escapeHtml(data.barberName),
    businessName: escapeHtml(data.businessName),
    businessAddress: escapeHtml(data.businessAddress),
    formattedDateTime: escapeHtml(data.formattedDateTime),
    googleCalendarUrl: escapeHtml(data.googleCalendarUrl),
    cancelUrl: escapeHtml(data.cancelUrl),
  };

  return `<!doctype html>
<html lang="es">
<body style="margin:0;padding:24px;background:#faf8f5;font-family:Arial,Helvetica,sans-serif;color:#1c1917;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:14px;padding:32px;border:1px solid #e4ded4;">
        <tr><td style="font-family:Georgia,serif;font-size:20px;font-weight:bold;padding-bottom:16px;">
          ${safe.businessName}
        </td></tr>
        <tr><td style="font-size:15px;line-height:1.5;padding-bottom:16px;">
          Hola ${safe.clientName}, tu cita está <strong>confirmada</strong>.
        </td></tr>
        <tr><td style="font-size:15px;line-height:1.7;background:#f5f2ed;border-radius:10px;padding:16px;">
          <strong>Cuándo:</strong> ${safe.formattedDateTime}<br>
          <strong>Barbero:</strong> ${safe.barberName}<br>
          <strong>Dónde:</strong> ${safe.businessAddress}
        </td></tr>
        <tr><td align="center" style="padding-top:24px;">
          <a href="${safe.googleCalendarUrl}"
             style="display:inline-block;background:#7c2d12;color:#ffffff;text-decoration:none;font-size:15px;padding:12px 24px;border-radius:10px;">
            Añadir a Google Calendar
          </a>
        </td></tr>
        <tr><td align="center" style="font-size:13px;color:#6b6257;padding-top:24px;line-height:1.5;">
          ¿No puedes venir?
          <a href="${safe.cancelUrl}" style="color:#6b6257;">Cancela tu cita aquí</a>.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
