import { Download, Upload, UserPlus, Share2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const activities = [
  {
    id: "1",
    type: "download",
    user: "@john_doe",
    action: "downloaded",
    target: "project_docs.pdf",
    time: "2 min ago",
  },
  {
    id: "2",
    type: "upload",
    user: "@jane_smith",
    action: "uploaded",
    target: "new_design.fig",
    time: "15 min ago",
  },
  {
    id: "3",
    type: "user_join",
    user: "@new_user_42",
    action: "joined the bot",
    target: "",
    time: "1 hour ago",
  },
  {
    id: "4",
    type: "share",
    user: "@admin",
    action: "shared",
    target: "tutorial_video.mp4",
    time: "2 hours ago",
  },
  {
    id: "5",
    type: "delete",
    user: "@moderator",
    action: "deleted",
    target: "old_file.zip",
    time: "3 hours ago",
  },
];

const activityIcons: Record<string, typeof Download> = {
  download: Download,
  upload: Upload,
  user_join: UserPlus,
  share: Share2,
  delete: Trash2,
};

const activityColors: Record<string, string> = {
  download: "bg-blue-500/10 text-blue-400",
  upload: "bg-green-500/10 text-green-400",
  user_join: "bg-primary/10 text-primary",
  share: "bg-purple-500/10 text-purple-400",
  delete: "bg-destructive/10 text-destructive",
};

export function ActivityFeed() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold">Recent Activity</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Latest actions in your bot
        </p>
      </div>
      <div className="divide-y divide-border">
        {activities.map((activity, index) => {
          const IconComponent = activityIcons[activity.type] || Download;
          const iconClass = activityColors[activity.type] || "bg-muted text-muted-foreground";
          return (
            <div
              key={activity.id}
              className="flex items-center gap-4 p-4 hover:bg-secondary/30 transition-colors animate-slide-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={cn("p-2 rounded-lg", iconClass)}>
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
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {activity.time}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
