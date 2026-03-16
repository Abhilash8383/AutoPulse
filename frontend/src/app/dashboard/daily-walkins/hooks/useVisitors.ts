import { useState, useCallback, useRef } from "react";
import { Visitor, VisitorFormData, PhoneLookup, DateFilter } from "../types";
import { VISITOR_PAGE_SIZE, CACHE_KEYS, CACHE_DURATIONS } from "../constants";
import { getCachedData, setCachedData } from "@/lib/cache";
import apiClient from "@/lib/api";
import { toast } from "sonner";

export function useVisitors(canViewVisitors: boolean) {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [filteredVisitors, setFilteredVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [visitorPage, setVisitorPage] = useState(1);
  const [visitorPageLoading, setVisitorPageLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalVisitors, setTotalVisitors] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>({
    startDate: "",
    endDate: "",
  });
  const [phoneLookups, setPhoneLookups] = useState<Record<string, PhoneLookup>>(
    {},
  );
  const fetchingRef = useRef(false);

  const applyFilters = useCallback(() => {
    let filtered = [...visitors];

    // Date filter
    if (dateFilter.startDate || dateFilter.endDate) {
      const startDate = dateFilter.startDate
        ? new Date(dateFilter.startDate)
        : null;
      const endDate = dateFilter.endDate ? new Date(dateFilter.endDate) : null;

      if (startDate) startDate.setHours(0, 0, 0, 0);
      if (endDate) endDate.setHours(23, 59, 59, 999);

      filtered = filtered.filter((visitor) => {
        const visitorDate = new Date(visitor.createdAt);
        if (startDate && visitorDate < startDate) return false;
        if (endDate && visitorDate > endDate) return false;
        return true;
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((visitor) => {
        const fullName =
          `${visitor.firstName ?? ""} ${visitor.lastName ?? ""}`.trim().toLowerCase();
        const phone = (visitor.whatsappNumber ?? "").toLowerCase();
        const email = visitor.email?.toLowerCase() || "";

        return (
          fullName.includes(query) ||
          phone.includes(query) ||
          email.includes(query)
        );
      });
    }

    setFilteredVisitors(filtered);
    setVisitorPage(1);
  }, [dateFilter, visitors, searchQuery]);

  const fetchVisitors = async (
    skip: number = 0,
    append: boolean = false,
    background: boolean = false,
  ) => {
    if (!canViewVisitors) return;
    if (fetchingRef.current && !append) return;
    if (!append) fetchingRef.current = true;

    try {
      if (!append && !background) {
        setLoading(true);
      } else if (append) {
        setVisitorPageLoading(true);
      }

      const response = await apiClient.get(
        `/visitors?limit=${VISITOR_PAGE_SIZE}&skip=${skip}`,
      );

      if (append) {
        const existingIds = new Set(visitors.map((v) => v.id));
        const newVisitors = response.data.visitors.filter(
          (v: Visitor) => !existingIds.has(v.id),
        );
        setVisitors([...visitors, ...newVisitors]);

        // Batch phone lookup for new visitors
        if (newVisitors.length > 0) {
          try {
            const phoneNumbers = [
              ...new Set(
                newVisitors
                  .map((v: Visitor) => v.whatsappNumber ?? "")
                  .filter(Boolean),
              ),
            ];
            const lookupRes = await apiClient.post("/phone-lookup", {
              phones: phoneNumbers,
            });
            setPhoneLookups((prev) => ({ ...prev, ...lookupRes.data }));
          } catch (error) {
            console.error("Failed to batch lookup phones:", error);
          }
        }
      } else {
        setVisitors(response.data.visitors);
        setVisitorPage(1);
        if (!background) {
          setCachedData(CACHE_KEYS.VISITORS, response.data.visitors);
        }
      }

      setHasMore(response.data.hasMore || false);
      setTotalVisitors(response.data.total || response.data.visitors.length);
    } catch (error) {
      console.error("Failed to fetch visitors:", error);
    } finally {
      if (!append) fetchingRef.current = false;
      setLoading(false);
      setVisitorPageLoading(false);
    }
  };

  const handleVisitorPageChange = async (page: number) => {
    const totalPages = Math.max(
      1,
      Math.ceil(
        (hasMore
          ? Math.max(totalVisitors, filteredVisitors.length)
          : filteredVisitors.length) / VISITOR_PAGE_SIZE,
      ),
    );
    const targetPage = Math.min(Math.max(page, 1), totalPages);

    if (targetPage * VISITOR_PAGE_SIZE <= visitors.length || !hasMore) {
      setVisitorPage(targetPage);
      return;
    }

    if (hasMore && !visitorPageLoading) {
      await fetchVisitors(visitors.length, true);
      setVisitorPage(targetPage);
    }
  };

  const createVisitor = async (formData: VisitorFormData) => {
    try {
      const response = await apiClient.post("/visitors", formData);

      if (response.data.success) {
        const newVisitor = response.data.visitor;

        // Immediate UI update
        setVisitors((prev) => {
          const exists = prev.some((v) => v.id === newVisitor.id);
          return exists ? prev : [newVisitor, ...prev];
        });
        setTotalVisitors((prev) => prev + 1);
        setVisitorPage(1);
        setHasMore(true);

        // Update cache
        const cached = getCachedData<Visitor[]>(
          CACHE_KEYS.VISITORS,
          CACHE_DURATIONS.VISITORS,
        );
        if (cached) {
          setCachedData(CACHE_KEYS.VISITORS, [newVisitor, ...cached]);
        } else {
          setCachedData(CACHE_KEYS.VISITORS, [newVisitor]);
        }

        // Background refetch
        fetchVisitors(0, false, true);

        // Warning if WhatsApp failed
        if (response.data.message?.status === "failed") {
          console.warn(
            "Visitor created but WhatsApp message failed:",
            response.data.message.error,
          );
        }

        return { success: true };
      } else {
        throw new Error("Failed to create visitor");
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error || "Failed to create visitor";
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const clearDateFilter = () => {
    setDateFilter({ startDate: "", endDate: "" });
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  return {
    visitors,
    filteredVisitors,
    loading,
    visitorPage,
    visitorPageLoading,
    hasMore,
    totalVisitors,
    searchQuery,
    dateFilter,
    phoneLookups,
    setSearchQuery,
    setDateFilter,
    applyFilters,
    fetchVisitors,
    handleVisitorPageChange,
    createVisitor,
    clearDateFilter,
    clearSearch,
  };
}
