import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MONTHS,
  STATUSES,
  monthRange,
  validateEntry,
  type ComputedRow,
  type Employee,
} from "@/lib/payroll";

export interface EntryDraft {
  id?: string;
  work_date: string;
  status: string;
  in_time: string;
  out_time: string;
  advance: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | undefined;
  employees: Employee[];
  month: number;
  year: number;
  existingDates: string[];
  editing: ComputedRow | null;
  saving: boolean;
  onSave: (draft: EntryDraft) => void;
}

const empty: EntryDraft = {
  work_date: "",
  status: "Present",
  in_time: "08:00",
  out_time: "20:00",
  advance: "",
};

export function EntryDialog({
  open,
  onOpenChange,
  employee,
  employees,
  month,
  year,
  existingDates,
  editing,
  saving,
  onSave,
}: Props) {
  const [draft, setDraft] = useState<EntryDraft>(empty);
  const [errors, setErrors] = useState<string[]>([]);
  const { start, end } = monthRange(month, year);

  useEffect(() => {
    if (!open) return;
    setErrors([]);
    setDraft(
      editing
        ? {
            id: editing.id,
            work_date: editing.work_date,
            status: editing.status,
            in_time: editing.in_time ?? "",
            out_time: editing.out_time ?? "",
            advance: editing.advance ? String(editing.advance) : "",
          }
        : { ...empty, work_date: start },
    );
  }, [open, editing, start]);

  const set = (patch: Partial<EntryDraft>) => setDraft((d) => ({ ...d, ...patch }));

  function submit() {
    const found = validateEntry({
      employeeId: employee?.id ?? null,
      employees,
      workDate: draft.work_date,
      status: draft.status,
      inTime: draft.in_time,
      outTime: draft.out_time,
      advance: draft.advance,
      month,
      year,
      existingDates,
      editingDate: editing?.work_date ?? null,
    });
    setErrors(found);
    if (found.length === 0) onSave(draft);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit day" : "Add day"}</DialogTitle>
          <DialogDescription>
            {employee ? employee.name : "No employee selected"} · {MONTHS[month - 1]} {year}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="work_date">Date</Label>
            <Input
              id="work_date"
              type="date"
              min={start}
              max={end}
              value={draft.work_date}
              onChange={(e) => set({ work_date: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={draft.status} onValueChange={(v) => set({ status: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="in_time">In time</Label>
              <Input
                id="in_time"
                type="time"
                value={draft.in_time}
                onChange={(e) => set({ in_time: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="out_time">Out time</Label>
              <Input
                id="out_time"
                type="time"
                value={draft.out_time}
                onChange={(e) => set({ out_time: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="advance">Advance taken</Label>
            <Input
              id="advance"
              inputMode="decimal"
              placeholder="0"
              value={draft.advance}
              onChange={(e) => set({ advance: e.target.value })}
            />
          </div>

          {errors.length > 0 && (
            <ul className="space-y-1 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {errors.map((e) => (
                <li key={e} className="flex gap-2">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{e}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving..." : "Save day"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
