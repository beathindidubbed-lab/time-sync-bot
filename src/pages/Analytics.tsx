import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const downloadData = [
  { name: "Mon", downloads: 1200 },
  { name: "Tue", downloads: 1800 },
  { name: "Wed", downloads: 2100 },
  { name: "Thu", downloads: 1600 },
  { name: "Fri", downloads: 2400 },
  { name: "Sat", downloads: 3200 },
  { name: "Sun", downloads: 2800 },
];

const fileTypeData = [
  { type: "Documents", count: 845 },
  { type: "Images", count: 623 },
  { type: "Videos", count: 412 },
  { type: "Audio", count: 289 },
  { type: "Archives", count: 678 },
];

const Analytics = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Track your bot's performance over time
          </p>
        </div>

        {/* Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Downloads Chart */}
          <div className="rounded-xl border border-border bg-card p-6 animate-fade-in">
            <h3 className="text-lg font-semibold mb-6">Downloads This Week</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={downloadData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="downloads"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* File Types Chart */}
          <div className="rounded-xl border border-border bg-card p-6 animate-fade-in" style={{ animationDelay: "100ms" }}>
            <h3 className="text-lg font-semibold mb-6">Files by Type</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fileTypeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="type"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4 animate-fade-in" style={{ animationDelay: "150ms" }}>
            <p className="text-sm text-muted-foreground">Avg. Daily Downloads</p>
            <p className="text-2xl font-bold mt-1">2,157</p>
            <p className="text-xs text-success mt-1">+15% vs last week</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 animate-fade-in" style={{ animationDelay: "200ms" }}>
            <p className="text-sm text-muted-foreground">Peak Hour</p>
            <p className="text-2xl font-bold mt-1">8 PM</p>
            <p className="text-xs text-muted-foreground mt-1">UTC+0</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 animate-fade-in" style={{ animationDelay: "250ms" }}>
            <p className="text-sm text-muted-foreground">Most Downloaded</p>
            <p className="text-2xl font-bold mt-1">Videos</p>
            <p className="text-xs text-muted-foreground mt-1">45.8% of total</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 animate-fade-in" style={{ animationDelay: "300ms" }}>
            <p className="text-sm text-muted-foreground">User Retention</p>
            <p className="text-2xl font-bold mt-1 text-success">78%</p>
            <p className="text-xs text-muted-foreground mt-1">Return within 7 days</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
