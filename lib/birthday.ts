/**
 * Birthday parsing and validation, shared by the onboarding form and the
 * profile-create API so the inline hint a user sees is exactly the rule the
 * server enforces.
 */

export const MIN_SIGNUP_AGE = 13;
export const MAX_SIGNUP_AGE = 120;

export interface BirthdayParts {
  month: string;
  day: string;
  year: string;
}

export interface BirthdayCheck {
  /** YYYY-MM-DD when every part is present and the date is valid, else null. */
  value: string | null;
  /** Null when valid (or still incomplete); a user-facing reason otherwise. */
  error: string | null;
  /** True once all three parts have been filled in. */
  complete: boolean;
  /** Which box is at fault, or null when the whole date is. */
  field: 'month' | 'day' | 'year' | null;
}

const pad = (n: string, len: number) => n.padStart(len, '0');

function daysInMonth(month: number, year: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Whole years between `birth` and `now`, in UTC. */
export function ageOn(birth: Date, now: Date): number {
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < birth.getUTCDate())) {
    age -= 1;
  }
  return age;
}

/**
 * Validate three raw MM / DD / YYYY strings. Partial input is not an error —
 * it just isn't complete yet — so the form can stay quiet until there is
 * something real to correct.
 */
export function checkBirthdayParts(parts: BirthdayParts, now: Date = new Date()): BirthdayCheck {
  const month = parts.month.trim();
  const day = parts.day.trim();
  const year = parts.year.trim();
  const complete = month.length > 0 && day.length > 0 && year.length === 4;

  const m = Number(month);
  const d = Number(day);
  const y = Number(year);

  if (month && (!Number.isInteger(m) || m < 1 || m > 12)) {
    return { value: null, error: 'Month must be between 1 and 12.', complete, field: 'month' };
  }
  if (day && (!Number.isInteger(d) || d < 1 || d > 31)) {
    return { value: null, error: 'Day must be between 1 and 31.', complete, field: 'day' };
  }
  if (year.length === 4 && !Number.isInteger(y)) {
    return { value: null, error: 'Enter a four-digit year.', complete, field: 'year' };
  }
  if (year.length === 4 && y < now.getUTCFullYear() - MAX_SIGNUP_AGE) {
    return { value: null, error: 'Check the year, that date is too far back.', complete, field: 'year' };
  }

  if (!complete) return { value: null, error: null, complete, field: null };

  if (d > daysInMonth(m, y)) {
    return { value: null, error: `That month only has ${daysInMonth(m, y)} days.`, complete, field: 'day' };
  }

  const value = `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
  const birth = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(birth.getTime())) {
    return { value: null, error: 'That date does not exist.', complete, field: null };
  }

  const age = ageOn(birth, now);
  if (age < 0) {
    return { value: null, error: 'Your birthday cannot be in the future.', complete, field: 'year' };
  }
  if (age > MAX_SIGNUP_AGE) {
    return { value: null, error: 'Check the year, that date is too far back.', complete, field: 'year' };
  }
  if (age < MIN_SIGNUP_AGE) {
    return { value: null, error: `You must be at least ${MIN_SIGNUP_AGE} to join the Academy.`, complete, field: null };
  }

  return { value, error: null, complete, field: null };
}

/** Server-side check of a stored YYYY-MM-DD string. */
export function checkBirthdayValue(value: string, now: Date = new Date()): BirthdayCheck {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return { value: null, error: 'Invalid birthday.', complete: true, field: null };
  return checkBirthdayParts({ year: match[1], month: match[2], day: match[3] }, now);
}
