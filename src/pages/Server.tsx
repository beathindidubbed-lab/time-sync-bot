import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ServerStats } from "@/components/dashboard/ServerStats";
import { StorageCard } from "@/components/dashboard/StorageCard";
import { BotStatus } from "@/components/dashboard/BotStatus";
import { useAuth } from "@/contexts/AuthContext";

const Server = () => {
  const { isOwner } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold tracking-tight">Server Status</h1>
          <p className="text-muted-foreground mt-1">
            Monitor server performance and storage usage
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ServerStats showConfidential={isOwner} />
          <div className="space-y-6">
            <BotStatus status="online" uptime="5d 12h 34m" version="4.0.0" />
            <StorageCard />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Server;
