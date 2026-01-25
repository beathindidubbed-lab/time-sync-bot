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

const allFiles = [
  { id: "1", name: "project_docs.pdf", type: "document", size: "2.4 MB", downloads: 156, uploadedBy: "@john_doe", date: "Jan 25, 2026" },
  { id: "2", name: "banner_image.png", type: "image", size: "1.2 MB", downloads: 89, uploadedBy: "@jane_smith", date: "Jan 25, 2026" },
  { id: "3", name: "tutorial_video.mp4", type: "video", size: "45.8 MB", downloads: 234, uploadedBy: "@admin", date: "Jan 24, 2026" },
  { id: "4", name: "soundtrack.mp3", type: "audio", size: "8.3 MB", downloads: 67, uploadedBy: "@mike_wilson", date: "Jan 23, 2026" },
  { id: "5", name: "source_code.zip", type: "archive", size: "12.1 MB", downloads: 312, uploadedBy: "@dev_team", date: "Jan 22, 2026" },
  { id: "6", name: "presentation.pptx", type: "document", size: "5.6 MB", downloads: 45, uploadedBy: "@sarah_lee", date: "Jan 22, 2026" },
  { id: "7", name: "logo_designs.zip", type: "archive", size: "28.3 MB", downloads: 178, uploadedBy: "@designer", date: "Jan 21, 2026" },
  { id: "8", name: "podcast_ep12.mp3", type: "audio", size: "42.1 MB", downloads: 523, uploadedBy: "@podcast_team", date: "Jan 20, 2026" },
];

const fileIcons: Record<string, typeof File> = {
  document: FileText,
  image: Image,
  video: Video,
  audio: Music,
  archive: Archive,
};

const fileColors: Record<string, string> = {
  document: "text-blue-400",
  image: "text-green-400",
  video: "text-purple-400",
  audio: "text-yellow-400",
  archive: "text-orange-400",
};

const Files = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFiles = allFiles.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold tracking-tight">Files</h1>
          <p className="text-muted-foreground mt-1">
            Manage all files shared through your bot
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary border-border"
            />
          </div>
          <Button variant="outline" className="border-border">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Files Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">File</TableHead>
                <TableHead className="text-muted-foreground">Size</TableHead>
                <TableHead className="text-muted-foreground">Downloads</TableHead>
                <TableHead className="text-muted-foreground">Uploaded By</TableHead>
                <TableHead className="text-muted-foreground">Date</TableHead>
                <TableHead className="text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFiles.map((file, index) => {
                const IconComponent = fileIcons[file.type] || File;
                const iconColor = fileColors[file.type] || "text-muted-foreground";
                return (
                  <TableRow
                    key={file.id}
                    className="border-border hover:bg-secondary/50 transition-colors animate-fade-in"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-secondary ${iconColor}`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{file.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{file.size}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                        {file.downloads}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{file.uploadedBy}</TableCell>
                    <TableCell className="text-muted-foreground">{file.date}</TableCell>
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
                            Download
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
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Files;
