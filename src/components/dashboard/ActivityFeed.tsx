import { Link2, Trash2, UserPlus, Settings, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActivityLog } from "@/hooks/useLinks";

const actionIcons: Record<string, typeof Link2> = {
  link_created: Link2,
  link_deleted: Trash2,
  user_added: UserPlus,
  settings_changed: Settings,
};

const actionColors: Record<string, string> = {
  link_created: "bg-primary/10 text-primary",
  link_deleted: "bg-destructive/10 text-destructive",
  user_added: "bg-success/10 text-success",
  settings_changed: "bg-blue-500/10 text-blue-400",
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ActivityFeed() {
  const { data: activities, isLoading } = useActivityLog(8);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold">Recent Activity</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Latest admin actions
        </p>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !activities || activities.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
          No recent activity
        </div>
      ) : (
        <div className="divide-y divide-border">
          {activities.map((activity, index) => {
            const IconComponent = actionIcons[activity.action] || Link2;
            const iconClass = actionColors[activity.action] || "bg-muted text-muted-foreground";
            return (
              <div
                key={activity.id}
                className="flex items-center gap-4 p-4 hover:bg-secondary/30 transition-colors animate-slide-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={cn("p-2 rounded-lg shrink-0", iconClass)}>
                  <IconComponent className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium text-primary">
                      {activity.user_name || "System"}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}{activity.description || activity.action.replace(/_/g, " ")}
                    </span>
                  </p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {timeAgo(activity.created_at)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
