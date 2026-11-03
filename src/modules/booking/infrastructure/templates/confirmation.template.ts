/** Booking confirmation email. Pure functions of their data: no I/O, no env. */

export interface ConfirmationEmailData {
  clientName: string;
  barberName: string;
  serviceName: string;
  /** Already formatted, e.g. "15 €". */
  priceLabel: string;
  paymentNote: string;
  businessPhone: string | undefined;
  businessName: string;
  businessAddress: string;
  /** Opens the address in Google Maps. */
  mapsUrl: string;
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
    `  Cuándo:   ${data.formattedDateTime}`,
    `  Servicio: ${data.serviceName}`,
    `  Barbero:  ${data.barberName}`,
    `  Precio:   ${data.priceLabel}. ${data.paymentNote}`,
    `  Dónde:    ${data.businessAddress}`,
    `  Cómo llegar: ${data.mapsUrl}`,
    ...(data.businessPhone ? [`  Teléfono: ${data.businessPhone}`] : []),
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
    serviceName: escapeHtml(data.serviceName),
    priceLabel: escapeHtml(data.priceLabel),
    paymentNote: escapeHtml(data.paymentNote),
    businessPhone: data.businessPhone ? escapeHtml(data.businessPhone) : undefined,
    businessName: escapeHtml(data.businessName),
    businessAddress: escapeHtml(data.businessAddress),
    mapsUrl: escapeHtml(data.mapsUrl),
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
          <strong>Servicio:</strong> ${safe.serviceName}<br>
          <strong>Barbero:</strong> ${safe.barberName}<br>
          <strong>Precio:</strong> ${safe.priceLabel} · ${safe.paymentNote}<br>
          <strong>Dónde:</strong> ${safe.businessAddress}<br>
          <a href="${safe.mapsUrl}"
             style="display:inline-block;margin-top:4px;padding:6px 12px;border:1px solid #c9bfae;border-radius:999px;background:#ffffff;color:#1c1917;text-decoration:none;font-size:13px;font-weight:bold;">
            &#128205; Ver en Google Maps
          </a>${
            safe.businessPhone
              ? `<br>\n          <strong>Teléfono:</strong> <a href="tel:${safe.businessPhone.replace(/\s/g, '')}" style="color:#7c2d12;">${safe.businessPhone}</a>`
              : ''
          }
        </td></tr>
        <tr><td align="center" style="padding-top:24px;">
          <a href="${safe.googleCalendarUrl}"
             style="display:inline-block;background:#7c2d12;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;padding:14px 24px;border-radius:10px;">
            Añadir a Google Calendar
          </a>
        </td></tr>
        <!-- Cancelling must be as findable as booking. A grey link in grey text
             at the end of the message reads as fine print and gets missed. -->
        <tr><td style="padding-top:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="border-top:1px solid #e4ded4;padding-top:20px;" align="center">
              <p style="margin:0 0 12px;font-size:14px;color:#1c1917;">
                ¿No puedes venir?
              </p>
              <a href="${safe.cancelUrl}"
                 style="display:inline-block;border:1px solid #b42318;color:#b42318;text-decoration:none;font-size:14px;font-weight:bold;padding:11px 22px;border-radius:10px;">
                Cancelar mi cita
              </a>
              <p style="margin:12px 0 0;font-size:12px;color:#6b6257;line-height:1.5;">
                Si el botón no funciona, copia este enlace:<br>
                <span style="color:#6b6257;word-break:break-all;">${safe.cancelUrl}</span>
              </p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
