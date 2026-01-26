import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Bot, Bell, Shield, Database, Zap } from "lucide-react";

const Settings = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure your Beat Animes Bot preferences
          </p>
        </div>

        {/* Bot Settings */}
        <div className="rounded-xl border border-border bg-card p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Bot Configuration</h3>
              <p className="text-sm text-muted-foreground">General bot settings</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="bot-token">Bot Token</Label>
              <Input
                id="bot-token"
                type="password"
                value="•••••••••••••••••••••••••••••••••••"
                className="bg-secondary border-border"
                readOnly
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bot-username">Bot Username</Label>
              <Input
                id="bot-username"
                value="@BeatAnimesBot"
                className="bg-secondary border-border"
                readOnly
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="channel">Channel</Label>
              <Input
                id="channel"
                value="@BeatAnimes"
                className="bg-secondary border-border"
                readOnly
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="support">Support</Label>
              <Input
                id="support"
                value="@Beat_Anime_Discussion"
                className="bg-secondary border-border"
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-xl border border-border bg-card p-6 animate-fade-in" style={{ animationDelay: "50ms" }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Notifications</h3>
              <p className="text-sm text-muted-foreground">Manage alerts and notifications</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">New User Alerts</p>
                <p className="text-sm text-muted-foreground">Get notified when new users join</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator className="bg-border" />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Error Notifications</p>
                <p className="text-sm text-muted-foreground">Alert on bot errors and issues</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator className="bg-border" />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Daily Summary</p>
                <p className="text-sm text-muted-foreground">Receive daily activity report</p>
              </div>
              <Switch />
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="rounded-xl border border-border bg-card p-6 animate-fade-in" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Security</h3>
              <p className="text-sm text-muted-foreground">Bot security settings</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Rate Limiting</p>
                <p className="text-sm text-muted-foreground">Prevent spam and abuse</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator className="bg-border" />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Force Subscription</p>
                <p className="text-sm text-muted-foreground">Require channel subscription</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </div>

        {/* Storage */}
        <div className="rounded-xl border border-border bg-card p-6 animate-fade-in" style={{ animationDelay: "150ms" }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Storage</h3>
              <p className="text-sm text-muted-foreground">Manage storage quota</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Used</span>
              <span className="font-medium">124 GB / 200 GB</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                style={{ width: "62%" }}
              />
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                <Zap className="h-3 w-3 mr-1" />
                Pro Plan
              </Badge>
              <Button variant="outline" size="sm" className="border-border">
                Upgrade Storage
              </Button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            Save Changes
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
