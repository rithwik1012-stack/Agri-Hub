import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Gavel, Sparkles, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PriceTrendChart } from "@/components/PriceTrendChart";
import { bidsQuery, cropsQuery, listingsQuery, priceHistoryQuery } from "@/lib/data";
import { changePct, inr, pct, timeLeft } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · AgriBid harvest marketplace" },
      {
        name: "description",
        content:
          "Live crop prices, 30-day market trends and your active harvest auctions in one dashboard.",
      },
      { property: "og:title", content: "AgriBid dashboard" },
      {
        property: "og:description",
        content: "Live crop prices, market trends and active harvest auctions.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const { data: crops = [] } = useQuery(cropsQuery);
  const { data: points = [] } = useQuery(priceHistoryQuery(30));
  const { data: listings = [] } = useQuery(listingsQuery);
  const { data: bids = [] } = useQuery(bidsQuery);

  const [selected, setSelected] = useState<string[]>([]);
  const chartCrops = selected.length ? selected : crops.slice(0, 3).map((c) => c.id);

  const myListings = listings.filter((l) => l.farmer_id === user.id);
  const myBidCount = bids.filter((b) => myListings.some((l) => l.id === b.listing_id)).length;
  const topBid = useMemo(() => {
    const mine = bids.filter((b) => myListings.some((l) => l.id === b.listing_id));
    return mine.length ? Math.max(...mine.map((b) => Number(b.amount))) : 0;
  }, [bids, myListings]);

  const gainers = [...crops].sort(
    (a, b) =>
      changePct(Number(b.current_price), Number(b.previous_price)) -
      changePct(Number(a.current_price), Number(a.previous_price)),
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Good day, farmer 🌱"
        subtitle="Today's mandi rates, market momentum and your auction activity."
        action={
          <Link
            to="/sell"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5"
          >
            <Gavel className="size-4" /> List harvest
          </Link>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Top rate today</p>
              <p className="font-display text-4xl font-semibold">
                {gainers[0] ? inr(Number(gainers[0].current_price)) : "—"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {gainers[0] ? `${gainers[0].emoji} ${gainers[0].name} per ${gainers[0].unit}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {crops.map((c) => {
                const on = chartCrops.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() =>
                      setSelected((prev) => {
                        const base = prev.length ? prev : chartCrops;
                        return base.includes(c.id)
                          ? base.filter((id) => id !== c.id) || []
                          : [...base, c.id];
                      })
                    }
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      on
                        ? "border-primary bg-primary-soft text-accent-foreground"
                        : "border-border bg-card text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {c.emoji} {c.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-4">
            <PriceTrendChart crops={crops} points={points} selected={chartCrops} />
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <StatCard
            label="Your live listings"
            value={String(myListings.filter((l) => l.status === "open").length)}
            hint={`${myListings.length} total created`}
            icon={<Gavel className="size-4" />}
          />
          <StatCard
            label="Bids received"
            value={String(myBidCount)}
            hint={topBid ? `Highest ${inr(topBid)}` : "No bids yet"}
            icon={<TrendingUp className="size-4" />}
          />
          <div className="panel flex flex-col justify-between gap-4 p-5">
            <div>
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Sparkles className="size-4.5" />
              </span>
              <h3 className="mt-3 font-display text-lg font-semibold">Ask the AI assistant</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                "Is this a good week to sell my soybean?" — get an instant answer with today's price
                context.
              </p>
            </div>
            <Link
              to="/assistant"
              className="rounded-xl bg-foreground px-4 py-2.5 text-center text-sm font-semibold text-background transition-opacity hover:opacity-90"
            >
              Open assistant
            </Link>
          </div>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Today's crop rates</h2>
            <Link to="/market" className="text-sm font-medium text-primary hover:underline">
              View market →
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {gainers.slice(0, 6).map((c) => {
              const delta = changePct(Number(c.current_price), Number(c.previous_price));
              const up = delta >= 0;
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 transition-shadow hover:shadow-soft"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-lg">
                      {c.emoji}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground">per {c.unit}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-base font-semibold">
                      {inr(Number(c.current_price))}
                    </p>
                    <p
                      className={cn(
                        "flex items-center justify-end gap-0.5 text-xs font-medium",
                        up ? "text-success" : "text-destructive",
                      )}
                    >
                      {up ? (
                        <ArrowUpRight className="size-3.5" />
                      ) : (
                        <ArrowDownRight className="size-3.5" />
                      )}
                      {pct(delta)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="font-display text-lg font-semibold">Latest listings</h2>
          <div className="mt-4 space-y-3">
            {listings.slice(0, 5).map((l) => {
              const crop = crops.find((c) => c.id === l.crop_id);
              const best = bids
                .filter((b) => b.listing_id === l.id)
                .reduce((m, b) => Math.max(m, Number(b.amount)), 0);
              return (
                <Link
                  key={l.id}
                  to="/buy"
                  className="flex items-center justify-between rounded-2xl border border-border bg-surface p-3 text-sm transition-colors hover:bg-muted"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {crop?.emoji} {l.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {l.mode === "auction" ? timeLeft(l.ends_at) : "Open offers"}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-semibold">
                      {inr(best || Number(l.base_price))}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {best ? "top bid" : "base"}
                    </span>
                  </span>
                </Link>
              );
            })}
            {listings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No listings yet. Be the first to auction a harvest.
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
          {icon}
        </span>
      </div>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
