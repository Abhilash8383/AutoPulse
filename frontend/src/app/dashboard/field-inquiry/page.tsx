"use client";

import { useState, useEffect, useRef } from "react";
import apiClient from "@/lib/api";
import { getCachedData, setCachedData } from "@/lib/cache";
import { usePermissions } from "@/contexts/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, MapPin, Upload, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import * as XLSX from "xlsx";
import FieldInquiryLoading from "./loading";
import InquiriesTable from "./components/InquiriesTable";
import Pagination from "./components/Pagination";
import CreateInquiryDialog from "./components/CreateInquiryDialog";
import BulkUploadDialog from "./components/BulkUploadDialog";
import { ExportExcelButton } from "@/components/export-excel-button";

interface LeadSource {
  id: string;
  name: string;
}

interface VehicleModel {
  id: string;
  name: string;
  year: number | null;
  variants?: Array<{ id: string; name: string }>;
}

interface VehicleCategory {
  id: string;
  name: string;
  models: VehicleModel[];
}

interface FieldInquiry {
  id: string;
  firstName: string;
  lastName: string;
  whatsappNumber: string;
  email: string | null;
  reason: string;
  leadScope: string;
  leadSource: {
    id: string;
    name: string;
  } | null;
  model: {
    name: string;
    category: {
      name: string;
    };
  } | null;
  createdAt: string;
}

interface PhoneLookup {
  dailyWalkins: boolean;
  digitalEnquiry: boolean;
  fieldInquiry: boolean;
  deliveryUpdate: boolean;
  visitorId: string | null;
  enquiryId: string | null;
  fieldInquiryId: string | null;
  ticketId: string | null;
}

interface FormData {
  firstName: string;
  lastName: string;
  whatsappNumber: string;
  email: string;
  address: string;
  reason: string;
  leadSourceId: string;
  leadScope: string;
  interestedModelId: string;
  interestedVariantId: string;
}

export default function FieldInquiryPage() {
  const { hasPermission } = usePermissions();
  const hasAccess = hasPermission("fieldInquiry");

  const PAGE_SIZE = 10;

  const [inquiries, setInquiries] = useState<FieldInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLoading, setPageLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalInquiries, setTotalInquiries] = useState(0);
  const [phoneLookups, setPhoneLookups] = useState<Record<string, PhoneLookup>>(
    {},
  );
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  // Create inquiry dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Bulk upload dialog state
  const [bulkUploadDialogOpen, setBulkUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadResults, setUploadResults] = useState<{
    summary: { total: number; success: number; errors: number };
    results: Array<{
      success: boolean;
      rowNumber: number;
      enquiryId?: string;
      error?: string;
    }>;
  } | null>(null);

  // Form data for create dialog
  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async (
    skip: number = 0,
    append: boolean = false,
    background: boolean = false,
  ) => {
    if (fetchingRef.current && !append) return;
    if (!append) fetchingRef.current = true;

    try {
      if (!append && !background) {
        setLoading(true);
      } else if (append) {
        setPageLoading(true);
      }

      const response = await apiClient.get(
        `/field-inquiry?limit=${PAGE_SIZE}&skip=${skip}`,
      );

      if (append) {
        setInquiries((prev) => [...prev, ...response.data.enquiries]);
      } else {
        setInquiries(response.data.enquiries);
        setCurrentPage(1);
        setCachedData("cache_field_inquiry", response.data.enquiries);
      }

      setHasMore(response.data.hasMore || false);
      setTotalInquiries(response.data.total || response.data.enquiries.length);

      // Batch lookup phone numbers when loading more data
      if (append && response.data.enquiries.length > 0) {
        const newInquiries = response.data.enquiries;

        try {
          const phoneNumbers = [
            ...new Set(newInquiries.map((e: FieldInquiry) => e.whatsappNumber)),
          ];

          const lookupRes = await apiClient.post("/phone-lookup", {
            phones: phoneNumbers,
          });

          setPhoneLookups((prev) => ({ ...prev, ...lookupRes.data }));
        } catch (err) {
          console.error("Failed to batch lookup phones:", err);
        }
      }
    } catch (err) {
      console.error("Failed to fetch inquiries:", err);
    } finally {
      if (!append) fetchingRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
        setPageLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!hasAccess) return;

    mountedRef.current = true;

    // Try to load from cache first - use longer cache duration
    const cached = getCachedData<FieldInquiry[]>("cache_field_inquiry", 120000);
    if (cached) {
      setInquiries(cached);
      setLoading(false);

      // Check cache age to decide if we need to refresh
      try {
        const cacheEntry = JSON.parse(
          sessionStorage.getItem("cache_field_inquiry") || "{}",
        );
        const cacheAge = Date.now() - (cacheEntry.timestamp || 0);

        if (cacheAge >= 30000) {
          // Cache is stale (> 30 seconds), refresh in background
          if (mountedRef.current && !fetchingRef.current) {
            setTimeout(() => {
              if (mountedRef.current && !fetchingRef.current) {
                fetchData(0, false, true);
              }
            }, 500);
          }
        }
      } catch {
        fetchData(0, false);
      }
    } else {
      fetchData(0, false);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [hasAccess]);

  if (!hasAccess) {
    return (
      <div className="space-y-8">
        <div className="pb-2 border-b">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Field Inquiry
          </h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-base">
                You don&apos;t have permission to access this page.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handlePageChange = async (page: number) => {
    const totalPages = Math.max(1, Math.ceil(totalInquiries / PAGE_SIZE));
    const targetPage = Math.min(Math.max(page, 1), totalPages);

    if (targetPage * PAGE_SIZE <= inquiries.length || !hasMore) {
      setCurrentPage(targetPage);
      return;
    }

    if (hasMore && !pageLoading) {
      await fetchData(inquiries.length, true);
      setCurrentPage(targetPage);
    }
  };

  const fetchCreateFormData = async () => {
    try {
      const [leadSourcesRes, categoriesRes] = await Promise.all([
        apiClient.get("/lead-sources"),
        apiClient.get("/categories"),
      ]);
      setLeadSources(
        leadSourcesRes.data?.leadSources ??
          (Array.isArray(leadSourcesRes.data) ? leadSourcesRes.data : []),
      );
      setCategories(categoriesRes.data?.categories ?? []);
    } catch (error) {
      console.error("Failed to fetch form data:", error);
    }
  };

  const handleCreateInquiry = async (formData: FormData) => {
    setSubmitting(true);
    setError("");

    try {
      const response = await apiClient.post("/field-inquiry", {
        ...formData,
        leadSourceId: formData.leadSourceId || null,
        interestedModelId: formData.interestedModelId || null,
        interestedVariantId: formData.interestedVariantId || null,
      });

      if (response.data.success) {
        const newInquiry = response.data.enquiry;

        // Immediate UI update
        setInquiries((prev) => [newInquiry, ...prev]);
        setTotalInquiries((prev) => prev + 1);
        setCurrentPage(1);
        setHasMore(true);

        // Update cache
        const cachedInquiries = getCachedData<FieldInquiry[]>(
          "cache_field_inquiry",
          120000,
        );
        if (cachedInquiries) {
          setCachedData("cache_field_inquiry", [
            newInquiry,
            ...cachedInquiries,
          ]);
        } else {
          setCachedData("cache_field_inquiry", [newInquiry]);
        }

        // Background refetch
        fetchData(0, false, true);

        // Close dialog
        setCreateDialogOpen(false);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || "Failed to create inquiry");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);
    setUploadError("");
    setUploadResults(null);

    const fileInput = e.currentTarget.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = fileInput?.files?.[0];

    if (!file) {
      setUploadError("Please select a file");
      setUploading(false);
      return;
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
      setUploadError(
        "Invalid file type. Please upload an Excel file (.xlsx or .xls)",
      );
      setUploading(false);
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });

      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        setUploadError("Excel file has no sheets");
        setUploading(false);
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rows: Record<string, unknown>[] =
        XLSX.utils.sheet_to_json(worksheet);

      if (rows.length === 0) {
        setUploadError("Excel file is empty");
        setUploading(false);
        return;
      }

      const firstRow = rows[0];
      const requiredColumns = ["Date", "Name", "WhatsApp Number", "Model"];
      const missingColumns = requiredColumns.filter(
        (col) => !(col in firstRow),
      );

      if (missingColumns.length > 0) {
        setUploadError(
          `Missing required columns: ${missingColumns.join(", ")}`,
        );
        setUploading(false);
        return;
      }

      const response = await apiClient.post("/field-inquiry/bulk", {
        rows: rows,
      });

      if (response.data.success) {
        setUploadResults(response.data);
        fetchData(0, false, true);
      }
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { error?: string; details?: string } };
      };
      setUploadError(
        error.response?.data?.error ||
          error.response?.data?.details ||
          "Failed to upload file",
      );
    } finally {
      setUploading(false);
    }
  };

  const getLeadScopeColor = (scope: string) => {
    switch (scope) {
      case "hot":
        return "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400";
      case "warm":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400";
      case "cold":
        return "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400";
      default:
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return <FieldInquiryLoading />;
  }

  const filteredInquiries = searchQuery.trim()
    ? inquiries.filter((i) => {
        const q = searchQuery.trim().toLowerCase();
        const fullName = `${i.firstName} ${i.lastName}`.toLowerCase();
        const phone = i.whatsappNumber.toLowerCase();
        const email = (i.email || "").toLowerCase();
        return fullName.includes(q) || phone.includes(q) || email.includes(q);
      })
    : inquiries;

  const totalPages = Math.max(1, Math.ceil(filteredInquiries.length / PAGE_SIZE));
  const paginatedInquiries = filteredInquiries.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="pb-2 border-b">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Field Inquiry
        </h1>
        <p className="text-xs sm:text-sm lg:text-base text-muted-foreground mt-2">
          Manage field lead inquiries
        </p>
      </div>

      <div className="flex justify-end gap-4">
        <ExportExcelButton type="field-inquiry" />
        <Button
          variant="outline"
          onClick={() => {
            setBulkUploadDialogOpen(true);
            setUploadError("");
            setUploadResults(null);
          }}
        >
          <Upload className="mr-2 h-4 w-4" />
          Bulk Upload
        </Button>
        <Button
          onClick={() => {
            setCreateDialogOpen(true);
            fetchCreateFormData();
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Inquiry
        </Button>
      </div>

      {inquiries.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm sm:text-base">
                No field inquiries yet. Create your first inquiry to get
                started.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="   Search by name, phone number, or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-14 pr-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {searchQuery && (
              <p className="text-xs text-muted-foreground mt-2">
                {filteredInquiries.length} result{filteredInquiries.length !== 1 ? "s" : ""} found
              </p>
            )}
          </div>
          {searchQuery && filteredInquiries.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-sm text-muted-foreground py-6">
                  No results for your search. Try a different name, phone, or email.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
          <InquiriesTable
            inquiries={paginatedInquiries}
            phoneLookups={phoneLookups}
            formatDate={formatDate}
            getLeadScopeColor={getLeadScopeColor}
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            pageLoading={pageLoading}
          />
            </>
          )}
        </>
      )}

      <CreateInquiryDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        leadSources={leadSources}
        categories={categories}
        onSubmit={handleCreateInquiry}
        submitting={submitting}
        error={error}
      />

      <BulkUploadDialog
        open={bulkUploadDialogOpen}
        onOpenChange={setBulkUploadDialogOpen}
        onSubmit={handleBulkUpload}
        uploading={uploading}
        uploadError={uploadError}
        uploadResults={uploadResults}
        onClose={() => {
          setBulkUploadDialogOpen(false);
          setUploadError("");
          setUploadResults(null);
        }}
      />
    </div>
  );
}
