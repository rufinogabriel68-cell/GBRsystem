"use client";

import { useState } from "react";
import { cn, monthName, toISO, todayISO } from "@/lib/utils";
import { ChevronRight } from "@/components/ui";
import type { Tone } from "@/components/ui";

export const TIPO_TONE: Record<string, Tone> = {
  Serviço: "accent",
  Instalação: "good",
  Orçamento: "warn",
  Comercial: "info",
  Pessoal: "bad",
};

export function MonthCalendar({
  events,
  selectedDay,
  onSelectDay,
}: {
  events: { dia: string; tipo: string }[];
  selectedDay?: string;
  onSelectDay?: (d: string) => void;
}) {
  const startRef = selectedDay ?? todayISO();
  const [cursor, setCursor] = useState(() => {
    const [y, m] = startRef.split("-").map(Number);
    return { y, m: m - 1 };
  });

  const today = todayISO();
  const first = new Date(cursor.y, cursor.m, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(toISO(new Date(cursor.y, cursor.m, d)));
  }

  const eventsByDay: Record<string, string[]> = {};
  for (const e of events) {
    const inMonth = e.dia.startsWith(
      `${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}`
    );
    if (!inMonth) continue;
    (eventsByDay[e.dia] ??= []).push(e.tipo);
  }

  const move = (delta: number) => {
    let m = cursor.m + delta;
    let y = cursor.y;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    if (m > 11) {
      m = 0;
      y += 1;
    }
    setCursor({ y, m });
  };

  const wd = ["D", "S", "T", "Q", "Q", "S", "S"];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => move(-1)}
            className="grid h-7 w-7 place-items-center rounded-lg border border-line text-muted hover:text-ink"
          >
            <span className="rotate-180">
              <ChevronRight />
            </span>
          </button>
          <span className="font-display text-sm font-bold text-ink">
            {monthName(cursor.m)} {cursor.y}
          </span>
          <button
            onClick={() => move(1)}
            className="grid h-7 w-7 place-items-center rounded-lg border border-line text-muted hover:text-ink"
          >
            <ChevronRight />
          </button>
        </div>
        <button
          onClick={() => {
            const now = new Date();
            setCursor({ y: now.getFullYear(), m: now.getMonth() });
          }}
          className="rounded-lg border border-line px-2 py-1 text-xs text-muted hover:text-ink"
        >
          Hoje
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {wd.map((d, i) => (
          <div
            key={i}
            className="pb-1 text-center text-[10px] font-bold uppercase text-muted"
          >
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const isToday = d === today;
          const isSelected = d === selectedDay;
          const evs = eventsByDay[d] ?? [];
          return (
            <button
              key={i}
              onClick={() => onSelectDay?.(d)}
              className={cn(
                "relative aspect-square rounded-lg border text-xs transition",
                isSelected
                  ? "border-accent bg-accent/15"
                  : "border-transparent hover:border-line hover:bg-surface2",
                isToday && !isSelected && "ring-1 ring-accent/50"
              )}
            >
              <span
                className={cn(
                  "text-[11px]",
                  isToday ? "font-bold text-accent" : "text-muted"
                )}
              >
                {Number(d.slice(8))}
              </span>
              {evs.length > 0 && (
                <div className="absolute inset-x-0 bottom-1 flex justify-center gap-0.5">
                  {evs.slice(0, 3).map((t, j) => (
                    <span
                      key={j}
                      className="h-1 w-1 rounded-full"
                      style={{
                        background: `var(--color-${TIPO_TONE[t] ?? "neutral"})`,
                      }}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
