import { useState } from "react";
import { Search, Filter, MoreVertical, UserX, UserCheck, Shield, Mail, Loader2, Crown, AlertTriangle } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBotUsers, useBanUser, formatDate } from "@/hooks/useBotData";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const Users = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all");
  const { isOwner } = useAuth();
  const { toast } = useToast();
  
  const { data: usersData, isLoading, error } = useBotUsers(page, 20, searchQuery, filter);
  const banUser = useBanUser();

  const users = usersData?.users || [];
  const stats = usersData?.stats;
  const pagination = usersData?.pagination;

  const handleBanToggle = async (userId: string | number, isBanned: boolean) => {
    const action = isBanned ? "unban" : "ban";
    try {
      await banUser.mutateAsync({ userId, action });
      toast({
        title: isBanned ? "User unbanned" : "User banned",
        description: isBanned
          ? "User can now use the bot again."
          : "User has been banned from the bot.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : `Failed to ${action} user`,
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold tracking-tight">Bot Users</h1>
          <p className="text-muted-foreground mt-1">
            Manage users who interact with your Telegram bot
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="text-2xl font-bold mt-1">
              {stats?.total?.toLocaleString() || "—"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Active Users</p>
            <p className="text-2xl font-bold mt-1 text-green-500">
              {stats?.active?.toLocaleString() || "—"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Premium Users</p>
            <p className="text-2xl font-bold mt-1 text-yellow-400">
              {stats?.premium?.toLocaleString() || "—"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Banned Users</p>
            <p className="text-2xl font-bold mt-1 text-destructive">
              {stats?.banned?.toLocaleString() || "—"}
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or user ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pl-10 bg-secondary border-border"
            />
          </div>
          <Select value={filter} onValueChange={(v) => { setFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="banned">Banned Only</SelectItem>
              <SelectItem value="premium">Premium Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Users Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12 text-destructive">
              Failed to load users: {error.message}
            </div>
          ) : users.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              No users found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">User</TableHead>
                  {isOwner && <TableHead className="text-muted-foreground">User ID</TableHead>}
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Joined</TableHead>
                  <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user, index) => (
                  <TableRow
                    key={user._id}
                    className="border-border hover:bg-secondary/50 transition-colors animate-fade-in"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-border">
                          <AvatarFallback className="bg-secondary text-xs">
                            {user.name?.split(" ").map((n) => n[0]).join("") || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{user.name || "Unknown"}</p>
                            {user.is_premium && (
                              <Crown className="h-4 w-4 text-yellow-400" />
                            )}
                            {user.spam_flagged && (
                            <span title="Flagged for spam">
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                            </span>
                            )}
                          </div>
                          {isOwner && user.username && (
                            <p className="text-sm text-muted-foreground">@{user.username}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    {isOwner && (
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {user.user_id}
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          user.banned
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : "bg-green-500/10 text-green-500 border-green-500/20"
                        }
                      >
                        {user.banned ? "Banned" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(user.joined_date)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover border-border">
                          <DropdownMenuItem className="cursor-pointer">
                            <Mail className="h-4 w-4 mr-2" />
                            Message
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer">
                            <Shield className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className={`cursor-pointer ${user.banned ? "text-green-500 focus:text-green-500" : "text-destructive focus:text-destructive"}`}
                            onClick={() => handleBanToggle(user.user_id, user.banned)}
                            disabled={banUser.isPending}
                          >
                            {user.banned ? (
                              <>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Unban User
                              </>
                            ) : (
                              <>
                                <UserX className="h-4 w-4 mr-2" />
                                Ban User
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * pagination.limit + 1} to{" "}
              {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} users
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Users;
