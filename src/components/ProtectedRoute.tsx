import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOwner?: boolean;
}

export function ProtectedRoute({ children, requireOwner = false }: ProtectedRouteProps) {
  const { user, loading, isAuthorized, isOwner } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access this dashboard. Contact the owner to request access.
          </p>
          <a
            href="https://t.me/Beat_Anime_Discussion"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-primary hover:underline"
          >
            Contact Support
          </a>
        </div>
      </div>
    );
  }

  if (requireOwner && !isOwner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold text-warning">Owner Access Required</h1>
          <p className="text-muted-foreground">
            This section is restricted to owners only.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
