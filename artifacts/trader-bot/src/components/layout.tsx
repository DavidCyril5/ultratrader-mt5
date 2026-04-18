import { useLocation, Link } from "wouter";
import { LayoutDashboard, Settings, ListOrdered, Activity, LogOut } from "lucide-react";
import { useGetAccountInfo, getGetAccountInfoQueryKey, useGetBotStatus, getGetBotStatusQueryKey } from "@workspace/api-client-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: accountInfo } = useGetAccountInfo({
    query: { queryKey: getGetAccountInfoQueryKey() }
  });
  const { data: botStatus } = useGetBotStatus({
    query: { queryKey: getGetBotStatusQueryKey(), refetchInterval: 5000 }
  });

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/trades",    icon: ListOrdered,    label: "Trades"    },
    { href: "/settings",  icon: Settings,       label: "Settings"  },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground selection:bg-primary/30">

      {/* Desktop sidebar */}
      <aside className="w-64 border-r border-border bg-card flex-col hidden md:flex shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-border shrink-0">
          <Activity className="h-6 w-6 text-primary mr-3" />
          <span className="font-bold tracking-tight text-lg">UltraTrader</span>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium
                ${location === href ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
              <Icon className="h-4 w-4" />
              {label === "Trades" ? "Trade History" : label === "Settings" ? "Strategy Settings" : label}
            </Link>
          ))}
        </div>

        <div className="p-4 border-t border-border shrink-0">
          <div className="bg-secondary rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-mono uppercase">Status</span>
              <div className="flex items-center gap-1.5">
                <div className={`h-2 w-2 rounded-full ${botStatus?.running ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-muted-foreground"}`} />
                <span className="font-mono">{botStatus?.running ? "ACTIVE" : "STANDBY"}</span>
              </div>
            </div>
            {accountInfo?.connected && (
              <div className="pt-2 border-t border-border/50">
                <div className="text-xs font-mono text-muted-foreground mb-1">BROKER</div>
                <div className="text-sm font-medium truncate" title={accountInfo.broker}>{accountInfo.broker || "Unknown"}</div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">{accountInfo.accountId}</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 bg-background h-screen overflow-hidden">

        {/* Top header */}
        <header className="h-14 md:h-16 border-b border-border flex items-center justify-between px-4 sm:px-6 shrink-0 bg-card/50 backdrop-blur-sm z-10 sticky top-0">
          {/* Mobile: logo + equity */}
          <div className="flex items-center gap-3 md:hidden">
            <Activity className="h-5 w-5 text-primary" />
            <span className="font-bold tracking-tight">UltraTrader</span>
          </div>

          {/* Desktop: equity bar */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Equity</span>
              <span className="text-sm font-bold">
                ${accountInfo?.equity?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
              </span>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="flex flex-col">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Free Margin</span>
              <span className="text-sm font-bold text-green-400">
                ${accountInfo?.freeMargin?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Mobile: quick equity */}
            <div className="flex md:hidden items-center gap-2 text-xs font-mono">
              <span className="text-muted-foreground">EQ</span>
              <span className="font-bold text-foreground">
                ${accountInfo?.equity?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
              </span>
              <div className={`h-1.5 w-1.5 rounded-full ${botStatus?.running ? "bg-green-500" : "bg-muted-foreground"}`} />
            </div>

            <Link href="/" className="text-muted-foreground hover:text-destructive transition-colors" title="Disconnect">
              <LogOut className="h-4 w-4" />
            </Link>
          </div>
        </header>

        {/* Page content — extra bottom padding on mobile to clear the nav bar */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-card/95 backdrop-blur-md border-t border-border z-50 flex items-stretch">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[10px] font-semibold tracking-wide uppercase transition-colors
              ${location === href ? "text-primary" : "text-muted-foreground"}`}>
            <Icon className={`h-5 w-5 transition-colors ${location === href ? "text-primary" : "text-muted-foreground"}`} />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
