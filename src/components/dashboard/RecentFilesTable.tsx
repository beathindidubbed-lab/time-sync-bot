import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Image, Video, Music, Archive, File } from "lucide-react";

const files = [
  {
    id: "1",
    name: "project_docs.pdf",
    type: "document",
    size: "2.4 MB",
    downloads: 156,
    uploadedBy: "@john_doe",
    date: "2 hours ago",
  },
  {
    id: "2",
    name: "banner_image.png",
    type: "image",
    size: "1.2 MB",
    downloads: 89,
    uploadedBy: "@jane_smith",
    date: "4 hours ago",
  },
  {
    id: "3",
    name: "tutorial_video.mp4",
    type: "video",
    size: "45.8 MB",
    downloads: 234,
    uploadedBy: "@admin",
    date: "Yesterday",
  },
  {
    id: "4",
    name: "soundtrack.mp3",
    type: "audio",
    size: "8.3 MB",
    downloads: 67,
    uploadedBy: "@mike_wilson",
    date: "2 days ago",
  },
  {
    id: "5",
    name: "source_code.zip",
    type: "archive",
    size: "12.1 MB",
    downloads: 312,
    uploadedBy: "@dev_team",
    date: "3 days ago",
  },
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

export function RecentFilesTable() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold">Recent Files</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Latest files shared through your bot
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-muted-foreground">File</TableHead>
            <TableHead className="text-muted-foreground">Size</TableHead>
            <TableHead className="text-muted-foreground">Downloads</TableHead>
            <TableHead className="text-muted-foreground">Uploaded By</TableHead>
            <TableHead className="text-muted-foreground text-right">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file, index) => {
            const IconComponent = fileIcons[file.type] || File;
            const iconColor = fileColors[file.type] || "text-muted-foreground";
            return (
              <TableRow
                key={file.id}
                className="border-border hover:bg-secondary/50 cursor-pointer transition-colors animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
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
                <TableCell className="text-right text-muted-foreground">{file.date}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
