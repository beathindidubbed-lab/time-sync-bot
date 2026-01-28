import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSpamData, useClearSpamFlag, useBanUser, useBotSettings, useUpdateBotSettings, formatDateTime } from "@/hooks/useBotData";
import { useToast } from "@/hooks/use-toast";
import { Shield, AlertTriangle, Ban, CheckCircle, RefreshCw, Activity } from "lucide-react";

export default function SpamMonitor() {
  const { data, isLoading, error, refetch } = useSpamData();
  const { data: settingsData } = useBotSettings();
  const updateSettings = useUpdateBotSettings();
  const clearSpamFlag = useClearSpamFlag();
  const banUser = useBanUser();
  const { toast } = useToast();
  
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleClearFlag = async (userId: number) => {
    try {
      await clearSpamFlag.mutateAsync(userId);
      toast({ title: "Flag cleared", description: "Spam flag has been removed from the user." });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to clear spam flag",
        variant: "destructive",
      });
    }
  };

  const handleBan = async (userId: number) => {
    try {
      await banUser.mutateAsync({ userId, action: "ban" });
      toast({ title: "User banned", description: "User has been banned from the bot." });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to ban user",
        variant: "destructive",
      });
    }
  };

  const handleToggleSpamProtection = async () => {
    if (!settingsData?.settings) return;
    
    try {
      await updateSettings.mutateAsync({
        spam_protection: !settingsData.settings.spam_protection,
      });
      toast({
        title: settingsData.settings.spam_protection ? "Spam protection disabled" : "Spam protection enabled",
        description: settingsData.settings.spam_protection
          ? "Spam protection has been turned off."
          : "Spam protection is now active.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update settings",
        variant: "destructive",
      });
    }
  };

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">Error loading spam data: {error.message}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Spam Monitor</h1>
            <p className="text-muted-foreground mt-1">
              Monitor and manage spam activity in your bot
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={settingsData?.settings.spam_protection ? "default" : "outline"}
              onClick={handleToggleSpamProtection}
              disabled={updateSettings.isPending}
            >
              <Shield className="h-4 w-4 mr-2" />
              {settingsData?.settings.spam_protection ? "Protection On" : "Protection Off"}
            </Button>
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Spam Protection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Shield className={`h-5 w-5 ${settingsData?.settings.spam_protection ? "text-green-500" : "text-muted-foreground"}`} />
                <span className="text-2xl font-bold">
                  {settingsData?.settings.spam_protection ? "Active" : "Disabled"}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Flagged Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <span className="text-2xl font-bold">
                  {data?.flaggedUsers.length || 0}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Spam Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                <p>Limit: {settingsData?.settings.spam_limit || 10} messages</p>
                <p>Rate: {settingsData?.settings.spam_rate || 60} seconds</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Flagged Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Flagged Spammers
            </CardTitle>
            <CardDescription>
              Users who have been flagged for suspicious activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : data?.flaggedUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                <p className="text-muted-foreground">No flagged spammers</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Spam Count</TableHead>
                    <TableHead>Last Spam</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.flaggedUsers.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {user.username ? `@${user.username}` : `ID: ${user.user_id}`}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">{user.spam_count}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.last_spam ? formatDateTime(user.last_spam) : "—"}
                      </TableCell>
                      <TableCell>
                        {user.banned ? (
                          <Badge variant="destructive">Banned</Badge>
                        ) : (
                          <Badge variant="outline">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleClearFlag(user.user_id)}
                            disabled={clearSpamFlag.isPending}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          {!user.banned && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleBan(user.user_id)}
                              disabled={banUser.isPending}
                              className="text-destructive hover:text-destructive"
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* High Activity Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              High Activity Users (Last Hour)
            </CardTitle>
            <CardDescription>
              Users with the most activity in the past hour
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : data?.highActivityUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Message Count</TableHead>
                    <TableHead>Last Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.highActivityUsers.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">ID: {user.user_id}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{user.message_count}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.last_active ? formatDateTime(user.last_active) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
