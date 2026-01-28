import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useBotAdmins, useAddBotAdmin, useUpdateBotAdmin, useRemoveBotAdmin, formatDate } from "@/hooks/useBotData";
import { useToast } from "@/hooks/use-toast";
import { UserCog, Plus, Trash2, Shield, Save } from "lucide-react";

const PERMISSION_LABELS: Record<string, { label: string; description: string }> = {
  can_broadcast: { label: "Broadcast", description: "Send messages to all users" },
  can_ban: { label: "Ban/Unban", description: "Ban or unban users from the bot" },
  can_genlink: { label: "Generate Links", description: "Create single file links" },
  can_batch: { label: "Batch Links", description: "Create batch file links" },
  can_custom_batch: { label: "Custom Batch", description: "Create custom batch from channels" },
  can_auto_link: { label: "Auto Link", description: "Toggle auto link generation" },
  can_delete_files: { label: "Delete Files", description: "Delete files from the bot" },
  can_view_stats: { label: "View Stats", description: "View bot statistics" },
  can_manage_fsub: { label: "Manage FSub", description: "Manage force subscribe channels" },
  can_set_delete_time: { label: "Set Delete Time", description: "Configure auto-delete time" },
};

export default function BotAdmins() {
  const { data, isLoading, error } = useBotAdmins();
  const addAdmin = useAddBotAdmin();
  const updateAdmin = useUpdateBotAdmin();
  const removeAdmin = useRemoveBotAdmin();
  const { toast } = useToast();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ user_id: "", name: "" });
  const [pendingChanges, setPendingChanges] = useState<Record<number, Record<string, boolean>>>({});

  const handleAddAdmin = async () => {
    if (!newAdmin.user_id) {
      toast({ title: "Error", description: "User ID is required", variant: "destructive" });
      return;
    }

    try {
      await addAdmin.mutateAsync({
        user_id: parseInt(newAdmin.user_id),
        name: newAdmin.name || undefined,
      });
      toast({ title: "Admin added", description: "New admin has been added successfully." });
      setNewAdmin({ user_id: "", name: "" });
      setIsAddOpen(false);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to add admin",
        variant: "destructive",
      });
    }
  };

  const handleTogglePermission = (userId: number, permission: string, currentValue: boolean) => {
    setPendingChanges(prev => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || {}),
        [permission]: !currentValue,
      },
    }));
  };

  const getEffectivePermission = (userId: number, permission: string, originalValue: boolean): boolean => {
    return pendingChanges[userId]?.[permission] ?? originalValue;
  };

  const hasPendingChanges = (userId: number): boolean => {
    return Object.keys(pendingChanges[userId] || {}).length > 0;
  };

  const handleSavePermissions = async (userId: number, originalPermissions: Record<string, boolean>) => {
    const changes = pendingChanges[userId];
    if (!changes) return;

    const newPermissions = { ...originalPermissions, ...changes };

    try {
      await updateAdmin.mutateAsync({ userId, permissions: newPermissions as Record<string, boolean> & { can_broadcast: boolean; can_ban: boolean; can_genlink: boolean; can_batch: boolean; can_custom_batch: boolean; can_auto_link: boolean; can_delete_files: boolean; can_view_stats: boolean; can_manage_fsub: boolean; can_set_delete_time: boolean } });
      toast({ title: "Permissions updated", description: "Admin permissions have been saved." });
      setPendingChanges(prev => {
        const { [userId]: _, ...rest } = prev;
        return rest;
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update permissions",
        variant: "destructive",
      });
    }
  };

  const handleRemoveAdmin = async (userId: number) => {
    try {
      await removeAdmin.mutateAsync(userId);
      toast({ title: "Admin removed", description: "Admin has been removed successfully." });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to remove admin",
        variant: "destructive",
      });
    }
  };

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">Error loading admins: {error.message}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Bot Admins</h1>
            <p className="text-muted-foreground mt-1">
              Manage Telegram bot administrators and their permissions
            </p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Admin
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Admin</DialogTitle>
                <DialogDescription>
                  Enter the Telegram user ID of the person you want to add as an admin.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Telegram User ID</Label>
                  <Input
                    type="number"
                    placeholder="123456789"
                    value={newAdmin.user_id}
                    onChange={(e) => setNewAdmin(prev => ({ ...prev, user_id: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Name (optional)</Label>
                  <Input
                    placeholder="Admin name"
                    value={newAdmin.name}
                    onChange={(e) => setNewAdmin(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button onClick={handleAddAdmin} disabled={addAdmin.isPending}>
                  {addAdmin.isPending ? "Adding..." : "Add Admin"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : data?.admins.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <UserCog className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Admins Yet</h3>
              <p className="text-muted-foreground text-center mt-1 mb-4">
                Add your first bot admin to manage permissions
              </p>
              <Button onClick={() => setIsAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Admin
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="multiple" className="space-y-4">
            {data?.admins.map((admin) => (
              <AccordionItem key={admin.user_id} value={String(admin.user_id)} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{admin.name}</span>
                        {hasPendingChanges(admin.user_id) && (
                          <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                            Unsaved
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">ID: {admin.user_id}</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 pb-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    {Object.entries(PERMISSION_LABELS).map(([key, { label, description }]) => (
                      <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium">{label}</Label>
                          <p className="text-xs text-muted-foreground">{description}</p>
                        </div>
                        <Switch
                          checked={getEffectivePermission(
                            admin.user_id,
                            key,
                            admin.permissions[key as keyof typeof admin.permissions]
                          )}
                          onCheckedChange={() => handleTogglePermission(
                            admin.user_id,
                            key,
                            getEffectivePermission(admin.user_id, key, admin.permissions[key as keyof typeof admin.permissions])
                          )}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveAdmin(admin.user_id)}
                      disabled={removeAdmin.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove Admin
                    </Button>
                    {hasPendingChanges(admin.user_id) && (
                      <Button
                        size="sm"
                        onClick={() => handleSavePermissions(admin.user_id, admin.permissions as unknown as Record<string, boolean>)}
                        disabled={updateAdmin.isPending}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Added on {formatDate(admin.created_at)}
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </DashboardLayout>
  );
}
