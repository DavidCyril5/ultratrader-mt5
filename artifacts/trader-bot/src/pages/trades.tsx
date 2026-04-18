import { format } from "date-fns";
import { useGetTrades, getGetTradesQueryKey } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, ArrowDownRight, ArrowUpRight, ListOrdered } from "lucide-react";

export default function Trades() {
  const { data: trades, isLoading } = useGetTrades(undefined, {
    query: { queryKey: getGetTradesQueryKey(), refetchInterval: 10000 }
  });

  const formatCurrency = (val?: number | null) => {
    if (val == null) return "-";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return format(new Date(dateStr), "MMM dd, HH:mm");
  };

  const plClass = (val?: number | null) =>
    (val ?? 0) >= 0 ? "text-green-500" : "text-destructive";

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Trade History</h1>
        <p className="text-muted-foreground text-sm font-mono mt-1">Complete log of all automated executions</p>
      </div>

      <Card className="bg-card border-border shadow-md">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-lg md:text-xl flex items-center gap-2">
            <ListOrdered className="h-5 w-5 text-primary" />
            Execution Ledger
          </CardTitle>
          <CardDescription>All closed, open, and cancelled positions.</CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {/* Mobile card list */}
          <div className="md:hidden divide-y divide-border/50">
            {isLoading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="p-4 space-y-2 animate-pulse">
                  <div className="h-4 bg-secondary/50 rounded w-1/2" />
                  <div className="h-4 bg-secondary/50 rounded w-1/3" />
                </div>
              ))
            ) : !trades || trades.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground font-mono text-sm">
                <Activity className="h-8 w-8 opacity-20" />
                <span>NO EXECUTION HISTORY FOUND</span>
              </div>
            ) : (
              trades.map((trade) => (
                <div key={trade.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge variant="outline"
                      className={`font-mono text-[10px] uppercase rounded-sm border-0 shrink-0
                        ${trade.type === "buy" ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"}`}>
                      {trade.type === "buy" ? <ArrowUpRight className="h-3 w-3 mr-0.5 inline" /> : <ArrowDownRight className="h-3 w-3 mr-0.5 inline" />}
                      {trade.type}
                    </Badge>
                    <div className="min-w-0">
                      <div className="font-bold text-sm">{trade.symbol}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{formatDate(trade.openTime)}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`font-bold font-mono text-sm ${trade.status === "open" ? "text-primary" : plClass(trade.profit)}`}>
                      {trade.status === "open" ? "OPEN" : `${(trade.profit ?? 0) >= 0 ? "+" : ""}${formatCurrency(trade.profit)}`}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground">{trade.lots.toFixed(2)} lots</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="font-mono text-xs uppercase h-12">Time</TableHead>
                  <TableHead className="font-mono text-xs uppercase h-12">Symbol</TableHead>
                  <TableHead className="font-mono text-xs uppercase h-12">Type</TableHead>
                  <TableHead className="font-mono text-xs uppercase h-12 text-right">Lots</TableHead>
                  <TableHead className="font-mono text-xs uppercase h-12 text-right">Entry</TableHead>
                  <TableHead className="font-mono text-xs uppercase h-12 text-right">Exit</TableHead>
                  <TableHead className="font-mono text-xs uppercase h-12 text-right">Pips</TableHead>
                  <TableHead className="font-mono text-xs uppercase h-12 text-right">P&amp;L</TableHead>
                  <TableHead className="font-mono text-xs uppercase h-12 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i} className="border-border/50">
                      <TableCell colSpan={9} className="h-16">
                        <div className="w-full h-4 bg-secondary/30 animate-pulse rounded" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : !trades || trades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-64 text-center text-muted-foreground font-mono">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Activity className="h-8 w-8 opacity-20" />
                        <span>NO EXECUTION HISTORY FOUND</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  trades.map((trade) => (
                    <TableRow key={trade.id} className="border-border/50 hover:bg-secondary/50 transition-colors h-14">
                      <TableCell className="font-mono text-xs text-muted-foreground">{formatDate(trade.openTime)}</TableCell>
                      <TableCell className="font-bold tracking-tight">{trade.symbol}</TableCell>
                      <TableCell>
                        <Badge variant="outline"
                          className={`font-mono text-[10px] uppercase rounded-sm border-0
                            ${trade.type === "buy" ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"}`}>
                          {trade.type === "buy" ? <ArrowUpRight className="h-3 w-3 mr-1 inline" /> : <ArrowDownRight className="h-3 w-3 mr-1 inline" />}
                          {trade.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{trade.lots.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{trade.openPrice.toFixed(5)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{trade.closePrice ? trade.closePrice.toFixed(5) : "-"}</TableCell>
                      <TableCell className={`text-right font-mono text-sm ${plClass(trade.pips)}`}>
                        {trade.pips != null ? `${trade.pips >= 0 ? "+" : ""}${trade.pips.toFixed(1)}` : "-"}
                      </TableCell>
                      <TableCell className={`text-right font-mono font-bold text-sm ${trade.status === "open" ? "text-primary" : plClass(trade.profit)}`}>
                        {trade.status === "open" ? "OPEN" : `${(trade.profit ?? 0) >= 0 ? "+" : ""}${formatCurrency(trade.profit)}`}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={`font-mono text-[10px] uppercase rounded-sm ${
                          trade.status === "closed" ? "border-border text-muted-foreground" :
                          trade.status === "open" ? "border-primary/50 text-primary bg-primary/10" :
                          "border-muted text-muted-foreground bg-muted/50"
                        }`}>
                          {trade.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
