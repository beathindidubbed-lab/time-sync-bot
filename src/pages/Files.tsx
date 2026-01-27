import { useState } from "react";
import {
  FileText,
  Image,
  Video,
  Music,
  Archive,
  File,
  Search,
  Filter,
  Download,
  Trash2,
  MoreVertical,
  Loader2,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dropdown-menu";
import { useBotFiles, useBotStats, formatBytes, formatDate } from "@/hooks/useBotData";

const fileIcons: Record<string, typeof File> = {
  document: FileText,
  image: Image,
  video: Video,
  audio: Music,
  archive: Archive,
  photo: Image,
};

const fileColors: Record<string, string> = {
  document: "text-blue-400",
  image: "text-green-400",
  video: "text-purple-400",
  audio: "text-yellow-400",
  archive: "text-orange-400",
  photo: "text-green-400",
};

const Files = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [fileType, setFileType] = useState("");

  const { data: filesData, isLoading, error } = useBotFiles(page, 20, searchQuery, fileType);
  const { data: statsData } = useBotStats();

  const files = filesData?.files || [];
  const pagination = filesData?.pagination;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold tracking-tight">Bot Files</h1>
          <p className="text-muted-foreground mt-1">
            Manage all files shared through your Telegram bot
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total Files</p>
            <p className="text-2xl font-bold mt-1">
              {statsData?.files.total?.toLocaleString() || "—"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total Storage Used</p>
            <p className="text-2xl font-bold mt-1 text-primary">
              {statsData?.files.totalStorageBytes 
                ? formatBytes(statsData.files.totalStorageBytes)
                : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Current Page</p>
            <p className="text-2xl font-bold mt-1">
              {pagination ? `${page} / ${pagination.totalPages}` : "—"}
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pl-10 bg-secondary border-border"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-border">
                <Filter className="h-4 w-4 mr-2" />
                {fileType || "All Types"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover border-border">
              <DropdownMenuItem onClick={() => { setFileType(""); setPage(1); }}>
                All Types
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setFileType("document"); setPage(1); }}>
                Documents
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setFileType("video"); setPage(1); }}>
                Videos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setFileType("audio"); setPage(1); }}>
                Audio
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setFileType("photo"); setPage(1); }}>
                Photos
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Files Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12 text-destructive">
              Failed to load files: {error.message}
            </div>
          ) : files.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              No files found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">File</TableHead>
                  <TableHead className="text-muted-foreground">Size</TableHead>
                  <TableHead className="text-muted-foreground">Downloads</TableHead>
                  <TableHead className="text-muted-foreground">Date</TableHead>
                  <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file, index) => {
                  const IconComponent = fileIcons[file.file_type] || File;
                  const iconColor = fileColors[file.file_type] || "text-muted-foreground";
                  return (
                    <TableRow
                      key={file._id}
                      className="border-border hover:bg-secondary/50 transition-colors animate-fade-in"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-secondary ${iconColor}`}>
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[200px]">
                              {file.file_name || "Unnamed file"}
                            </p>
                            {file.caption && (
                              <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {file.caption}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {file.file_size ? formatBytes(file.file_size) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                          {file.downloads || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(file.created_at)}
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
                              <Download className="h-4 w-4 mr-2" />
                              Copy Link
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * pagination.limit + 1} to{" "}
              {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} files
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

export default Files;
