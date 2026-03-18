"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Search, X } from "lucide-react";
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
import Pagination from "../contacts/components/Pagination";
import {
  getCrmLeads,
  patchCrmLead,
  type CrmLead,
  type CrmLeadStage,
  type CrmLeadStatus,
} from "@/services/api/crm-leads.service";
import { getDealershipUsers, type DealershipUser } from "@/services/api/users.service";

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
                <SelectTrigger className="w-[190px]">
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
                <SelectTrigger className="w-[200px]">
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
                <SelectTrigger className="w-[180px]">
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
                <SelectTrigger className="w-[160px]">
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
                <SelectTrigger className="w-[120px]">
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
                </tr>
              </thead>
              <tbody>
                {initialLoading ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center">
                      <div className="inline-flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading leads…
                      </div>
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-muted-foreground">
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
                          <SelectTrigger className="h-8 w-[170px]">
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
                          onValueChange={(v) =>
                            onQuickUpdate(lead, {
                              ownerUserId: v === "unassigned" ? null : v,
                            })
                          }
                          disabled={usersLoading}
                        >
                          <SelectTrigger className="h-8 w-[220px]">
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
                          className="h-8 w-[220px]"
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
    </div>
  );
}

