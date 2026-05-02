import { Link, useLocation } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  Home,
  Swords,
  Wallet,
  Users,
  ShieldCheck,
  UserCircle,
  Menu,
  X,
} from "lucide-react";
import logo from "@/assets/taqtik-logo.jpg";
import { AmbientPlayer } from "./AmbientPlayer";
import { NetworkBadge } from "./NetworkBadge";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/lobby", label: "Lobby", icon: Swords },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/referrals", label: "Referrals", icon: Users },
  { to: "/anti-cheat", label: "Fair Play", icon: ShieldCheck },
  { to: "/profile", label: "Profile", icon: UserCircle },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-40 glass-strong border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative h-9 w-9 rounded-xl holo-border animate-pulse-glow">
              <img
                src={logo}
                alt="TaQtik logo"
                className="h-9 w-9 rounded-xl object-cover transition-smooth"
              />
            </div>
            <div className="leading-none">
              <div className="text-lg font-bold tracking-wider text-gradient-gold">TaQtik</div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Play · Bet · Win
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "relative px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-smooth",
                    active
                      ? "text-gold glass ring-1 ring-gold/30 shadow-gold"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <NetworkBadge />
            <AmbientPlayer />
            <div className="hidden sm:block">
              <ConnectButton
                accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
                chainStatus={{ smallScreen: "icon", largeScreen: "icon" }}
                showBalance={{ smallScreen: false, largeScreen: false }}
              />
            </div>
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="lg:hidden p-2 rounded-md hover:bg-secondary text-foreground"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-white/10 glass-strong">
            <nav className="px-4 py-3 grid grid-cols-2 gap-1">
              {NAV.map(({ to, label, icon: Icon }) => {
                const active = location.pathname === to;
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "px-3 py-2.5 rounded-md text-sm font-medium flex items-center gap-2",
                      active
                        ? "bg-secondary text-gold"
                        : "text-muted-foreground hover:bg-secondary/60",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
              <div className="col-span-2 mt-2 sm:hidden">
                <ConnectButton />
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-10">{children}</main>

      <footer className="border-t border-white/10 mt-12 py-8 text-center text-xs text-muted-foreground glass-strong">
        <p suppressHydrationWarning>
          © {new Date().getFullYear()} TaQtik · Testnet only · Play responsibly · Compliant with
          regulated board game rule sets (FIDE, WCDF, WBF, Hasbro, Mattel).
        </p>
      </footer>

      <Toaster richColors position="top-center" />
    </div>
  );
}
