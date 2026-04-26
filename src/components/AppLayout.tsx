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
    <div className="min-h-screen bg-gradient-hero">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border/60 backdrop-blur-xl bg-background/70">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src={logo}
              alt="TaQtik logo"
              className="h-9 w-9 rounded-md object-cover ring-1 ring-gold/40 group-hover:ring-gold transition-smooth"
            />
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
                    "px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-smooth",
                    active
                      ? "bg-secondary text-gold"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
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
          <div className="lg:hidden border-t border-border/60 bg-background/95 backdrop-blur-xl">
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

      <footer className="border-t border-border/60 mt-12 py-8 text-center text-xs text-muted-foreground">
        <p suppressHydrationWarning>
          © {new Date().getFullYear()} TaQtik · Testnet only · Play responsibly · Compliant with
          regulated board game rule sets (FIDE, WCDF, WBF, Hasbro, Mattel).
        </p>
      </footer>

      <Toaster richColors position="top-center" />
    </div>
  );
}
