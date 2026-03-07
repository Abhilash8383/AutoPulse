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
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Settings2,
  Plus,
  Filter,
} from "lucide-react";
import Pagination from "../contacts/components/Pagination";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
const PAGE_SIZE = 10;

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_SIZE);
  const [pageLoading, setPageLoading] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({
    taskTitle: true,
    status: true,
    assignedTo: true,
    associatedWith: true,
    tags: true,
    dueDate: true,
    reminder: true,
    repeat: true,
    priority: true,
    type: true,
    createdOn: true,
    notes: true,
  });

  const tasks: Array<{
    id: string;
    taskTitle: string;
    status: string;
    assignedTo: string;
    associatedWith: string;
    tags: string;
    dueDate: string;
    reminder: string;
    repeat: string;
    priority: string;
    type: string;
    createdOn: string;
    notes: string;
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

  function TasksTabPanel() {
    return (
      <div className="mt-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by task title"
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info("Select All Pages — coming soon.")}
            >
              Select All Pages
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Column settings">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 max-h-[70vh] overflow-y-auto">
                <DropdownMenuCheckboxItem checked={columnVisibility.taskTitle} onCheckedChange={(v) => setColumnVisibility((prev) => ({ ...prev, taskTitle: !!v }))}>Task Title</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={columnVisibility.status} onCheckedChange={(v) => setColumnVisibility((prev) => ({ ...prev, status: !!v }))}>Status</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={columnVisibility.assignedTo} onCheckedChange={(v) => setColumnVisibility((prev) => ({ ...prev, assignedTo: !!v }))}>Assigned To</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={columnVisibility.associatedWith} onCheckedChange={(v) => setColumnVisibility((prev) => ({ ...prev, associatedWith: !!v }))}>Associated With</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={columnVisibility.tags} onCheckedChange={(v) => setColumnVisibility((prev) => ({ ...prev, tags: !!v }))}>Tags</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={columnVisibility.dueDate} onCheckedChange={(v) => setColumnVisibility((prev) => ({ ...prev, dueDate: !!v }))}>Due Date</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={columnVisibility.reminder} onCheckedChange={(v) => setColumnVisibility((prev) => ({ ...prev, reminder: !!v }))}>Reminder</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={columnVisibility.repeat} onCheckedChange={(v) => setColumnVisibility((prev) => ({ ...prev, repeat: !!v }))}>Repeat</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={columnVisibility.priority} onCheckedChange={(v) => setColumnVisibility((prev) => ({ ...prev, priority: !!v }))}>Priority</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={columnVisibility.type} onCheckedChange={(v) => setColumnVisibility((prev) => ({ ...prev, type: !!v }))}>Type</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={columnVisibility.createdOn} onCheckedChange={(v) => setColumnVisibility((prev) => ({ ...prev, createdOn: !!v }))}>Created On</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={columnVisibility.notes} onCheckedChange={(v) => setColumnVisibility((prev) => ({ ...prev, notes: !!v }))}>Notes</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-10 py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <input type="checkbox" className="rounded border-input" aria-label="Select all" />
                  </TableHead>
                  {columnVisibility.taskTitle && <SortHeader label="Task Title" sortKeyName="taskTitle" />}
                  {columnVisibility.status && <SortHeader label="Status" sortKeyName="status" />}
                  {columnVisibility.assignedTo && <SortHeader label="Assigned To" sortKeyName="assignedTo" />}
                  {columnVisibility.associatedWith && <SortHeader label="Associated With" sortKeyName="associatedWith" />}
                  {columnVisibility.tags && <SortHeader label="Tags" sortKeyName="tags" />}
                  {columnVisibility.dueDate && <SortHeader label="Due Date" sortKeyName="dueDate" />}
                  {columnVisibility.reminder && <SortHeader label="Reminder" sortKeyName="reminder" />}
                  {columnVisibility.repeat && <SortHeader label="Repeat" sortKeyName="repeat" />}
                  {columnVisibility.priority && <SortHeader label="Priority" sortKeyName="priority" />}
                  {columnVisibility.type && <SortHeader label="Type" sortKeyName="type" />}
                  {columnVisibility.createdOn && <SortHeader label="Created On" sortKeyName="createdOn" />}
                  {columnVisibility.notes && <TableHead className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</TableHead>}
                  <TableHead className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2 + Object.values(columnVisibility).filter(Boolean).length} className="py-12 text-center text-muted-foreground text-sm">No results found.</TableCell>
                  </TableRow>
                ) : (
                  tasks.map((task) => (
                    <TableRow key={task.id} className="border-b hover:bg-muted/30 transition-colors">
                      <TableCell className="py-3 px-4"><input type="checkbox" className="rounded border-input" aria-label={`Select ${task.taskTitle}`} /></TableCell>
                      {columnVisibility.taskTitle && <TableCell className="py-3 px-4 text-sm">{task.taskTitle}</TableCell>}
                      {columnVisibility.status && <TableCell className="py-3 px-4 text-sm">{task.status}</TableCell>}
                      {columnVisibility.assignedTo && <TableCell className="py-3 px-4 text-sm">{task.assignedTo}</TableCell>}
                      {columnVisibility.associatedWith && <TableCell className="py-3 px-4 text-sm">{task.associatedWith}</TableCell>}
                      {columnVisibility.tags && <TableCell className="py-3 px-4 text-sm">{task.tags}</TableCell>}
                      {columnVisibility.dueDate && <TableCell className="py-3 px-4 text-sm">{task.dueDate}</TableCell>}
                      {columnVisibility.reminder && <TableCell className="py-3 px-4 text-sm">{task.reminder}</TableCell>}
                      {columnVisibility.repeat && <TableCell className="py-3 px-4 text-sm">{task.repeat}</TableCell>}
                      {columnVisibility.priority && <TableCell className="py-3 px-4 text-sm">{task.priority}</TableCell>}
                      {columnVisibility.type && <TableCell className="py-3 px-4 text-sm">{task.type}</TableCell>}
                      {columnVisibility.createdOn && <TableCell className="py-3 px-4 text-sm">{task.createdOn}</TableCell>}
                      {columnVisibility.notes && <TableCell className="py-3 px-4 text-sm">{task.notes}</TableCell>}
                      <TableCell className="py-3 px-4"><Button variant="ghost" size="sm">Actions</Button></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page:</span>
            <Select value={String(rowsPerPage)} onValueChange={(v) => { setRowsPerPage(Number(v)); setCurrentPage(1); }}>
              <SelectTrigger className="w-16 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{ROWS_PER_PAGE_OPTIONS.map((n) => (<SelectItem key={n} value={String(n)}>{n}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">Total Results: {totalResults}</p>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} pageLoading={pageLoading} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header: title + subtitle left, primary action right */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-fluid-2xl font-bold text-foreground sm:text-2xl lg:text-3xl">
            Manage Tasks
          </h1>
          <p className="text-fluid-xs text-muted-foreground mt-1 sm:text-sm">
            Browse, search, and manage tasks.
          </p>
        </div>
        <Button asChild className="shrink-0" style={{ backgroundColor: "#1976B8" }}>
          <Link href="/dashboard/crm/tasks/add">
            <Plus className="mr-2 h-4 w-4" />
            Add new
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted text-muted-foreground">
          <TabsTrigger value="all">All Tasks</TabsTrigger>
          <TabsTrigger value="todo">To Do</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <TasksTabPanel />
        </TabsContent>
        <TabsContent value="todo">
          <TasksTabPanel />
        </TabsContent>
        <TabsContent value="in-progress">
          <TasksTabPanel />
        </TabsContent>
        <TabsContent value="completed">
          <TasksTabPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
