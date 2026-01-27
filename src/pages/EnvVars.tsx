import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Loader2, 
  Key, 
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useEnvVars, useCreateEnvVar, useDeleteEnvVar } from "@/hooks/useBotData";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const EnvVars = () => {
  const { isOwner } = useAuth();
  const { data, isLoading, error, refetch } = useEnvVars();
  const createEnvVar = useCreateEnvVar();
  const deleteEnvVar = useDeleteEnvVar();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [newEnvVar, setNewEnvVar] = useState({
    key: "",
    value: "",
    description: "",
    is_secret: false,
    sync_to_render: false,
    render_service_id: "",
  });

  const envVars = data?.envVars || [];

  const handleCreate = async () => {
    if (!newEnvVar.key || !newEnvVar.value) {
      toast.error("Key and value are required");
      return;
    }

    try {
      await createEnvVar.mutateAsync(newEnvVar);
      toast.success("Environment variable created");
      setIsDialogOpen(false);
      setNewEnvVar({
        key: "",
        value: "",
        description: "",
        is_secret: false,
        sync_to_render: false,
        render_service_id: "",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create env var");
    }
  };

  const handleDelete = async (key: string) => {
    try {
      await deleteEnvVar.mutateAsync({ key });
      toast.success("Environment variable deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete env var");
    }
  };

  if (!isOwner) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <AlertTriangle className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground mt-2">
            Only the owner can manage environment variables
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Environment Variables</h1>
            <p className="text-muted-foreground mt-1">
              Manage your bot's environment configuration
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Variable
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle>Add Environment Variable</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="key">Key</Label>
                    <Input
                      id="key"
                      placeholder="BOT_TOKEN"
                      value={newEnvVar.key}
                      onChange={(e) => setNewEnvVar({ ...newEnvVar, key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_") })}
                      className="bg-secondary border-border font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="value">Value</Label>
                    <Textarea
                      id="value"
                      placeholder="Enter value..."
                      value={newEnvVar.value}
                      onChange={(e) => setNewEnvVar({ ...newEnvVar, value: e.target.value })}
                      className="bg-secondary border-border font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Input
                      id="description"
                      placeholder="What is this variable for?"
                      value={newEnvVar.description}
                      onChange={(e) => setNewEnvVar({ ...newEnvVar, description: e.target.value })}
                      className="bg-secondary border-border"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Secret Value</p>
                      <p className="text-sm text-muted-foreground">Hide value in UI</p>
                    </div>
                    <Switch
                      checked={newEnvVar.is_secret}
                      onCheckedChange={(checked) => setNewEnvVar({ ...newEnvVar, is_secret: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Sync to Render</p>
                      <p className="text-sm text-muted-foreground">Also update on Render hosting</p>
                    </div>
                    <Switch
                      checked={newEnvVar.sync_to_render}
                      onCheckedChange={(checked) => setNewEnvVar({ ...newEnvVar, sync_to_render: checked })}
                    />
                  </div>
                  {newEnvVar.sync_to_render && (
                    <div className="space-y-2">
                      <Label htmlFor="render_service_id">Render Service ID</Label>
                      <Input
                        id="render_service_id"
                        placeholder="srv-..."
                        value={newEnvVar.render_service_id}
                        onChange={(e) => setNewEnvVar({ ...newEnvVar, render_service_id: e.target.value })}
                        className="bg-secondary border-border font-mono"
                      />
                    </div>
                  )}
                  <Button 
                    onClick={handleCreate} 
                    className="w-full bg-primary text-primary-foreground"
                    disabled={createEnvVar.isPending}
                  >
                    {createEnvVar.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Variable
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Env Vars List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-center">
              <p className="text-destructive">Failed to load environment variables</p>
              <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
            </div>
          ) : envVars.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No environment variables</p>
              <p className="text-muted-foreground mt-1">
                Add your first variable to get started
              </p>
            </div>
          ) : (
            envVars.map((envVar, index) => (
              <div
                key={envVar.id}
                className="rounded-xl border border-border bg-card p-4 animate-fade-in"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono font-semibold text-primary">
                        {envVar.key}
                      </code>
                      {envVar.is_secret && (
                        <Badge variant="outline" className="text-xs">
                          Secret
                        </Badge>
                      )}
                    </div>
                    {envVar.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {envVar.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <code className="text-sm font-mono bg-secondary px-2 py-1 rounded flex-1 truncate">
                        {envVar.is_secret && !showValues[envVar.id]
                          ? "••••••••••••"
                          : envVar.value}
                      </code>
                      {envVar.is_secret && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            setShowValues((prev) => ({ ...prev, [envVar.id]: !prev[envVar.id] }))
                          }
                        >
                          {showValues[envVar.id] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card border-border">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Environment Variable</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete <code className="font-mono">{envVar.key}</code>?
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => handleDelete(envVar.key)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EnvVars;
