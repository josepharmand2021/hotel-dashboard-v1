"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

/**
 * MonthYearPicker
 * value format: 'YYYY-MM'
 */
export function MonthYearPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parsed = parseYYYYMM(value);
  const [open, setOpen] = React.useState(false);
  const [year, setYear] = React.useState(parsed.year);

  React.useEffect(() => {
    const p = parseYYYYMM(value);
    setYear(p.year);
  }, [value]);

  const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  const label = formatYYYYMMLabel(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-start w-full" role="combobox">
          <Calendar className="mr-2 h-4 w-4" /> {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-3">
        <div className="flex items-center justify-between mb-3">
          <Button size="icon" variant="ghost" onClick={() => setYear((y) => y - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-medium">{year}</div>
          <Button size="icon" variant="ghost" onClick={() => setYear((y) => y + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {months.map((m, idx) => {
            const mm = String(idx + 1).padStart(2, "0");
            const val = `${year}-${mm}`;
            const active = value === val;
            return (
              <Button
                key={m}
                variant={active ? "default" : "secondary"}
                className="w-full"
                onClick={() => {
                  onChange(val);
                  setOpen(false);
                }}
              >
                {m}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function parseYYYYMM(v: string): { year: number; month: number } {
  const [y, m] = v.split("-");
  const year = Number(y) || new Date().getFullYear();
  const month = Number(m) || new Date().getMonth() + 1;
  return { year, month };
}

function formatYYYYMMLabel(v: string) {
  const { year, month } = parseYYYYMM(v);
  const months = [
    "Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"
  ];
  const name = months[Math.max(0, Math.min(11, month - 1))];
  return `${name} ${year}`;
}
