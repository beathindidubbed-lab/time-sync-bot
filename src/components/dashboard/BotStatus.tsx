import { Circle, Zap, Clock, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BotStatusProps {
  status?: "online" | "offline" | "maintenance";
  uptime?: string;
  version?: string;
}

export function BotStatus({
  status = "online",
  uptime = "5d 12h 34m",
  version = "4.0.0",
}: BotStatusProps) {
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

  const config = statusConfig[status];

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Bot Status</h3>
        <Badge
          variant="outline"
          className="border-success/30 text-success bg-success/10"
        >
          <span className="relative flex h-2 w-2 mr-2">
            {config.pulse && (
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.color} opacity-75`} />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${config.color}`} />
          </span>
          {config.text}
        </Badge>
      </div>

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
          <span className="text-sm font-medium text-success">45ms</span>
        </div>
      </div>
    </div>
  );
}
