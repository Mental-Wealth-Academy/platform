import { Resend } from 'resend';
import type { EventItem } from './events';

/**
 * Transactional email via Resend.
 *
 * Guarded like the Mailchimp route: if RESEND_API_KEY isn't set (local dev,
 * preview builds), every send is a no-op that logs and returns false rather than
 * throwing — so a missing key never breaks a request or a cron run.
 */
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
// Must be on a Resend-verified domain. mentalwealthacademy.net is the domain we
// currently control (research@ mailbox); switch to Blue's address once that
// Google account exists and its domain is verified in Resend.
const FROM_EMAIL = process.env.EVENTS_FROM_EMAIL || 'Mental Wealth Academy <research@mentalwealthacademy.net>';
const SITE_URL = process.env.NEXT_PUBLIC_URL || 'https://mentalwealthacademy.world';

let resendClient: Resend | null = null;
function getResend(): Resend | null {
  if (!RESEND_API_KEY) return null;
  if (!resendClient) resendClient = new Resend(RESEND_API_KEY);
  return resendClient;
}

export function isEmailConfigured(): boolean {
  return Boolean(RESEND_API_KEY);
}

function formatWhen(ev: EventItem): string {
  if (!ev.startsAt) return `${ev.dateLabel} · ${ev.timeLabel}`;
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
      timeZone: 'UTC',
    }).format(new Date(ev.startsAt));
  } catch {
    return `${ev.dateLabel} · ${ev.timeLabel}`;
  }
}

/**
 * Send the day-before reminder for an event the user registered for.
 * Returns true if Resend accepted the message.
 */
export async function sendEventReminderEmail(to: string, ev: EventItem): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping reminder for', ev.id, '->', to);
    return false;
  }

  const when = formatWhen(ev);
  const homeUrl = `${SITE_URL}/home`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <p style="font-size: 13px; letter-spacing: 0.04em; color: #5168FF; margin: 0 0 8px;">${ev.category} · reminder</p>
      <h1 style="font-size: 22px; margin: 0 0 12px;">${ev.heading}</h1>
      <p style="font-size: 15px; line-height: 1.55; margin: 0 0 16px; color: #333;">${ev.description}</p>
      <table style="font-size: 14px; margin: 0 0 20px;">
        <tr><td style="padding: 2px 12px 2px 0; color: #777;">When</td><td><strong>${when}</strong></td></tr>
        ${ev.location ? `<tr><td style="padding: 2px 12px 2px 0; color: #777;">Where</td><td><strong>${ev.location}</strong></td></tr>` : ''}
      </table>
      <a href="${homeUrl}" style="display: inline-block; background: #5168FF; color: #fff; text-decoration: none; padding: 11px 20px; border-radius: 8px; font-size: 14px; font-weight: 600;">Open your dashboard</a>
      <p style="font-size: 12px; color: #999; margin: 24px 0 0;">You're getting this because you registered for this event on Mental Wealth Academy.</p>
    </div>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Reminder: ${ev.heading} — ${ev.timeLabel}`,
      html,
    });
    if (error) {
      console.error('[email] Resend error for', ev.id, '->', to, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] Failed to send reminder for', ev.id, '->', to, err);
    return false;
  }
}

/**
 * Instant "hello from Blue" intro email — powers the Meet Blue card's button.
 * Doubles as a live prod check that the email pipeline reaches an inbox.
 * Returns true if Resend accepted the message.
 */
export async function sendMeetBlueEmail(to: string): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping Meet Blue email ->', to);
    return false;
  }

  const homeUrl = `${SITE_URL}/home`;
  // Structured like a short letter from the Academy, signed off by Blue with a
  // cursive signature in the footer (font stack degrades gracefully per client).
  const html = `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 520px; margin: 0 auto; color: #1a1a1a; line-height: 1.62;">
      <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; letter-spacing: 0.08em; color: #5168ff; margin: 0 0 20px;">Mental Wealth Academy</p>

      <p style="font-size: 16px; margin: 0 0 14px;">Dear scholar,</p>

      <p style="font-size: 15px; margin: 0 0 14px;">Welcome. I am Blue, your guide and study companion here at the Academy. It is a quiet pleasure to make your acquaintance.</p>

      <p style="font-size: 15px; margin: 0 0 14px;">My role is a simple one: to keep your learning on course. I will share the sessions and circles on our calendar, and remind you the day before anything you choose to attend, so the work never slips past you.</p>

      <p style="font-size: 15px; margin: 0 0 22px;">Consider this short letter your first piece of correspondence, and proof that my notes will reach your inbox when they matter.</p>

      <p style="font-size: 15px; margin: 0 0 4px;">Warmly, and in study,</p>

      <p style="font-family: 'Snell Roundhand', 'Brush Script MT', 'Segoe Script', cursive; font-size: 32px; line-height: 1; color: #5168ff; margin: 6px 0 4px;">Blue</p>
      <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; color: #777; margin: 0 0 26px;">Your guide at Mental Wealth Academy</p>

      <a href="${homeUrl}" style="display: inline-block; background: #5168ff; color: #ffffff; text-decoration: none; padding: 11px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">Open your dashboard</a>

      <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; color: #999; margin: 28px 0 0;">You received this because you asked Blue to say hello from your Mental Wealth Academy dashboard.</p>
    </div>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'A welcome from Blue — Mental Wealth Academy',
      html,
    });
    if (error) {
      console.error('[email] Resend error for Meet Blue ->', to, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] Failed to send Meet Blue email ->', to, err);
    return false;
  }
}

/**
 * Send booking invitation email for 1-on-1 Professional Guidance.
 * Triggered when a member on a voice call asks Blue to email the consultation link.
 */
export async function sendGuidanceBookingInviteEmail(
  to: string,
  name?: string,
  focusArea?: string
): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping guidance invite ->', to);
    return false;
  }

  const bookingUrl = `${SITE_URL}/home?guidance=open`;
  const recipientName = name?.trim() || 'Academy Member';
  const focusLabel = focusArea?.trim() || 'General Mental Wealth';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; color: #1a1a1a; line-height: 1.6;">
      <p style="font-size: 12px; letter-spacing: 0.08em; color: #5168ff; margin: 0 0 16px;">Mental Wealth Academy</p>
      <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 14px; color: #111;">1-on-1 Professional Guidance</h1>
      <p style="font-size: 15px; margin: 0 0 14px; color: #333;">Hello ${recipientName},</p>
      <p style="font-size: 15px; margin: 0 0 14px; color: #333;">
        As discussed with Blue, here is your direct link to reserve a private 50-minute consultation with an Academy Lead Practitioner.
      </p>
      <div style="background: #f7f8fc; border: 1px solid #e2e6f5; border-radius: 10px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 6px; font-size: 14px; font-weight: 600; color: #111;">Session Details</p>
        <p style="margin: 0 0 4px; font-size: 14px; color: #555;">Focus: <strong>${focusLabel}</strong></p>
        <p style="margin: 0; font-size: 14px; color: #555;">Format: 50-minute clinical mental wealth consultation ($120)</p>
      </div>
      <p style="font-size: 15px; margin: 0 0 20px; color: #333;">
        Once confirmed, you will receive a unique access code for a private Squad Room where your supervisor will meet you 1-on-1.
      </p>
      <a href="${bookingUrl}" style="display: inline-block; background: #5168ff; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">Reserve Your Session</a>
      <p style="font-size: 12px; color: #999; margin: 28px 0 0;">
        Mental Wealth Academy · <a href="${SITE_URL}" style="color: #999; text-decoration: none;">mentalwealth.academy</a>
      </p>
    </div>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Your 1-on-1 Professional Guidance Link — Mental Wealth Academy',
      html,
    });
    if (error) {
      console.error('[email] Resend error for guidance invite ->', to, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] Failed to send guidance invite ->', to, err);
    return false;
  }
}

/**
 * Send post-payment confirmation email containing the private Squad Room access code.
 */
export async function sendGuidanceConfirmedEmail(
  to: string,
  details: {
    name: string;
    focusArea: string;
    squadRoomCode: string;
    notes?: string;
  }
): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping guidance confirmation ->', to);
    return false;
  }

  const squadRoomUrl = `${SITE_URL}/chat?squad=${encodeURIComponent(details.squadRoomCode)}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; color: #1a1a1a; line-height: 1.6;">
      <p style="font-size: 12px; letter-spacing: 0.08em; color: #5168ff; margin: 0 0 16px;">Mental Wealth Academy</p>
      <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 14px; color: #111;">Session Confirmed</h1>
      <p style="font-size: 15px; margin: 0 0 14px; color: #333;">Hello ${details.name || 'Academy Member'},</p>
      <p style="font-size: 15px; margin: 0 0 16px; color: #333;">
        Your 50-minute private consultation with an Academy Lead Practitioner is reserved. Below is your private Squad Room access code.
      </p>
      <div style="background: #f3f5ff; border: 1.5px dashed #5168ff; border-radius: 12px; padding: 20px; text-align: center; margin: 22px 0;">
        <span style="font-size: 12px; font-weight: 600; letter-spacing: 0.08em; color: #5168ff; display: block; margin-bottom: 6px;">YOUR SQUAD ROOM CODE</span>
        <span style="font-size: 26px; font-weight: 700; letter-spacing: 0.1em; color: #111; font-family: monospace;">${details.squadRoomCode}</span>
      </div>
      <p style="font-size: 14px; line-height: 1.6; margin: 0 0 20px; color: #444;">
        Your MWA supervisor will connect with you 1-on-1 in this room to speak with you directly about your regimen and focus area (<strong>${details.focusArea}</strong>).
      </p>
      <a href="${squadRoomUrl}" style="display: inline-block; background: #5168ff; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">Enter Squad Room</a>
      <p style="font-size: 12px; color: #888; margin: 24px 0 0;">
        You can also enter this code anytime on your Squads hub at <a href="${SITE_URL}/chat" style="color: #5168ff; text-decoration: none;">${SITE_URL}/chat</a>.
      </p>
    </div>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Your Squad Room Access Code: ${details.squadRoomCode} — Mental Wealth Academy`,
      html,
    });
    if (error) {
      console.error('[email] Resend error for guidance confirmation ->', to, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] Failed to send guidance confirmation ->', to, err);
    return false;
  }
}

/**
 * Send alert to Academy Supervisor / Admin when a new 1-on-1 consultation is booked.
 */
export async function sendSupervisorConsultationAlertEmail(
  details: {
    memberName: string;
    memberEmail: string;
    focusArea: string;
    squadRoomCode: string;
    notes?: string;
  }
): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const adminEmail = process.env.ADMIN_ALERT_EMAIL || 'research@mentalwealthacademy.net';
  const squadRoomUrl = `${SITE_URL}/chat?squad=${encodeURIComponent(details.squadRoomCode)}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="font-size: 18px; margin: 0 0 12px; color: #111;">New 1-on-1 Consultation Booked</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #666;">Member</td><td style="padding: 6px 0; font-weight: 600;">${details.memberName}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Email</td><td style="padding: 6px 0;">${details.memberEmail}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Focus Area</td><td style="padding: 6px 0; font-weight: 600;">${details.focusArea}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Squad Room Code</td><td style="padding: 6px 0; font-family: monospace; font-weight: 700; color: #5168ff;">${details.squadRoomCode}</td></tr>
        ${details.notes ? `<tr><td style="padding: 6px 0; color: #666;">Notes</td><td style="padding: 6px 0; color: #333;">${details.notes}</td></tr>` : ''}
      </table>
      <a href="${squadRoomUrl}" style="display: inline-block; background: #111; color: #fff; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-size: 13px; font-weight: 600;">Open Squad Room</a>
    </div>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: adminEmail,
      subject: `[Lead Practitioner Alert] New Booking: ${details.memberName} [${details.squadRoomCode}]`,
      html,
    });
    if (error) {
      console.error('[email] Resend error for supervisor alert:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] Failed to send supervisor alert:', err);
    return false;
  }
}

