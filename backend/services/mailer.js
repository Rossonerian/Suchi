// Single responsibility: own the nodemailer transporter and expose one
// sendMail function. Uses Gmail SMTP with an app password.
import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD must be set to send meeting emails.');
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  const t = getTransporter();
  return t.sendMail({
    from: `"AirMouse Ops Board" <${process.env.GMAIL_USER}>`,
    to: to.join(', '),
    subject,
    text,
    html,
  });
}

export { sendMail };
