import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Files,
  Users,
  Settings,
  Bot,
  ChevronLeft,
  Activity,
  BarChart3,
  Server,
  LogOut,
  Key,
  Sliders,
  UserCog,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { title: "Overview", url: "/", icon: LayoutDashboard },
  { title: "Files", url: "/files", icon: Files },
  { title: "Users", url: "/users", icon: Users, ownerOnly: true },
  { title: "Bot Settings", url: "/bot-settings", icon: Sliders },
  { title: "Bot Admins", url: "/bot-admins", icon: UserCog, ownerOnly: true },
  { title: "Spam Monitor", url: "/spam-monitor", icon: Shield },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Activity", url: "/activity", icon: Activity },
  { title: "Server", url: "/server", icon: Server },
  { title: "Env Vars", url: "/env", icon: Key, ownerOnly: true },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { userRole, isOwner, signOut } = useAuth();

  const filteredNavItems = navItems.filter(
    (item) => !item.ownerOnly || isOwner
  );

  return (
    <aside
      className={cn(
        "flex flex-col h-screen border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <div className={cn("flex items-center gap-3", collapsed && "hidden")}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">Beat Animes</h1>
            <p className="text-xs text-muted-foreground">File Share Bot</p>
          </div>
        </div>
        {collapsed && (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground mx-auto">
            <Bot className="h-5 w-5" />
          </div>
        )}
      </div>

      {/* Role Badge */}
      {!collapsed && userRole && (
        <div className="px-4 py-2">
          <Badge
            variant="outline"
            className={cn(
              "w-full justify-center capitalize",
              userRole === "owner"
                ? "border-primary/30 text-primary bg-primary/10"
                : "border-blue-400/30 text-blue-400 bg-blue-400/10"
            )}
          >
            {userRole}
          </Badge>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.url;
          return (
            <NavLink
              key={item.url}
              to={item.url}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Links */}
      {!collapsed && (
        <div className="px-4 py-2 space-y-1 text-xs text-muted-foreground">
          <a
            href="https://t.me/BeatAnimes"
            target="_blank"
            rel="noopener noreferrer"
            className="block hover:text-primary transition-colors"
          >
            Channel: @BeatAnimes
          </a>
          <a
            href="https://t.me/Beat_Anime_Discussion"
            target="_blank"
            rel="noopener noreferrer"
            className="block hover:text-primary transition-colors"
          >
            Support: @Beat_Anime_Discussion
          </a>
        </div>
      )}

      {/* Collapse & Logout */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className={cn(
            "w-full justify-center text-muted-foreground hover:text-destructive",
            !collapsed && "justify-start"
          )}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sign Out</span>}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full justify-center text-muted-foreground hover:text-foreground",
            !collapsed && "justify-start"
          )}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              collapsed && "rotate-180"
            )}
          />
          {!collapsed && <span className="ml-2">Collapse</span>}
        </Button>
      </div>
    </aside>
  );
}
