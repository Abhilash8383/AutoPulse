"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
import { getContactActivity, type ContactActivityResponse } from "@/services/api/contact.service";
import apiClient from "@/lib/api";

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

  const [contactActivityLoading, setContactActivityLoading] = useState(false);
  const [contactActivity, setContactActivity] = useState<ContactActivityResponse | null>(null);
  const [sourceRecordError, setSourceRecordError] = useState<string | null>(null);
  const [sourceSaving, setSourceSaving] = useState(false);

  type LeadScopePriority = "hot" | "warm" | "cold";

  type LeadSourceOption = { id: string; name: string };
  type VehicleModelOption = {
    id: string;
    name: string;
    variants?: Array<{ id: string; name: string }>;
  };
  type VehicleCategoryOption = { id: string; name: string; models: VehicleModelOption[] };

  const [leadScopeEditor, setLeadScopeEditor] = useState<LeadScopePriority>("warm");
  const [leadSourceIdEditor, setLeadSourceIdEditor] = useState<string>("");
  const [interestedModelIdEditor, setInterestedModelIdEditor] = useState<string>("");
  const [interestedVariantIdEditor, setInterestedVariantIdEditor] = useState<string>("");
  const [sourceReasonEditor, setSourceReasonEditor] = useState<string>("");

  const [deliveryModelIdEditor, setDeliveryModelIdEditor] = useState<string>("");
  const [deliveryVariantIdEditor, setDeliveryVariantIdEditor] = useState<string>("");
  const [deliveryDateEditor, setDeliveryDateEditor] = useState<string>("");
  const [deliveryStatusEditor, setDeliveryStatusEditor] = useState<string>("");
  const [deliveryDescriptionEditor, setDeliveryDescriptionEditor] = useState<string>("");
  const [deliveryTicketIdToEdit, setDeliveryTicketIdToEdit] = useState<string | null>(null);

  const [leadSourcesLoading, setLeadSourcesLoading] = useState(false);
  const [leadSources, setLeadSources] = useState<LeadSourceOption[]>([]);

  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categories, setCategories] = useState<VehicleCategoryOption[]>([]);

  const allModels = useMemo(
    () => categories.flatMap((c) => c.models ?? []),
    [categories],
  );

  const selectedInterestedModel = allModels.find(
    (m) => m.id === interestedModelIdEditor,
  );
  const selectedInterestedVariants = selectedInterestedModel?.variants ?? [];

  const selectedDeliveryModel = allModels.find(
    (m) => m.id === deliveryModelIdEditor,
  );
  const selectedDeliveryVariants = selectedDeliveryModel?.variants ?? [];

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

  // Load the intake source data from the linked Contact.
  // We need this so dealerships can edit source details (vehicle interest, leadScope, etc).
  useEffect(() => {
    if (!lead) return;
    let cancelled = false;
    setContactActivityLoading(true);
    setSourceRecordError(null);

    getContactActivity(lead.contactId)
      .then((data) => {
        if (cancelled) return;
        setContactActivity(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setContactActivity(null);
        setSourceRecordError(
          err?.response?.data?.error || "Failed to load source details",
        );
      })
      .finally(() => {
        if (cancelled) return;
        setContactActivityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lead?.id, lead?.contactId]);

  // Prefill editor state from the correct intake record using sourceType/sourceId.
  useEffect(() => {
    if (!lead || !contactActivity) return;
    setSourceRecordError(null);
    setSourceReasonEditor("");
    setLeadScopeEditor("warm");
    setLeadSourceIdEditor("");
    setInterestedModelIdEditor("");
    setInterestedVariantIdEditor("");
    setDeliveryTicketIdToEdit(null);
    setDeliveryModelIdEditor("");
    setDeliveryVariantIdEditor("");
    setDeliveryDateEditor("");
    setDeliveryStatusEditor("");
    setDeliveryDescriptionEditor("");

    const latestDelivery = contactActivity.deliveryTickets?.[0];
    if (latestDelivery) {
      setDeliveryTicketIdToEdit(latestDelivery.id);
      setDeliveryModelIdEditor(latestDelivery.modelId ?? "");
      setDeliveryVariantIdEditor(latestDelivery.variantId ?? "");
      setDeliveryDateEditor(toDatetimeLocal(latestDelivery.deliveryDate ?? null) ?? "");
      setDeliveryStatusEditor(latestDelivery.status ?? "");
      setDeliveryDescriptionEditor(latestDelivery.description ?? "");
    }

    if (lead.sourceType === "digital_enquiry") {
      const rec = contactActivity.digitalEnquiries.find((e) => e.id === lead.sourceId);
      if (!rec) {
        setSourceRecordError("Digital enquiry record not found for this lead.");
        return;
      }
      setLeadScopeEditor((rec.leadScope as LeadScopePriority) || "warm");
      setLeadSourceIdEditor(rec.leadSourceId ?? "");
      setInterestedModelIdEditor(rec.interestedModelId ?? "");
      setInterestedVariantIdEditor(rec.interestedVariantId ?? "");
      setSourceReasonEditor(rec.reason ?? "");
      return;
    }

    if (lead.sourceType === "field_inquiry") {
      const rec = contactActivity.fieldInquiries.find((e) => e.id === lead.sourceId);
      if (!rec) {
        setSourceRecordError("Field inquiry record not found for this lead.");
        return;
      }
      setLeadScopeEditor((rec.leadScope as LeadScopePriority) || "warm");
      setLeadSourceIdEditor(rec.leadSourceId ?? "");
      setInterestedModelIdEditor(rec.interestedModelId ?? "");
      setInterestedVariantIdEditor(rec.interestedVariantId ?? "");
      setSourceReasonEditor(rec.reason ?? "");
      return;
    }

    // For import leads we typically don't have a separate intake module record.
    setSourceReasonEditor("");
  }, [lead?.id, lead?.sourceType, lead?.sourceId, contactActivity]);

  // Dropdown options for lead source + model/variant pickers.
  useEffect(() => {
    if (!lead) return;
    let cancelled = false;

    const run = async () => {
      setLeadSourcesLoading(true);
      setCategoriesLoading(true);
      try {
        const [leadSourcesRes, categoriesRes] = await Promise.all([
          apiClient.get("/lead-sources"),
          apiClient.get("/categories"),
        ]);

        if (cancelled) return;

        const parsedLeadSources: LeadSourceOption[] =
          leadSourcesRes.data?.leadSources ??
          (Array.isArray(leadSourcesRes.data) ? leadSourcesRes.data : []);

        const parsedCategories: VehicleCategoryOption[] =
          categoriesRes.data?.categories ??
          (Array.isArray(categoriesRes.data) ? categoriesRes.data : []);

        setLeadSources(parsedLeadSources);
        setCategories(parsedCategories);
      } catch {
        if (cancelled) return;
        setLeadSources([]);
        setCategories([]);
      } finally {
        if (cancelled) return;
        setLeadSourcesLoading(false);
        setCategoriesLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [lead?.id]);

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

  const refreshContactActivity = async () => {
    if (!lead) return;
    setContactActivityLoading(true);
    try {
      const data = await getContactActivity(lead.contactId);
      setContactActivity(data);
      setSourceRecordError(null);
    } finally {
      setContactActivityLoading(false);
    }
  };

  const onSaveSourceDetails = async () => {
    if (!lead) return;
    setSourceSaving(true);
    try {
      if (lead.sourceType === "digital_enquiry") {
        await apiClient.patch(`/digital-enquiry/${lead.sourceId}/details`, {
          leadScope: leadScopeEditor,
          leadSourceId: leadSourceIdEditor.trim() ? leadSourceIdEditor : null,
          interestedModelId: interestedModelIdEditor.trim()
            ? interestedModelIdEditor
            : null,
          interestedVariantId: interestedVariantIdEditor.trim()
            ? interestedVariantIdEditor
            : null,
          reason: sourceReasonEditor,
        });
      } else if (lead.sourceType === "field_inquiry") {
        await apiClient.patch(`/field-inquiry/${lead.sourceId}/details`, {
          leadScope: leadScopeEditor,
          leadSourceId: leadSourceIdEditor.trim() ? leadSourceIdEditor : null,
          interestedModelId: interestedModelIdEditor.trim()
            ? interestedModelIdEditor
            : null,
          interestedVariantId: interestedVariantIdEditor.trim()
            ? interestedVariantIdEditor
            : null,
          reason: sourceReasonEditor,
        });
      } else if (lead.sourceType === "import" && deliveryTicketIdToEdit) {
        if (!deliveryModelIdEditor.trim()) {
          toast.error("Delivery model is required");
          return;
        }

        const payload: any = {
          modelId: deliveryModelIdEditor.trim(),
          variantId: deliveryVariantIdEditor.trim() ? deliveryVariantIdEditor : null,
          status: deliveryStatusEditor,
          description: deliveryDescriptionEditor.trim()
            ? deliveryDescriptionEditor
            : null,
        };

        const deliveryDateIso = fromDatetimeLocal(deliveryDateEditor);
        if (deliveryDateIso) {
          payload.deliveryDate = deliveryDateIso;
        }

        await apiClient.patch(
          `/delivery-tickets/${deliveryTicketIdToEdit}/details`,
          payload,
        );
      } else {
        toast.error("This lead source type cannot be edited here");
        return;
      }

      await refreshContactActivity();
      toast.success("Source details updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to update source details");
    } finally {
      setSourceSaving(false);
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

          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="text-sm font-semibold">Source details</div>
              <div className="text-sm text-muted-foreground">
                Edit vehicle interest and showroom/source info (where available) based on this lead’s intake source.
              </div>

              {contactActivityLoading ? (
                <div className="text-sm text-muted-foreground">Loading source details…</div>
              ) : sourceRecordError ? (
                <div className="text-sm text-destructive">{sourceRecordError}</div>
              ) : lead.sourceType === "digital_enquiry" || lead.sourceType === "field_inquiry" ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Lead scope (priority)
                      </div>
                      <Select
                        value={leadScopeEditor}
                        onValueChange={(v) => setLeadScopeEditor(v as LeadScopePriority)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select lead scope" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hot">Hot</SelectItem>
                          <SelectItem value="warm">Warm</SelectItem>
                          <SelectItem value="cold">Cold</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Lead source (ID)
                      </div>
                      <Select
                        value={leadSourceIdEditor}
                        onValueChange={(v) => setLeadSourceIdEditor(v)}
                        disabled={leadSourcesLoading || leadSources.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select lead source" />
                        </SelectTrigger>
                        <SelectContent>
                          {leadSources.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Interested model (ID)
                      </div>
                      <Select
                        value={interestedModelIdEditor}
                        onValueChange={(v) => {
                          setInterestedModelIdEditor(v);
                          setInterestedVariantIdEditor("");
                        }}
                        disabled={categoriesLoading || allModels.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          {allModels.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Interested variant (ID)
                      </div>
                      <Select
                        value={interestedVariantIdEditor}
                        onValueChange={(v) => setInterestedVariantIdEditor(v)}
                        disabled={categoriesLoading || selectedInterestedVariants.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select variant" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedInterestedVariants.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Reason / notes from source
                    </div>
                    <Textarea
                      value={sourceReasonEditor}
                      onChange={(e) => setSourceReasonEditor(e.target.value)}
                      placeholder="Reason from the digital/field enquiry"
                      rows={3}
                    />
                  </div>
                </>
              ) : lead.sourceType === "import" && deliveryTicketIdToEdit ? (
                <>
                  <div className="text-sm text-muted-foreground">
                    Editing the latest Delivery Update for this contact (ticket ID:{" "}
                    <span className="text-foreground">{deliveryTicketIdToEdit}</span>).
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 pt-2">
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Model (ID)
                      </div>
                      <Select
                        value={deliveryModelIdEditor}
                        onValueChange={(v) => {
                          setDeliveryModelIdEditor(v);
                          setDeliveryVariantIdEditor("");
                        }}
                        disabled={categoriesLoading || allModels.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          {allModels.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Variant (ID)
                      </div>
                      <Select
                        value={deliveryVariantIdEditor}
                        onValueChange={(v) => setDeliveryVariantIdEditor(v)}
                        disabled={categoriesLoading || selectedDeliveryVariants.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select variant" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedDeliveryVariants.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Delivery date
                      </div>
                      <Input
                        type="datetime-local"
                        value={deliveryDateEditor}
                        onChange={(e) => setDeliveryDateEditor(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Delivery status
                      </div>
                      <Input
                        value={deliveryStatusEditor}
                        onChange={(e) => setDeliveryStatusEditor(e.target.value)}
                        placeholder="status"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Description
                    </div>
                    <Textarea
                      value={deliveryDescriptionEditor}
                      onChange={(e) => setDeliveryDescriptionEditor(e.target.value)}
                      placeholder="Delivery ticket description"
                      rows={3}
                    />
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Intake source editing is not available for this lead source type.
                </div>
              )}

              {(lead.sourceType === "digital_enquiry" ||
                lead.sourceType === "field_inquiry" ||
                (lead.sourceType === "import" && deliveryTicketIdToEdit)) && (
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={onSaveSourceDetails}
                    disabled={sourceSaving || contactActivityLoading}
                  >
                    {sourceSaving ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving…
                      </span>
                    ) : (
                      "Save Source Details"
                    )}
                  </Button>
                </div>
              )}
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

