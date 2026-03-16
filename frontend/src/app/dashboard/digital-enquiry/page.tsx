"use client";

import { useState, useEffect, useRef } from "react";
import apiClient from "@/lib/api";
import { getCachedData, setCachedData } from "@/lib/cache";
import { toast } from "sonner";
import { usePermissions } from "@/contexts/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Loader2, MessageSquare, Upload, RotateCw, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import * as XLSX from "xlsx";
import CreateEnquiryDialog from "./components/CreateEnquiryDialog";
import BulkUploadDialog from "./components/BulkUploadDialog";
import EnquiriesTable from "./components/EnquiriesTable";
import Pagination from "./components/Pagination";
import { ExportExcelButton } from "@/components/export-excel-button";
import DigitalEnquiryLoading from "./loading";

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

interface DigitalEnquiry {
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
  modelText?: string | null; // Raw model name when not found in DB
  sourceText?: string | null; // Raw source name when not found in DB
  createdAt: string;
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

interface PhoneLookup {
  dailyWalkins: boolean;
  digitalEnquiry: boolean;
  deliveryUpdate: boolean;
  visitorId: string | null;
  enquiryId: string | null;
  ticketId: string | null;
}

export default function DigitalEnquiryPage() {
  const { hasPermission } = usePermissions();

  const PAGE_SIZE = 10;

  const [enquiries, setEnquiries] = useState<DigitalEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLoading, setPageLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalEnquiries, setTotalEnquiries] = useState(0);
  const [phoneLookups, setPhoneLookups] = useState<Record<string, PhoneLookup>>(
    {},
  );
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  // Create enquiry dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Bulk upload dialog state
  const [bulkUploadDialogOpen, setBulkUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadResults, setUploadResults] = useState<{
    success: boolean;
    jobId?: string;
    totalRows?: number;
    status?: string;
    message?: string;
    summary?: { total: number; success: number; errors: number };
    results?: Array<{
      success: boolean;
      rowNumber: number;
      enquiryId?: string;
      error?: string;
    }>;
  } | null>(null);

  // Edit lead scope state
  const [editingLeadScope, setEditingLeadScope] = useState<string | null>(null);
  const [updatingLeadScope, setUpdatingLeadScope] = useState(false);
  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    mountedRef.current = true;

    // Try to load from cache first - use longer cache duration
    const cached = getCachedData<DigitalEnquiry[]>(
      "cache_digital_enquiry",
      120000, // 2 minutes
    );
    if (cached) {
      setEnquiries(cached);
      setLoading(false);

      // Check cache age to decide if we need to refresh
      try {
        const cacheEntry = JSON.parse(
          sessionStorage.getItem("cache_digital_enquiry") || "{}",
        );
        const cacheAge = Date.now() - (cacheEntry.timestamp || 0);

        // If cache is fresh (< 30 seconds), don't fetch
        if (cacheAge < 30000) {
          // Cache is fresh, no need to fetch
        } else {
          // Cache is stale (> 30 seconds), refresh in background
          if (mountedRef.current && !fetchingRef.current) {
            setTimeout(() => {
              if (mountedRef.current && !fetchingRef.current) {
                fetchData(0, false, true); // Background fetch
              }
            }, 500);
          }
        }
      } catch {
        // If cache parsing fails, fetch normally
        fetchData(0, false);
      }
    } else {
      // No cache, fetch normally
      fetchData(0, false);
    }

    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hasPermission("digitalEnquiry")) {
    return (
      <div className="space-y-8">
        <div className="pb-2 border-b">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Digital Enquiry
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

  const fetchData = async (
    skip: number = 0,
    append: boolean = false,
    background: boolean = false,
  ) => {
    // Prevent duplicate fetches
    if (fetchingRef.current && !append) return;
    if (!append) fetchingRef.current = true;

    try {
      if (!append && !background) {
        setLoading(true);
      } else if (append) {
        setPageLoading(true);
      }

      const response = await apiClient.get(
        `/digital-enquiry?limit=${PAGE_SIZE}&skip=${skip}`,
      );

      // Append or replace enquiries
      if (append) {
        setEnquiries([...enquiries, ...response.data.enquiries]);
      } else {
        setEnquiries(response.data.enquiries);
        setCurrentPage(1);
        // Cache the data
        setCachedData("cache_digital_enquiry", response.data.enquiries);
      }

      setHasMore(response.data.hasMore || false);
      setTotalEnquiries(response.data.total || response.data.enquiries.length);

      // Only fetch phone lookups when loading more data (not on initial load)
      // Use batch lookup to avoid multiple API calls
      if (append && response.data.enquiries.length > 0) {
        const newEnquiries = response.data.enquiries;
        const lookups: Record<string, PhoneLookup> = { ...phoneLookups };

        try {
          // Extract unique phone numbers
          const phoneNumbers = [
            ...new Set(
              newEnquiries.map((e: DigitalEnquiry) => e.whatsappNumber),
            ),
          ];

          // Batch lookup all phones in one request
          const lookupRes = await apiClient.post("/phone-lookup", {
            phones: phoneNumbers,
          });

          // Merge batch results into lookups
          Object.assign(lookups, lookupRes.data);
          setPhoneLookups(lookups);
        } catch (error) {
          console.error("Failed to batch lookup phones:", error);
          // Don't break the page if phone lookup fails
        }
      }
    } catch (error) {
      console.error("Failed to fetch enquiries:", error);
    } finally {
      if (!append) fetchingRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
        setPageLoading(false);
      }
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

  const handleCreateEnquiry = async (formData: FormData) => {
    setSubmitting(true);
    setError("");

    try {
      const response = await apiClient.post("/digital-enquiry", {
        ...formData,
        leadSourceId: formData.leadSourceId || null,
        interestedModelId: formData.interestedModelId || null,
        interestedVariantId: formData.interestedVariantId || null,
      });

      if (response.data.success) {
        const newEnquiry = response.data.enquiry;

        // 1. IMMEDIATE UI UPDATE - Add enquiry to list immediately
        setEnquiries((prev) => [newEnquiry, ...prev]);
        setTotalEnquiries((prev) => prev + 1);
        setCurrentPage(1);
        setHasMore(true);

        // 2. UPDATE CACHE
        const cachedEnquiries = getCachedData<DigitalEnquiry[]>(
          "cache_digital_enquiry",
          120000,
        );
        if (cachedEnquiries) {
          setCachedData("cache_digital_enquiry", [
            newEnquiry,
            ...cachedEnquiries,
          ]);
        } else {
          setCachedData("cache_digital_enquiry", [newEnquiry]);
        }

        // 3. BACKGROUND REFETCH - Ensure consistency
        fetchData(0, false, true); // Background fetch

        // Close dialog
        setCreateDialogOpen(false);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || "Failed to create enquiry");
      throw error;
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

    // Validate file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
      setUploadError(
        "Invalid file type. Please upload an Excel file (.xlsx or .xls)",
      );
      setUploading(false);
      return;
    }

    try {
      // Read Excel file and convert to JSON
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });

      // Get first sheet
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

      // Validate required columns
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

      // Send JSON data to backend
      const response = await apiClient.post("/digital-enquiry/bulk", {
        rows: rows,
      });

      if (response.data.success) {
        setUploadResults(response.data);
        // Refresh the enquiry list in background
        fetchData(0, false, true); // Background fetch after bulk upload
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

  const handlePageChange = async (page: number) => {
    const totalPages = Math.max(1, Math.ceil(totalEnquiries / PAGE_SIZE));
    const targetPage = Math.min(Math.max(page, 1), totalPages);

    if (targetPage * PAGE_SIZE <= enquiries.length || !hasMore) {
      setCurrentPage(targetPage);
      return;
    }

    if (hasMore && !pageLoading) {
      await fetchData(enquiries.length, true);
      setCurrentPage(targetPage);
    }
  };

  const handleUpdateLeadScope = async (
    enquiryId: string,
    newLeadScope: string,
  ) => {
    if (updatingLeadScope) return;

    setUpdatingLeadScope(true);
    try {
      const response = await apiClient.patch(`/digital-enquiry/${enquiryId}`, {
        leadScope: newLeadScope,
      });

      if (response.data.success) {
        // 1. IMMEDIATE UI UPDATE - Update enquiry in local state
        setEnquiries((prev) =>
          prev.map((enquiry) =>
            enquiry.id === enquiryId
              ? { ...enquiry, leadScope: newLeadScope }
              : enquiry,
          ),
        );

        // 2. UPDATE CACHE
        const cachedEnquiries = getCachedData<DigitalEnquiry[]>(
          "cache_digital_enquiry",
          120000,
        );
        if (cachedEnquiries) {
          const updatedCache = cachedEnquiries.map((enquiry) =>
            enquiry.id === enquiryId
              ? { ...enquiry, leadScope: newLeadScope }
              : enquiry,
          );
          setCachedData("cache_digital_enquiry", updatedCache);
        }

        setEditingLeadScope(null);
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      console.error("Failed to update lead scope:", error);
      toast.error(err.response?.data?.error || "Failed to update lead scope");
    } finally {
      setUpdatingLeadScope(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
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

  if (loading) {
    return <DigitalEnquiryLoading />;
  }

  const filteredEnquiries = searchQuery.trim()
    ? enquiries.filter((e) => {
        const q = searchQuery.trim().toLowerCase();
        const fullName = `${e.firstName} ${e.lastName}`.toLowerCase();
        const phone = e.whatsappNumber.toLowerCase();
        const email = (e.email || "").toLowerCase();
        return fullName.includes(q) || phone.includes(q) || email.includes(q);
      })
    : enquiries;

  const totalPages = Math.max(1, Math.ceil(filteredEnquiries.length / PAGE_SIZE));
  const paginatedEnquiries = filteredEnquiries.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="pb-2 border-b">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Digital Enquiry
        </h1>
        <p className="text-xs sm:text-sm lg:text-base text-muted-foreground mt-2">
          Manage digital lead inquiries
        </p>
      </div>

      <div className="flex justify-end gap-4">
        <ExportExcelButton type="digital-enquiry" />
        <Button
          variant="outline"
          onClick={() => {
            setEnquiries([]);
            setCurrentPage(1);
            fetchData(0, false);
            toast.success("Reloading data...");
          }}
          disabled={loading}
        >
          <RotateCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Sync Data
        </Button>
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

      {enquiries.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm sm:text-base">
                No digital enquiries yet. Create your first inquiry to get
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
                {filteredEnquiries.length} result{filteredEnquiries.length !== 1 ? "s" : ""} found
              </p>
            )}
          </div>
          {searchQuery && filteredEnquiries.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-sm text-muted-foreground py-6">
                  No results for your search. Try a different name, phone, or email.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
          <EnquiriesTable
            enquiries={paginatedEnquiries}
            phoneLookups={phoneLookups}
            editingLeadScope={editingLeadScope}
            updatingLeadScope={updatingLeadScope}
            onEditLeadScope={setEditingLeadScope}
            onUpdateLeadScope={handleUpdateLeadScope}
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

      <CreateEnquiryDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        leadSources={leadSources}
        categories={categories}
        onSubmit={handleCreateEnquiry}
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
