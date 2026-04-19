"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Eye, Loader2, Search, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Pagination from "../contacts/components/Pagination";
import {
  getCrmLeads,
  patchCrmLead,
  type CrmLead,
  type CrmLeadStage,
  type CrmLeadStatus,
} from "@/services/api/crm-leads.service";
import { getDealershipUsers, type DealershipUser } from "@/services/api/users.service";
import { getContactActivity, type ContactActivityResponse } from "@/services/api/contact.service";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
const PAGE_SIZE = 10;

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

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

function sourceLabel(source: CrmLead["sourceType"]) {
  switch (source) {
    case "visitor":
      return "Walk-in";
    case "digital_enquiry":
      return "Digital";
    case "field_inquiry":
      return "Field";
    case "import":
      return "Import";
    default:
      return source;
  }
}

export default function LeadsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [view, setView] = useState<"converted" | "all">("converted");
  const [stage, setStage] = useState<CrmLeadStage | "all">("all");
  const [status, setStatus] = useState<CrmLeadStatus | "all">("open");
  const [overdue, setOverdue] = useState(false);
  const [owner, setOwner] = useState<string | "all" | "unassigned">("all");
  const [users, setUsers] = useState<DealershipUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_SIZE);
  const [pageLoading, setPageLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [ownerConfirmOpen, setOwnerConfirmOpen] = useState(false);
  const [pendingOwnerChange, setPendingOwnerChange] = useState<{
    leadId: string;
    nextOwnerUserId: string | null;
  } | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewTab, setViewTab] = useState("overview");
  const [activeLead, setActiveLead] = useState<CrmLead | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activity, setActivity] = useState<ContactActivityResponse | null>(null);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const totalPages = Math.max(1, Math.ceil(totalResults / rowsPerPage));

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1);
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setUsersLoading(true);
    getDealershipUsers()
      .then((res) => {
        if (cancelled) return;
        setUsers(res.users);
      })
      .catch(() => {
        if (cancelled) return;
        setUsers([]);
      })
      .finally(() => {
        if (cancelled) return;
        setUsersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPageLoading(true);
    if (currentPage === 1 && leads.length === 0) setInitialLoading(true);

    getCrmLeads({
      limit: rowsPerPage,
      skip: (currentPage - 1) * rowsPerPage,
      search: searchQuery.trim() || undefined,
      sourceType: view === "converted" ? "import" : undefined,
      stage: stage === "all" ? undefined : stage,
      status: status === "all" ? undefined : status,
      ownerUserId:
        owner === "all" || owner === "unassigned" ? undefined : owner,
      overdue: overdue || undefined,
    })
      .then((res) => {
        if (cancelled) return;
        setLeads(res.leads);
        setTotalResults(res.total);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err.response?.data?.error || "Failed to load leads");
        setLeads([]);
        setTotalResults(0);
      })
      .finally(() => {
        if (cancelled) return;
        setPageLoading(false);
        setInitialLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentPage, rowsPerPage, searchQuery, view, stage, status, overdue, owner]);

  useEffect(() => {
    if (!viewOpen || !activeLead) return;
    let cancelled = false;
    setActivityLoading(true);
    getContactActivity(activeLead.contactId)
      .then((data) => {
        if (cancelled) return;
        setActivity(data);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err?.response?.data?.error || "Failed to load contact activity");
        setActivity(null);
      })
      .finally(() => {
        if (cancelled) return;
        setActivityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [viewOpen, activeLead?.id]);

  const onQuickUpdate = async (
    lead: CrmLead,
    patch: { stage?: CrmLeadStage; ownerUserId?: string | null; nextFollowUpAt?: string | null },
  ) => {
    const optimistic: CrmLead = {
      ...lead,
      ...("stage" in patch && patch.stage ? { stage: patch.stage } : {}),
      ...("ownerUserId" in patch
        ? {
            ownerUserId: patch.ownerUserId ?? null,
            ownerUser:
              patch.ownerUserId == null
                ? null
                : users.find((u) => u.id === patch.ownerUserId) ?? null,
          }
        : {}),
      ...("nextFollowUpAt" in patch ? { nextFollowUpAt: patch.nextFollowUpAt ?? null } : {}),
    };
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? optimistic : l)));
    try {
      const updated = await patchCrmLead(lead.id, patch);
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? updated : l)));
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to update lead");
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? lead : l)));
    }
  };

  const requestOwnerChange = (lead: CrmLead, value: string) => {
    const nextOwnerUserId = value === "unassigned" ? null : value;
    if ((lead.ownerUserId ?? null) === nextOwnerUserId) return;

    setPendingOwnerChange({
      leadId: lead.id,
      nextOwnerUserId,
    });
    setOwnerConfirmOpen(true);
  };

  const confirmOwnerChange = async () => {
    if (!pendingOwnerChange) return;
    const lead = leads.find((l) => l.id === pendingOwnerChange.leadId);
    if (!lead) {
      setOwnerConfirmOpen(false);
      setPendingOwnerChange(null);
      return;
    }

    await onQuickUpdate(lead, { ownerUserId: pendingOwnerChange.nextOwnerUserId });
    setOwnerConfirmOpen(false);
    setPendingOwnerChange(null);
  };

  const openView = (lead: CrmLead) => {
    setActiveLead(lead);
    setViewTab("overview");
    setActivity(null);
    setViewOpen(true);
  };

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-sm text-muted-foreground">
            Converted contacts you are actively working on.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search name, phone, email…"
                className="pl-9 pr-9"
              />
              {searchInput.trim() ? (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <Select
                value={view}
                onValueChange={(v) => {
                  setView(v as any);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[190px]">
                  <SelectValue placeholder="View" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="converted">Converted only</SelectItem>
                  <SelectItem value="all">All sources</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={owner}
                onValueChange={(v) => {
                  setOwner(v as any);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All owners</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={stage}
                onValueChange={(v) => {
                  setStage(v as any);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stages</SelectItem>
                  {stageOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {stageLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={status}
                onValueChange={(v) => {
                  setStatus(v as any);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant={overdue ? "default" : "outline"}
                onClick={() => {
                  setOverdue((v) => !v);
                  setCurrentPage(1);
                }}
              >
                Overdue
              </Button>

              <Select
                value={String(rowsPerPage)}
                onValueChange={(v) => {
                  setRowsPerPage(parseInt(v, 10));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[120px]">
                  <SelectValue placeholder="Rows" />
                </SelectTrigger>
                <SelectContent>
                  {ROWS_PER_PAGE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} / page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Contact
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Phone
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Source
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Stage
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Owner
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Next follow-up
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Updated
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {initialLoading ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center">
                      <div className="inline-flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading leads…
                      </div>
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-muted-foreground">
                      No leads found.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className="border-b hover:bg-muted/30">
                      <td className="py-3 px-4 font-medium">
                        <Link
                          href={`/dashboard/crm/leads/${lead.id}`}
                          className="hover:underline"
                        >
                          {formatName(lead)}
                        </Link>
                        {lead.contact.email ? (
                          <div className="text-xs text-muted-foreground">
                            {lead.contact.email}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3 px-4">{lead.contact.whatsappNumber}</td>
                      <td className="py-3 px-4">{sourceLabel(lead.sourceType)}</td>
                      <td className="py-3 px-4">
                        <Select
                          value={lead.stage}
                          onValueChange={(v) =>
                            onQuickUpdate(lead, { stage: v as CrmLeadStage })
                          }
                        >
                          <SelectTrigger className="h-8 w-full sm:w-[170px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {stageOptions.map((s) => (
                              <SelectItem key={s} value={s}>
                                {stageLabel(s)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 px-4">
                        <Select
                          value={lead.ownerUserId ?? "unassigned"}
                          onValueChange={(v) => requestOwnerChange(lead, v)}
                          disabled={usersLoading}
                        >
                          <SelectTrigger className="h-8 w-full sm:w-[220px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {users.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 px-4">
                        <Input
                          type="datetime-local"
                          className="h-8 w-full sm:w-[220px]"
                          value={
                            lead.nextFollowUpAt
                              ? new Date(lead.nextFollowUpAt)
                                  .toISOString()
                                  .slice(0, 16)
                              : ""
                          }
                          onChange={(e) => {
                            const v = e.target.value;
                            onQuickUpdate(lead, {
                              nextFollowUpAt: v ? new Date(v).toISOString() : null,
                            });
                          }}
                        />
                      </td>
                      <td className="py-3 px-4">{formatDate(lead.updatedAt)}</td>
                      <td className="py-3 px-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openView(lead)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 pb-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              pageLoading={pageLoading}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={viewOpen}
        onOpenChange={(open) => {
          setViewOpen(open);
          if (!open) {
            setActiveLead(null);
            setActivity(null);
            setViewTab("overview");
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Lead details</DialogTitle>
          </DialogHeader>
          {activeLead ? (
            <Tabs value={viewTab} onValueChange={setViewTab}>
              <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full gap-1">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="walkins">Walkins</TabsTrigger>
                <TabsTrigger value="digital">Digital</TabsTrigger>
                <TabsTrigger value="field">Field</TabsTrigger>
                <TabsTrigger value="delivery">Delivery</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Name
                    </div>
                    <div className="text-sm">{formatName(activeLead)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Phone
                    </div>
                    <div className="text-sm">{activeLead.contact.whatsappNumber}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Email
                    </div>
                    <div className="text-sm">{activeLead.contact.email ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Source
                    </div>
                    <div className="text-sm">{sourceLabel(activeLead.sourceType)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Stage
                    </div>
                    <div className="text-sm">{stageLabel(activeLead.stage)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Status
                    </div>
                    <div className="text-sm">{activeLead.status.toUpperCase()}</div>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Address
                  </div>
                  <div className="text-sm">{activeLead.contact.address ?? "—"}</div>
                </div>
              </TabsContent>

              <TabsContent value="walkins" className="mt-4">
                {activityLoading ? (
                  <div className="text-sm text-muted-foreground">Loading…</div>
                ) : !activity || activity.visitors.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No walkins found.</div>
                ) : (
                  <div className="space-y-3">
                    {activity.visitors.map((v) => (
                      <div key={v.id} className="rounded-md border p-3">
                        <div className="text-sm font-medium">Visitor #{v.id}</div>
                        <div className="text-xs text-muted-foreground">
                          Created: {new Date(v.createdAt).toLocaleString("en-IN")} • Sessions: {v.sessions?.length ?? 0}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="digital" className="mt-4">
                {activityLoading ? (
                  <div className="text-sm text-muted-foreground">Loading…</div>
                ) : !activity || activity.digitalEnquiries.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No digital enquiries found.</div>
                ) : (
                  <div className="space-y-3">
                    {activity.digitalEnquiries.map((e) => (
                      <div key={e.id} className="rounded-md border p-3">
                        <div className="text-sm font-medium">{e.reason}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(e.createdAt).toLocaleString("en-IN")} • Scope: {e.leadScope}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="field" className="mt-4">
                {activityLoading ? (
                  <div className="text-sm text-muted-foreground">Loading…</div>
                ) : !activity || activity.fieldInquiries.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No field inquiries found.</div>
                ) : (
                  <div className="space-y-3">
                    {activity.fieldInquiries.map((f) => (
                      <div key={f.id} className="rounded-md border p-3">
                        <div className="text-sm font-medium">{f.reason}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(f.createdAt).toLocaleString("en-IN")} • Scope: {f.leadScope}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="delivery" className="mt-4">
                {activityLoading ? (
                  <div className="text-sm text-muted-foreground">Loading…</div>
                ) : !activity || activity.deliveryTickets.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No delivery tickets found.</div>
                ) : (
                  <div className="space-y-3">
                    {activity.deliveryTickets.map((t) => (
                      <div key={t.id} className="rounded-md border p-3">
                        <div className="text-sm font-medium">Ticket #{t.id}</div>
                        <div className="text-xs text-muted-foreground">
                          Delivery: {new Date(t.deliveryDate).toLocaleDateString("en-IN")} • Status: {t.status}
                        </div>
                        {t.description ? (
                          <div className="text-sm mt-2 text-muted-foreground">{t.description}</div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={ownerConfirmOpen}
        onOpenChange={(open) => {
          setOwnerConfirmOpen(open);
          if (!open) setPendingOwnerChange(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change lead owner?</DialogTitle>
            <DialogDescription>
              Are you sure you want to change the owner of this lead?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOwnerConfirmOpen(false);
                setPendingOwnerChange(null);
              }}
            >
              No
            </Button>
            <Button type="button" onClick={confirmOwnerChange}>
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
