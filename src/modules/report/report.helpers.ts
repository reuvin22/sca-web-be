// Small counting helpers for the report service.

// Most common values of a field, highest first: [{ label, count }]. Empty values are skipped.
export function countBy<T>(items: T[], getValue: (item: T) => string, limit?: number) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const value = getValue(item);
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// Count per month, oldest first: [{ month: "2026-10", count }]
export function countByMonth(dates: string[]) {
  return countBy(dates, (date) => date.slice(0, 7))
    .map(({ label, count }) => ({ month: label, count }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

// One row per staff member with a count per appointment status, busiest first
export function workloadByStaff(appointments: { staff: string; status: string }[]) {
  return countBy(appointments, (item) => item.staff).map(({ label, count }) => {
    const mine = appointments.filter((item) => item.staff === label);
    const countStatus = (status: string) => mine.filter((item) => item.status === status).length;
    return {
      staff: label,
      total: count,
      scheduled: countStatus("scheduled"),
      completed: countStatus("completed"),
      cancelled: countStatus("cancelled"),
      noShow: countStatus("no-show"),
    };
  });
}
