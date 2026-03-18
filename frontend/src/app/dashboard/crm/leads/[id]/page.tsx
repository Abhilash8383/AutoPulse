"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getCrmLeadById,
  patchCrmLead,
  type CrmLead,
  type CrmLeadStage,
  type CrmLeadStatus,
} from "@/services/api/crm-leads.service";
import { createCrmNote, getCrmNotes, type CrmNote } from "@/services/api/crm-notes.service";
import { getCrmTimeline, type CrmTimelineEvent } from "@/services/api/crm-timeline.service";

function formatName(lead: CrmLead) {
  const name = [lead.contact.firstName, lead.contact.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || "—";
}

function stageLabel(stage: CrmLeadStage) {
  return stage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function toDatetimeLocal(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string) {
  if (!value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lead, setLead] = useState<CrmLead | null>(null);
  const [activeTab, setActiveTab] = useState("details");

  const [stage, setStage] = useState<CrmLeadStage>("new");
  const [status, setStatus] = useState<CrmLeadStatus>("open");
  const [nextFollowUpAt, setNextFollowUpAt] = useState<string>("");

  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timeline, setTimeline] = useState<CrmTimelineEvent[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notes, setNotes] = useState<CrmNote[]>([]);
  const [noteDraft, setNoteDraft] = useState("");

  const stageOptions = useMemo(
    () =>
      [
        "new",
        "contacted",
        "qualified",
        "appointment",
        "test_drive",
        "negotiation",
        "won",
        "lost",
      ] as const,
    [],
  );
  const statusOptions = useMemo(() => ["open", "won", "lost"] as const, []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    getCrmLeadById(id)
      .then((data) => {
        if (cancelled) return;
        setLead(data);
        setStage(data.stage);
        setStatus(data.status);
        setNextFollowUpAt(toDatetimeLocal(data.nextFollowUpAt));
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err.response?.data?.error || "Failed to load lead");
        router.push("/dashboard/crm/leads");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  useEffect(() => {
    if (!lead) return;
    let cancelled = false;
    setTimelineLoading(true);
    getCrmTimeline({ contactId: lead.contactId, leadId: lead.id })
      .then((res) => {
        if (cancelled) return;
        setTimeline(res.events);
      })
      .catch(() => {
        if (cancelled) return;
        setTimeline([]);
      })
      .finally(() => {
        if (cancelled) return;
        setTimelineLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lead?.id]);

  useEffect(() => {
    if (!lead) return;
    let cancelled = false;
    setNotesLoading(true);
    getCrmNotes({ contactId: lead.contactId, leadId: lead.id })
      .then((res) => {
        if (cancelled) return;
        setNotes(res.notes);
      })
      .catch(() => {
        if (cancelled) return;
        setNotes([]);
      })
      .finally(() => {
        if (cancelled) return;
        setNotesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lead?.id]);

  const onSave = async () => {
    if (!lead) return;
    setSaving(true);
    try {
      const updated = await patchCrmLead(lead.id, {
        stage,
        status,
        nextFollowUpAt: fromDatetimeLocal(nextFollowUpAt),
      });
      setLead(updated);
      toast.success("Lead updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to update lead");
    } finally {
      setSaving(false);
    }
  };

  const onAddNote = async () => {
    if (!lead) return;
    const body = noteDraft.trim();
    if (!body) return;
    try {
      const created = await createCrmNote({
        contactId: lead.contactId,
        leadId: lead.id,
        body,
      });
      setNotes((prev) => [created, ...prev]);
      setNoteDraft("");
      toast.success("Note added");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to add note");
    }
  };

  if (loading) {
    return (
      <div className="py-10 text-center">
        <div className="inline-flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading lead…
        </div>
      </div>
    );
  }

  if (!lead) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{formatName(lead)}</h1>
          <div className="text-sm text-muted-foreground">
            {lead.contact.whatsappNumber}
            {lead.contact.email ? ` • ${lead.contact.email}` : ""}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/dashboard/crm/leads")}>
            Back
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </span>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Stage
                  </div>
                  <Select
                    value={stage}
                    onValueChange={(v) => setStage(v as CrmLeadStage)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {stageOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {stageLabel(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Status
                  </div>
                  <Select
                    value={status}
                    onValueChange={(v) => setStatus(v as CrmLeadStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Next follow-up
                  </div>
                  <Input
                    type="datetime-local"
                    value={nextFollowUpAt}
                    onChange={(e) => setNextFollowUpAt(e.target.value)}
                  />
                  <div className="text-xs text-muted-foreground">
                    Clear the field to remove next follow-up.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="text-sm font-semibold">Lead info</div>
              <div className="text-sm text-muted-foreground">
                Source: <span className="text-foreground">{lead.sourceType}</span>{" "}
                • Source ID: <span className="text-foreground">{lead.sourceId}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              {timelineLoading ? (
                <div className="text-sm text-muted-foreground">Loading timeline…</div>
              ) : timeline.length === 0 ? (
                <div className="text-sm text-muted-foreground">No timeline yet.</div>
              ) : (
                <div className="space-y-3">
                  {timeline.map((e) => (
                    <div key={e.id} className="rounded-md border p-3">
                      <div className="text-sm font-medium">{e.type}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(e.createdAt).toLocaleString("en-IN")}{" "}
                        {e.createdByUser?.email ? `• ${e.createdByUser.email}` : ""}
                      </div>
                      {e.payload ? (
                        <pre className="mt-2 text-xs whitespace-pre-wrap text-muted-foreground">
                          {JSON.stringify(e.payload, null, 2)}
                        </pre>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-2">
                <Input
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Add a note…"
                />
                <Button onClick={onAddNote} disabled={!noteDraft.trim()}>
                  Add
                </Button>
              </div>

              {notesLoading ? (
                <div className="text-sm text-muted-foreground">Loading notes…</div>
              ) : notes.length === 0 ? (
                <div className="text-sm text-muted-foreground">No notes yet.</div>
              ) : (
                <div className="space-y-3">
                  {notes.map((n) => (
                    <div key={n.id} className="rounded-md border p-3">
                      <div className="text-sm whitespace-pre-wrap">{n.body}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(n.createdAt).toLocaleString("en-IN")}{" "}
                        {n.createdByUser?.email ? `• ${n.createdByUser.email}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

