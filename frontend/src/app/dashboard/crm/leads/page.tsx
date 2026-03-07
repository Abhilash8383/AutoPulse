"use client";

import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExportExcelButton } from "@/components/export-excel-button";
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Settings2,
  UserPlus,
  FileUp,
  Plus,
  Filter,
  LayoutGrid,
  List,
} from "lucide-react";
import Pagination from "./components/Pagination";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
const PAGE_SIZE = 10;
type ViewMode = "table" | "grid";

export default function LeadsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_SIZE);
  const [pageLoading, setPageLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
    name: true,
    company: true,
    email: true,
    stage: true,
    createdOn: true,
  });

  const leads: Array<{
    id: string;
    name: string;
    company: string;
    email: string;
    stage: string;
    createdOn: string;
  }> = [];
  const totalResults = 0;
  const totalPages = Math.max(1, Math.ceil(totalResults / rowsPerPage));

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
    <TableHead className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
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
    </TableHead>
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header: title + subtitle left, primary action right */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-fluid-2xl font-bold text-foreground sm:text-2xl lg:text-3xl">
            Manage Leads
          </h1>
          <p className="text-fluid-xs text-muted-foreground mt-1 sm:text-sm">
            Browse, search, and manage leads.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          <ExportExcelButton type="leads" variant="outline" />
          <Button asChild style={{ backgroundColor: "#1976B8" }}>
            <Link href="/dashboard/crm/leads/add">
              <Plus className="mr-2 h-4 w-4" />
              Add Lead
            </Link>
          </Button>
          <Button
            onClick={() => toast.info("Import Leads — coming soon.")}
            variant="outline"
          >
            <FileUp className="mr-2 h-4 w-4" />
            Import
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted text-muted-foreground">
          <TabsTrigger value="all">All leads</TabsTrigger>
          <TabsTrigger value="list">Lead List</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-4">
          {/* Search, Filter, Select All, Settings */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search By Lead Name"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="mr-1.5 h-4 w-4" />
                Filter
              </Button>
              <div className="flex border rounded-md overflow-hidden">
                <Button
                  variant={viewMode === "table" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8 rounded-none"
                  onClick={() => setViewMode("table")}
                  aria-label="Table view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8 rounded-none"
                  onClick={() => setViewMode("grid")}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Column settings">
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.name}
                    onCheckedChange={(v) =>
                      setColumnVisibility((prev) => ({ ...prev, name: !!v }))
                    }
                  >
                    Name
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.company}
                    onCheckedChange={(v) =>
                      setColumnVisibility((prev) => ({ ...prev, company: !!v }))
                    }
                  >
                    Company
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.email}
                    onCheckedChange={(v) =>
                      setColumnVisibility((prev) => ({ ...prev, email: !!v }))
                    }
                  >
                    Email
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.stage}
                    onCheckedChange={(v) =>
                      setColumnVisibility((prev) => ({ ...prev, stage: !!v }))
                    }
                  >
                    Stage
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.createdOn}
                    onCheckedChange={(v) =>
                      setColumnVisibility((prev) => ({ ...prev, createdOn: !!v }))
                    }
                  >
                    Created On
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-b bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-10 py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      <input
                        type="checkbox"
                        className="rounded border-input"
                        aria-label="Select all"
                      />
                    </TableHead>
                    {columnVisibility.name && (
                      <SortHeader label="Name" sortKeyName="name" />
                    )}
                    {columnVisibility.company && (
                      <SortHeader label="Company" sortKeyName="company" />
                    )}
                    {columnVisibility.email && (
                      <SortHeader label="Email" sortKeyName="email" />
                    )}
                    {columnVisibility.stage && (
                      <SortHeader label="Stage" sortKeyName="stage" />
                    )}
                    {columnVisibility.createdOn && (
                      <SortHeader label="Created On" sortKeyName="createdOn" />
                    )}
                    <TableHead className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={
                          2 +
                          Object.values(columnVisibility).filter(Boolean).length
                        }
                        className="py-12 text-center text-muted-foreground text-sm"
                      >
                        No results found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    leads.map((lead) => (
                      <TableRow
                        key={lead.id}
                        className="border-b hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="py-3 px-4">
                          <input
                            type="checkbox"
                            className="rounded border-input"
                            aria-label={`Select ${lead.name}`}
                          />
                        </TableCell>
                        {columnVisibility.name && (
                          <TableCell className="py-3 px-4 text-sm">
                            {lead.name}
                          </TableCell>
                        )}
                        {columnVisibility.company && (
                          <TableCell className="py-3 px-4 text-sm">
                            {lead.company}
                          </TableCell>
                        )}
                        {columnVisibility.email && (
                          <TableCell className="py-3 px-4 text-sm">
                            {lead.email}
                          </TableCell>
                        )}
                        {columnVisibility.stage && (
                          <TableCell className="py-3 px-4 text-sm">
                            {lead.stage}
                          </TableCell>
                        )}
                        {columnVisibility.createdOn && (
                          <TableCell className="py-3 px-4 text-sm">
                            {lead.createdOn}
                          </TableCell>
                        )}
                        <TableCell className="py-3 px-4">
                          <Button variant="ghost" size="sm">
                            Actions
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Footer */}
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
                <SelectTrigger className="w-16 h-8 text-sm">
                  <SelectValue />
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
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              Lead lists will be available here.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
