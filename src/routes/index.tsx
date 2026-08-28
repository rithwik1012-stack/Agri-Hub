import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, LineChart, Gavel, Sparkles, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AgriBid — Live crop prices & harvest auctions for farmers" },
      {
        name: "description",
        content:
          "Track live mandi prices, watch market trends and auction your harvest to verified buyers. With an AI assistant that answers your farming questions.",
      },
      { property: "og:title", content: "AgriBid — Sell your harvest for what it's worth" },
      {
        property: "og:description",
        content: "Live crop prices, market trend graphs, harvest auctions and an AI assistant.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: LineChart,
    title: "Live crop prices",
    body: "Today's rate for every crop you grow, with the day's change at a glance.",
  },
  {
    icon: Sparkles,
    title: "Market trend graphs",
    body: "See how prices moved over the last 7 to 120 days before you decide to sell.",
  },
  {
    icon: Gavel,
    title: "Auction your harvest",
    body: "Run a timed auction or take open offers, then accept the bid you like.",
  },
  {
    icon: ShieldCheck,
    title: "AI assistant, saved",
    body: "Ask Kisan about pricing and storage. Every conversation stays in your account.",
  },
];

function Landing() {
  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-xl font-bold">
          Agri<span className="text-primary">Bid</span>
        </span>
        <Link
          to="/auth"
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft"
        >
          Sign in
        </Link>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-10 pb-16 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-4 py-1.5 text-xs font-semibold text-accent-foreground">
          Built for farmers, priced by the market
        </span>
        <h1 className="mt-6 font-display text-4xl leading-tight font-bold sm:text-6xl">
          Sell your harvest for
          <br />
          what it's truly worth
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground">
          Live crop rates, honest market trends and an auction floor where buyers compete for your
          produce — all in one calm dashboard.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5"
          >
            Get started free <ArrowRight className="size-4" />
          </Link>
          <Link
            to="/auth"
            className="rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold"
          >
            I'm a buyer
          </Link>
        </div>

        <div className="mt-14 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="panel p-5">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-secondary text-primary">
                <f.icon className="size-5" />
              </span>
              <h2 className="mt-4 font-display text-base font-semibold">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        AgriBid · fair prices, direct buyers
      </footer>
    </main>
  );
}
