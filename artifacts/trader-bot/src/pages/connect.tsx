import { useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useConnectAccount, getGetAccountInfoQueryKey, useGetAccountInfo } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Activity, Key, Shield, Zap } from "lucide-react";
import { toast } from "sonner";

const connectSchema = z.object({
  metaApiToken: z.string().min(1, "MetaApi Token is required"),
  accountId: z.string().min(1, "Account ID is required"),
});

export default function Connect() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const { data: accountInfo, isLoading: isChecking } = useGetAccountInfo({
    query: {
      queryKey: getGetAccountInfoQueryKey(),
      retry: false
    }
  });

  useEffect(() => {
    if (accountInfo?.connected) {
      setLocation("/dashboard");
    }
  }, [accountInfo, setLocation]);

  const connectMutation = useConnectAccount({
    mutation: {
      onSuccess: (data) => {
        if (data.connected) {
          toast.success("Account connected successfully");
          queryClient.invalidateQueries({ queryKey: getGetAccountInfoQueryKey() });
          setLocation("/dashboard");
        } else {
          toast.error("Failed to connect account");
        }
      },
      onError: (error) => {
        toast.error(error.message || "Failed to connect to MetaApi");
      }
    }
  });

  const form = useForm<z.infer<typeof connectSchema>>({
    resolver: zodResolver(connectSchema),
    defaultValues: {
      metaApiToken: "",
      accountId: "",
    },
  });

  function onSubmit(values: z.infer<typeof connectSchema>) {
    connectMutation.mutate({ data: values });
  }

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Activity className="h-8 w-8 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background selection:bg-primary/30">
      <div className="flex-1 flex flex-col justify-center p-8 md:p-12 lg:p-24 border-r border-border bg-card/30 relative overflow-hidden hidden md:flex">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
        
        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-3 mb-8">
            <Activity className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold tracking-tighter">UltraTrader</h1>
          </div>
          
          <h2 className="text-3xl font-medium mb-6 text-foreground/90">Professional algorithmic trading infrastructure for MetaTrader 5.</h2>
          <p className="text-lg text-muted-foreground mb-12">
            Connect your broker account via MetaApi to deploy advanced quantitative strategies with sub-millisecond execution.
          </p>

          <div className="space-y-6">
            <div className="flex gap-4 items-start">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Key className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-lg">Secure Connection</h3>
                <p className="text-muted-foreground text-sm">We use MetaApi cloud to securely bridge your broker to our execution engine without storing your MT5 password.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-lg">Ultra-Low Latency</h3>
                <p className="text-muted-foreground text-sm">Direct market access protocol ensures your automated trades execute with minimal slippage.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-lg">Risk Management</h3>
                <p className="text-muted-foreground text-sm">Institutional-grade risk controls protect your capital regardless of market volatility.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-background relative">
        <div className="w-full max-w-md space-y-8 relative z-10">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-4 md:hidden">
              <Activity className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold tracking-tighter">UltraTrader</h1>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">Connect Account</h2>
            <p className="text-sm text-muted-foreground mt-2">Enter your MetaApi credentials to initialize the terminal.</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4 p-6 bg-card border border-border rounded-xl shadow-xl">
                <FormField
                  control={form.control}
                  name="metaApiToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">MetaApi Token</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI..." 
                          className="font-mono bg-background border-input"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">MT5 Account ID</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. 1a2b3c4d-5e6f-7g8h-9i0j" 
                          className="font-mono bg-background border-input"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-medium shadow-primary/20 shadow-lg"
                disabled={connectMutation.isPending}
              >
                {connectMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Activity className="h-4 w-4 animate-spin" />
                    Connecting...
                  </span>
                ) : (
                  "Initialize Terminal"
                )}
              </Button>
            </form>
          </Form>

          <div className="text-xs text-muted-foreground p-4 bg-secondary/50 rounded-lg border border-border/50">
            <h4 className="font-semibold mb-2 text-foreground">How to get these credentials:</h4>
            <ol className="list-decimal list-inside space-y-1 ml-1 font-mono text-[10px]">
              <li>Sign up at <a href="https://metaapi.cloud/" target="_blank" rel="noreferrer" className="text-primary hover:underline">metaapi.cloud</a></li>
              <li>Add your MT5 account in the MetaApi dashboard</li>
              <li>Copy the generated Account ID</li>
              <li>Go to API tokens and create a new token</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
