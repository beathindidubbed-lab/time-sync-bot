import { useState } from "react";
import {
  Tag, Plus, Pencil, Trash2, Loader2, Check, X, Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import {
  useLinkCategories, useCreateCategory, useUpdateCategory, useDeleteCategory,
  type LinkCategory,
} from "@/hooks/useLinks";

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#ef4444", "#f97316",
  "#eab308", "#84cc16", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6", "#6d28d9", "#78716c",
];

export function CategoryManager() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#6366f1");
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");
  const [deleteTarget, setDeleteTarget] = useState<LinkCategory | null>(null);

  const { data: categories, isLoading } = useLinkCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createCategory.mutateAsync({ name: newName.trim(), color: newColor });
      toast({ title: "Category created", description: `"${newName.trim()}" added` });
      setNewName("");
      setNewColor("#6366f1");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const startEdit = (cat: LinkCategory) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditColor("#6366f1");
  };

  const handleUpdate = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      await updateCategory.mutateAsync({ id: editingId, name: editName.trim(), color: editColor });
      toast({ title: "Updated", description: `Category renamed to "${editName.trim()}"` });
      cancelEdit();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCategory.mutateAsync(deleteTarget.id);
      toast({ title: "Deleted", description: `"${deleteTarget.name}" removed` });
      setDeleteTarget(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="border-border">
            <Tag className="h-4 w-4 mr-2" />
            Manage Categories
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              Manage Categories
            </DialogTitle>
            <DialogDescription>
              Create, edit, or delete link categories with custom colors.
            </DialogDescription>
          </DialogHeader>

          {/* New category form */}
          <div className="flex items-end gap-2 pt-2">
            <div className="flex-1 space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">New Category</label>
              <Input
                placeholder="e.g. Anime, Movies..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <ColorPicker color={newColor} onChange={setNewColor} />
            <Button
              size="icon"
              onClick={handleCreate}
              disabled={!newName.trim() || createCategory.isPending}
              className="shrink-0"
            >
              {createCategory.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Category list */}
          <div className="mt-4 space-y-1 max-h-[320px] overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !categories?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No categories yet. Create one above!
              </p>
            ) : (
              categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-secondary/60 transition-colors group"
                >
                  {editingId === cat.id ? (
                    /* Edit mode */
                    <>
                      <ColorPicker color={editColor} onChange={setEditColor} />
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdate();
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="h-8 flex-1"
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-success hover:text-success"
                        onClick={handleUpdate}
                        disabled={updateCategory.isPending}
                      >
                        {updateCategory.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={cancelEdit}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    /* View mode */
                    <>
                      <div
                        className="w-4 h-4 rounded-full shrink-0 ring-1 ring-border"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="flex-1 text-sm font-medium truncate">{cat.name}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => startEdit(cat)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(cat)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{deleteTarget?.name}" from all links. Links won't be deleted, just un-categorized.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCategory.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* Small inline color picker popover */
function ColorPicker({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        className="h-10 w-10 rounded-md border border-border flex items-center justify-center hover:border-primary/50 transition-colors"
        style={{ backgroundColor: color + "20" }}
        onClick={() => setOpen(!open)}
      >
        <div className="w-5 h-5 rounded-full ring-1 ring-border" style={{ backgroundColor: color }} />
      </button>
      {open && (
        <div className="absolute bottom-full mb-2 left-0 z-50 p-2 rounded-lg border border-border bg-popover shadow-lg grid grid-cols-4 gap-1.5 min-w-[140px]">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`w-7 h-7 rounded-full ring-1 transition-all hover:scale-110 ${
                c === color ? "ring-2 ring-primary ring-offset-2 ring-offset-popover" : "ring-border"
              }`}
              style={{ backgroundColor: c }}
              onClick={() => { onChange(c); setOpen(false); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
