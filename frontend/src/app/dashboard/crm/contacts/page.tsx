"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExportExcelButton } from "@/components/export-excel-button";
import Link from "next/link";
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  FileUp,
  Plus,
  Loader2,
} from "lucide-react";
import Pagination from "./components/Pagination";
import {
  getContactActivities,
  getContactActivity,
  updateContact,
  type Contact,
  type ContactActivityRow,
  type ContactActivityResponse,
} from "@/services/api/contact.service";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Eye, Pencil, Wand2 } from "lucide-react";
import { createLeadFromContact } from "@/services/api/crm-leads.service";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
const PAGE_SIZE = 10;

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function ContactsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_SIZE);
  const [pageLoading, setPageLoading] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>("name");
  const [sortAsc, setSortAsc] = useState(true);

  const [activities, setActivities] = useState<ContactActivityRow[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [viewTab, setViewTab] = useState("overview");
  const [activityLoading, setActivityLoading] = useState(false);
  const [activity, setActivity] = useState<ContactActivityResponse | null>(null);

  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editWhatsappNumber, setEditWhatsappNumber] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [convertSavingId, setConvertSavingId] = useState<string | null>(null);

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
    setPageLoading(true);
    if (currentPage === 1 && activities.length === 0) setInitialLoading(true);

    getContactActivities({
      limit: rowsPerPage,
      skip: (currentPage - 1) * rowsPerPage,
      search: searchQuery.trim() || undefined,
    })
      .then((res) => {
        if (cancelled) return;
        setActivities(res.activities);
        setTotalResults(res.total);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(
          err.response?.data?.error || "Failed to load contact activity",
        );
        setActivities([]);
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
  }, [currentPage, rowsPerPage, searchQuery]);

  const openView = (c: Contact) => {
    setActiveContact(c);
    setViewTab("overview");
    setActivity(null);
    setViewOpen(true);
  };
  useEffect(() => {
    if (!viewOpen || !activeContact) return;
    let cancelled = false;
    setActivityLoading(true);
    getContactActivity(activeContact.id)
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
  }, [viewOpen, activeContact?.id]);

  const openEdit = (c: Contact) => {
    setActiveContact(c);
    setEditFirstName(c.firstName ?? "");
    setEditLastName(c.lastName ?? "");
    setEditWhatsappNumber(c.whatsappNumber ?? "");
    setEditEmail(c.email ?? "");
    setEditAddress(c.address ?? "");
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!activeContact) return;
    const firstName = editFirstName.trim();
    const lastName = editLastName.trim();
    const whatsappNumber = editWhatsappNumber.trim();
    const email = editEmail.trim();
    const address = editAddress.trim();

    if (!firstName || !lastName || !whatsappNumber) {
      toast.error("First name, last name and WhatsApp number are required");
      return;
    }

    setEditSaving(true);
    try {
      const updated = await updateContact(activeContact.id, {
        firstName,
        lastName,
        whatsappNumber,
        email: email ? email : null,
        address: address ? address : null,
      });
      setActivities((prev) =>
        prev.map((row) =>
          row.contact?.id === updated.id ? { ...row, contact: updated } : row,
        ),
      );
      setActiveContact(updated);
      toast.success("Contact updated");
      setEditOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to update contact");
    } finally {
      setEditSaving(false);
    }
  };

  const convertToLead = async (c: Contact) => {
    setConvertSavingId(c.id);
    try {
      await createLeadFromContact(c.id);
      toast.success("Contact converted to lead");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to create lead");
    } finally {
      setConvertSavingId(null);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortAsc((a) => !a);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const SortHeader = ({ label, sortKeyName }: { label: string; sortKeyName: string }) => (
    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        onClick={() => toggleSort(sortKeyName)}
      >
        {label}
        {sortKey === sortKeyName ? (
          sortAsc ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )
        ) : (
          <span className="inline-flex opacity-40">
            <ChevronUp className="h-3 w-3" />
          </span>
        )}
      </button>
    </th>
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header: title + subtitle left, primary action right */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-fluid-2xl font-bold text-foreground sm:text-2xl lg:text-3xl">
            Manage Contacts
          </h1>
          <p className="text-fluid-xs text-muted-foreground mt-1 sm:text-sm">
            Browse, search, and manage contacts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          <ExportExcelButton type="contacts" variant="outline" />
          <Button asChild style={{ backgroundColor: "#1976B8" }}>
            <Link href="/dashboard/crm/contacts/add">
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Link>
          </Button>
          <Button
            onClick={() => toast.info("Import Contacts — coming soon.")}
            variant="outline"
          >
            <FileUp className="mr-2 h-4 w-4" />
            Import
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-4">
          {/* Search - same pattern as Daily Walkins / Digital Enquiry / Field Inquiry */}
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="   Search by name, phone number, or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-14 pr-10"
              />
              {searchInput && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchInput("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {(searchQuery || searchInput) && (
              <p className="text-xs text-muted-foreground mt-2">
                {totalResults} result{totalResults !== 1 ? "s" : ""} found
              </p>
            )}
          </div>

          {/* Table - same structure as Daily Walkins / Digital Enquiry / Field Inquiry */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <SortHeader label="Name" sortKeyName="name" />
                      <SortHeader label="Email" sortKeyName="email" />
                      <SortHeader label="Phone" sortKeyName="phone" />
                      <SortHeader label="Address" sortKeyName="address" />
                      <SortHeader label="Created" sortKeyName="created" />
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {initialLoading ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-12 text-center text-muted-foreground text-sm"
                        >
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading activity…
                          </span>
                        </td>
                      </tr>
                    ) : activities.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-12 text-center text-muted-foreground text-sm"
                        >
                          No activity found.
                        </td>
                      </tr>
                    ) : (
                      activities.map((activity) => (
                        <tr
                          key={activity.id}
                          className="border-b hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-3 px-4 text-sm">
                            {(activity.contact?.firstName ??
                              activity.fallback.firstName ??
                              "—") +
                              " " +
                              (activity.contact?.lastName ??
                                activity.fallback.lastName ??
                                "").trim()}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {activity.contact?.email ?? activity.fallback.email ?? "—"}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {activity.contact?.whatsappNumber ??
                              activity.fallback.whatsappNumber ??
                              "—"}
                          </td>
                          <td
                            className="py-3 px-4 text-sm max-w-[200px] truncate"
                            title={
                              activity.contact?.address ??
                              activity.fallback.address ??
                              ""
                            }
                          >
                            {activity.contact?.address ?? activity.fallback.address ?? "—"}
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground whitespace-nowrap">
                            {formatDate(activity.createdAt)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={!activity.contact}
                                onClick={() => {
                                  if (!activity.contact) return;
                                  openView(activity.contact);
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={!activity.contact}
                                onClick={() => {
                                  if (!activity.contact) return;
                                  openEdit(activity.contact);
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (!activity.contact) return;
                                  convertToLead(activity.contact);
                                }}
                                disabled={
                                  !activity.contact || convertSavingId === activity.contact.id
                                }
                              >
                                <Wand2 className="mr-2 h-4 w-4" />
                                {activity.contact &&
                                convertSavingId === activity.contact.id
                                  ? "Converting…"
                                  : "Convert"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* View dialog */}
          <Dialog open={viewOpen} onOpenChange={setViewOpen}>
            <DialogContent className="sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>Contact details</DialogTitle>
              </DialogHeader>
              {activeContact ? (
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
                        <div className="text-sm">
                          {activeContact.firstName} {activeContact.lastName}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Phone
                        </div>
                        <div className="text-sm">{activeContact.whatsappNumber}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Email
                        </div>
                        <div className="text-sm">{activeContact.email ?? "—"}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Created
                        </div>
                        <div className="text-sm">{formatDate(activeContact.createdAt)}</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Address
                      </div>
                      <div className="text-sm">{activeContact.address ?? "—"}</div>
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
                              Created: {new Date(v.createdAt).toLocaleString("en-IN")} • Sessions:{" "}
                              {v.sessions?.length ?? 0}
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
                {activeContact ? (
                  <Button
                    onClick={() => {
                      setViewOpen(false);
                      openEdit(activeContact);
                    }}
                  >
                    Edit
                  </Button>
                ) : null}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit dialog */}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit contact</DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editFirstName">First name</Label>
                  <Input
                    id="editFirstName"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editLastName">Last name</Label>
                  <Input
                    id="editLastName"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="editWhatsappNumber">WhatsApp number</Label>
                  <Input
                    id="editWhatsappNumber"
                    value={editWhatsappNumber}
                    onChange={(e) => setEditWhatsappNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="editEmail">Email</Label>
                  <Input
                    id="editEmail"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="editAddress">Address</Label>
                  <Input
                    id="editAddress"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editSaving}>
                  Cancel
                </Button>
                <Button onClick={saveEdit} disabled={editSaving}>
                  {editSaving ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </span>
                  ) : (
                    "Save changes"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Footer: Rows per page, Total results, Pagination */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                Rows per page:
              </span>
              <Select
                value={String(rowsPerPage)}
                onValueChange={(v) => {
                  setRowsPerPage(Number(v));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-28 h-8 text-sm">
                  <SelectValue placeholder={String(rowsPerPage)} />
                </SelectTrigger>
                <SelectContent>
                  {ROWS_PER_PAGE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              Total Results: {totalResults}
            </p>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              pageLoading={pageLoading}
            />
          </div>
      </div>
    </div>
  );
}
