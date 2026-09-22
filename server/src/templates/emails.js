/**
 * Reusable HTML email templates. All emails share the same brand shell.
 */

const brandColor = '#1d6fef';

function shell({ title, body }) {
  return `<!doctype html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#f6f7f9;font-family:Inter,Arial,sans-serif;color:#242936;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;padding:32px 16px;">
      <tr><td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(16,24,40,.08);">
          <tr>
            <td style="background:${brandColor};padding:20px 28px;">
              <span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:.3px;">Wanderlust</span>
            </td>
          </tr>
          <tr><td style="padding:32px 28px;">
            <h1 style="margin:0 0 16px;font-size:20px;color:#242936;">${title}</h1>
            ${body}
          </td></tr>
          <tr>
            <td style="padding:20px 28px;background:#f6f7f9;font-size:12px;color:#68758f;">
              Wanderlust — find the perfect stay. <br/> © ${new Date().getFullYear()} Wanderlust. You're receiving this because you use Wanderlust.
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

const button = (label, url) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td style="background:${brandColor};border-radius:8px;">
      <a href="${url}" style="display:inline-block;padding:12px 28px;color:#fff;text-decoration:none;font-weight:600;">${label}</a>
    </td></tr>
  </table>`;

const muted = (text) => `<p style="font-size:13px;color:#8795a9;line-height:1.6;">${text}</p>`;

export const templates = {
  welcome: ({ name, verifyUrl }) =>
    shell({
      title: `Welcome to Wanderlust, ${name}!`,
      body: `
        <p style="line-height:1.7;">Thank you for joining Wanderlust. We can't wait to help you plan your next getaway.</p>
        <p style="line-height:1.7;">Please verify your email address to fully activate your account.</p>
        ${button('Verify my email', verifyUrl)}
        ${muted('If you did not create this account, you can safely ignore this email.')}`,
    }),

  emailVerification: ({ name, verifyUrl, code }) =>
    shell({
      title: 'Verify your email address',
      body: `
        <p style="line-height:1.7;">Hi ${name},</p>
        <p style="line-height:1.7;">Use this 6-digit code to activate your account. It is valid for 24 hours:</p>
        <div style="margin:20px 0;padding:18px;background:#f6f7f9;border-radius:8px;text-align:center;">
          <span style="font-size:32px;font-weight:800;letter-spacing:10px;color:#242936;">${code}</span>
        </div>
        <p style="line-height:1.7;">Prefer one click? The button below verifies automatically:</p>
        ${button('Verify email', verifyUrl)}
        ${muted('If you did not create this account, you can safely ignore this email.')}`,
    }),

  passwordReset: ({ name, resetUrl }) =>
    shell({
      title: 'Reset your password',
      body: `
        <p style="line-height:1.7;">Hi ${name}, a password reset was requested for your account.</p>
        <p style="line-height:1.7;">Click below to choose a new password. The link expires in 1 hour.</p>
        ${button('Reset password', resetUrl)}
        ${muted("If you didn't request this, you can safely ignore this email.")}`,
    }),

  bookingConfirmed: ({ name, bookingNumber, hotelName, checkIn, checkOut, total, viewUrl }) =>
    shell({
      title: 'Booking confirmed 🎉',
      body: `
        <p style="line-height:1.7;">Hi ${name}, your stay is confirmed!</p>
        <table cellpadding="10" cellspacing="0" style="background:#f6f7f9;border-radius:8px;width:100%;font-size:14px;">
          <tr><td style="color:#68758f;">Booking number</td><td style="font-weight:600;">${bookingNumber}</td></tr>
          <tr><td style="color:#68758f;">Hotel</td><td style="font-weight:600;">${hotelName}</td></tr>
          <tr><td style="color:#68758f;">Check-in</td><td>${checkIn}</td></tr>
          <tr><td style="color:#68758f;">Check-out</td><td>${checkOut}</td></tr>
          <tr><td style="color:#68758f;">Total paid</td><td style="font-weight:700;">${total}</td></tr>
        </table>
        ${button('View booking', viewUrl)}`,
    }),

  bookingPending: ({ name, bookingNumber, hotelName, payUrl }) =>
    shell({
      title: 'Complete your booking',
      body: `
        <p style="line-height:1.7;">Hi ${name}, we've reserved your room at <strong>${hotelName}</strong> (${bookingNumber}).</p>
        <p style="line-height:1.7;">Complete the payment to confirm your booking.</p>
        ${button('Complete payment', payUrl)}`,
    }),

  paymentConfirmed: ({ name, bookingNumber, amount }) =>
    shell({
      title: 'Payment successful',
      body: `
        <p style="line-height:1.7;">Hi ${name}, we received your payment of <strong>${amount}</strong> for booking <strong>${bookingNumber}</strong>.</p>
        <p style="line-height:1.7;">Your booking is now confirmed. Safe travels!</p>`,
    }),

  bookingCancelled: ({ name, bookingNumber, hotelName, refundAmount }) =>
    shell({
      title: 'Booking cancelled',
      body: `
        <p style="line-height:1.7;">Hi ${name}, booking <strong>${bookingNumber}</strong> at ${hotelName} was cancelled.</p>
        <p style="line-height:1.7;">Refund amount: <strong>${refundAmount}</strong>. Refunds typically take 5–7 business days.</p>`,
    }),

  refundProcessed: ({ name, bookingNumber, amount }) =>
    shell({
      title: 'Refund processed',
      body: `
        <p style="line-height:1.7;">Hi ${name}, a refund of <strong>${amount}</strong> for booking <strong>${bookingNumber}</strong> has been processed.</p>`,
    }),

  checkInReminder: ({ name, bookingNumber, hotelName, address, checkIn }) =>
    shell({
      title: 'Check-in reminder',
      body: `
        <p style="line-height:1.7;">Hi ${name}, you check in soon!</p>
        <table cellpadding="10" cellspacing="0" style="background:#f6f7f9;border-radius:8px;width:100%;font-size:14px;">
          <tr><td style="color:#68758f;">Hotel</td><td style="font-weight:600;">${hotelName}</td></tr>
          <tr><td style="color:#68758f;">Address</td><td>${address}</td></tr>
          <tr><td style="color:#68758f;">Check-in</td><td>${checkIn}</td></tr>
          <tr><td style="color:#68758f;">Booking</td><td>${bookingNumber}</td></tr>
        </table>`,
    }),

  reviewRequest: ({ name, hotelName, bookingNumber, reviewUrl }) =>
    shell({
      title: 'How was your stay?',
      body: `
        <p style="line-height:1.7;">Hi ${name}, your stay at ${hotelName} (${bookingNumber}) has ended. We'd love your feedback!</p>
        ${button('Leave a review', reviewUrl)}`,
    }),

  propertyStatus: ({ name, hotelName, status, reason = '' }) =>
    shell({
      title: `Property ${status}`,
      body: `
        <p style="line-height:1.7;">Hi ${name}, your property <strong>${hotelName}</strong> has been ${status} by our team.</p>
        ${reason ? `<p style="line-height:1.7;">Reason: ${reason}</p>` : ''}
        ${muted('Log in to your owner dashboard for details.')}`,
    }),
};

export default templates;