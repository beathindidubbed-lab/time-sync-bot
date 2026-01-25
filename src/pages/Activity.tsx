import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Download, Upload, UserPlus, Share2, Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const activityLog = [
  { id: "1", type: "download", user: "@john_doe", action: "downloaded", target: "project_docs.pdf", time: "2 min ago", ip: "192.168.1.1" },
  { id: "2", type: "upload", user: "@jane_smith", action: "uploaded", target: "new_design.fig", time: "15 min ago", ip: "192.168.1.2" },
  { id: "3", type: "user_join", user: "@new_user_42", action: "joined the bot", target: "", time: "1 hour ago", ip: "192.168.1.3" },
  { id: "4", type: "share", user: "@admin", action: "shared", target: "tutorial_video.mp4", time: "2 hours ago", ip: "192.168.1.4" },
  { id: "5", type: "delete", user: "@moderator", action: "deleted", target: "old_file.zip", time: "3 hours ago", ip: "192.168.1.5" },
  { id: "6", type: "error", user: "System", action: "Rate limit exceeded for", target: "@spammer_user", time: "4 hours ago", ip: "192.168.1.6" },
  { id: "7", type: "download", user: "@mike_wilson", action: "downloaded", target: "source_code.zip", time: "5 hours ago", ip: "192.168.1.7" },
  { id: "8", type: "upload", user: "@dev_team", action: "uploaded", target: "release_v4.1.zip", time: "6 hours ago", ip: "192.168.1.8" },
  { id: "9", type: "user_join", user: "@developer_99", action: "joined the bot", target: "", time: "8 hours ago", ip: "192.168.1.9" },
  { id: "10", type: "share", user: "@sarah_lee", action: "shared", target: "presentation.pptx", time: "Yesterday", ip: "192.168.1.10" },
];

const activityIcons: Record<string, typeof Download> = {
  download: Download,
  upload: Upload,
  user_join: UserPlus,
  share: Share2,
  delete: Trash2,
  error: AlertTriangle,
};

const activityColors: Record<string, string> = {
  download: "bg-blue-500/10 text-blue-400",
  upload: "bg-green-500/10 text-green-400",
  user_join: "bg-primary/10 text-primary",
  share: "bg-purple-500/10 text-purple-400",
  delete: "bg-orange-500/10 text-orange-400",
  error: "bg-destructive/10 text-destructive",
};

const Activity = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold tracking-tight">Activity Log</h1>
          <p className="text-muted-foreground mt-1">
            Complete history of bot actions and events
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="cursor-pointer bg-primary/10 text-primary border-primary/20">All</Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary">Downloads</Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary">Uploads</Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary">Users</Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary">Errors</Badge>
        </div>

        {/* Activity Log */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="divide-y divide-border">
            {activityLog.map((activity, index) => {
              const IconComponent = activityIcons[activity.type] || Download;
              const iconClass = activityColors[activity.type] || "bg-muted text-muted-foreground";
              return (
                <div
                  key={activity.id}
                  className="flex items-center gap-4 p-4 hover:bg-secondary/30 transition-colors animate-fade-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className={cn("p-2.5 rounded-lg shrink-0", iconClass)}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium text-primary">{activity.user}</span>
                      <span className="text-muted-foreground"> {activity.action} </span>
                      {activity.target && (
                        <span className="font-medium">{activity.target}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      IP: {activity.ip}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {activity.time}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Activity;
