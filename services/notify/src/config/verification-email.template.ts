const brand = {
  green: '#3D5A47',
  greenDark: '#2F4A3A',
  orange: '#C88250',
  text: '#1A1A1A',
  muted: '#5C6670',
  surface: '#F7F6F3',
  border: '#E4E0D8',
  white: '#FFFFFF',
} as const;

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildOrderFirstLogoHtml() {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
    <tr>
      <td style="padding:0 14px 0 0;vertical-align:middle;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td align="center" valign="middle" style="width:52px;height:52px;background-color:${brand.greenDark};border-radius:12px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
                <tr>
                  <td align="center" valign="bottom" style="padding:0 5px 0 0;height:22px;">
                    <span style="display:inline-block;width:2px;height:14px;background-color:${brand.white};margin:0 1px;"></span><span style="display:inline-block;width:2px;height:14px;background-color:${brand.white};margin:0 1px;"></span><span style="display:inline-block;width:2px;height:14px;background-color:${brand.white};margin:0 1px;"></span>
                  </td>
                  <td align="center" valign="bottom" style="padding:0 0 0 5px;height:22px;">
                    <span style="display:inline-block;width:3px;height:16px;background-color:${brand.white};border-radius:1px;"></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
      <td style="vertical-align:middle;white-space:nowrap;">
        <span style="font-size:30px;line-height:1;font-weight:700;letter-spacing:-0.03em;color:${brand.text};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">OrderFirst</span><span style="display:inline-block;width:9px;height:9px;margin:0 0 4px 3px;background-color:${brand.orange};vertical-align:baseline;"></span>
      </td>
    </tr>
  </table>`;
}

export function buildVerificationEmailContent(input: {
  name: string;
  code: string;
}) {
  const safeName = escapeHtml(input.name);
  const safeCode = escapeHtml(input.code);
  const logoHtml = buildOrderFirstLogoHtml();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Verify your OrderFirst account</title>
</head>
<body style="margin:0;padding:0;background-color:${brand.surface};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${brand.text};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${brand.surface};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:${brand.white};border:1px solid ${brand.border};border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;background-color:${brand.surface};">
              ${logoHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 0;">
              <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${brand.green};">Email verification</p>
              <h1 style="margin:0 0 12px;font-size:28px;line-height:1.25;font-weight:700;color:${brand.text};">Verify your account</h1>
              <p style="margin:0;font-size:16px;line-height:1.6;color:${brand.muted};">Hi ${safeName}, use the code below to finish setting up your OrderFirst account.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${brand.surface};border:1px dashed ${brand.border};border-radius:12px;">
                <tr>
                  <td style="padding:24px 20px;text-align:center;">
                    <p style="margin:0 0 10px;font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${brand.muted};">Your verification code</p>
                    <p style="margin:0;font-size:36px;line-height:1;font-weight:700;letter-spacing:0.35em;color:${brand.greenDark};font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;-webkit-user-select:all;user-select:all;">${safeCode}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 24px;text-align:center;">
              <p style="margin:0;font-size:14px;line-height:1.6;color:${brand.muted};">Tap the code above to select and copy it.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${brand.surface};border-radius:12px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:${brand.muted};"><strong style="color:${brand.text};">Expires in 10 minutes.</strong> If you did not create an account, you can safely ignore this email.</p>
                    <p style="margin:0;font-size:13px;line-height:1.5;color:${brand.muted};">Need a new code? Sign in and choose resend verification from your account.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid ${brand.border};text-align:center;background-color:${brand.white};">
              <p style="margin:0;font-size:12px;line-height:1.5;color:${brand.muted};">&copy; OrderFirst. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Hi ${input.name},

Verify your OrderFirst account with this code:

${input.code}

This code expires in 10 minutes.

If you did not create an account, you can ignore this email.`;

  return { html, text };
}

