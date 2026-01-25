import { Files, Users, Download, HardDrive } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentFilesTable } from "@/components/dashboard/RecentFilesTable";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { BotStatus } from "@/components/dashboard/BotStatus";

const Index = () => {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor your File Share Bot performance and activity
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Files"
            value="2,847"
            change="+12% from last month"
            changeType="positive"
            icon={Files}
            iconColor="text-blue-400"
          />
          <StatsCard
            title="Active Users"
            value="1,429"
            change="+8% from last month"
            changeType="positive"
            icon={Users}
            iconColor="text-primary"
          />
          <StatsCard
            title="Downloads Today"
            value="3,215"
            change="+23% from yesterday"
            changeType="positive"
            icon={Download}
            iconColor="text-green-400"
          />
          <StatsCard
            title="Storage Used"
            value="124 GB"
            change="62% of 200GB"
            changeType="neutral"
            icon={HardDrive}
            iconColor="text-purple-400"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RecentFilesTable />
          </div>
          <div className="space-y-6">
            <BotStatus status="online" uptime="5d 12h 34m" version="4.0.0" />
            <ActivityFeed />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
