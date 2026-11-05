function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export interface OrderConfirmationInput {
  orderId: string;
  customerName: string;
  total: string | number;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: string | number;
  }>;
}

export function buildOrderConfirmationEmailContent(input: OrderConfirmationInput) {
  const safeName = escapeHtml(input.customerName);
  const safeOrderId = escapeHtml(input.orderId);
  const formattedTotal = Number(input.total).toFixed(2);

  const itemsHtml = input.items
    .map(
      (item) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #E4E0D8;font-size:14px;color:#1A1A1A;">${escapeHtml(item.name)} &times; ${item.quantity}</td>
        <td align="right" style="padding:8px 0;border-bottom:1px solid #E4E0D8;font-size:14px;font-weight:600;color:#1A1A1A;">$${(Number(item.unitPrice) * item.quantity).toFixed(2)}</td>
      </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Order Confirmation - OrderFirst</title>
</head>
<body style="margin:0;padding:24px;background-color:#F7F6F3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:540px;margin:0 auto;background:#FFFFFF;border-radius:12px;padding:32px;border:1px solid #E4E0D8;">
    <h1 style="font-size:22px;color:#2F4A3A;margin:0 0 16px;">Order Confirmed!</h1>
    <p style="font-size:15px;color:#5C6670;line-height:1.5;">Hi ${safeName}, thank you for your order. We have received it and our kitchen is preparing it.</p>
    <div style="margin:24px 0;background:#FAF9F6;padding:16px;border-radius:8px;">
      <p style="margin:0 0 12px;font-size:13px;color:#5C6670;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;">Order #${safeOrderId.slice(0, 8)}</p>
      <table style="width:100%;border-collapse:collapse;">
        ${itemsHtml}
        <tr>
          <td style="padding:12px 0 0;font-size:16px;font-weight:700;color:#1A1A1A;">Total</td>
          <td align="right" style="padding:12px 0 0;font-size:16px;font-weight:700;color:#2F4A3A;">$${formattedTotal}</td>
        </tr>
      </table>
    </div>
    <p style="font-size:13px;color:#5C6670;margin:0;">OrderFirst Restaurant Management</p>
  </div>
</body>
</html>`;

  const text = `Hi ${input.customerName},

Thank you for your order #${input.orderId.slice(0, 8)}! Total: $${formattedTotal}.
Your order is confirmed and our kitchen is preparing it.

OrderFirst Team`;

  return { html, text };
}

