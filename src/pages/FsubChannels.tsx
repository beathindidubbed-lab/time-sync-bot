import { useState } from "react";
import { Plus, Trash2, Tv, Power, PowerOff } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useFsubChannels, useAddFsubChannel, useRemoveFsubChannel, useToggleFsubMode, formatDateTime } from "@/hooks/useBotData";

const FsubChannels = () => {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newChannel, setNewChannel] = useState({ channel_id: "", channel_name: "", channel_username: "" });

  const { data, isLoading, error } = useFsubChannels();
  const addChannel = useAddFsubChannel();
  const removeChannel = useRemoveFsubChannel();
  const toggleFsub = useToggleFsubMode();

  const handleAddChannel = async () => {
    if (!newChannel.channel_id) {
      toast({ title: "Error", description: "Channel ID is required", variant: "destructive" });
      return;
    }

    try {
      await addChannel.mutateAsync({
        channel_id: Number(newChannel.channel_id),
        channel_name: newChannel.channel_name || undefined,
        channel_username: newChannel.channel_username || undefined,
      });
      toast({ title: "Success", description: "Channel added successfully" });
      setNewChannel({ channel_id: "", channel_name: "", channel_username: "" });
      setIsAddDialogOpen(false);
    } catch (err) {
      toast({ 
        title: "Error", 
        description: err instanceof Error ? err.message : "Failed to add channel", 
        variant: "destructive" 
      });
    }
  };

  const handleRemoveChannel = async (channelId: number) => {
    try {
      await removeChannel.mutateAsync(channelId);
      toast({ title: "Success", description: "Channel removed successfully" });
    } catch (err) {
      toast({ 
        title: "Error", 
        description: err instanceof Error ? err.message : "Failed to remove channel", 
        variant: "destructive" 
      });
    }
  };

  const handleToggleFsub = async () => {
    try {
      const result = await toggleFsub.mutateAsync();
      toast({ 
        title: "Success", 
        description: result.message || `Force subscribe ${result.fsub_enabled ? "enabled" : "disabled"}` 
      });
    } catch (err) {
      toast({ 
        title: "Error", 
        description: err instanceof Error ? err.message : "Failed to toggle fsub mode", 
        variant: "destructive" 
      });
    }
  };

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">Error loading channels: {error.message}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Force Subscribe Channels</h1>
            <p className="text-muted-foreground mt-1">
              Manage channels users must join before using the bot
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="fsub-toggle">Force Subscribe</Label>
              <Switch
                id="fsub-toggle"
                checked={data?.fsub_enabled ?? false}
                onCheckedChange={handleToggleFsub}
                disabled={toggleFsub.isPending}
              />
              <Badge variant={data?.fsub_enabled ? "default" : "secondary"}>
                {data?.fsub_enabled ? (
                  <><Power className="h-3 w-3 mr-1" /> Enabled</>
                ) : (
                  <><PowerOff className="h-3 w-3 mr-1" /> Disabled</>
                )}
              </Badge>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Channel
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Force Subscribe Channel</DialogTitle>
                  <DialogDescription>
                    Add a channel that users must join to use the bot
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="channel_id">Channel ID *</Label>
                    <Input
                      id="channel_id"
                      placeholder="-1001234567890"
                      value={newChannel.channel_id}
                      onChange={(e) => setNewChannel({ ...newChannel, channel_id: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      The numeric ID of the channel (starts with -100)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="channel_name">Channel Name</Label>
                    <Input
                      id="channel_name"
                      placeholder="My Channel"
                      value={newChannel.channel_name}
                      onChange={(e) => setNewChannel({ ...newChannel, channel_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="channel_username">Channel Username</Label>
                    <Input
                      id="channel_username"
                      placeholder="@mychannel"
                      value={newChannel.channel_username}
                      onChange={(e) => setNewChannel({ ...newChannel, channel_username: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddChannel} disabled={addChannel.isPending}>
                    {addChannel.isPending ? "Adding..." : "Add Channel"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Channels Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tv className="h-5 w-5" />
              Channels ({data?.channels.length || 0})
            </CardTitle>
            <CardDescription>
              Users must be members of all these channels to use the bot
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">Loading channels...</p>
              </div>
            ) : data?.channels.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <Tv className="h-12 w-12 text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">No channels configured</p>
                <p className="text-sm text-muted-foreground">
                  Add a channel to enable force subscribe
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Channel</TableHead>
                    <TableHead>Channel ID</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.channels.map((channel) => (
                    <TableRow key={channel._id}>
                      <TableCell className="font-medium">{channel.channel_name}</TableCell>
                      <TableCell className="font-mono text-sm">{channel.channel_id}</TableCell>
                      <TableCell>
                        {channel.channel_username ? (
                          <a 
                            href={`https://t.me/${channel.channel_username.replace("@", "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {channel.channel_username}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {channel.added_at ? formatDateTime(channel.added_at) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Channel?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove "{channel.channel_name}" from force subscribe. Users will no longer need to join this channel.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemoveChannel(channel.channel_id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
};

export default FsubChannels;
