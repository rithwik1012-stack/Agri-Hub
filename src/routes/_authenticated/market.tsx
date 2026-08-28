import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PriceTrendChart } from "@/components/PriceTrendChart";
import { cropsQuery, priceHistoryQuery } from "@/lib/data";
import { changePct, inr, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/market")({
  head: () => ({
    meta: [
      { title: "Crop market prices & trends · AgriBid" },
      {
        name: "description",
        content:
          "Compare live crop prices and track market fluctuations over 7, 30, 90 or 120 days before you sell.",
      },
      { property: "og:title", content: "Crop market prices & trends" },
      {
        property: "og:description",
        content: "Compare live crop prices and market fluctuations across seasons.",
      },
    ],
  }),
  component: Market,
});

const RANGES = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "120d", days: 120 },
];

function Market() {
  const [days, setDays] = useState(30);
  const { data: crops = [] } = useQuery(cropsQuery);
  const { data: points = [] } = useQuery(priceHistoryQuery(days));
  const [selected, setSelected] = useState<string[]>([]);
  const active = selected.length ? selected : crops.slice(0, 4).map((c) => c.id);

  function toggle(id: string) {
    setSelected(() => {
      const base = selected.length ? selected : active;
      const next = base.includes(id) ? base.filter((x) => x !== id) : [...base, id];
      return next.length ? next : [id];
    });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Market prices"
        subtitle="Track how each crop is moving so you can pick the right week to sell."
        action={
          <div className="flex rounded-xl border border-border bg-card p-1">
            {RANGES.map((r) => (
              <button
                key={r.label}
                onClick={() => setDays(r.days)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  days === r.days
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      <section className="panel p-5">
        <div className="flex flex-wrap gap-1.5">
          {crops.map((c) => (
            <button
              key={c.id}
              onClick={() => toggle(c.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active.includes(c.id)
                  ? "border-primary bg-primary-soft text-accent-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
        <div className="mt-5">
          <PriceTrendChart crops={crops} points={points} selected={active} />
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-2 border-b border-border px-5 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <span>Crop</span>
          <span className="text-right">Today</span>
          <span className="text-right">Last week</span>
          <span className="text-right">Change</span>
        </div>
        {crops.map((c) => {
          const delta = changePct(Number(c.current_price), Number(c.previous_price));
          const up = delta >= 0;
          return (
            <div
              key={c.id}
              className="grid grid-cols-[1.5fr_1fr_1fr_1fr] items-center gap-2 border-b border-border px-5 py-4 text-sm last:border-0 hover:bg-muted/60"
            >
              <span className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-secondary text-base">
                  {c.emoji}
                </span>
                <span>
                  <span className="block font-medium">{c.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {c.category} · per {c.unit}
                  </span>
                </span>
              </span>
              <span className="text-right font-semibold">{inr(Number(c.current_price))}</span>
              <span className="text-right text-muted-foreground">
                {inr(Number(c.previous_price))}
              </span>
              <span
                className={cn(
                  "flex items-center justify-end gap-1 font-medium",
                  up ? "text-success" : "text-destructive",
                )}
              >
                {up ? (
                  <ArrowUpRight className="size-4" />
                ) : (
                  <ArrowDownRight className="size-4" />
                )}
                {pct(delta)}
              </span>
            </div>
          );
        })}
      </section>
    </div>
  );
}
