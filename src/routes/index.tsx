import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarDays,
  IndianRupee,
  Pencil,
  Plus,
  Printer,
  Trash2,
  TriangleAlert,
  UserRound,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EntryDialog, type EntryDraft } from "@/components/EntryDialog";
import { EmployeeDialog } from "@/components/EmployeeDialog";
import {
  deleteEmployee,
  deleteEntry,
  fetchAttendance,
  fetchEmployees,
  fetchOrphanAttendanceCount,
  saveEmployee,
  upsertEntry,
} from "@/lib/attendance-api";
import {
  MONTHS,
  computeMonth,
  computeTotals,
  formatTime12,
  hrs,
  isValidTime,
  money,
  type ComputedRow,
  type Employee,
} from "@/lib/payroll";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Attendance & Payroll Register — Daily hours, OT and net salary" },
      {
        name: "description",
        content:
          "Track daily in/out times, overtime, cash advances and net monthly salary for each worker in one register.",
      },
      { property: "og:title", content: "Attendance & Payroll Register" },
      {
        property: "og:description",
        content:
          "Daily attendance log sheet with automatic hour, overtime, advance and net salary calculation.",
      },
    ],
  }),
  component: Index,
});

const YEARS = [2024, 2025, 2026, 2027];

function Index() {
  const qc = useQueryClient();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [month, setMonth] = useState(8);
  const [year, setYear] = useState(2026);

  const [entryOpen, setEntryOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ComputedRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ComputedRow | null>(null);

  const [empOpen, setEmpOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [empDeleteTarget, setEmpDeleteTarget] = useState<Employee | null>(null);

  const employeesQuery = useQuery({ queryKey: ["employees"], queryFn: fetchEmployees });
  const employees = employeesQuery.data ?? [];
  const selectedId = employeeId ?? employees[0]?.id ?? null;
  const employee = employees.find((e) => e.id === selectedId);

  const attendanceQuery = useQuery({
    queryKey: ["attendance", selectedId, month, year],
    queryFn: () => fetchAttendance(selectedId!, month, year),
    enabled: !!selectedId,
  });

  const orphanQuery = useQuery({
    queryKey: ["orphans", employees.map((e) => e.id).join(",")],
    queryFn: () => fetchOrphanAttendanceCount(employees.map((e) => e.id)),
    enabled: employees.length > 0,
  });

  const rows = useMemo(
    () => computeMonth(attendanceQuery.data ?? [], employee, month, year),
    [attendanceQuery.data, employee, month, year],
  );
  const totals = useMemo(() => computeTotals(rows, employee), [rows, employee]);
  const existingDates = rows.map((r) => r.work_date);
  const flagged = rows.filter((r) => r.issues.length > 0);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["attendance"] });
    void qc.invalidateQueries({ queryKey: ["employees"] });
    void qc.invalidateQueries({ queryKey: ["orphans"] });
  };

  const entryMutation = useMutation({
    mutationFn: async (draft: EntryDraft) => {
      if (!employee) throw new Error("Select an employee before saving a day.");
      await upsertEntry(
        {
          employee_id: employee.id,
          work_date: draft.work_date,
          status: draft.status,
          in_time: isValidTime(draft.in_time) ? draft.in_time : null,
          out_time: isValidTime(draft.out_time) ? draft.out_time : null,
          advance: draft.advance.trim() === "" ? 0 : Number(draft.advance),
        },
        draft.id,
      );
    },
    onSuccess: () => {
      toast.success("Day saved");
      setEntryOpen(false);
      setEditingEntry(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEntry(id),
    onSuccess: () => {
      toast.success("Day removed");
      setDeleteTarget(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const empMutation = useMutation({
    mutationFn: (values: {
      name: string;
      phone: string;
      hourly_rate: number;
      ot_rate: number;
    }) => saveEmployee(values, editingEmp?.id),
    onSuccess: () => {
      toast.success("Employee saved");
      setEmpOpen(false);
      setEditingEmp(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const empDeleteMutation = useMutation({
    mutationFn: (id: string) => deleteEmployee(id),
    onSuccess: () => {
      toast.success("Employee removed");
      setEmpDeleteTarget(null);
      setEmployeeId(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4 px-4 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Attendance &amp; Payroll
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              Monthly Register
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={selectedId ?? ""}
              onValueChange={(v) => setEmployeeId(v)}
              disabled={employees.length === 0}
            >
              <SelectTrigger className="w-[190px]">
                <UserRound className="size-4 opacity-60" />
                <SelectValue placeholder="No employees yet" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-[150px]">
                <CalendarDays className="size-4 opacity-60" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={m} value={String(i + 1)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="size-4" /> Payslip
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {employeesQuery.isError && (
          <Banner tone="error">Could not load employees. Refresh and try again.</Banner>
        )}
        {attendanceQuery.isError && (
          <Banner tone="error">Could not load this month's records. Refresh and try again.</Banner>
        )}
        {!employeesQuery.isLoading && employees.length === 0 && (
          <Banner tone="warn">
            No employee profiles exist yet. Add one before recording attendance.
          </Banner>
        )}
        {(orphanQuery.data ?? 0) > 0 && (
          <Banner tone="warn">
            {orphanQuery.data} attendance record(s) are not linked to any employee profile and are
            excluded from payroll.
          </Banner>
        )}
        {flagged.length > 0 && (
          <Banner tone="warn">
            {flagged.length} day(s) in {MONTHS[month - 1]} {year} need attention — see the
            highlighted rows below.
          </Banner>
        )}

        <div className="mb-6 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {employee?.name ?? "—"}
                {employee?.phone ? (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {employee.phone}
                  </span>
                ) : null}
              </h2>
              <p className="text-sm text-muted-foreground">
                {MONTHS[month - 1]} {year} · {money(employee?.hourly_rate ?? 0)}/hr · OT{" "}
                {money(employee?.ot_rate ?? 0)}/hr
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Net salary
              </p>
              <p className="text-3xl font-bold tabular-nums text-foreground">
                {money(totals.netSalary)}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            <Stat label="Working days" value={String(totals.workingDays)} />
            <Stat label="Present days" value={String(totals.presentDays)} />
            <Stat label="Leave days" value={String(totals.leaveDays)} />
            <Stat label="Regular hours" value={hrs(totals.regularHours)} />
            <Stat label="OT hours" value={hrs(totals.otHours)} />
            <Stat label="Regular pay" value={money(totals.regularPay)} />
            <Stat label="OT pay" value={money(totals.otPay)} />
            <Stat label="Gross pay" value={money(totals.grossPay)} />
            <Stat label="Total advance" value={money(totals.advance)} />
            <Stat label="Data issues" value={String(totals.issueCount)} />
          </div>
        </div>

        <Tabs defaultValue="sheet">
          <TabsList className="print:hidden">
            <TabsTrigger value="sheet">Log sheet</TabsTrigger>
            <TabsTrigger value="advances">Advances</TabsTrigger>
            <TabsTrigger value="employees">
              <Users className="size-4" /> Employees
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sheet">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Daily log sheet</CardTitle>
                <Button
                  className="print:hidden"
                  onClick={() => {
                    if (!employee) {
                      toast.error("Add or select an employee first.");
                      return;
                    }
                    setEditingEntry(null);
                    setEntryOpen(true);
                  }}
                >
                  <Plus className="size-4" /> Add day
                </Button>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-3">#</th>
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Day</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">In</th>
                      <th className="py-2 pr-3">Out</th>
                      <th className="py-2 pr-3 text-right">Total hrs</th>
                      <th className="py-2 pr-3 text-right">Reg hrs</th>
                      <th className="py-2 pr-3 text-right">OT hrs</th>
                      <th className="py-2 pr-3 text-right">Rate</th>
                      <th className="py-2 pr-3 text-right">Daily total</th>
                      <th className="py-2 pr-3 text-right">Advance</th>
                      <th className="py-2 print:hidden" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr
                        key={r.id}
                        className={`border-b border-border/60 ${
                          r.issues.length ? "bg-destructive/5" : ""
                        }`}
                      >
                        <td className="py-2 pr-3 text-muted-foreground">{i + 1}</td>
                        <td className="py-2 pr-3 font-medium">
                          <span className="flex items-center gap-1.5">
                            {r.work_date}
                            {r.issues.length > 0 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <TriangleAlert className="size-4 text-destructive" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <ul className="list-disc space-y-1 pl-4">
                                    {r.issues.map((issue) => (
                                      <li key={issue}>{issue}</li>
                                    ))}
                                  </ul>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground">{r.day}</td>
                        <td className="py-2 pr-3">
                          <Badge
                            variant={
                              r.status === "Present"
                                ? "default"
                                : r.status === "Advance"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {r.status}
                          </Badge>
                        </td>
                        <td className="py-2 pr-3">{formatTime12(r.in_time)}</td>
                        <td className="py-2 pr-3">{formatTime12(r.out_time)}</td>
                        <td className="py-2 pr-3 text-right font-semibold tabular-nums">
                          {hrs(r.totalHours)}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">{hrs(r.regularHours)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{hrs(r.otHours)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">
                          {hrs(employee?.hourly_rate ?? 0)}
                        </td>
                        <td className="py-2 pr-3 text-right font-semibold tabular-nums">
                          {money(r.dailyTotal)}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          {r.advance ? money(r.advance) : "—"}
                        </td>
                        <td className="py-2 text-right print:hidden">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Edit day"
                              onClick={() => {
                                setEditingEntry(r);
                                setEntryOpen(true);
                              }}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Delete day"
                              onClick={() => setDeleteTarget(r)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={13} className="py-10 text-center text-muted-foreground">
                          {attendanceQuery.isLoading
                            ? "Loading..."
                            : `No records for ${MONTHS[month - 1]} ${year}.`}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {rows.length > 0 && (
                    <tfoot>
                      <tr className="font-semibold">
                        <td className="py-3" colSpan={6}>
                          TOTAL
                        </td>
                        <td className="py-3 pr-3 text-right tabular-nums">
                          {hrs(totals.totalHours)}
                        </td>
                        <td className="py-3 pr-3 text-right tabular-nums">
                          {hrs(totals.regularHours)}
                        </td>
                        <td className="py-3 pr-3 text-right tabular-nums">{hrs(totals.otHours)}</td>
                        <td />
                        <td className="py-3 pr-3 text-right tabular-nums">
                          {money(totals.grossPay)}
                        </td>
                        <td className="py-3 pr-3 text-right tabular-nums">
                          {money(totals.advance)}
                        </td>
                        <td className="print:hidden" />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advances">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IndianRupee className="size-4" /> Cash advances
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border">
                  {rows
                    .filter((r) => r.advance > 0)
                    .map((r) => (
                      <li key={r.id} className="flex items-center justify-between py-3">
                        <span>
                          {r.work_date}{" "}
                          <span className="text-muted-foreground">({r.day})</span>
                        </span>
                        <span className="font-semibold tabular-nums">{money(r.advance)}</span>
                      </li>
                    ))}
                  {rows.every((r) => r.advance === 0) && (
                    <li className="py-8 text-center text-muted-foreground">
                      No advances recorded this month.
                    </li>
                  )}
                </ul>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-4 font-semibold">
                  <span>Deducted from salary</span>
                  <span className="tabular-nums">{money(totals.advance)}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employees">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Employee profiles</CardTitle>
                <Button
                  onClick={() => {
                    setEditingEmp(null);
                    setEmpOpen(true);
                  }}
                >
                  <Plus className="size-4" /> New employee
                </Button>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border">
                  {employees.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <p className="font-medium">{e.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {e.phone || "No phone"} · {money(e.hourly_rate)}/hr · OT{" "}
                          {money(e.ot_rate)}/hr
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Edit employee"
                          onClick={() => {
                            setEditingEmp(e);
                            setEmpOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Delete employee"
                          onClick={() => setEmpDeleteTarget(e)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                  {employees.length === 0 && (
                    <li className="py-8 text-center text-muted-foreground">
                      No employees yet. Add the first one.
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <EntryDialog
        open={entryOpen}
        onOpenChange={(o) => {
          setEntryOpen(o);
          if (!o) setEditingEntry(null);
        }}
        employee={employee}
        employees={employees}
        month={month}
        year={year}
        existingDates={existingDates}
        editing={editingEntry}
        saving={entryMutation.isPending}
        onSave={(draft) => entryMutation.mutate(draft)}
      />

      <EmployeeDialog
        open={empOpen}
        onOpenChange={(o) => {
          setEmpOpen(o);
          if (!o) setEditingEmp(null);
        }}
        editing={editingEmp}
        saving={empMutation.isPending}
        onSave={(values) => empMutation.mutate(values)}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this day?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.work_date} will be deleted and the monthly totals recalculated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!empDeleteTarget} onOpenChange={(o) => !o && setEmpDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {empDeleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              All attendance records for this person will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => empDeleteTarget && empDeleteMutation.mutate(empDeleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function Banner({ tone, children }: { tone: "warn" | "error"; children: React.ReactNode }) {
  return (
    <div
      className={`mb-4 flex items-start gap-2 rounded-lg border p-3 text-sm print:hidden ${
        tone === "error"
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-accent-foreground/20 bg-accent text-accent-foreground"
      }`}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
