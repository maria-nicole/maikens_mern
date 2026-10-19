const C = {
  ink: "#241F1A",
  gold: "#9C7A3C",
  goldLight: "#C9A96A",
  goldDark: "#6B5426",
  cream: "#F4ECDB",
  page: "#EFE9E3",
  soft: "#FBF8F3",
  border: "#E3DACB",
  body: "#4A4136",
  muted: "#8B8072",
};
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "'Courier New', Courier, monospace";

const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const clientUrl = () => process.env.CLIENT_URL || "http://localhost:5173";

const heading = (text) =>
  `<h1 style="margin:0 0 16px;font-family:${SERIF};font-size:26px;font-weight:normal;color:${C.ink};">${text}</h1>`;

const paragraph = (text) => `<p style="margin:0 0 16px;">${text}</p>`;

const button = (href, label) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto 8px;">
    <tr><td style="background:${C.gold};border-radius:8px;">
      <a href="${href}" style="display:inline-block;padding:13px 28px;font-family:${SANS};font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;">${label}</a>
    </td></tr>
  </table>`;

const layout = ({ preheader = "", content }) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>Maikens Gown &amp; Barong</title>
</head>
<body style="margin:0;padding:0;background:${C.page};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;">
        <tr><td align="center" style="background:${C.ink};padding:30px 24px;border-radius:16px 16px 0 0;">
          <div style="font-family:${SERIF};font-size:28px;letter-spacing:7px;color:#F5EFE4;">MAIKENS</div>
          <div style="font-family:${SANS};font-size:11px;letter-spacing:3px;color:${C.goldLight};text-transform:uppercase;margin-top:6px;">Gown &amp; Barong</div>
        </td></tr>
        <tr><td style="background:${C.goldLight};height:3px;line-height:3px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="background:#FFFFFF;padding:36px 32px;font-family:${SANS};font-size:15px;line-height:1.65;color:${C.body};border-left:1px solid ${C.border};border-right:1px solid ${C.border};">
          ${content}
        </td></tr>
        <tr><td align="center" style="background:${C.soft};padding:22px 32px;border:1px solid ${C.border};border-top:0;border-radius:0 0 16px 16px;font-family:${SANS};font-size:12px;line-height:1.7;color:${C.muted};">
          Stall A18 Disenyo Pandi &middot; Wedding Depot<br>
          Grace Park Street, Bagong Barrio, Pandi, 3014 Bulacan<br><br>
          This is an automated message, so please don't reply to it.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

export const verificationEmailTemplate = ({ name, code }) =>
  layout({
    preheader: `Your Maikens verification code is ${code}`,
    content: `
      ${heading(`Welcome${name ? `, ${esc(name)}` : ""}`)}
      ${paragraph("Thank you for joining Maikens Gown &amp; Barong. Enter this code to verify your email and finish creating your account:")}
      <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:28px auto;">
        <tr><td align="center" style="background:${C.cream};border:1px dashed ${C.gold};border-radius:12px;padding:18px 32px;">
          <span style="font-family:${MONO};font-size:36px;font-weight:bold;letter-spacing:10px;color:${C.ink};">${esc(code)}</span>
        </td></tr>
      </table>
      <p style="margin:0 0 16px;text-align:center;font-size:13px;color:${C.muted};">This code expires in 15 minutes.</p>
      ${paragraph("If you didn't create an account with us, you can safely ignore this email.")}
      <p style="margin:24px 0 0;">Warm regards,<br><span style="font-family:${SERIF};color:${C.goldDark};">The Maikens Team</span></p>`,
  });

export const welcomeEmailTemplate = ({ name }) =>
  layout({
    preheader: "Your email is verified. Welcome to Maikens.",
    content: `
      ${heading(`You're all set${name ? `, ${esc(name)}` : ""}`)}
      ${paragraph("Your email is verified and your account is ready. Here's what you can do now:")}
      <ul style="margin:0 0 16px;padding-left:20px;">
        <li style="margin-bottom:6px;">Browse our gowns and barong</li>
        <li style="margin-bottom:6px;">Design your own piece with an AI-generated preview</li>
        <li style="margin-bottom:6px;">Track every order from production to pick-up</li>
      </ul>
      ${button(`${clientUrl()}/catalog`, "Browse the catalog")}
      <p style="margin:24px 0 0;">Warm regards,<br><span style="font-family:${SERIF};color:${C.goldDark};">The Maikens Team</span></p>`,
  });

export const passwordResetRequestTemplate = ({ resetURL }) =>
  layout({
    preheader: "Reset your Maikens password",
    content: `
      ${heading("Reset your password")}
      ${paragraph("We received a request to reset your password. If this wasn't you, you can ignore this email.")}
      ${button(esc(resetURL), "Reset password")}
      <p style="margin:16px 0 0;text-align:center;font-size:13px;color:${C.muted};">This link expires in 1 hour.</p>`,
  });

export const passwordResetSuccessTemplate = () =>
  layout({
    preheader: "Your Maikens password was changed",
    content: `
      ${heading("Password changed")}
      ${paragraph("Your password has been reset successfully. If you didn't do this, please contact the boutique right away.")}`,
  });