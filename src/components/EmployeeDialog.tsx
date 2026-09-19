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
import type { Employee } from "@/lib/payroll";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Employee | null;
  saving: boolean;
  onSave: (values: {
    name: string;
    phone: string;
    hourly_rate: number;
    ot_rate: number;
  }) => void;
}

export function EmployeeDialog({ open, onOpenChange, editing, saving, onSave }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [rate, setRate] = useState("");
  const [otRate, setOtRate] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setErrors([]);
    setName(editing?.name ?? "");
    setPhone(editing?.phone ?? "");
    setRate(editing ? String(editing.hourly_rate) : "");
    setOtRate(editing ? String(editing.ot_rate) : "");
  }, [open, editing]);

  function submit() {
    const found: string[] = [];
    if (!name.trim()) found.push("Name is required.");
    if (phone.trim() && !/^[0-9+\- ]{6,15}$/.test(phone.trim())) {
      found.push("Phone number looks invalid.");
    }
    const r = Number(rate);
    const o = otRate.trim() === "" ? r : Number(otRate);
    if (Number.isNaN(r) || r <= 0) found.push("Hourly rate must be a number above 0.");
    if (Number.isNaN(o) || o <= 0) found.push("OT rate must be a number above 0.");
    setErrors(found);
    if (found.length === 0) {
      onSave({ name: name.trim(), phone: phone.trim(), hourly_rate: r, ot_rate: o });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit employee" : "New employee"}</DialogTitle>
          <DialogDescription>Rates are used for every day calculation.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="rate">Hourly rate</Label>
              <Input
                id="rate"
                inputMode="decimal"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="otRate">OT rate</Label>
              <Input
                id="otRate"
                inputMode="decimal"
                value={otRate}
                onChange={(e) => setOtRate(e.target.value)}
              />
            </div>
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
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
