export type Status = "Present" | "Leave" | "Advance";

export const STATUSES: Status[] = ["Present", "Leave", "Advance"];

export const REGULAR_HOURS_PER_DAY = 12;

export interface Employee {
  id: string;
  name: string;
  phone: string | null;
  hourly_rate: number;
  ot_rate: number;
}

export interface AttendanceRow {
  id: string;
  employee_id: string;
  work_date: string;
  status: string;
  in_time: string | null;
  out_time: string | null;
  advance: number;
  notes?: string | null;
}

export interface ComputedRow extends AttendanceRow {
  day: string;
  totalHours: number;
  regularHours: number;
  otHours: number;
  dailyTotal: number;
  issues: string[];
}

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export function isValidTime(value: string | null | undefined): boolean {
  return !!value && TIME_RE.test(value.trim());
}

export function toMinutes(value: string): number {
  const [h, m] = value.trim().split(":");
  return Number(h) * 60 + Number(m);
}

export function formatTime12(value: string | null): string {
  if (!isValidTime(value)) return "—";
  const [h, m] = value!.trim().split(":").map(Number);
  const period = h! >= 12 ? "PM" : "AM";
  const hour12 = h! % 12 === 0 ? 12 : h! % 12;
  return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

/** Hours worked; handles shifts that cross midnight. */
export function hoursBetween(inTime: string, outTime: string): number {
  let diff = toMinutes(outTime) - toMinutes(inTime);
  if (diff < 0) diff += 24 * 60;
  return Math.round((diff / 60) * 100) / 100;
}

export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  return (
    dt.getUTCFullYear() === y && dt.getUTCMonth() === m! - 1 && dt.getUTCDate() === d
  );
}

export function dayName(value: string): string {
  if (!isValidDateString(value)) return "—";
  const [y, m, d] = value.split("-").map(Number);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
    new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay()
  ]!;
}

export function money(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function hrs(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

export interface ComputeContext {
  employee: Employee | undefined;
  month: number; // 1-12
  year: number;
  seenDates: Map<string, number>;
}

export function computeRow(row: AttendanceRow, ctx: ComputeContext): ComputedRow {
  const issues: string[] = [];
  const rate = ctx.employee?.hourly_rate ?? 0;
  const otRate = ctx.employee?.ot_rate ?? rate;

  if (!ctx.employee) {
    issues.push("This record is not linked to an existing employee profile.");
  }
  if (!isValidDateString(row.work_date)) {
    issues.push(`Date "${row.work_date}" is not a valid date.`);
  } else {
    const [y, m] = row.work_date.split("-").map(Number);
    if (y !== ctx.year || m !== ctx.month) {
      issues.push("This record belongs to a different month.");
    }
  }
  if ((ctx.seenDates.get(row.work_date) ?? 0) > 1) {
    issues.push("More than one record exists for this date.");
  }
  if (!STATUSES.includes(row.status as Status)) {
    issues.push(`Unknown status "${row.status}".`);
  }

  const hasIn = isValidTime(row.in_time);
  const hasOut = isValidTime(row.out_time);
  if (row.in_time && !hasIn) issues.push("In time is not a valid 24-hour time.");
  if (row.out_time && !hasOut) issues.push("Out time is not a valid 24-hour time.");
  if (hasIn !== hasOut && (row.in_time || row.out_time)) {
    issues.push("Both in time and out time are needed to calculate hours.");
  }
  if (row.status === "Present" && !(hasIn && hasOut)) {
    issues.push("Marked present but no working hours recorded.");
  }
  if (Number(row.advance) < 0) issues.push("Advance cannot be negative.");

  const totalHours = hasIn && hasOut ? hoursBetween(row.in_time!, row.out_time!) : 0;
  if (totalHours > 18) issues.push("Working hours look unusually high (over 18).");

  const regularHours = Math.min(totalHours, REGULAR_HOURS_PER_DAY);
  const otHours = Math.max(0, Math.round((totalHours - REGULAR_HOURS_PER_DAY) * 100) / 100);
  const dailyTotal = Math.round((regularHours * rate + otHours * otRate) * 100) / 100;

  return {
    ...row,
    advance: Number(row.advance) || 0,
    day: dayName(row.work_date),
    totalHours,
    regularHours,
    otHours,
    dailyTotal,
    issues,
  };
}

export function computeMonth(
  rows: AttendanceRow[],
  employee: Employee | undefined,
  month: number,
  year: number,
): ComputedRow[] {
  const seenDates = new Map<string, number>();
  for (const r of rows) seenDates.set(r.work_date, (seenDates.get(r.work_date) ?? 0) + 1);
  return rows
    .slice()
    .sort((a, b) => a.work_date.localeCompare(b.work_date))
    .map((r) => computeRow(r, { employee, month, year, seenDates }));
}

export interface Totals {
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  regularHours: number;
  otHours: number;
  totalHours: number;
  regularPay: number;
  otPay: number;
  grossPay: number;
  advance: number;
  netSalary: number;
  issueCount: number;
}

export function computeTotals(rows: ComputedRow[], employee: Employee | undefined): Totals {
  const rate = employee?.hourly_rate ?? 0;
  const otRate = employee?.ot_rate ?? rate;
  const regularHours = rows.reduce((s, r) => s + r.regularHours, 0);
  const otHours = rows.reduce((s, r) => s + r.otHours, 0);
  const advance = rows.reduce((s, r) => s + r.advance, 0);
  const regularPay = Math.round(regularHours * rate * 100) / 100;
  const otPay = Math.round(otHours * otRate * 100) / 100;
  const grossPay = Math.round((regularPay + otPay) * 100) / 100;

  return {
    workingDays: rows.length,
    presentDays: rows.filter((r) => r.totalHours > 0).length,
    leaveDays: rows.filter((r) => r.totalHours === 0).length,
    regularHours: Math.round(regularHours * 100) / 100,
    otHours: Math.round(otHours * 100) / 100,
    totalHours: Math.round((regularHours + otHours) * 100) / 100,
    regularPay,
    otPay,
    grossPay,
    advance,
    netSalary: Math.round((grossPay - advance) * 100) / 100,
    issueCount: rows.reduce((s, r) => s + r.issues.length, 0),
  };
}

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function monthRange(month: number, year: number) {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    start: `${year}-${pad(month)}-01`,
    end: `${year}-${pad(month)}-${pad(last)}`,
    lastDay: last,
  };
}

/** Validation for a single entry before it is saved. */
export function validateEntry(input: {
  employeeId: string | null;
  employees: Employee[];
  workDate: string;
  status: string;
  inTime: string;
  outTime: string;
  advance: string;
  month: number;
  year: number;
  existingDates: string[];
  editingDate?: string | null;
}): string[] {
  const errors: string[] = [];
  if (!input.employeeId || !input.employees.some((e) => e.id === input.employeeId)) {
    errors.push("Choose an employee first — this entry needs a valid profile.");
  }
  if (!input.workDate) {
    errors.push("Pick a date.");
  } else if (!isValidDateString(input.workDate)) {
    errors.push("That date is not valid. Use the date picker.");
  } else {
    const [y, m] = input.workDate.split("-").map(Number);
    if (y !== input.year || m !== input.month) {
      errors.push(`That date is outside ${MONTHS[input.month - 1]} ${input.year}.`);
    }
    if (
      input.existingDates.includes(input.workDate) &&
      input.workDate !== (input.editingDate ?? "")
    ) {
      errors.push("A record already exists for this date. Edit that row instead.");
    }
  }
  if (!STATUSES.includes(input.status as Status)) errors.push("Choose a valid status.");

  const hasIn = isValidTime(input.inTime);
  const hasOut = isValidTime(input.outTime);
  if (input.inTime && !hasIn) errors.push("In time must look like 08:00.");
  if (input.outTime && !hasOut) errors.push("Out time must look like 20:00.");
  if (hasIn !== hasOut) errors.push("Enter both in time and out time, or leave both empty.");
  if (input.status === "Present" && !(hasIn && hasOut)) {
    errors.push("A present day needs an in time and an out time.");
  }
  const adv = input.advance.trim() === "" ? 0 : Number(input.advance);
  if (Number.isNaN(adv) || adv < 0) errors.push("Advance must be a number of 0 or more.");
  if (input.status === "Advance" && adv <= 0) {
    errors.push("An advance day needs an advance amount above 0.");
  }
  return errors;
}
