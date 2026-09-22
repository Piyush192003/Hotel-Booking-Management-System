import nodemailer from 'nodemailer';
import { config, isEmailConfigured } from '../config/env.js';

// ── OUTGOING EMAIL: TEMPORARILY DISABLED ─────────────────────────────────
// Every email this app can send (email verification, password reset,
// booking pending / confirmed / cancelled, payment confirmation, property
// approval / rejection, check-in reminders, review requests) flows through
// EmailService.send(). While this flag is true, nothing is delivered and
// each attempt is only logged on the server. To re-enable: set it to false
// and configure SMTP_HOST / SMTP_USER / SMTP_PASS in server/.env (or leave
// them empty to use the disposable Ethereal dev inbox).
const EMAILS_DISABLED = true;

/**
 * Email delivery with three tiers (first available wins):
 *
 *  1. "smtp"     — a real SMTP relay (Gmail app password, Brevo, Mailtrap, …).
 *                  Active as soon as SMTP_HOST + SMTP_USER + SMTP_PASS are set
 *                  in server/.env, so verification codes reach REAL inboxes.
 *  2. "ethereal" — development default (no credentials needed). A disposable
 *                  Ethereal test account is created automatically; the mail is
 *                  genuinely sent over SMTP and a browser preview URL is
 *                  returned so the code can be read without a real inbox.
 *  3. "console"  — last-resort fallback (e.g. offline): prints to the terminal.
 */
class EmailService {
  constructor() {
    this.smtpTransporter = null;
    this.ethereal = { transporter: null, accountPromise: null };
  }

  get isEnabled() {
    return !EMAILS_DISABLED;
  }

  get mode() {
    return EMAILS_DISABLED ? 'disabled' : isEmailConfigured ? 'smtp' : 'ethereal';
  }

  #getSmtpTransporter() {
    if (!this.smtpTransporter) {
      this.smtpTransporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465,
        auth: { user: config.smtp.user, pass: config.smtp.pass },
      });
    }
    return this.smtpTransporter;
  }

  async #getEtherealTransporter() {
    if (this.ethereal.transporter) return this.ethereal.transporter;
    if (!this.ethereal.accountPromise) {
      this.ethereal.accountPromise = nodemailer
        .createTestAccount()
        .then((account) => {
          this.ethereal.transporter = nodemailer.createTransport({
            host: account.smtp.host,
            port: account.smtp.port,
            secure: account.smtp.secure,
            auth: { user: account.user, pass: account.pass },
          });
          return this.ethereal.transporter;
        })
        .catch((err) => {
          this.ethereal.accountPromise = null; // allow a retry on the next send
          throw err;
        });
    }
    return this.ethereal.accountPromise;
  }

  async send({ to, subject, html, text }) {
    if (EMAILS_DISABLED) {
      console.log(`[email:disabled] Suppressed "${subject}" → ${to}`);
      return { skipped: true, disabled: true };
    }
    const mail = { from: config.smtp.from, to, subject, html, text: text || htmlToText(html) };

    // Tier 1 — configured SMTP: real delivery to real inboxes.
    if (isEmailConfigured) {
      try {
        const info = await this.#getSmtpTransporter().sendMail(mail);
        console.log(`[email:smtp] "${subject}" -> ${to} (${info.messageId})`);
        return { to, subject, messageId: info.messageId, mode: 'smtp' };
      } catch (err) {
        // Bad credentials or an SMTP outage must never break the user flow
        // (e.g. signup) — degrade to the dev tiers and log the cause loudly.
        console.error(`\n[email:smtp] SEND FAILED: ${err?.response || err?.message || 'unknown error'}`);
        console.error('[email:smtp] Falling back to the dev preview inbox. Check SMTP_* values in server/.env');
        console.error('[email:smtp] Gmail requires a 16-char App Password (myaccount.google.com/apppasswords), not the account password.\n');
      }
    }

    // Tier 2 — Ethereal preview inbox (development default).
    try {
      const transporter = await this.#getEtherealTransporter();
      const info = await transporter.sendMail(mail);
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('\n────────── [dev email · ethereal] ──────────');
      console.log(`To: ${to}\nSubject: ${subject}`);
      console.log(`Open in browser: ${previewUrl}`);
      console.log('────────────────────────────────────────────\n');
      return { to, subject, messageId: info.messageId, mode: 'ethereal', previewUrl };
    } catch (err) {
      // Tier 3 — offline / Ethereal unreachable: log only, never crash.
      console.log('\n────────── [dev email · console] ──────────');
      console.log(`To: ${to}\nSubject: ${subject}`);
      console.log(`SMTP unavailable (${err?.message || 'unknown error'}) — content logged only.`);
      console.log('───────────────────────────────────────────\n');
      return { to, subject, mode: 'console', error: err?.message };
    }
  }

  async verifyConnection() {
    if (isEmailConfigured) return this.#getSmtpTransporter().verify();
    try {
      await this.#getEtherealTransporter();
      return { ok: true, mode: 'ethereal' };
    } catch {
      return { ok: false, mode: 'console' };
    }
  }
}

function htmlToText(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default new EmailService();