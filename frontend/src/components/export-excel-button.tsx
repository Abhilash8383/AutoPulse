"use client";

import { useState } from "react";
import apiClient from "@/lib/api";
import { toast } from "sonner";
import { usePermissions } from "@/contexts/permissions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Loader2, Calendar, X, CheckCircle } from "lucide-react";

export type ExportExcelType =
  | "visitors"
  | "digital-enquiry"
  | "field-inquiry"
  | "delivery-tickets"
  | "contacts"
  | "leads";

type DateRange = "1m" | "3m" | "6m" | "1y" | "custom";

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "1m", label: "Last 1 Month" },
  { value: "3m", label: "Last 3 Months" },
  { value: "6m", label: "Last 6 Months" },
  { value: "1y", label: "Last 1 Year" },
  { value: "custom", label: "Custom date range" },
];

const TYPE_LABELS: Record<ExportExcelType, string> = {
  visitors: "Daily Walkins",
  "digital-enquiry": "Digital Enquiry",
  "field-inquiry": "Field Inquiry",
  "delivery-tickets": "Delivery Update",
  contacts: "Contacts",
  leads: "Leads",
};

function getDefaultCustomDates(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end);
  start.setMonth(start.getMonth() - 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

interface ExportExcelButtonProps {
  type: ExportExcelType;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  className?: string;
}

export function ExportExcelButton({
  type,
  variant = "outline",
  className,
}: ExportExcelButtonProps) {
  const { hasPermission } = usePermissions();
  const [open, setOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>("1m");
  const [customDates, setCustomDates] = useState(getDefaultCustomDates);
  const [loading, setLoading] = useState(false);

  if (!hasPermission("exportExcel")) {
    return null;
  }

  const isCustomValid =
    dateRange !== "custom" ||
    (customDates.startDate &&
      customDates.endDate &&
      new Date(customDates.startDate) <= new Date(customDates.endDate));

  const handleExport = async () => {
    const params: Record<string, string> =
      dateRange === "custom"
        ? {
            startDate: customDates.startDate,
            endDate: customDates.endDate,
          }
        : { range: dateRange };

    setLoading(true);
    try {
      const response = await apiClient.get(`/export/${type}`, {
        params,
        responseType: "blob",
      });

      const contentDisposition = response.headers["content-disposition"];
      let filename = `${type}-export.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1].replace(/"/g, "");
        }
      }

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`${TYPE_LABELS[type]} exported successfully!`);
      setOpen(false);
    } catch (error: unknown) {
      console.error("Export error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to export data";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Download className="mr-2 h-4 w-4" />
        Export to Excel
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export to Excel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Date range</Label>
              <Select
                value={dateRange}
                onValueChange={(v) => setDateRange(v as DateRange)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {dateRange === "custom" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="export-start"
                    className="text-sm font-medium flex items-center gap-2"
                  >
                    <Calendar className="h-4 w-4 text-primary" />
                    Start date
                  </Label>
                  <div className="relative group">
                    <div className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <Input
                      id="export-start"
                      type="date"
                      value={customDates.startDate}
                      onChange={(e) =>
                        setCustomDates((prev) => ({
                          ...prev,
                          startDate: e.target.value,
                        }))
                      }
                      className="pl-10 pr-10 w-full cursor-pointer hover:border-primary focus:border-primary transition-colors text-sm font-medium [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:left-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      style={{ colorScheme: "light" }}
                    />
                    {customDates.startDate && (
                      <button
                        type="button"
                        onClick={() =>
                          setCustomDates((prev) => ({
                            ...prev,
                            startDate: "",
                          }))
                        }
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 h-6 w-6 rounded-full bg-destructive/20 hover:bg-destructive/30 flex items-center justify-center transition-colors z-20 border border-destructive/30"
                        aria-label="Clear start date"
                      >
                        <X className="h-3.5 w-3.5 text-destructive font-bold" />
                      </button>
                    )}
                  </div>
                  {customDates.startDate && (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/10">
                      <CheckCircle className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      <p className="text-xs text-foreground font-medium">
                        {new Date(
                          customDates.startDate,
                        ).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="export-end"
                    className="text-sm font-medium flex items-center gap-2"
                  >
                    <Calendar className="h-4 w-4 text-primary" />
                    End date
                  </Label>
                  <div className="relative group">
                    <div className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <Input
                      id="export-end"
                      type="date"
                      value={customDates.endDate}
                      onChange={(e) =>
                        setCustomDates((prev) => ({
                          ...prev,
                          endDate: e.target.value,
                        }))
                      }
                      className="pl-10 pr-10 w-full cursor-pointer hover:border-primary focus:border-primary transition-colors text-sm font-medium [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:left-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      style={{ colorScheme: "light" }}
                    />
                    {customDates.endDate && (
                      <button
                        type="button"
                        onClick={() =>
                          setCustomDates((prev) => ({
                            ...prev,
                            endDate: "",
                          }))
                        }
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 h-6 w-6 rounded-full bg-destructive/20 hover:bg-destructive/30 flex items-center justify-center transition-colors z-20 border border-destructive/30"
                        aria-label="Clear end date"
                      >
                        <X className="h-3.5 w-3.5 text-destructive font-bold" />
                      </button>
                    )}
                  </div>
                  {customDates.endDate && (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/10">
                      <CheckCircle className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      <p className="text-xs text-foreground font-medium">
                        {new Date(
                          customDates.endDate,
                        ).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={loading || !isCustomValid}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
