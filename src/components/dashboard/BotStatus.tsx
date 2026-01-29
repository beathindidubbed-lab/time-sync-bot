import { Clock, Server, Zap, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBotStatus } from "@/hooks/useBotData";

export function BotStatus() {
  const { data, isLoading, error, refetch, isFetching } = useBotStatus();

  const statusConfig = {
    online: {
      color: "bg-success",
      text: "Online",
      pulse: true,
    },
    offline: {
      color: "bg-destructive",
      text: "Offline",
      pulse: false,
    },
    maintenance: {
      color: "bg-warning",
      text: "Maintenance",
      pulse: true,
    },
  };

  const status = data?.status || "offline";
  const config = statusConfig[status];
  const uptime = data?.uptime || "Unknown";
  const version = data?.version || "—";
  const responseTime = data?.response_time_ms;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Bot Status</h3>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
          <Badge
            variant="outline"
            className={status === "online" 
              ? "border-success/30 text-success bg-success/10"
              : status === "maintenance"
              ? "border-warning/30 text-warning bg-warning/10"
              : "border-destructive/30 text-destructive bg-destructive/10"
            }
          >
            <span className="relative flex h-2 w-2 mr-2">
              {config.pulse && (
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.color} opacity-75`} />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${config.color}`} />
            </span>
            {isLoading ? "Loading..." : config.text}
          </Badge>
        </div>
      </div>

      {error ? (
        <div className="text-center py-4 text-muted-foreground">
          <p className="text-sm">Failed to load status</p>
          <p className="text-xs text-destructive mt-1">{error.message}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Uptime</span>
            </div>
            <span className="text-sm font-medium">{uptime}</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-3">
              <Server className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Version</span>
            </div>
            <span className="text-sm font-medium">v{version}</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-3">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Response Time</span>
            </div>
            <span className={`text-sm font-medium ${responseTime && responseTime < 100 ? 'text-success' : responseTime && responseTime < 500 ? 'text-warning' : ''}`}>
              {responseTime ? `${responseTime}ms` : "—"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
