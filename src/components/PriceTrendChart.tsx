import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Crop, PricePoint } from "@/lib/data";
import { inr } from "@/lib/format";

const PALETTE = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

export function PriceTrendChart({
  crops,
  points,
  selected,
}: {
  crops: Crop[];
  points: PricePoint[];
  selected: string[];
}) {
  const byDate = new Map<string, Record<string, number | string>>();
  for (const p of points) {
    if (!selected.includes(p.crop_id)) continue;
    const row = byDate.get(p.recorded_on) ?? { date: p.recorded_on };
    row[p.crop_id] = Number(p.price);
    byDate.set(p.recorded_on, row);
  }
  const data = [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
        <defs>
          {selected.map((id, i) => (
            <linearGradient key={id} id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.35} />
              <stop offset="100%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          minTickGap={40}
          tickFormatter={(v: string) =>
            new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
          }
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={64}
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          tickFormatter={(v: number) => `₹${Math.round(v / 100) / 10}k`}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 14,
            border: "1px solid var(--color-border)",
            background: "var(--color-card)",
            boxShadow: "var(--shadow-lift)",
            fontSize: 12,
          }}
          labelFormatter={(v: string) => new Date(v).toDateString()}
          formatter={(value: number, name: string) => [
            inr(Number(value)),
            crops.find((c) => c.id === name)?.name ?? name,
          ]}
        />
        {selected.map((id, i) => (
          <Area
            key={id}
            type="monotone"
            dataKey={id}
            stroke={PALETTE[i % PALETTE.length]}
            strokeWidth={2.5}
            fill={`url(#g-${id})`}
            dot={false}
            isAnimationActive
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
