import { format } from "date-fns";
import { 
  useGetTrades,
  getGetTradesQueryKey
} from "@workspace/api-client-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, ArrowDownRight, ArrowUpRight, ListOrdered } from "lucide-react";

export default function Trades() {
  const { data: trades, isLoading } = useGetTrades(undefined, {
    query: {
      queryKey: getGetTradesQueryKey(),
      refetchInterval: 10000
    }
  });

  const formatCurrency = (val?: number) => {
    if (val === undefined) return "-";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return format(new Date(dateStr), "MMM dd, HH:mm:ss");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Trade History</h1>
        <p className="text-muted-foreground text-sm font-mono mt-1">Complete log of all automated executions</p>
      </div>

      <Card className="bg-card border-border shadow-md">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <ListOrdered className="h-5 w-5 text-primary" />
            Execution Ledger
          </CardTitle>
          <CardDescription>All closed, open, and cancelled positions.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="font-mono text-xs uppercase h-12 w-[120px]">Time (Open)</TableHead>
                  <TableHead className="font-mono text-xs uppercase h-12 w-[100px]">Symbol</TableHead>
                  <TableHead className="font-mono text-xs uppercase h-12 w-[80px]">Type</TableHead>
                  <TableHead className="font-mono text-xs uppercase h-12 w-[80px] text-right">Lots</TableHead>
                  <TableHead className="font-mono text-xs uppercase h-12 text-right">Entry</TableHead>
                  <TableHead className="font-mono text-xs uppercase h-12 text-right">Exit</TableHead>
                  <TableHead className="font-mono text-xs uppercase h-12 text-right">Pips</TableHead>
                  <TableHead className="font-mono text-xs uppercase h-12 text-right">P&L</TableHead>
                  <TableHead className="font-mono text-xs uppercase h-12 w-[100px] text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i} className="border-border/50">
                      <TableCell colSpan={9} className="h-16">
                        <div className="w-full h-full bg-secondary/30 animate-pulse rounded" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (!trades || trades.length === 0) ? (
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
                        <Badge variant="outline" className={`font-mono text-[10px] uppercase rounded-sm border-0 ${trade.type === 'buy' ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'}`}>
                          {trade.type === 'buy' ? <ArrowUpRight className="h-3 w-3 mr-1 inline" /> : <ArrowDownRight className="h-3 w-3 mr-1 inline" />}
                          {trade.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{trade.lots.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{trade.openPrice.toFixed(5)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{trade.closePrice ? trade.closePrice.toFixed(5) : '-'}</TableCell>
                      <TableCell className={`text-right font-mono text-sm ${(trade.pips || 0) >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                        {trade.pips ? `${(trade.pips >= 0 ? '+' : '')}${trade.pips.toFixed(1)}` : '-'}
                      </TableCell>
                      <TableCell className={`text-right font-mono font-bold text-sm ${trade.status === 'open' ? 'text-muted-foreground' : (trade.profit || 0) >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                        {trade.status === 'open' ? 'OPEN' : `${(trade.profit || 0) >= 0 ? '+' : ''}${formatCurrency(trade.profit)}`}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={`font-mono text-[10px] uppercase rounded-sm ${
                          trade.status === 'closed' ? 'border-border text-muted-foreground' : 
                          trade.status === 'open' ? 'border-primary/50 text-primary bg-primary/10' : 
                          'border-muted text-muted-foreground bg-muted/50'
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
