import { Cpu, HardDrive, MemoryStick, Clock, Server, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ServerStatsProps {
  showConfidential?: boolean;
}

export function ServerStats({ showConfidential = true }: ServerStatsProps) {
  // Mock server stats - in production, these would come from an API
  const stats = {
    os: "Ubuntu 22.04 LTS",
    platform: "Render",
    node: "v20.11.0",
    python: "3.11.4",
    cpu: "2 vCPU",
    cpuUsage: 34,
    memory: "4 GB RAM",
    memoryUsage: 62,
    uptime: "5d 12h 34m",
    region: "Singapore",
    repository: "beathindidubbed-lab/Advance-File-Share-bot-V4",
    lastDeploy: "2h ago",
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Server Stats</h3>
        <Badge variant="outline" className="border-success/30 text-success bg-success/10">
          <span className="relative flex h-2 w-2 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          Running
        </Badge>
      </div>

      <div className="space-y-4">
        {/* OS Info */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
          <div className="flex items-center gap-3">
            <Server className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">OS</span>
          </div>
          <span className="text-sm font-medium">{stats.os}</span>
        </div>

        {/* Platform */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
          <div className="flex items-center gap-3">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Platform</span>
          </div>
          <span className="text-sm font-medium">{stats.platform} ({stats.region})</span>
        </div>

        {/* CPU */}
        <div className="p-3 rounded-lg bg-secondary/50 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">CPU</span>
            </div>
            <span className="text-sm font-medium">{stats.cpu}</span>
          </div>
          <div className="h-2 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
              style={{ width: `${stats.cpuUsage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">{stats.cpuUsage}% usage</p>
        </div>

        {/* Memory */}
        <div className="p-3 rounded-lg bg-secondary/50 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MemoryStick className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Memory</span>
            </div>
            <span className="text-sm font-medium">{stats.memory}</span>
          </div>
          <div className="h-2 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-purple-500/70 rounded-full transition-all duration-500"
              style={{ width: `${stats.memoryUsage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">{stats.memoryUsage}% usage</p>
        </div>

        {/* Uptime */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Uptime</span>
          </div>
          <span className="text-sm font-medium text-success">{stats.uptime}</span>
        </div>

        {/* Repo Info - Only for owners */}
        {showConfidential && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-3">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Repository</span>
            </div>
            <span className="text-sm font-medium text-primary truncate max-w-[180px]">
              {stats.repository}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
