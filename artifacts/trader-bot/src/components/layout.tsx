import { useLocation, Link } from "wouter";
import { LayoutDashboard, Settings, ListOrdered, Activity, LogOut } from "lucide-react";
import { useGetAccountInfo, getGetAccountInfoQueryKey, useGetBotStatus, getGetBotStatusQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: accountInfo } = useGetAccountInfo({
    query: {
      queryKey: getGetAccountInfoQueryKey()
    }
  });

  const { data: botStatus } = useGetBotStatus({
    query: {
      queryKey: getGetBotStatusQueryKey(),
      refetchInterval: 5000
    }
  });

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground selection:bg-primary/30">
      <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-border shrink-0">
          <Activity className="h-6 w-6 text-primary mr-3" />
          <span className="font-bold tracking-tight text-lg">UltraTrader</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <Link href="/dashboard" className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium ${location === '/dashboard' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          <Link href="/trades" className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium ${location === '/trades' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
            <ListOrdered className="h-4 w-4" />
            Trade History
          </Link>
          <Link href="/settings" className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium ${location === '/settings' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
            <Settings className="h-4 w-4" />
            Strategy Settings
          </Link>
        </div>

        <div className="p-4 border-t border-border shrink-0">
          <div className="bg-secondary rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-mono uppercase">Status</span>
              <div className="flex items-center gap-1.5">
                <div className={`h-2 w-2 rounded-full ${botStatus?.running ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-muted-foreground'}`} />
                <span className="font-mono">{botStatus?.running ? 'ACTIVE' : 'STANDBY'}</span>
              </div>
            </div>
            {accountInfo?.connected && (
              <div className="pt-2 border-t border-border/50">
                <div className="text-xs font-mono text-muted-foreground mb-1">BROKER</div>
                <div className="text-sm font-medium truncate" title={accountInfo.broker}>{accountInfo.broker || 'Unknown'}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{accountInfo.accountId}</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-background h-screen overflow-hidden">
        <header className="h-16 border-b border-border flex items-center justify-between px-4 sm:px-6 shrink-0 bg-card/50 backdrop-blur-sm z-10 sticky top-0">
          <div className="flex items-center gap-3 md:hidden">
            <Activity className="h-5 w-5 text-primary" />
            <span className="font-bold tracking-tight">UltraTrader</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Equity</span>
              <span className="text-sm font-bold">${accountInfo?.equity?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</span>
            </div>
            <div className="w-px h-8 bg-border"></div>
            <div className="flex flex-col">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Free Margin</span>
              <span className="text-sm font-bold text-green-400">${accountInfo?.freeMargin?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-muted-foreground hover:text-destructive transition-colors" title="Disconnect">
              <LogOut className="h-4 w-4" />
            </Link>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
