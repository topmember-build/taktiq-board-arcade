import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { Providers } from "@/components/providers";
import { AppLayout } from "@/components/AppLayout";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "TaQtik - Crypto Board Game Arcade" },
      {
        name: "description",
        content:
          "TaQtik is a Web3 arcade for board games. Connect your wallet, deposit MON or testnet tokens, and bet on Chess, Checkers, and Backgammon on Monad and EVM testnets.",
      },
      { name: "author", content: "TaQtik" },
      { name: "theme-color", content: "#0d0d12" },
      { property: "og:title", content: "TaQtik - Crypto Board Game Arcade" },
      {
        property: "og:description",
        content:
          "Wallet-first dApp to play Chess, Checkers, and Backgammon for crypto on Monad testnet.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "TaQtik - Crypto Board Game Arcade" },
      { name: "description", content: "The crypto arcade for serious board gamers." },
      { property: "og:description", content: "The crypto arcade for serious board gamers." },
      { name: "twitter:description", content: "The crypto arcade for serious board gamers." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/0db83abd-cb76-4c51-a68e-f0e2e2dbfe7c" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/0db83abd-cb76-4c51-a68e-f0e2e2dbfe7c" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: () => (
    <Providers>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </Providers>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center px-4 text-center">
      <div>
        <h1 className="text-7xl font-bold text-gradient-gold">404</h1>
        <p className="mt-3 text-muted-foreground">This page slipped off the board.</p>
        <a
          href="/"
          className="mt-6 inline-flex items-center px-4 py-2 rounded-md bg-gradient-gold text-primary-foreground font-medium"
        >
          Back to arcade
        </a>
      </div>
    </div>
  ),
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
