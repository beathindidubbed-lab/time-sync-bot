import { useState } from "react";
import {
  Link2,
  Search,
  Filter,
  Plus,
  Trash2,
  MoreVertical,
  Loader2,
  ExternalLink,
  Copy,
  ToggleLeft,
  ToggleRight,
  Tag,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  useBotLinks, useLinkCategories, useLinkStats,
  useCreateLink, useDeleteLink, useToggleLinkActive,
} from "@/hooks/useLinks";
import { formatDate } from "@/hooks/useBotData";
import { CategoryManager } from "@/components/links/CategoryManager";

const linkTypeLabels: Record<string, string> = {
  single: "Single",
  batch: "Batch",
  custom_batch: "Custom Batch",
};

const Links = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newLink, setNewLink] = useState({
    name: "", bot_link: "", category_id: "", link_type: "single", notes: "",
  });

  const { data: linksData, isLoading, error } = useBotLinks(page, 20, searchQuery, categoryFilter);
  const { data: categories } = useLinkCategories();
  const { data: stats } = useLinkStats();
  const createLink = useCreateLink();
  const deleteLink = useDeleteLink();
  const toggleActive = useToggleLinkActive();

  const links = linksData?.links || [];
  const pagination = linksData?.pagination;

  const handleCreateLink = async () => {
    if (!newLink.name || !newLink.bot_link) {
      toast({ title: "Error", description: "Name and link are required", variant: "destructive" });
      return;
    }
    try {
      await createLink.mutateAsync(newLink);
      toast({ title: "Link created", description: `"${newLink.name}" added successfully` });
      setDialogOpen(false);
      setNewLink({ name: "", bot_link: "", category_id: "", link_type: "single", notes: "" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteLink.mutateAsync(id);
      toast({ title: "Deleted", description: `"${name}" removed` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({ title: "Copied", description: "Link copied to clipboard" });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Bot Links</h1>
            <p className="text-muted-foreground mt-1">Manage all generated links for your bot</p>
          </div>
          <div className="flex items-center gap-2">
            <CategoryManager />
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Add Link</Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Link</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input placeholder="e.g. Naruto Season 1" value={newLink.name}
                    onChange={(e) => setNewLink(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Bot Link *</Label>
                  <Input placeholder="https://t.me/YourBot?start=..." value={newLink.bot_link}
                    onChange={(e) => setNewLink(p => ({ ...p, bot_link: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={newLink.category_id}
                    onValueChange={(v) => setNewLink(p => ({ ...p, category_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories?.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                            {cat.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Link Type</Label>
                  <Select value={newLink.link_type}
                    onValueChange={(v) => setNewLink(p => ({ ...p, link_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="batch">Batch</SelectItem>
                      <SelectItem value="custom_batch">Custom Batch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea placeholder="Optional notes..." value={newLink.notes}
                    onChange={(e) => setNewLink(p => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateLink} disabled={createLink.isPending}>
                  {createLink.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Link
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total Links</p>
            <p className="text-2xl font-bold mt-1">{stats?.total ?? "—"}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Active Links</p>
            <p className="text-2xl font-bold mt-1 text-success">{stats?.active ?? "—"}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Categories</p>
            <p className="text-2xl font-bold mt-1">{categories?.length ?? "—"}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Current Page</p>
            <p className="text-2xl font-bold mt-1">
              {pagination ? `${page} / ${pagination.totalPages || 1}` : "—"}
            </p>
          </div>
        </div>

        {/* Category breakdown */}
        {stats?.byCategory && stats.byCategory.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {stats.byCategory.map((cat) => (
              <Badge key={cat.name} variant="outline" className="px-3 py-1"
                style={{ borderColor: cat.color + "50", color: cat.color, backgroundColor: cat.color + "10" }}>
                {cat.name}: {cat.count}
              </Badge>
            ))}
          </div>
        )}

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search links..." value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="pl-10 bg-secondary border-border" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-border">
                <Filter className="h-4 w-4 mr-2" />
                {categoryFilter
                  ? categories?.find(c => c.id === categoryFilter)?.name || "Filter"
                  : "All Categories"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover border-border">
              <DropdownMenuItem onClick={() => { setCategoryFilter(""); setPage(1); }}>
                All Categories
              </DropdownMenuItem>
              {categories?.map(cat => (
                <DropdownMenuItem key={cat.id}
                  onClick={() => { setCategoryFilter(cat.id); setPage(1); }}>
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: cat.color }} />
                  {cat.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Links Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12 text-destructive">
              Failed to load links: {(error as Error).message}
            </div>
          ) : links.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Link2 className="h-8 w-8" />
              <p>No links found. Create your first link!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Name</TableHead>
                  <TableHead className="text-muted-foreground">Category</TableHead>
                  <TableHead className="text-muted-foreground">Type</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Created By</TableHead>
                  <TableHead className="text-muted-foreground">Date</TableHead>
                  <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map((link, index) => (
                  <TableRow key={link.id}
                    className="border-border hover:bg-secondary/50 transition-colors animate-fade-in"
                    style={{ animationDelay: `${index * 30}ms` }}>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="font-medium truncate max-w-[220px]">{link.name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[220px]">
                          {link.bot_link}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {link.category ? (
                        <Badge variant="outline" className="text-xs"
                          style={{
                            borderColor: link.category.color + "50",
                            color: link.category.color,
                            backgroundColor: link.category.color + "10",
                          }}>
                          {link.category.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {linkTypeLabels[link.link_type] || link.link_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={link.is_active ? "default" : "outline"}
                        className={link.is_active
                          ? "bg-success/10 text-success border-success/30"
                          : "text-muted-foreground"}>
                        {link.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {link.created_by_name || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(link.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover border-border">
                          <DropdownMenuItem className="cursor-pointer"
                            onClick={() => handleCopyLink(link.bot_link)}>
                            <Copy className="h-4 w-4 mr-2" />Copy Link
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer"
                            onClick={() => window.open(link.bot_link, "_blank")}>
                            <ExternalLink className="h-4 w-4 mr-2" />Open Link
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer"
                            onClick={() => toggleActive.mutate({
                              linkId: link.id, isActive: !link.is_active
                            })}>
                            {link.is_active
                              ? <><ToggleLeft className="h-4 w-4 mr-2" />Deactivate</>
                              : <><ToggleRight className="h-4 w-4 mr-2" />Activate</>}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer text-destructive focus:text-destructive"
                            onClick={() => handleDelete(link.id, link.name)}>
                            <Trash2 className="h-4 w-4 mr-2" />Delete
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
              {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} links
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                Previous
              </Button>
              <Button variant="outline" size="sm"
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Links;
