import { HardDrive, FileText, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface StorageCardProps {
  usedBytes?: number;
  totalBytes?: number;
  fileCount?: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 GB";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function StorageCard({
  usedBytes = 133143986176, // ~124 GB
  totalBytes = 214748364800, // ~200 GB
  fileCount = 2847,
}: StorageCardProps) {
  const usedPercentage = Math.round((usedBytes / totalBytes) * 100);
  const remainingBytes = totalBytes - usedBytes;
  
  const getColorClass = () => {
    if (usedPercentage >= 90) return "from-destructive to-destructive/70";
    if (usedPercentage >= 75) return "from-warning to-warning/70";
    return "from-primary to-primary/70";
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Database Storage</h3>
        <Badge 
          variant="outline" 
          className={
            usedPercentage >= 90 
              ? "border-destructive/30 text-destructive bg-destructive/10"
              : usedPercentage >= 75 
              ? "border-warning/30 text-warning bg-warning/10"
              : "border-primary/30 text-primary bg-primary/10"
          }
        >
          {usedPercentage}% used
        </Badge>
      </div>

      <div className="space-y-6">
        {/* Storage Bar */}
        <div className="space-y-2">
          <div className="h-4 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${getColorClass()} rounded-full transition-all duration-700`}
              style={{ width: `${usedPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {formatBytes(usedBytes)} used
            </span>
            <span className="font-medium">
              {formatBytes(totalBytes)} total
            </span>
          </div>
        </div>

        {/* Storage Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-secondary/50 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <HardDrive className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Remaining</span>
            </div>
            <p className="text-xl font-bold text-success">{formatBytes(remainingBytes)}</p>
          </div>
          <div className="p-4 rounded-lg bg-secondary/50 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-muted-foreground">Total Files</span>
            </div>
            <p className="text-xl font-bold">{fileCount.toLocaleString()}</p>
          </div>
        </div>

        {/* Action */}
        {usedPercentage >= 75 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
            <TrendingUp className="h-4 w-4 text-warning" />
            <span className="text-sm text-warning">Storage running low</span>
            <Button variant="outline" size="sm" className="ml-auto border-warning/30 text-warning hover:bg-warning/10">
              Upgrade
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
