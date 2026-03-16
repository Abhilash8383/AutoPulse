import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Phone, Mail, Calendar } from "lucide-react";
import { Visitor, Session } from "../types";
import { SessionsList } from "./SessionsList";
import { formatDate, getInitials } from "../utils/formatters";
import apiClient from "@/lib/api";

interface VisitorDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitor: Visitor | null;
  expandedSessions: Set<string>;
  onToggleSession: (sessionId: string, open: boolean) => void;
  onAddTestDrive: (session: Session) => void;
  onExitSession: (session: Session) => void;
  sessionSubmitting: boolean;
  refreshTrigger?: number; // Add this to force refresh when sessions are updated
}

export function VisitorDetailsModal({
  open,
  onOpenChange,
  visitor,
  expandedSessions,
  onToggleSession,
  onAddTestDrive,
  onExitSession,
  sessionSubmitting,
  refreshTrigger,
}: VisitorDetailsModalProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch sessions when modal opens, visitor changes, or refresh is triggered
  useEffect(() => {
    const fetchVisitorSessions = async () => {
      if (!visitor || !open) {
        setSessions([]);
        return;
      }

      setLoading(true);
      try {
        const response = await apiClient.get(
          `/sessions?visitorId=${visitor.id}&limit=100`,
        );
        setSessions(response.data.sessions || []);
      } catch (error) {
        console.error("Failed to fetch visitor sessions:", error);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVisitorSessions();
  }, [visitor, open, refreshTrigger]);

  if (!visitor) return null;

  const initials = getInitials(visitor.firstName, visitor.lastName);
  const lastVisit =
    sessions.length > 0
      ? formatDate(
          sessions.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )[0].createdAt,
        )
      : formatDate(visitor.createdAt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0 flex flex-col gap-0">
        {/* Fixed Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center font-semibold text-base shrink-0">
              {initials}
            </div>

            <div className="flex-1 min-w-0 space-y-2.5">
              <DialogTitle className="text-xl font-semibold">
                {[visitor.firstName, visitor.lastName].filter(Boolean).join(" ") || "—"}
              </DialogTitle>

              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {visitor.whatsappNumber ?? "—"}
                </div>
                {visitor.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {visitor.email}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {lastVisit}
                </div>
              </div>

              {visitor.interests && visitor.interests.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {visitor.interests.map((interest, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {interest.model.category.name} - {interest.model.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Sessions Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          <div className="mb-4">
            <h3 className="text-xs font-medium text-muted-foreground">
              {sessions.length} Session{sessions.length !== 1 ? "s" : ""}
            </h3>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin mb-2" />
              <span className="text-sm text-muted-foreground">
                Loading sessions...
              </span>
            </div>
          ) : (
            <SessionsList
              sessions={sessions}
              expandedSessions={expandedSessions}
              onToggleSession={onToggleSession}
              onAddTestDrive={onAddTestDrive}
              onExitSession={onExitSession}
              sessionSubmitting={sessionSubmitting}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
