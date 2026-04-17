import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587/STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

const FROM = process.env.MAIL_FROM || 'team1 Portal <noreply@team1.network>'
const SUPPORT_TO = process.env.SUPPORT_EMAIL || 'sarnavo@team1.network'

interface SendMailArgs {
  to: string
  subject: string
  html: string
  replyTo?: string
}

/** Send a single email. Swallows errors so callers don't fail. */
export async function sendMail(args: SendMailArgs): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: FROM,
      to: args.to,
      subject: args.subject,
      html: args.html,
      replyTo: args.replyTo,
    })
    return true
  } catch (e) {
    console.error('[mailer] failed to send email:', e)
    return false
  }
}

/** Send a support request from the login page to the support inbox. */
export async function sendSupportMail(data: {
  name: string
  email: string
  role: string
  country: string
  message: string
}): Promise<boolean> {
  return sendMail({
    to: SUPPORT_TO,
    subject: `[Support] Login issue from ${data.name}`,
    replyTo: data.email,
    html: `
      <div style="font-family:sans-serif;max-width:560px">
        <h2 style="color:#e11d48">Support Request — team1 Portal</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 0;color:#666;width:100px">Name</td><td>${esc(data.name)}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Email</td><td>${esc(data.email)}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Role</td><td>${esc(data.role)}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Country</td><td>${esc(data.country)}</td></tr>
        </table>
        <hr style="margin:16px 0;border:none;border-top:1px solid #eee"/>
        <p style="font-size:14px;line-height:1.6;white-space:pre-wrap">${esc(data.message)}</p>
        <p style="font-size:11px;color:#999;margin-top:24px">Sent from the team1 Portal login page</p>
      </div>
    `,
  })
}

/** Send a welcome/role-assignment email to a member added to a region. */
export async function sendMemberAddedMail(data: {
  toEmail: string
  toName: string
  regionName: string
  role: string
}): Promise<boolean> {
  const roleLabel = data.role === 'co_lead' ? 'Co-Lead' : data.role.charAt(0).toUpperCase() + data.role.slice(1)
  return sendMail({
    to: data.toEmail,
    subject: `You've been added to ${data.regionName} as ${roleLabel} — team1 Portal`,
    html: `
      <div style="font-family:sans-serif;max-width:560px">
        <h2 style="color:#e11d48">Welcome to ${esc(data.regionName)}!</h2>
        <p style="font-size:14px;line-height:1.6">
          Hi <strong>${esc(data.toName)}</strong>,<br/><br/>
          You have been added to the <strong>${esc(data.regionName)}</strong> region
          on the team1 Portal with the role <strong>${esc(roleLabel)}</strong>.
        </p>
        <p style="font-size:14px;line-height:1.6">
          Sign in to get started:
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://member.team1.network'}/login"
             style="color:#e11d48;font-weight:bold">Open Portal</a>
        </p>
        <p style="font-size:11px;color:#999;margin-top:32px">team1 Member Portal</p>
      </div>
    `,
  })
}

/** Escape HTML to prevent injection in email bodies. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
