"use client";

import { useEffect, useRef, useState } from "react";
import apiClient from "@/lib/api";
import { getCachedData, setCachedData } from "@/lib/cache";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

type LeadSource = {
  id: string;
  name: string;
  order: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  dealershipId: string | null;
};

export default function LeadSourcesSettings() {
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const cached = getCachedData<LeadSource[]>("cache_settings_lead_sources", 300000);
    if (cached) {
      setSources(cached);
      setLoading(false);
      // refresh in background if cache is stale
      setTimeout(() => {
        if (mountedRef.current && !fetchingRef.current) fetchData();
      }, 500);
    } else {
      fetchData();
    }

    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      setLoading(true);
      const res = await apiClient.get<LeadSource[]>("/lead-sources");
      const data = Array.isArray(res.data) ? res.data : [];
      setSources(data);
      setCachedData("cache_settings_lead_sources", data);
    } catch (e) {
      // Keep UI stable; permissions middleware already handles redirects/toasts elsewhere
      setSources([]);
    } finally {
      fetchingRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Sources</CardTitle>
        <CardDescription>
          View the lead sources available for your dealership.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading lead sources…
          </div>
        ) : sources.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6">
            No lead sources found.
          </div>
        ) : (
          <div className="space-y-2">
            {sources.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {s.name}
                    {s.isDefault ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (default)
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Order: {s.order}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

