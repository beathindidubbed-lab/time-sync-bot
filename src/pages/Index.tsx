import { Link2, Users, HardDrive, TrendingUp } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { BotStatus } from "@/components/dashboard/BotStatus";
import { StorageCard } from "@/components/dashboard/StorageCard";
import { useAuth } from "@/contexts/AuthContext";
import { useBotStats } from "@/hooks/useBotData";
import { useLinkStats, useStorageStats } from "@/hooks/useLinks";

const Index = () => {
  const { isOwner } = useAuth();
  const { data: stats } = useBotStats();
  const { data: linkStats } = useLinkStats();
  const { data: storageData } = useStorageStats();

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor your Beat Animes File Share Bot performance
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Links"
            value={linkStats?.total?.toLocaleString() || "0"}
            change={`${linkStats?.active || 0} active`}
            changeType="positive"
            icon={Link2}
            iconColor="text-primary"
          />
          {isOwner && (
            <StatsCard
              title="Total Users"
              value={stats?.users.total?.toLocaleString() || "—"}
              change={`${stats?.users.banned || 0} banned`}
              changeType="neutral"
              icon={Users}
              iconColor="text-blue-400"
            />
          )}
          <StatsCard
            title="Premium Users"
            value={stats?.users.premium?.toLocaleString() || "—"}
            change="Active subscribers"
            changeType="positive"
            icon={TrendingUp}
            iconColor="text-yellow-400"
          />
          <StatsCard
            title="New This Week"
            value={stats?.users.recentWeek?.toLocaleString() || "—"}
            change="New registrations"
            changeType="positive"
            icon={Users}
            iconColor="text-green-400"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ActivityFeed />
          </div>
          <div className="space-y-6">
            <BotStatus />
            <StorageCard
              usedBytes={storageData?.used_storage_bytes || undefined}
              totalBytes={storageData?.total_storage_bytes || undefined}
              fileCount={storageData?.file_count || undefined}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
