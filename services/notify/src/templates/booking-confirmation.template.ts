function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export interface BookingConfirmationInput {
  bookingId: string;
  customerName: string;
  partySize: number;
  reservationTime: string;
}

export function buildBookingConfirmationEmailContent(input: BookingConfirmationInput) {
  const safeName = escapeHtml(input.customerName);
  const safeBookingId = escapeHtml(input.bookingId);
  const formattedDate = new Date(input.reservationTime).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Table Reservation Confirmed - OrderFirst</title>
</head>
<body style="margin:0;padding:24px;background-color:#F7F6F3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:540px;margin:0 auto;background:#FFFFFF;border-radius:12px;padding:32px;border:1px solid #E4E0D8;">
    <h1 style="font-size:22px;color:#2F4A3A;margin:0 0 16px;">Reservation Confirmed!</h1>
    <p style="font-size:15px;color:#5C6670;line-height:1.5;">Hi ${safeName}, your table reservation is confirmed. We look forward to hosting you!</p>
    <div style="margin:24px 0;background:#FAF9F6;padding:16px;border-radius:8px;">
      <p style="margin:0 0 8px;font-size:13px;color:#5C6670;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;">Reservation #${safeBookingId.slice(0, 8)}</p>
      <p style="margin:4px 0;font-size:15px;color:#1A1A1A;"><strong>Date & Time:</strong> ${formattedDate}</p>
      <p style="margin:4px 0;font-size:15px;color:#1A1A1A;"><strong>Party Size:</strong> ${input.partySize} guests</p>
    </div>
    <p style="font-size:13px;color:#5C6670;margin:0;">OrderFirst Restaurant Management</p>
  </div>
</body>
</html>`;

  const text = `Hi ${input.customerName},

Your reservation #${input.bookingId.slice(0, 8)} for ${input.partySize} guests on ${formattedDate} is confirmed!

We look forward to hosting you.
OrderFirst Team`;

  return { html, text };
}

