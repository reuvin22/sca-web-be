// Dates are stored and sent as "YYYY-MM-DD" strings, which sort correctly as text.

// Today (or today + offsetDays) as "YYYY-MM-DD" (UTC)
export function todayString(offsetDays = 0): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export const nowIso = () => new Date().toISOString();
