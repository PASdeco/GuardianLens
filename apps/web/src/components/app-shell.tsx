"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Clock3, LogIn, Moon, ScanLine, Sun, UserRound, WalletCards } from "lucide-react";
import type { ReactNode } from "react";
import { GuardianBrand } from "./brand";
import { useGuardianAuth } from "@/lib/auth";
import { useGuardianTheme } from "@/lib/theme";
import { AccessReminder } from "./access-reminder";

const navigation = [
  { href: "/", label: "Scan", icon: ScanLine },
  { href: "/history", label: "History", icon: Clock3 },
  { href: "/watchlist", label: "Watchlist", icon: Bookmark },
  { href: "/profile", label: "Profile", icon: UserRound }
];

function matches(pathname: string, href: string) {
  return href === "/" ? pathname === "/" || pathname.startsWith("/scan/") : pathname.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const auth = useGuardianAuth();
  const { theme, toggleTheme } = useGuardianTheme();

  if (pathname.startsWith("/report/")) return <>{children}</>;

  const shortWallet = auth.walletAddress ? `${auth.walletAddress.slice(0, 6)}...${auth.walletAddress.slice(-4)}` : "Preview mode";

  return (
    <div className="app-shell">
      <aside className="desktop-sidebar">
        <GuardianBrand />
        <nav aria-label="Primary navigation">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={matches(pathname, href) ? "active" : ""}>
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-trust">
          <span className="status-dot" />
          <div>
            <strong>Studionet</strong>
            <span>Validator consensus</span>
          </div>
        </div>
      </aside>

      <div className="app-column">
        <header className="topbar">
          <div className="mobile-brand"><GuardianBrand /></div>
          <div className="topbar-context">
            <span className="eyebrow">Check before you trust</span>
            <strong>{pathname === "/" ? "Product scanner" : navigation.find((item) => matches(pathname, item.href))?.label || "Assessment"}</strong>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" type="button" title={`Use ${theme === "light" ? "dark" : "light"} mode`} aria-label={`Use ${theme === "light" ? "dark" : "light"} mode`} onClick={toggleTheme}>{theme === "light" ? <Moon /> : <Sun />}</button>
            {auth.authenticated ? (
              <Link className="wallet-chip" href="/profile"><WalletCards /> {shortWallet}</Link>
            ) : (
              <button className="wallet-chip" type="button" onClick={() => auth.login()}><LogIn /> Sign in</button>
            )}
          </div>
        </header>
        <AccessReminder />
        <main className="app-main">{children}</main>
      </div>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navigation.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={matches(pathname, href) ? "active" : ""}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
