/** Booking confirmation email. Pure functions of their data (S4). */

interface ConfirmationData {
  clientName: string;
  barberName: string;
  businessName: string;
  businessAddress: string;
  formattedDateTime: string;
  googleCalendarUrl: string;
  cancelUrl: string;
}

export function confirmationSubject(d: ConfirmationData): string {
  return `Cita confirmada — ${d.formattedDateTime}`;
}

export function confirmationText(d: ConfirmationData): string {
  return [
    `Hola ${d.clientName},`,
    '',
    `Tu cita en ${d.businessName} está confirmada:`,
    '',
    `  Cuándo:  ${d.formattedDateTime}`,
    `  Barbero: ${d.barberName}`,
    `  Dónde:   ${d.businessAddress}`,
    '',
    `Añadir a Google Calendar: ${d.googleCalendarUrl}`,
    '',
    `¿No puedes venir? Cancela aquí: ${d.cancelUrl}`,
    '',
    `— ${d.businessName}`,
  ].join('\n');
}

export function confirmationHtml(d: ConfirmationData): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return `<!doctype html>
<html lang="es">
<body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:8px;padding:32px;">
        <tr><td style="font-size:20px;font-weight:bold;padding-bottom:16px;">
          ${esc(d.businessName)}
        </td></tr>
        <tr><td style="font-size:15px;line-height:1.5;padding-bottom:16px;">
          Hola ${esc(d.clientName)}, tu cita está <strong>confirmada</strong>.
        </td></tr>
        <tr><td style="font-size:15px;line-height:1.7;background:#fafafa;border:1px solid #e4e4e7;border-radius:6px;padding:16px;">
          <strong>Cuándo:</strong> ${esc(d.formattedDateTime)}<br>
          <strong>Barbero:</strong> ${esc(d.barberName)}<br>
          <strong>Dónde:</strong> ${esc(d.businessAddress)}
        </td></tr>
        <tr><td align="center" style="padding-top:24px;">
          <a href="${esc(d.googleCalendarUrl)}"
             style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:15px;padding:12px 24px;border-radius:6px;">
            Añadir a Google Calendar
          </a>
        </td></tr>
        <tr><td align="center" style="font-size:13px;color:#71717a;padding-top:24px;line-height:1.5;">
          ¿No puedes venir?
          <a href="${esc(d.cancelUrl)}" style="color:#71717a;">Cancela tu cita aquí</a>.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
