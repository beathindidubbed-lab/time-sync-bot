import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBotSettings, useUpdateBotSettings } from "@/hooks/useBotData";
import { useToast } from "@/hooks/use-toast";
import { Settings, Link, Bell, Shield, Clock, Eye, Trash2, AlertTriangle, Save } from "lucide-react";
import { useState, useEffect } from "react";

export default function BotSettings() {
  const { data, isLoading, error } = useBotSettings();
  const updateSettings = useUpdateBotSettings();
  const { toast } = useToast();
  
  const [localSettings, setLocalSettings] = useState({
    auto_link: false,
    fsub_mode: true,
    preview: true,
    delete_style: "text",
    auto_delete: true,
    auto_delete_time: 600,
    spam_protection: true,
    spam_limit: 10,
    spam_rate: 60,
    force_subscribe_enabled: true,
  });
  
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (data?.settings) {
      setLocalSettings(data.settings);
    }
  }, [data?.settings]);

  const handleToggle = (key: string, value: boolean) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleInputChange = (key: string, value: number | string) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(localSettings);
      toast({
        title: "Settings saved",
        description: "Bot settings have been updated successfully.",
      });
      setHasChanges(false);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">Error loading settings: {error.message}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Bot Settings</h1>
            <p className="text-muted-foreground mt-1">
              Configure your Telegram bot features and behavior
            </p>
          </div>
          {hasChanges && (
            <Button onClick={handleSave} disabled={updateSettings.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {updateSettings.isPending ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Link Generation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="h-5 w-5 text-primary" />
                  Link Generation
                </CardTitle>
                <CardDescription>
                  Configure automatic link generation settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto Link Generation</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically generate links for new posts
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.auto_link}
                    onCheckedChange={(checked) => handleToggle("auto_link", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Link Preview</Label>
                    <p className="text-sm text-muted-foreground">
                      Show preview card when sharing links
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.preview}
                    onCheckedChange={(checked) => handleToggle("preview", checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Force Subscribe */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Force Subscribe
                </CardTitle>
                <CardDescription>
                  Require users to join channels before accessing files
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Force Subscribe Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable force subscribe for all users
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.fsub_mode}
                    onCheckedChange={(checked) => handleToggle("fsub_mode", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Force Subscribe Enabled</Label>
                    <p className="text-sm text-muted-foreground">
                      Master toggle for force subscribe feature
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.force_subscribe_enabled}
                    onCheckedChange={(checked) => handleToggle("force_subscribe_enabled", checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Auto Delete */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-primary" />
                  Auto Delete
                </CardTitle>
                <CardDescription>
                  Automatically delete messages after a set time
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto Delete</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable automatic message deletion
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.auto_delete}
                    onCheckedChange={(checked) => handleToggle("auto_delete", checked)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Delete Time (seconds)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={localSettings.auto_delete_time}
                      onChange={(e) => handleInputChange("auto_delete_time", parseInt(e.target.value) || 0)}
                      min={0}
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">
                      ({Math.floor(localSettings.auto_delete_time / 60)}m {localSettings.auto_delete_time % 60}s)
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Delete Style</Label>
                    <p className="text-sm text-muted-foreground">
                      Message style: {localSettings.delete_style}
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.delete_style === "photo"}
                    onCheckedChange={(checked) => handleInputChange("delete_style", checked ? "photo" : "text")}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Spam Protection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Spam Protection
                </CardTitle>
                <CardDescription>
                  Configure anti-spam settings to protect your bot
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Spam Protection</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable spam detection and prevention
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.spam_protection}
                    onCheckedChange={(checked) => handleToggle("spam_protection", checked)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Spam Limit (messages)</Label>
                  <Input
                    type="number"
                    value={localSettings.spam_limit}
                    onChange={(e) => handleInputChange("spam_limit", parseInt(e.target.value) || 0)}
                    min={1}
                    max={100}
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Max messages before flagging as spam
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Spam Rate (seconds)</Label>
                  <Input
                    type="number"
                    value={localSettings.spam_rate}
                    onChange={(e) => handleInputChange("spam_rate", parseInt(e.target.value) || 0)}
                    min={1}
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Time window for spam detection
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Info Card */}
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-500">Important</p>
              <p className="text-sm text-muted-foreground">
                Changes to bot settings are saved to the database and will take effect immediately.
                Make sure your bot is configured to read settings from the database.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
