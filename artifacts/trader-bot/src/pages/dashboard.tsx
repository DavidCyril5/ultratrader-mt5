import { useState, useMemo } from "react";
import {
  useGetAccountInfo,
  getGetAccountInfoQueryKey,
  useGetBotStatus,
  getGetBotStatusQueryKey,
  useStartBot,
  useStopBot,
  useGetTradeStats,
  getGetTradeStatsQueryKey,
  useGetTrades,
  getGetTradesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Activity, ArrowDownRight, ArrowUpRight,
  Power, Hash, DollarSign, Percent, Clock, LineChart as LineIcon,
  RefreshCw, Wifi, WifiOff, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

const GREEN = "#22c55e";
const RED   = "#ef4444";
const BLUE  = "hsl(var(--primary))";

function CustomTooltip({ active, payload, label, currency = false }: {
  active?: boolean; payload?: any[]; label?: string; currency?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl text-xs font-mono">
      {label && <p className="text-muted-foreground mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill || BLUE }}>
          {p.name}: {currency
            ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(p.value)
            : p.value}
        </p>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [isToggling, setIsToggling] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const syncTrades = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/trades/sync?days=90", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Sync failed");
      toast.success(`Synced ${data.synced} trades from your broker`);
      queryClient.invalidateQueries({ queryKey: getGetTradesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetTradeStatsQueryKey() });
    } catch (err: any) {
      toast.error(err.message ?? "Trade sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const { data: accountInfo } = useGetAccountInfo({
    query: { queryKey: getGetAccountInfoQueryKey(), refetchInterval: 5000 }
  });
  const { data: botStatus } = useGetBotStatus({
    query: { queryKey: getGetBotStatusQueryKey(), refetchInterval: 2000 }
  });
  const { data: tradeStats } = useGetTradeStats({
    query: { queryKey: getGetTradeStatsQueryKey(), refetchInterval: 10000 }
  });
  const { data: allTrades } = useGetTrades(undefined, {
    query: { queryKey: getGetTradesQueryKey(), refetchInterval: 10000 }
  });

  const startMutation = useStartBot({
    mutation: {
      onSuccess: () => { toast.success("Trading bot activated"); queryClient.invalidateQueries({ queryKey: getGetBotStatusQueryKey() }); setIsToggling(false); },
      onError: (err) => { toast.error("Failed to start bot: " + err.message); setIsToggling(false); }
    }
  });
  const stopMutation = useStopBot({
    mutation: {
      onSuccess: () => { toast.warning("Trading bot deactivated"); queryClient.invalidateQueries({ queryKey: getGetBotStatusQueryKey() }); setIsToggling(false); },
      onError: (err) => { toast.error("Failed to stop bot: " + err.message); setIsToggling(false); }
    }
  });

  const handleToggleBot = () => {
    setIsToggling(true);
    botStatus?.running ? stopMutation.mutate() : startMutation.mutate();
  };

  const formatCurrency = (val?: number | null) => {
    if (val == null) return "$0.00";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);
  };

  const closedTrades = useMemo(() =>
    (allTrades ?? []).filter(t => t.status === "closed" && t.profit != null)
      .sort((a, b) => new Date(a.openTime ?? 0).getTime() - new Date(b.openTime ?? 0).getTime()),
    [allTrades]
  );

  const equityCurveData = useMemo(() => {
    let running = 0;
    return closedTrades.map((t, i) => {
      running += t.profit ?? 0;
      return {
        i: i + 1,
        label: format(new Date(t.openTime ?? Date.now()), "MM/dd HH:mm"),
        equity: parseFloat(running.toFixed(2))
      };
    });
  }, [closedTrades]);

  const plBarData = useMemo(() =>
    closedTrades.slice(-30).map((t, i) => ({
      i: i + 1,
      label: t.symbol,
      profit: parseFloat((t.profit ?? 0).toFixed(2)),
      color: (t.profit ?? 0) >= 0 ? GREEN : RED
    })),
    [closedTrades]
  );

  const symbolData = useMemo(() => {
    const map: Record<string, number> = {};
    (allTrades ?? []).forEach(t => {
      if (t.symbol) map[t.symbol] = (map[t.symbol] ?? 0) + 1;
    });
    return Object.entries(map)
      .map(([symbol, count]) => ({ symbol, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [allTrades]);

  const winLossData = useMemo(() => {
    const wins = tradeStats?.winCount ?? 0;
    const losses = tradeStats?.lossCount ?? 0;
    if (wins === 0 && losses === 0) return [{ name: "No data", value: 1, color: "hsl(var(--muted))" }];
    return [
      { name: "Wins", value: wins, color: GREEN },
      { name: "Losses", value: losses, color: RED }
    ];
  }, [tradeStats]);

  const recentTrades = useMemo(() =>
    [...(allTrades ?? [])].reverse().slice(0, 8),
    [allTrades]
  );

  const equityColor = (equityCurveData.at(-1)?.equity ?? 0) >= 0 ? GREEN : RED;
  const hasTradeData = closedTrades.length > 0;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Terminal Dashboard</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <p className="text-muted-foreground text-sm font-mono">Real-time market execution & performance metrics</p>
            {accountInfo?.connected && (
              <Badge variant="outline" className={`text-[10px] font-mono uppercase rounded-sm flex items-center gap-1.5
                ${accountInfo.synced ? "border-green-500/40 bg-green-500/10 text-green-400"
                  : accountInfo.syncing ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-400"
                  : "border-muted bg-muted/30 text-muted-foreground"}`}>
                {accountInfo.synced
                  ? <><Wifi className="h-3 w-3" /> LIVE</>
                  : accountInfo.syncing
                  ? <><Loader2 className="h-3 w-3 animate-spin" /> SYNCING</>
                  : <><WifiOff className="h-3 w-3" /> OFFLINE</>}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Sync button — icon only on mobile, text on desktop */}
          <Button
            variant="outline"
            size="sm"
            onClick={syncTrades}
            disabled={isSyncing}
            className="gap-2 font-mono text-xs border-border hover:border-primary/50 shrink-0"
            title="Pull your last 90 days of real trades from the broker">
            {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Sync Trades</span>
          </Button>

          {/* Engine toggle — compact on mobile */}
          <button
            onClick={handleToggleBot}
            disabled={isToggling}
            className={`relative group flex items-center justify-between flex-1 sm:w-56 sm:flex-none h-14 rounded-xl p-2 transition-all duration-500
              border shadow-lg overflow-hidden disabled:opacity-80
              ${botStatus?.running
                ? "bg-card border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.15)]"
                : "bg-card border-border"}`}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <div className="flex items-center gap-2 z-10 pl-1">
              <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors shrink-0
                ${botStatus?.running ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground"}`}>
                <Power className={`h-4 w-4 ${botStatus?.running ? "animate-pulse" : ""}`} />
              </div>
              <div className="flex flex-col items-start min-w-0">
                <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Engine</span>
                <span className={`font-bold tracking-wide text-xs sm:text-sm truncate ${botStatus?.running ? "text-green-500" : "text-foreground"}`}>
                  {isToggling ? "PENDING..." : botStatus?.running ? "ACTIVE" : "STANDBY"}
                </span>
              </div>
            </div>
            <div className={`w-10 h-6 rounded-md flex items-center justify-center transition-all z-10 shrink-0
              ${botStatus?.running ? "bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]" : "bg-muted"}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${botStatus?.running ? "bg-background" : "bg-muted-foreground"}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          {
            label: "Account Balance", icon: DollarSign,
            value: formatCurrency(accountInfo?.balance),
            sub: `Margin: ${formatCurrency(accountInfo?.margin)}`
          },
          {
            label: "Net Profit", icon: LineIcon,
            value: `${(tradeStats?.netProfit ?? 0) >= 0 ? "+" : ""}${formatCurrency(tradeStats?.netProfit)}`,
            valueClass: (tradeStats?.netProfit ?? 0) >= 0 ? "text-green-500" : "text-destructive",
            sub: `Today: ${(tradeStats?.todayProfit ?? 0) >= 0 ? "+" : ""}${formatCurrency(tradeStats?.todayProfit)}`
          },
          {
            label: "Win Rate", icon: Percent,
            value: `${tradeStats?.winRate?.toFixed(1) ?? "0.0"}%`,
            sub: `${tradeStats?.winCount ?? 0}W / ${tradeStats?.lossCount ?? 0}L`
          },
          {
            label: "Active Trades", icon: Activity,
            value: String(tradeStats?.openTrades ?? 0),
            sub: `Total Executed: ${tradeStats?.totalTrades ?? 0}`
          }
        ].map(({ label, icon: Icon, value, valueClass, sub }) => (
          <Card key={label} className="bg-card border-border shadow-md">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] md:text-xs font-mono text-muted-foreground uppercase tracking-wider leading-tight">{label}</p>
                <Icon className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground shrink-0" />
              </div>
              <div className={`text-xl md:text-3xl font-bold tracking-tighter ${valueClass ?? ""}`}>{value}</div>
              <p className="text-[10px] text-muted-foreground mt-1 font-mono">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Equity Curve + Win/Loss Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-card border-border shadow-md">
          <CardHeader className="border-b border-border/50 pb-3 pt-4 px-4 md:px-6">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <LineIcon className="h-4 w-4 text-primary" />
              Equity Curve
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-4 md:p-4 md:pt-4">
            {hasTradeData ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={equityCurveData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={equityColor} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={equityColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))", fontFamily: "monospace" }}
                    interval="preserveStartEnd" axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))", fontFamily: "monospace" }}
                    axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} width={48} />
                  <Tooltip content={<CustomTooltip currency />} />
                  <Area type="monotone" dataKey="equity" name="Equity" stroke={equityColor}
                    strokeWidth={2} fill="url(#equityGrad)" dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <LineIcon className="h-10 w-10 opacity-10" />
                <span className="text-xs font-mono uppercase">No closed trades yet</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-md">
          <CardHeader className="border-b border-border/50 pb-3 pt-4 px-4 md:px-6">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Percent className="h-4 w-4 text-primary" />
              Win / Loss Ratio
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-4 md:p-4 md:pt-4 flex flex-col items-center">
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={winLossData} cx="50%" cy="50%" innerRadius={52} outerRadius={74}
                  dataKey="value" paddingAngle={3} strokeWidth={0}>
                  {winLossData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex gap-6 mt-1">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
                <span className="text-muted-foreground">Wins</span>
                <span className="font-bold">{tradeStats?.winCount ?? 0}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="h-2 w-2 rounded-full bg-destructive inline-block" />
                <span className="text-muted-foreground">Losses</span>
                <span className="font-bold">{tradeStats?.lossCount ?? 0}</span>
              </div>
            </div>
            <div className="mt-3 w-full space-y-2 pt-3 border-t border-border/50">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-muted-foreground">Profit Factor</span>
                <span className="font-bold">{tradeStats?.profitFactor?.toFixed(2) ?? "0.00"}</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-muted-foreground">Avg Win</span>
                <span className="text-green-500 font-bold">{formatCurrency(tradeStats?.avgWin)}</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-muted-foreground">Avg Loss</span>
                <span className="text-destructive font-bold">{formatCurrency(tradeStats?.avgLoss)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* P&L Bars + Symbol Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-card border-border shadow-md">
          <CardHeader className="border-b border-border/50 pb-3 pt-4 px-4 md:px-6">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              P&amp;L Per Trade <span className="text-xs font-mono font-normal text-muted-foreground ml-1">(last 30)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-4 md:p-4 md:pt-4">
            {hasTradeData ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={plBarData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))", fontFamily: "monospace" }}
                    axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(plBarData.length / 6) - 1)} />
                  <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))", fontFamily: "monospace" }}
                    axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} width={48} />
                  <Tooltip content={<CustomTooltip currency />} />
                  <Bar dataKey="profit" name="P&L" radius={[2, 2, 0, 0]}>
                    {plBarData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Activity className="h-10 w-10 opacity-10" />
                <span className="text-xs font-mono uppercase">No closed trades yet</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-md">
          <CardHeader className="border-b border-border/50 pb-3 pt-4 px-4 md:px-6">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Hash className="h-4 w-4 text-primary" />
              Symbol Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {symbolData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground text-xs font-mono uppercase">
                No trades recorded
              </div>
            ) : (
              symbolData.map(({ symbol, count }) => {
                const total = symbolData.reduce((s, x) => s + x.count, 0);
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={symbol} className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="font-bold">{symbol}</span>
                      <span className="text-muted-foreground">{count} trades · {pct}%</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}

            <div className="pt-3 border-t border-border/50 space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-muted-foreground">Last Signal</span>
                <span>{botStatus?.lastSignalAt ? format(new Date(botStatus.lastSignalAt), "HH:mm:ss") : "None"}</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-muted-foreground">Status</span>
                <span className="text-primary truncate max-w-[120px]">{botStatus?.message ?? "Ready"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent execution feed */}
      <Card className="bg-card border-border shadow-md">
        <CardHeader className="border-b border-border/50 pb-3 pt-4 px-4 md:px-6">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Recent Execution Feed
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile: cards */}
          <div className="md:hidden divide-y divide-border/50">
            {recentTrades.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground font-mono text-xs uppercase">No recent trades</div>
            ) : (
              recentTrades.map(trade => (
                <div key={trade.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge variant="outline"
                      className={`font-mono text-[10px] uppercase rounded-sm border-0 shrink-0
                        ${trade.type === "buy" ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"}`}>
                      {trade.type === "buy" ? <ArrowUpRight className="h-3 w-3 inline mr-0.5" /> : <ArrowDownRight className="h-3 w-3 inline mr-0.5" />}
                      {trade.type}
                    </Badge>
                    <div>
                      <div className="font-bold text-sm">{trade.symbol}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{trade.lots.toFixed(2)} lots</div>
                    </div>
                  </div>
                  <div className={`font-mono font-bold text-sm ${trade.status === "open" ? "text-primary" : (trade.profit ?? 0) >= 0 ? "text-green-500" : "text-destructive"}`}>
                    {trade.status === "open" ? "OPEN" : `${(trade.profit ?? 0) >= 0 ? "+" : ""}${formatCurrency(trade.profit)}`}
                  </div>
                </div>
              ))
            )}
          </div>
          {/* Desktop: table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr className="border-b border-border/50">
                  {["Symbol", "Type", "Lots", "Entry", "P&L"].map(h => (
                    <th key={h} className={`h-10 px-4 font-mono text-xs uppercase text-muted-foreground font-medium ${h === "P&L" ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentTrades.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="h-32 text-center text-muted-foreground font-mono text-sm">NO RECENT TRADES</td>
                  </tr>
                ) : (
                  recentTrades.map(trade => (
                    <tr key={trade.id} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                      <td className="px-4 py-3 font-bold">{trade.symbol}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline"
                          className={`font-mono text-[10px] uppercase rounded-sm border-0
                            ${trade.type === "buy" ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"}`}>
                          {trade.type === "buy" ? <ArrowUpRight className="h-3 w-3 mr-1 inline" /> : <ArrowDownRight className="h-3 w-3 mr-1 inline" />}
                          {trade.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono">{trade.lots.toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono">{trade.openPrice.toFixed(5)}</td>
                      <td className={`px-4 py-3 text-right font-mono font-medium
                        ${trade.status === "open" ? "text-muted-foreground" : (trade.profit ?? 0) >= 0 ? "text-green-500" : "text-destructive"}`}>
                        {trade.status === "open" ? "OPEN" : `${(trade.profit ?? 0) >= 0 ? "+" : ""}${formatCurrency(trade.profit)}`}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
