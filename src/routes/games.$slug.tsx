import { createFileRoute, Link } from "@tanstack/react-router";
import { Construction, ArrowLeft, Trophy, Users, Coins } from "lucide-react";

export const Route = createFileRoute("/games/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.charAt(0).toUpperCase() + params.slug.slice(1)} — TaQtik` },
      { name: "description", content: `Play ${params.slug} for crypto on TaQtik.` },
    ],
  }),
  component: GamePage,
});

const META: Record<string, { name: string; rules: string; tagline: string }> = {
  chess: {
    name: "Chess",
    rules: "FIDE Laws of Chess",
    tagline: "Outsmart your opponent on the 64-square battlefield.",
  },
  checkers: {
    name: "Checkers",
    rules: "WCDF tournament rules",
    tagline: "Quick, sharp, decisive — capture every piece to win.",
  },
  backgammon: {
    name: "Backgammon",
    rules: "WBF rules with doubling cube",
    tagline: "Roll, race, and double the stakes.",
  },
};

function GamePage() {
  const { slug } = Route.useParams();
  const meta = META[slug] ?? {
    name: slug,
    rules: "Standard rules",
    tagline: "Coming soon.",
  };

  return (
    <div className="space-y-8">
      <Link
        to="/lobby"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-gold"
      >
        <ArrowLeft className="h-4 w-4" /> Back to lobby
      </Link>

      <div>
        <div className="text-xs uppercase tracking-widest text-gold">{meta.rules}</div>
        <h1 className="mt-1 text-4xl sm:text-5xl font-bold">{meta.name}</h1>
        <p className="text-muted-foreground mt-2">{meta.tagline}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 aspect-square sm:aspect-video rounded-2xl border border-border/60 bg-gradient-card shadow-elegant grid place-items-center">
          <div className="text-center px-6">
            <Construction className="h-12 w-12 mx-auto text-gold mb-4" />
            <h2 className="text-xl font-semibold">Game engine integration in progress</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              The on-chain match contract is wired up. The visual {meta.name} board is being added
              in the next build — your wallet, deposit, and matchmaking flows are already live.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-gold/30 bg-gradient-card p-5 shadow-gold">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Current pot
            </div>
            <div className="mt-2 text-3xl font-bold text-gradient-gold">10 MON</div>
            <div className="mt-1 text-xs text-muted-foreground">Winner takes 19.5 MON (2.5% rake)</div>
            <button className="mt-5 w-full px-4 py-3 rounded-lg bg-gradient-gold text-primary-foreground font-semibold shadow-gold">
              Match stake — 5 MON
            </button>
          </div>

          <div className="rounded-2xl border border-border/60 bg-gradient-card p-5 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Users className="h-4 w-4" /> Spectators
              </span>
              <span className="font-semibold">24</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Trophy className="h-4 w-4" /> Host record
              </span>
              <span className="font-semibold">12W · 4L</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Coins className="h-4 w-4" /> Network
              </span>
              <span className="font-semibold">Monad Testnet</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
