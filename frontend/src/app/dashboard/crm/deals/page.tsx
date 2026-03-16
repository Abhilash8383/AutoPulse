"use client";

import { useState } from "react";
import Link from "next/link";
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Search, X, ChevronDown, ChevronUp, Plus, Filter, LayoutGrid, List, Settings2 } from "lucide-react";
import Pagination from "../contacts/components/Pagination";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
const PAGE_SIZE = 10;

export default function DealsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_SIZE);
  const [pageLoading, setPageLoading] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>("dealName");
  const [sortAsc, setSortAsc] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [columnVisibility, setColumnVisibility] = useState({
    dealName: true,
    productTags: true,
    dealAmount: true,
    priority: true,
    dealStage: true,
    closedDate: true,
    type: true,
    dealOwner: true,
    referralSource: true,
    pipeline: true,
  });

  const deals: Array<{
    id: string;
    dealName: string;
    productTags: string;
    dealAmount: string;
    priority: string;
    dealStage: string;
    closedDate: string;
    type: string;
    dealOwner: string;
    referralSource: string;
    pipeline: string;
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

  const SortHeader = ({
    label,
    sortKeyName,
  }: {
    label: string;
    sortKeyName: string;
  }) => (
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
            Manage Deals
          </h1>
          <p className="text-fluid-xs text-muted-foreground mt-1 sm:text-sm">
            Browse, search, and manage deals.
          </p>
        </div>
        <Button asChild className="shrink-0" style={{ backgroundColor: "#1976B8" }}>
          <Link href="/dashboard/crm/deals/add">
            <Plus className="mr-2 h-4 w-4" />
            Add Deals
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted text-muted-foreground">
          <TabsTrigger value="all">All deals</TabsTrigger>
          <TabsTrigger value="list">Deal List</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-4">
          {/* Search, Filter, View toggles, Settings */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search By Deal Name"
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
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Column settings"
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.dealName}
                    onCheckedChange={(v) =>
                      setColumnVisibility((prev) => ({ ...prev, dealName: !!v }))
                    }
                  >
                    Deal Name
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.productTags}
                    onCheckedChange={(v) =>
                      setColumnVisibility((prev) => ({
                        ...prev,
                        productTags: !!v,
                      }))
                    }
                  >
                    Product Tags
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.dealAmount}
                    onCheckedChange={(v) =>
                      setColumnVisibility((prev) => ({
                        ...prev,
                        dealAmount: !!v,
                      }))
                    }
                  >
                    Deal Amount
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.priority}
                    onCheckedChange={(v) =>
                      setColumnVisibility((prev) => ({ ...prev, priority: !!v }))
                    }
                  >
                    Priority
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.dealStage}
                    onCheckedChange={(v) =>
                      setColumnVisibility((prev) => ({
                        ...prev,
                        dealStage: !!v,
                      }))
                    }
                  >
                    Deal Stage
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.closedDate}
                    onCheckedChange={(v) =>
                      setColumnVisibility((prev) => ({
                        ...prev,
                        closedDate: !!v,
                      }))
                    }
                  >
                    Closed Date
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.type}
                    onCheckedChange={(v) =>
                      setColumnVisibility((prev) => ({ ...prev, type: !!v }))
                    }
                  >
                    Type
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.dealOwner}
                    onCheckedChange={(v) =>
                      setColumnVisibility((prev) => ({
                        ...prev,
                        dealOwner: !!v,
                      }))
                    }
                  >
                    Deal Owner
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.referralSource}
                    onCheckedChange={(v) =>
                      setColumnVisibility((prev) => ({
                        ...prev,
                        referralSource: !!v,
                      }))
                    }
                  >
                    Referral Source
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.pipeline}
                    onCheckedChange={(v) =>
                      setColumnVisibility((prev) => ({
                        ...prev,
                        pipeline: !!v,
                      }))
                    }
                  >
                    Pipeline
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
                    {columnVisibility.dealName && (
                      <SortHeader label="Deal Name" sortKeyName="dealName" />
                    )}
                    {columnVisibility.productTags && (
                      <SortHeader
                        label="Product Tags"
                        sortKeyName="productTags"
                      />
                    )}
                    {columnVisibility.dealAmount && (
                      <SortHeader
                        label="Deal Amount"
                        sortKeyName="dealAmount"
                      />
                    )}
                    {columnVisibility.priority && (
                      <SortHeader label="Priority" sortKeyName="priority" />
                    )}
                    {columnVisibility.dealStage && (
                      <SortHeader label="Deal Stage" sortKeyName="dealStage" />
                    )}
                    {columnVisibility.closedDate && (
                      <SortHeader
                        label="Closed Date"
                        sortKeyName="closedDate"
                      />
                    )}
                    {columnVisibility.type && (
                      <SortHeader label="Type" sortKeyName="type" />
                    )}
                    {columnVisibility.dealOwner && (
                      <SortHeader
                        label="Deal Owner"
                        sortKeyName="dealOwner"
                      />
                    )}
                    {columnVisibility.referralSource && (
                      <SortHeader
                        label="Referral Source"
                        sortKeyName="referralSource"
                      />
                    )}
                    {columnVisibility.pipeline && (
                      <SortHeader label="Pipeline" sortKeyName="pipeline" />
                    )}
                    <TableHead className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.length === 0 ? (
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
                    deals.map((deal) => (
                      <TableRow
                        key={deal.id}
                        className="border-b hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="py-3 px-4">
                          <input
                            type="checkbox"
                            className="rounded border-input"
                            aria-label={`Select ${deal.dealName}`}
                          />
                        </TableCell>
                        {columnVisibility.dealName && (
                          <TableCell className="py-3 px-4 text-sm">
                            {deal.dealName}
                          </TableCell>
                        )}
                        {columnVisibility.productTags && (
                          <TableCell className="py-3 px-4 text-sm">
                            {deal.productTags}
                          </TableCell>
                        )}
                        {columnVisibility.dealAmount && (
                          <TableCell className="py-3 px-4 text-sm">
                            {deal.dealAmount}
                          </TableCell>
                        )}
                        {columnVisibility.priority && (
                          <TableCell className="py-3 px-4 text-sm">
                            {deal.priority}
                          </TableCell>
                        )}
                        {columnVisibility.dealStage && (
                          <TableCell className="py-3 px-4 text-sm">
                            {deal.dealStage}
                          </TableCell>
                        )}
                        {columnVisibility.closedDate && (
                          <TableCell className="py-3 px-4 text-sm">
                            {deal.closedDate}
                          </TableCell>
                        )}
                        {columnVisibility.type && (
                          <TableCell className="py-3 px-4 text-sm">
                            {deal.type}
                          </TableCell>
                        )}
                        {columnVisibility.dealOwner && (
                          <TableCell className="py-3 px-4 text-sm">
                            {deal.dealOwner}
                          </TableCell>
                        )}
                        {columnVisibility.referralSource && (
                          <TableCell className="py-3 px-4 text-sm">
                            {deal.referralSource}
                          </TableCell>
                        )}
                        {columnVisibility.pipeline && (
                          <TableCell className="py-3 px-4 text-sm">
                            {deal.pipeline}
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
              Deal lists will be available here.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
