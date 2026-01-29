import { useState } from "react";
import { Send, Radio, Clock, CheckCircle, XCircle, AlertCircle, Pin, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useBroadcasts, useCreateBroadcast, useCancelBroadcast, formatDateTime } from "@/hooks/useBotData";

const Broadcast = () => {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [options, setOptions] = useState({
    pin: false,
    delete_after: null as number | null,
    forward: false,
  });
  const [deleteAfterEnabled, setDeleteAfterEnabled] = useState(false);
  const [deleteAfterSeconds, setDeleteAfterSeconds] = useState(600);
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useBroadcasts(page);
  const createBroadcast = useCreateBroadcast();
  const cancelBroadcast = useCancelBroadcast();

  const handleSendBroadcast = async () => {
    if (!message.trim()) {
      toast({ title: "Error", description: "Message is required", variant: "destructive" });
      return;
    }

    try {
      const result = await createBroadcast.mutateAsync({
        message: message.trim(),
        type: "text",
        options: {
          pin: options.pin,
          delete_after: deleteAfterEnabled ? deleteAfterSeconds : null,
          forward: options.forward,
        },
      });
      toast({ 
        title: "Broadcast Queued", 
        description: `Message will be sent to ${result.total_users.toLocaleString()} users` 
      });
      setMessage("");
      setOptions({ pin: false, delete_after: null, forward: false });
      setDeleteAfterEnabled(false);
    } catch (err) {
      toast({ 
        title: "Error", 
        description: err instanceof Error ? err.message : "Failed to create broadcast", 
        variant: "destructive" 
      });
    }
  };

  const handleCancelBroadcast = async (broadcastId: string) => {
    try {
      await cancelBroadcast.mutateAsync(broadcastId);
      toast({ title: "Success", description: "Broadcast cancelled" });
    } catch (err) {
      toast({ 
        title: "Error", 
        description: err instanceof Error ? err.message : "Failed to cancel broadcast", 
        variant: "destructive" 
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500"><Radio className="h-3 w-3 mr-1 animate-pulse" /> In Progress</Badge>;
      case "completed":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Completed</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
      case "cancelled":
        return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">Error loading broadcasts: {error.message}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Broadcast</h1>
          <p className="text-muted-foreground mt-1">
            Send messages to all bot users
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Compose Message */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  New Broadcast
                </CardTitle>
                <CardDescription>
                  {data?.total_active_users 
                    ? `Message will be sent to ${data.total_active_users.toLocaleString()} active users`
                    : "Compose your broadcast message"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    placeholder="Enter your broadcast message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Supports Telegram markdown: *bold*, _italic_, `code`, [link](url)
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-2">
                    <Pin className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="pin">Pin message</Label>
                  </div>
                  <Switch
                    id="pin"
                    checked={options.pin}
                    onCheckedChange={(checked) => setOptions({ ...options, pin: checked })}
                  />
                </div>

                <div className="space-y-3 p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="delete_after">Auto-delete after</Label>
                    </div>
                    <Switch
                      id="delete_after"
                      checked={deleteAfterEnabled}
                      onCheckedChange={setDeleteAfterEnabled}
                    />
                  </div>
                  {deleteAfterEnabled && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={deleteAfterSeconds}
                        onChange={(e) => setDeleteAfterSeconds(Number(e.target.value))}
                        min={60}
                        max={86400}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">seconds</span>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={handleSendBroadcast} 
                  disabled={createBroadcast.isPending || !message.trim()}
                  className="w-full"
                >
                  {createBroadcast.isPending ? (
                    "Queuing..."
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Broadcast
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Stats */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {data?.total_active_users?.toLocaleString() || "—"}
                </div>
                <p className="text-xs text-muted-foreground">Users who will receive broadcasts</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Broadcasts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {data?.pagination.total || 0}
                </div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Broadcast History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5" />
              Broadcast History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">Loading broadcasts...</p>
              </div>
            ) : data?.broadcasts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <Radio className="h-12 w-12 text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">No broadcasts yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Message</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.broadcasts.map((broadcast) => (
                    <TableRow key={broadcast._id}>
                      <TableCell className="max-w-xs">
                        <p className="truncate">{broadcast.message}</p>
                        <div className="flex gap-1 mt-1">
                          {broadcast.options.pin && (
                            <Badge variant="outline" className="text-xs"><Pin className="h-2 w-2" /></Badge>
                          )}
                          {broadcast.options.delete_after && (
                            <Badge variant="outline" className="text-xs">{broadcast.options.delete_after}s delete</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(broadcast.status)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Progress 
                            value={broadcast.total_users ? (broadcast.sent_count / broadcast.total_users) * 100 : 0} 
                            className="h-2"
                          />
                          <p className="text-xs text-muted-foreground">
                            {broadcast.sent_count} / {broadcast.total_users} 
                            {broadcast.failed_count > 0 && ` (${broadcast.failed_count} failed)`}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDateTime(broadcast.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        {broadcast.status === "pending" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive">
                                Cancel
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancel Broadcast?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will cancel the pending broadcast. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Keep</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleCancelBroadcast(broadcast._id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Cancel Broadcast
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Pagination */}
            {data && data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {data.pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                  disabled={page === data.pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Broadcast;
