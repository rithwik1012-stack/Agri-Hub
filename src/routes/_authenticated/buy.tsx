import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Clock, MapPin, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { bidsQuery, cropsQuery, listingsQuery, profilesQuery } from "@/lib/data";
import { inr, timeLeft } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/buy")({
  head: () => ({
    meta: [
      { title: "Buy harvest & place bids · AgriBid" },
      {
        name: "description",
        content:
          "Browse harvest listed by farmers, compare base prices with market rates and place your bid.",
      },
      { property: "og:title", content: "Buy harvest & place bids" },
      {
        property: "og:description",
        content: "Browse farmer listings and bid on the harvest you need.",
      },
    ],
  }),
  component: Buy,
});

function Buy() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const { data: crops = [] } = useQuery(cropsQuery);
  const { data: listings = [] } = useQuery(listingsQuery);
  const { data: bids = [] } = useQuery(bidsQuery);
  const { data: profiles = [] } = useQuery(profilesQuery);
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const placeBid = useMutation({
    mutationFn: async ({ listingId, amount }: { listingId: string; amount: number }) => {
      const { error } = await supabase
        .from("bids")
        .insert({ listing_id: listingId, bidder_id: user.id, amount });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bid placed");
      qc.invalidateQueries({ queryKey: ["bids"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const open = listings.filter((l) => l.status === "open");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Buy harvest"
        subtitle="Live listings from farmers. Place a bid or make an offer."
      />

      {open.length === 0 ? (
        <div className="panel p-10 text-center text-sm text-muted-foreground">
          No open listings right now.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {open.map((l) => {
          const crop = crops.find((c) => c.id === l.crop_id);
          const farmer = profiles.find((p) => p.id === l.farmer_id);
          const listingBids = bids.filter((b) => b.listing_id === l.id);
          const best = listingBids.reduce((m, b) => Math.max(m, Number(b.amount)), 0);
          const closed = l.mode === "auction" && l.ends_at && new Date(l.ends_at) < new Date();
          const mineOwn = l.farmer_id === user.id;
          return (
            <article key={l.id} className="panel flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-secondary text-xl">
                  {crop?.emoji}
                </span>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    l.mode === "auction"
                      ? "bg-primary-soft text-accent-foreground"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {l.mode === "auction" ? "Auction" : "Open offers"}
                </span>
              </div>

              <h3 className="mt-3 font-display text-base font-semibold">{l.title}</h3>
              <p className="text-xs text-muted-foreground">
                {farmer?.full_name || "Farmer"} · {Number(l.quantity)} {l.unit}
              </p>
              {l.description ? (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{l.description}</p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {l.location ? (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" /> {l.location}
                  </span>
                ) : null}
                <span className="flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {l.mode === "auction" ? timeLeft(l.ends_at) : "No deadline"}
                </span>
              </div>

              <div className="mt-4 flex items-end justify-between rounded-2xl bg-surface p-3">
                <div>
                  <p className="text-xs text-muted-foreground">Base price</p>
                  <p className="font-display text-lg font-semibold">{inr(Number(l.base_price))}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    Top bid · {listingBids.length} bids
                  </p>
                  <p className="font-display text-lg font-semibold text-primary">
                    {best ? inr(best) : "—"}
                  </p>
                </div>
              </div>

              {mineOwn ? (
                <p className="mt-4 text-xs text-muted-foreground">This is your own listing.</p>
              ) : (
                <form
                  className="mt-4 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const value = Number(amounts[l.id]);
                    if (!value || value <= 0) return toast.error("Enter a bid amount");
                    if (l.mode === "auction" && value <= Math.max(best, Number(l.base_price)))
                      return toast.error("Bid must beat the current top bid");
                    placeBid.mutate({ listingId: l.id, amount: value });
                    setAmounts((a) => ({ ...a, [l.id]: "" }));
                  }}
                >
                  <Input
                    type="number"
                    placeholder={`₹ ${Math.round(Math.max(best, Number(l.base_price)) + 50)}`}
                    value={amounts[l.id] ?? ""}
                    onChange={(e) => setAmounts((a) => ({ ...a, [l.id]: e.target.value }))}
                    disabled={Boolean(closed)}
                  />
                  <Button type="submit" disabled={Boolean(closed) || placeBid.isPending}>
                    {placeBid.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                    {closed ? "Closed" : "Bid"}
                  </Button>
                </form>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
