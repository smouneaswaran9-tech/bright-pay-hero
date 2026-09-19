import { supabase } from "@/integrations/supabase/client";
import type { AttendanceRow, Employee } from "./payroll";
import { monthRange } from "./payroll";

export async function fetchEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from("employees")
    .select("id, name, phone, hourly_rate, ot_rate")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((e) => ({
    ...e,
    hourly_rate: Number(e.hourly_rate),
    ot_rate: Number(e.ot_rate),
  }));
}

export async function fetchAttendance(
  employeeId: string,
  month: number,
  year: number,
): Promise<AttendanceRow[]> {
  const { start, end } = monthRange(month, year);
  const { data, error } = await supabase
    .from("attendance")
    .select("id, employee_id, work_date, status, in_time, out_time, advance, notes")
    .eq("employee_id", employeeId)
    .gte("work_date", start)
    .lte("work_date", end)
    .order("work_date", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ ...r, advance: Number(r.advance) }));
}

export async function fetchOrphanAttendanceCount(employeeIds: string[]): Promise<number> {
  const { data, error } = await supabase.from("attendance").select("id, employee_id");
  if (error) return 0;
  return (data ?? []).filter((r) => !employeeIds.includes(r.employee_id)).length;
}

export interface EntryPayload {
  employee_id: string;
  work_date: string;
  status: string;
  in_time: string | null;
  out_time: string | null;
  advance: number;
}

export async function upsertEntry(payload: EntryPayload, id?: string) {
  if (id) {
    const { error } = await supabase.from("attendance").update(payload).eq("id", id);
    if (error) throw new Error(friendly(error.message));
    return;
  }
  const { error } = await supabase.from("attendance").insert(payload);
  if (error) throw new Error(friendly(error.message));
}

export async function deleteEntry(id: string) {
  const { error } = await supabase.from("attendance").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function saveEmployee(
  values: { name: string; phone: string; hourly_rate: number; ot_rate: number },
  id?: string,
) {
  if (id) {
    const { error } = await supabase.from("employees").update(values).eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await supabase.from("employees").insert(values);
  if (error) throw new Error(error.message);
}

export async function deleteEmployee(id: string) {
  const { error } = await supabase.from("employees").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

function friendly(message: string): string {
  if (message.includes("duplicate key") || message.includes("attendance_employee_id_work_date")) {
    return "A record already exists for that employee on that date.";
  }
  if (message.includes("violates foreign key")) {
    return "That employee profile no longer exists. Pick another employee.";
  }
  return message;
}
