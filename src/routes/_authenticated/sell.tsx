import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Gavel, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { bidsQuery, cropsQuery, listingsQuery, profilesQuery } from "@/lib/data";
import { inr, timeLeft } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/sell")({
  head: () => ({
    meta: [
      { title: "Sell & auction your harvest · AgriBid" },
      {
        name: "description",
        content:
          "List your harvest as a timed auction or open offers, then review and accept buyer bids.",
      },
      { property: "og:title", content: "Sell & auction your harvest" },
      {
        property: "og:description",
        content: "List your harvest and accept the best buyer bid.",
      },
    ],
  }),
  component: Sell,
});

function Sell() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const { data: crops = [] } = useQuery(cropsQuery);
  const { data: listings = [] } = useQuery(listingsQuery);
  const { data: bids = [] } = useQuery(bidsQuery);
  const { data: profiles = [] } = useQuery(profilesQuery);

  const [cropId, setCropId] = useState("");
  const [title, setTitle] = useState("");
  const [quantity, setQuantity] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [mode, setMode] = useState<"auction" | "offers">("auction");
  const [days, setDays] = useState("5");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  const crop = crops.find((c) => c.id === cropId);
  const mine = listings.filter((l) => l.farmer_id === user.id);

  const create = useMutation({
    mutationFn: async () => {
      if (!crop) throw new Error("Pick a crop first");
      const { error } = await supabase.from("listings").insert({
        farmer_id: user.id,
        crop_id: crop.id,
        title: title || `${crop.name} harvest`,
        description,
        quantity: Number(quantity),
        unit: crop.unit,
        base_price: Number(basePrice),
        mode,
        location,
        ends_at:
          mode === "auction"
            ? new Date(Date.now() + Number(days) * 86_400_000).toISOString()
            : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Listing saved — buyers can bid now.");
      setTitle("");
      setQuantity("");
      setBasePrice("");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["listings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const acceptBid = useMutation({
    mutationFn: async ({ bidId, listingId }: { bidId: string; listingId: string }) => {
      const { error } = await supabase.from("bids").update({ accepted: true }).eq("id", bidId);
      if (error) throw error;
      const { error: e2 } = await supabase
        .from("listings")
        .update({ status: "sold" })
        .eq("id", listingId);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Bid accepted. Deal closed!");
      qc.invalidateQueries({ queryKey: ["bids"] });
      qc.invalidateQueries({ queryKey: ["listings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeListing = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("listings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Listing removed");
      qc.invalidateQueries({ queryKey: ["listings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sell & auction"
        subtitle="Put your harvest in front of buyers. Everything you save here stays in your account."
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <section className="panel p-5">
          <h2 className="font-display text-lg font-semibold">New harvest listing</h2>
          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>Crop</Label>
              <div className="flex flex-wrap gap-1.5">
                {crops.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setCropId(c.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      cropId === c.id
                        ? "border-primary bg-primary-soft text-accent-foreground"
                        : "border-border bg-card text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {c.emoji} {c.name}
                  </button>
                ))}
              </div>
              {crop ? (
                <p className="text-xs text-muted-foreground">
                  Market rate today: {inr(Number(crop.current_price))} per {crop.unit}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Listing title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Grade A wheat, freshly threshed"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="qty">Quantity ({crop?.unit ?? "quintal"})</Label>
                <Input
                  id="qty"
                  type="number"
                  min="0.1"
                  step="0.1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="base">Base price (₹)</Label>
                <Input
                  id="base"
                  type="number"
                  min="1"
                  required
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Sale mode</Label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { key: "auction", label: "Timed auction", hint: "Highest bid at close" },
                    { key: "offers", label: "Open offers", hint: "You accept manually" },
                  ] as const
                ).map((m) => (
                  <button
                    type="button"
                    key={m.key}
                    onClick={() => setMode(m.key)}
                    className={cn(
                      "rounded-2xl border p-3 text-left transition-colors",
                      mode === m.key
                        ? "border-primary bg-primary-soft"
                        : "border-border bg-card hover:bg-muted",
                    )}
                  >
                    <span className="block text-sm font-semibold">{m.label}</span>
                    <span className="text-xs text-muted-foreground">{m.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            {mode === "auction" ? (
              <div className="space-y-2">
                <Label htmlFor="days">Auction runs for (days)</Label>
                <Input
                  id="days"
                  type="number"
                  min="1"
                  max="30"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="loc">Pickup location</Label>
              <Input
                id="loc"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Nashik APMC yard"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">Notes for buyers</Label>
              <Textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Moisture 11%, cleaned and bagged, transport available."
              />
            </div>

            <Button type="submit" className="w-full" disabled={create.isPending || !cropId}>
              {create.isPending ? <Loader2 className="size-4 animate-spin" /> : <Gavel className="size-4" />}
              Publish listing
            </Button>
          </form>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-lg font-semibold">Your listings</h2>
          {mine.length === 0 ? (
            <div className="panel p-8 text-center text-sm text-muted-foreground">
              Nothing listed yet. Your published harvests and their bids appear here.
            </div>
          ) : null}
          {mine.map((l) => {
            const c = crops.find((x) => x.id === l.crop_id);
            const listingBids = bids
              .filter((b) => b.listing_id === l.id)
              .sort((a, b) => Number(b.amount) - Number(a.amount));
            return (
              <article key={l.id} className="panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-base font-semibold">
                      {c?.emoji} {l.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {Number(l.quantity)} {l.unit} · base {inr(Number(l.base_price))} ·{" "}
                      {l.mode === "auction" ? timeLeft(l.ends_at) : "Open offers"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        l.status === "sold"
                          ? "bg-primary-soft text-accent-foreground"
                          : "bg-secondary text-muted-foreground",
                      )}
                    >
                      {l.status}
                    </span>
                    <button
                      onClick={() => removeListing.mutate(l.id)}
                      className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-muted"
                      aria-label="Delete listing"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {listingBids.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No bids yet.</p>
                  ) : null}
                  {listingBids.map((b) => {
                    const bidder = profiles.find((p) => p.id === b.bidder_id);
                    return (
                      <div
                        key={b.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-surface p-3"
                      >
                        <div>
                          <p className="text-sm font-semibold">{inr(Number(b.amount))}</p>
                          <p className="text-xs text-muted-foreground">
                            {bidder?.full_name || "Buyer"}
                            {b.note ? ` · ${b.note}` : ""}
                          </p>
                        </div>
                        {b.accepted ? (
                          <span className="flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-accent-foreground">
                            <Check className="size-3.5" /> Accepted
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              acceptBid.mutate({ bidId: b.id, listingId: l.id })
                            }
                          >
                            Accept bid
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}
