"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const currentYear = new Date().getFullYear();
const years = Array.from(
  { length: currentYear - 2020 + 1 },
  (_, i) => currentYear - i
);

interface Props {
  onSubmit: (propertyId: string, year: string) => void;
}

export function PropertyLookupModal({ onSubmit }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(true);
  const [propertyId, setPropertyId] = React.useState("");
  const [year, setYear] = React.useState(String(currentYear));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!propertyId.trim() || !year) return;
    setOpen(false);
    onSubmit(propertyId.trim(), year);
  }

  function handleOpenChange(next: boolean) {
    if (!next) router.push("/");
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Look Up Property</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-5 py-2">
          <div className="grid gap-2">
            <Label htmlFor="property-id">Property ID</Label>
            <Input
              id="property-id"
              placeholder="Enter property ID"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="year">Year</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger id="year" className="w-full">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={!propertyId.trim() || !year}
              className="w-full"
            >
              Continue
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
