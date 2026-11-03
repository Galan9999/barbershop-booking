/** What the shop sees when a booking is made or cancelled. Pure functions. */

export interface ShopNoticeData {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  barberName: string;
  serviceName: string;
  /** Already formatted, e.g. "15 €". */
  priceLabel: string;
  formattedDateTime: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderShopNoticeSubject(
  data: ShopNoticeData,
  kind: 'booked' | 'cancelled',
): string {
  const verb = kind === 'booked' ? 'Nueva cita' : 'Cita cancelada';
  return `${verb}: ${data.clientName} — ${data.formattedDateTime}`;
}

export function renderShopNoticeText(
  data: ShopNoticeData,
  kind: 'booked' | 'cancelled',
): string {
  const heading = kind === 'booked' ? 'Nueva reserva' : 'Cita CANCELADA';
  return [
    heading,
    '',
    `  Cuándo:   ${data.formattedDateTime}`,
    `  Servicio: ${data.serviceName}`,
    `  Precio:   ${data.priceLabel} (en efectivo)`,
    `  Barbero:  ${data.barberName}`,
    `  Cliente:  ${data.clientName}`,
    `  Teléfono: ${data.clientPhone}`,
    `  Email:    ${data.clientEmail}`,
    '',
    kind === 'booked'
      ? 'El evento va adjunto: tu calendario debería añadirlo solo.'
      : 'Se adjunta la cancelación: el evento debería desaparecer del calendario.',
  ].join('\n');
}

export function renderShopNoticeHtml(
  data: ShopNoticeData,
  kind: 'booked' | 'cancelled',
): string {
  const booked = kind === 'booked';
  const safe = {
    clientName: escapeHtml(data.clientName),
    clientEmail: escapeHtml(data.clientEmail),
    clientPhone: escapeHtml(data.clientPhone),
    barberName: escapeHtml(data.barberName),
    serviceName: escapeHtml(data.serviceName),
    priceLabel: escapeHtml(data.priceLabel),
    formattedDateTime: escapeHtml(data.formattedDateTime),
  };
  const accent = booked ? '#7c2d12' : '#b42318';

  return `<!doctype html>
<html lang="es">
<body style="margin:0;padding:24px;background:#faf8f5;font-family:Arial,Helvetica,sans-serif;color:#1c1917;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table role="presentation" width="460" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:14px;padding:28px;border:1px solid #e4ded4;">
        <tr><td style="font-size:17px;font-weight:bold;color:${accent};padding-bottom:16px;">
          ${booked ? 'Nueva reserva' : 'Cita cancelada'}
        </td></tr>
        <tr><td style="font-size:15px;line-height:1.8;background:#f5f2ed;border-radius:10px;padding:16px;">
          <strong>Cuándo:</strong> ${safe.formattedDateTime}<br>
          <strong>Servicio:</strong> ${safe.serviceName}<br>
          <strong>Precio:</strong> ${safe.priceLabel} (en efectivo)<br>
          <strong>Barbero:</strong> ${safe.barberName}<br>
          <strong>Cliente:</strong> ${safe.clientName}<br>
          <strong>Teléfono:</strong> <a href="tel:${safe.clientPhone}" style="color:${accent};">${safe.clientPhone}</a><br>
          <strong>Email:</strong> ${safe.clientEmail}
        </td></tr>
        <tr><td style="font-size:13px;color:#6b6257;padding-top:20px;line-height:1.5;">
          ${
            booked
              ? 'El evento va adjunto: tu calendario debería añadirlo automáticamente.'
              : 'Se adjunta la cancelación: el evento debería desaparecer de tu calendario.'
          }
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
