import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useGetBotConfig,
  getGetBotConfigQueryKey,
  useUpdateBotConfig,
  BotConfigInputStrategy,
  BotConfigInputTimeframe,
  BotConfigInputLotMode,
  BotConfigInputTradeDirection,
  BotConfigInputSession
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Save, AlertTriangle, Settings2, ShieldAlert, SlidersHorizontal, Activity } from "lucide-react";
import { toast } from "sonner";

const configSchema = z.object({
  strategy: z.nativeEnum(BotConfigInputStrategy),
  symbols: z.string(),
  timeframe: z.nativeEnum(BotConfigInputTimeframe),
  lotMode: z.nativeEnum(BotConfigInputLotMode),
  fixedLot: z.coerce.number().min(0.01),
  riskPercent: z.coerce.number().min(0.1).max(100),
  fixedDollarRisk: z.coerce.number().min(1),
  stopLossPips: z.coerce.number().min(0),
  takeProfitPips: z.coerce.number().min(0),
  useTrailingStop: z.boolean(),
  trailingPips: z.coerce.number().min(0),
  useBreakEven: z.boolean(),
  breakEvenPips: z.coerce.number().min(0),
  maxPositions: z.coerce.number().min(1).int(),
  maxBuys: z.coerce.number().min(0).int(),
  maxSells: z.coerce.number().min(0).int(),
  tradeDirection: z.nativeEnum(BotConfigInputTradeDirection),
  session: z.nativeEnum(BotConfigInputSession),
  useSpreadFilter: z.boolean(),
  maxSpreadPips: z.coerce.number().min(0),
  useDailyProfitLimit: z.boolean(),
  dailyProfitLimit: z.coerce.number().min(0),
  useDailyLossLimit: z.boolean(),
  dailyLossLimit: z.coerce.number().min(0),
  // Strategy specific
  fastMaPeriod: z.coerce.number().min(1).int(),
  slowMaPeriod: z.coerce.number().min(1).int(),
  trendMaPeriod: z.coerce.number().min(1).int(),
  rsiPeriod: z.coerce.number().min(1).int(),
  rsiOverbought: z.coerce.number().min(1).max(100),
  rsiOversold: z.coerce.number().min(1).max(100),
  macdFastEma: z.coerce.number().min(1).int(),
  macdSlowEma: z.coerce.number().min(1).int(),
  macdSignal: z.coerce.number().min(1).int(),
  bbPeriod: z.coerce.number().min(1).int(),
  bbDeviation: z.coerce.number().min(0.1),
});

export default function Settings() {
  const queryClient = useQueryClient();
  const initGuard = useRef(false);

  const { data: botConfig, isLoading } = useGetBotConfig({
    query: {
      queryKey: getGetBotConfigQueryKey(),
    }
  });

  const updateMutation = useUpdateBotConfig({
    mutation: {
      onSuccess: () => {
        toast.success("Strategy configuration updated");
        queryClient.invalidateQueries({ queryKey: getGetBotConfigQueryKey() });
      },
      onError: (err) => {
        toast.error("Failed to update config: " + err.message);
      }
    }
  });

  const form = useForm<z.infer<typeof configSchema>>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      strategy: BotConfigInputStrategy.ma_crossover,
      symbols: "", // Stored as string for input, parsed on submit
      timeframe: BotConfigInputTimeframe.H1,
      lotMode: BotConfigInputLotMode.fixed,
      fixedLot: 0.1,
      riskPercent: 1.0,
      fixedDollarRisk: 100,
      stopLossPips: 50,
      takeProfitPips: 100,
      useTrailingStop: false,
      trailingPips: 20,
      useBreakEven: false,
      breakEvenPips: 15,
      maxPositions: 5,
      maxBuys: 3,
      maxSells: 3,
      tradeDirection: BotConfigInputTradeDirection.both,
      session: BotConfigInputSession.all,
      useSpreadFilter: true,
      maxSpreadPips: 3,
      useDailyProfitLimit: false,
      dailyProfitLimit: 500,
      useDailyLossLimit: false,
      dailyLossLimit: 200,
      fastMaPeriod: 9,
      slowMaPeriod: 21,
      trendMaPeriod: 200,
      rsiPeriod: 14,
      rsiOverbought: 70,
      rsiOversold: 30,
      macdFastEma: 12,
      macdSlowEma: 26,
      macdSignal: 9,
      bbPeriod: 20,
      bbDeviation: 2.0,
    }
  });

  const strategy = form.watch("strategy");
  const lotMode = form.watch("lotMode");

  useEffect(() => {
    if (botConfig && !initGuard.current) {
      initGuard.current = true;
      form.reset({
        ...botConfig,
        // @ts-ignore
        symbols: botConfig.symbols.join(", ")
      });
    }
  }, [botConfig, form]);

  const onSubmit = (values: z.infer<typeof configSchema>) => {
    const payload = {
      ...values,
      symbols: values.symbols.split(',').map((s: string) => s.trim()).filter(Boolean),
    };
    updateMutation.mutate({ data: payload });
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] w-full items-center justify-center">
        <Activity className="h-8 w-8 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Strategy Configuration</h1>
          <p className="text-muted-foreground text-sm font-mono mt-1">Configure trading algorithms and risk parameters</p>
        </div>
        <Button 
          onClick={form.handleSubmit(onSubmit)} 
          disabled={updateMutation.isPending}
          className="gap-2 shadow-lg shadow-primary/20"
        >
          <Save className="h-4 w-4" />
          Deploy Configuration
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="strategy" className="w-full">
            <div className="overflow-x-auto mb-6 -mx-1 px-1">
              <TabsList className="flex min-w-max w-full sm:grid sm:grid-cols-4 bg-secondary/50 p-1">
                <TabsTrigger value="strategy" className="data-[state=active]:bg-card min-w-[90px]">Strategy</TabsTrigger>
                <TabsTrigger value="risk" className="data-[state=active]:bg-card min-w-[90px]">Risk Mgt</TabsTrigger>
                <TabsTrigger value="limits" className="data-[state=active]:bg-card min-w-[90px]">Limits</TabsTrigger>
                <TabsTrigger value="indicators" className="data-[state=active]:bg-card min-w-[90px]">Indicators</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="strategy" className="space-y-6 mt-0">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings2 className="h-5 w-5 text-primary" />
                    Core Settings
                  </CardTitle>
                  <CardDescription>Primary operating parameters for the execution engine.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="strategy" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Active Strategy</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="font-mono"><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={BotConfigInputStrategy.ma_crossover}>MA Crossover</SelectItem>
                            <SelectItem value={BotConfigInputStrategy.rsi}>RSI Reversion</SelectItem>
                            <SelectItem value={BotConfigInputStrategy.macd}>MACD Trend</SelectItem>
                            <SelectItem value={BotConfigInputStrategy.bollinger}>Bollinger Bands</SelectItem>
                            <SelectItem value={BotConfigInputStrategy.combined}>Combined (Confluence)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="timeframe" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Execution Timeframe</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="font-mono"><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={BotConfigInputTimeframe.M1}>M1 (1 Minute)</SelectItem>
                            <SelectItem value={BotConfigInputTimeframe.M5}>M5 (5 Minutes)</SelectItem>
                            <SelectItem value={BotConfigInputTimeframe.M15}>M15 (15 Minutes)</SelectItem>
                            <SelectItem value={BotConfigInputTimeframe.M30}>M30 (30 Minutes)</SelectItem>
                            <SelectItem value={BotConfigInputTimeframe.H1}>H1 (1 Hour)</SelectItem>
                            <SelectItem value={BotConfigInputTimeframe.H4}>H4 (4 Hours)</SelectItem>
                            <SelectItem value={BotConfigInputTimeframe.D1}>D1 (Daily)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="tradeDirection" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Trade Direction</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="font-mono"><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={BotConfigInputTradeDirection.both}>Long & Short</SelectItem>
                            <SelectItem value={BotConfigInputTradeDirection.buy_only}>Long Only</SelectItem>
                            <SelectItem value={BotConfigInputTradeDirection.sell_only}>Short Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="session" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Trading Session</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="font-mono"><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={BotConfigInputSession.all}>24/5 All Sessions</SelectItem>
                            <SelectItem value={BotConfigInputSession.london}>London Only</SelectItem>
                            <SelectItem value={BotConfigInputSession.new_york}>New York Only</SelectItem>
                            <SelectItem value={BotConfigInputSession.tokyo}>Tokyo Only</SelectItem>
                            <SelectItem value={BotConfigInputSession.overlap}>London/NY Overlap</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  </div>
                  
                  <Separator className="bg-border/50" />
                  
                  <FormField control={form.control} name="symbols" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Traded Symbols</FormLabel>
                      <FormControl>
                        <Input placeholder="XAUUSD, USDZAR, BTCUSD" className="font-mono" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">Comma separated list of symbols exactly as they appear in MT5.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="risk" className="space-y-6 mt-0">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-primary" />
                    Position Sizing & Risk
                  </CardTitle>
                  <CardDescription>Rules for capital allocation and trade protection.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="lotMode" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Sizing Model</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="font-mono"><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={BotConfigInputLotMode.fixed}>Fixed Lots</SelectItem>
                            <SelectItem value={BotConfigInputLotMode.percent_balance}>% of Balance</SelectItem>
                            <SelectItem value={BotConfigInputLotMode.fixed_dollar}>Fixed Dollar Amount</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    
                    {lotMode === BotConfigInputLotMode.fixed && (
                      <FormField control={form.control} name="fixedLot" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Lot Size</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" className="font-mono" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}
                    
                    {lotMode === BotConfigInputLotMode.percent_balance && (
                      <FormField control={form.control} name="riskPercent" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Risk % per Trade</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" className="font-mono" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}
                    
                    {lotMode === BotConfigInputLotMode.fixed_dollar && (
                      <FormField control={form.control} name="fixedDollarRisk" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Risk Amount ($)</FormLabel>
                          <FormControl>
                            <Input type="number" step="1" className="font-mono" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}
                  </div>

                  <Separator className="bg-border/50" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="stopLossPips" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Hard Stop Loss (Pips)</FormLabel>
                        <FormControl>
                          <Input type="number" className="font-mono" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="takeProfitPips" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Take Profit (Pips)</FormLabel>
                        <FormControl>
                          <Input type="number" className="font-mono" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  
                  <Separator className="bg-border/50" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4 bg-secondary/20 p-4 rounded-lg border border-border/30">
                      <FormField control={form.control} name="useTrailingStop" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm font-medium">Trailing Stop</FormLabel>
                            <FormDescription className="text-xs">Lock in profit as price moves in favor</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )} />
                      {form.watch("useTrailingStop") && (
                        <FormField control={form.control} name="trailingPips" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Trailing Distance (Pips)</FormLabel>
                            <FormControl>
                              <Input type="number" className="font-mono h-8" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      )}
                    </div>
                    
                    <div className="space-y-4 bg-secondary/20 p-4 rounded-lg border border-border/30">
                      <FormField control={form.control} name="useBreakEven" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm font-medium">Break Even</FormLabel>
                            <FormDescription className="text-xs">Move SL to entry when in profit</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )} />
                      {form.watch("useBreakEven") && (
                        <FormField control={form.control} name="breakEvenPips" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Activation Level (Pips)</FormLabel>
                            <FormControl>
                              <Input type="number" className="font-mono h-8" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="limits" className="space-y-6 mt-0">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-primary" />
                    Exposure & Daily Limits
                  </CardTitle>
                  <CardDescription>Maximum allowed concurrency and daily circuit breakers.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField control={form.control} name="maxPositions" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Global Max Positions</FormLabel>
                        <FormControl>
                          <Input type="number" className="font-mono" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="maxBuys" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Max Longs</FormLabel>
                        <FormControl>
                          <Input type="number" className="font-mono" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="maxSells" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Max Shorts</FormLabel>
                        <FormControl>
                          <Input type="number" className="font-mono" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  
                  <Separator className="bg-border/50" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <FormField control={form.control} name="useDailyProfitLimit" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/50 p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm font-medium">Daily Profit Target</FormLabel>
                            <FormDescription className="text-xs">Halt trading after reaching goal</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )} />
                      {form.watch("useDailyProfitLimit") && (
                        <FormField control={form.control} name="dailyProfitLimit" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Target Amount ($)</FormLabel>
                            <FormControl>
                              <Input type="number" className="font-mono" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      <FormField control={form.control} name="useDailyLossLimit" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm font-medium text-destructive">Daily Loss Limit (Drawdown)</FormLabel>
                            <FormDescription className="text-xs">Emergency halt if loss exceeds limit</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )} />
                      {form.watch("useDailyLossLimit") && (
                        <FormField control={form.control} name="dailyLossLimit" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Max Loss Amount ($)</FormLabel>
                            <FormControl>
                              <Input type="number" className="font-mono border-destructive/50" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      )}
                    </div>
                  </div>
                  
                  <Separator className="bg-border/50" />
                  
                  <div className="space-y-4 w-1/2">
                    <FormField control={form.control} name="useSpreadFilter" render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-medium">Spread Filter</FormLabel>
                          <FormDescription className="text-xs">Block entries during high spread/news</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )} />
                    {form.watch("useSpreadFilter") && (
                      <FormField control={form.control} name="maxSpreadPips" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Max Spread (Pips)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" className="font-mono h-8" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="indicators" className="space-y-6 mt-0">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <SlidersHorizontal className="h-5 w-5 text-primary" />
                    Indicator Parameters
                  </CardTitle>
                  <CardDescription>Mathematical inputs for signal generation.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  
                  {/* MA Crossover Settings */}
                  {(strategy === BotConfigInputStrategy.ma_crossover || strategy === BotConfigInputStrategy.combined) && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-sm border-b border-border/50 pb-2">Moving Average Crossover</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FormField control={form.control} name="fastMaPeriod" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Fast MA</FormLabel>
                            <FormControl><Input type="number" className="font-mono" {...field} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="slowMaPeriod" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Slow MA</FormLabel>
                            <FormControl><Input type="number" className="font-mono" {...field} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="trendMaPeriod" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Trend Filter MA</FormLabel>
                            <FormControl><Input type="number" className="font-mono" {...field} /></FormControl>
                          </FormItem>
                        )} />
                      </div>
                    </div>
                  )}

                  {/* RSI Settings */}
                  {(strategy === BotConfigInputStrategy.rsi || strategy === BotConfigInputStrategy.combined) && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-sm border-b border-border/50 pb-2">Relative Strength Index (RSI)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FormField control={form.control} name="rsiPeriod" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Period</FormLabel>
                            <FormControl><Input type="number" className="font-mono" {...field} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="rsiOverbought" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Overbought Level</FormLabel>
                            <FormControl><Input type="number" className="font-mono" {...field} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="rsiOversold" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Oversold Level</FormLabel>
                            <FormControl><Input type="number" className="font-mono" {...field} /></FormControl>
                          </FormItem>
                        )} />
                      </div>
                    </div>
                  )}

                  {/* MACD Settings */}
                  {(strategy === BotConfigInputStrategy.macd || strategy === BotConfigInputStrategy.combined) && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-sm border-b border-border/50 pb-2">MACD</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FormField control={form.control} name="macdFastEma" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Fast EMA</FormLabel>
                            <FormControl><Input type="number" className="font-mono" {...field} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="macdSlowEma" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Slow EMA</FormLabel>
                            <FormControl><Input type="number" className="font-mono" {...field} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="macdSignal" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Signal Period</FormLabel>
                            <FormControl><Input type="number" className="font-mono" {...field} /></FormControl>
                          </FormItem>
                        )} />
                      </div>
                    </div>
                  )}

                  {/* Bollinger Bands Settings */}
                  {(strategy === BotConfigInputStrategy.bollinger || strategy === BotConfigInputStrategy.combined) && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-sm border-b border-border/50 pb-2">Bollinger Bands</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                        <FormField control={form.control} name="bbPeriod" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Period</FormLabel>
                            <FormControl><Input type="number" className="font-mono" {...field} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="bbDeviation" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Deviation</FormLabel>
                            <FormControl><Input type="number" step="0.1" className="font-mono" {...field} /></FormControl>
                          </FormItem>
                        )} />
                      </div>
                    </div>
                  )}

                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </form>
      </Form>
    </div>
  );
}
