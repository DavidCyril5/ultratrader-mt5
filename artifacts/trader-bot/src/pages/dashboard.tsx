import { useState } from "react";
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
import { Activity, ArrowDownRight, ArrowUpRight, Ban, CheckCircle2, AlertCircle, Power, Zap, Hash, DollarSign, Percent, Clock, LineChart } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [isToggling, setIsToggling] = useState(false);

  const { data: accountInfo } = useGetAccountInfo({
    query: {
      queryKey: getGetAccountInfoQueryKey(),
      refetchInterval: 5000
    }
  });

  const { data: botStatus } = useGetBotStatus({
    query: {
      queryKey: getGetBotStatusQueryKey(),
      refetchInterval: 2000
    }
  });

  const { data: tradeStats } = useGetTradeStats({
    query: {
      queryKey: getGetTradeStatsQueryKey(),
      refetchInterval: 10000
    }
  });

  const { data: recentTrades } = useGetTrades({ limit: 10 }, {
    query: {
      queryKey: getGetTradesQueryKey({ limit: 10 }),
      refetchInterval: 10000
    }
  });

  const startMutation = useStartBot({
    mutation: {
      onSuccess: () => {
        toast.success("Trading bot activated");
        queryClient.invalidateQueries({ queryKey: getGetBotStatusQueryKey() });
        setIsToggling(false);
      },
      onError: (err) => {
        toast.error("Failed to start bot: " + err.message);
        setIsToggling(false);
      }
    }
  });

  const stopMutation = useStopBot({
    mutation: {
      onSuccess: () => {
        toast.warning("Trading bot deactivated");
        queryClient.invalidateQueries({ queryKey: getGetBotStatusQueryKey() });
        setIsToggling(false);
      },
      onError: (err) => {
        toast.error("Failed to stop bot: " + err.message);
        setIsToggling(false);
      }
    }
  });

  const handleToggleBot = () => {
    setIsToggling(true);
    if (botStatus?.running) {
      stopMutation.mutate();
    } else {
      startMutation.mutate();
    }
  };

  const formatCurrency = (val?: number) => {
    if (val === undefined) return "$0.00";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Terminal Dashboard</h1>
          <p className="text-muted-foreground text-sm font-mono mt-1">Real-time market execution & performance metrics</p>
        </div>
        
        <button 
          onClick={handleToggleBot}
          disabled={isToggling}
          className={`
            relative group flex items-center justify-between w-64 h-16 rounded-xl p-2 transition-all duration-500
            border shadow-lg overflow-hidden disabled:opacity-80
            ${botStatus?.running 
              ? 'bg-card border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.15)]' 
              : 'bg-card border-border shadow-none'
            }
          `}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
          
          <div className="flex items-center gap-3 z-10 pl-2">
            <div className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors duration-500
              ${botStatus?.running ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'}
            `}>
              <Power className={`h-5 w-5 ${botStatus?.running ? 'animate-pulse' : ''}`} />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">Engine Status</span>
              <span className={`font-bold tracking-wider ${botStatus?.running ? 'text-green-500' : 'text-foreground'}`}>
                {isToggling ? 'PENDING...' : botStatus?.running ? 'ACTIVE' : 'STANDBY'}
              </span>
            </div>
          </div>
          
          <div className={`w-14 h-8 rounded-lg flex items-center justify-center transition-all duration-500 z-10
            ${botStatus?.running ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'bg-muted'}
          `}>
            <div className={`w-1.5 h-1.5 rounded-full ${botStatus?.running ? 'bg-background' : 'bg-muted-foreground'}`}></div>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-mono text-muted-foreground uppercase tracking-wider">Account Balance</p>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold tracking-tighter">{formatCurrency(accountInfo?.balance)}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              Margin: {formatCurrency(accountInfo?.margin)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-mono text-muted-foreground uppercase tracking-wider">Net Profit</p>
              <LineChart className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-baseline gap-2">
              <div className={`text-3xl font-bold tracking-tighter ${(tradeStats?.netProfit || 0) >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                {(tradeStats?.netProfit || 0) >= 0 ? '+' : ''}{formatCurrency(tradeStats?.netProfit)}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-mono flex items-center gap-1">
              Today: <span className={(tradeStats?.todayProfit || 0) >= 0 ? 'text-green-500' : 'text-destructive'}>{(tradeStats?.todayProfit || 0) >= 0 ? '+' : ''}{formatCurrency(tradeStats?.todayProfit)}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-mono text-muted-foreground uppercase tracking-wider">Win Rate</p>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold tracking-tighter">{tradeStats?.winRate?.toFixed(1) || '0.0'}%</div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              {tradeStats?.winCount || 0}W / {tradeStats?.lossCount || 0}L
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-mono text-muted-foreground uppercase tracking-wider">Active Trades</p>
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold tracking-tighter">{tradeStats?.openTrades || 0}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              Total Executed: {tradeStats?.totalTrades || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-2">
          <Card className="bg-card border-border shadow-md h-full">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                Recent Execution Feed
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-secondary/50">
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="font-mono text-xs uppercase h-10">Symbol</TableHead>
                    <TableHead className="font-mono text-xs uppercase h-10">Type</TableHead>
                    <TableHead className="font-mono text-xs uppercase h-10">Lots</TableHead>
                    <TableHead className="font-mono text-xs uppercase h-10">Entry</TableHead>
                    <TableHead className="font-mono text-xs uppercase h-10 text-right">P&L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!recentTrades || recentTrades.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground font-mono text-sm">
                        NO RECENT TRADES
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentTrades.map((trade) => (
                      <TableRow key={trade.id} className="border-border/50 hover:bg-secondary/50 transition-colors">
                        <TableCell className="font-bold tracking-tight">{trade.symbol}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`font-mono text-[10px] uppercase rounded-sm border-0 ${trade.type === 'buy' ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'}`}>
                            {trade.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{trade.lots.toFixed(2)}</TableCell>
                        <TableCell className="font-mono text-sm">{trade.openPrice.toFixed(5)}</TableCell>
                        <TableCell className={`text-right font-mono font-medium text-sm ${trade.status === 'open' ? 'text-muted-foreground' : (trade.profit || 0) >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                          {trade.status === 'open' ? 'OPEN' : `${(trade.profit || 0) >= 0 ? '+' : ''}${formatCurrency(trade.profit)}`}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        
        <div className="col-span-1 space-y-6">
          <Card className="bg-card border-border shadow-md">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Hash className="h-5 w-5 text-muted-foreground" />
                Bot Diagnostics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Connected Account</span>
                <span className="font-mono text-sm font-medium">{botStatus?.connectedAccountId || '-'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Last Signal</span>
                <span className="font-mono text-sm">{botStatus?.lastSignalAt ? format(new Date(botStatus.lastSignalAt), 'HH:mm:ss') : 'None'}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">System Message</span>
                <span className="text-sm text-primary truncate max-w-[150px]" title={botStatus?.message}>{botStatus?.message || 'Ready'}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-md">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-muted-foreground" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Profit Factor</span>
                <span className="font-mono text-sm font-medium">{tradeStats?.profitFactor?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Avg Win</span>
                <span className="font-mono text-sm text-green-500">{formatCurrency(tradeStats?.avgWin)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Avg Loss</span>
                <span className="font-mono text-sm text-destructive">{formatCurrency(tradeStats?.avgLoss)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
