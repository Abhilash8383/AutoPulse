"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCrmOverview,
  type CrmOverviewOwnerPerformance,
  type CrmOverviewResponse,
} from "@/services/api/crm-overview.service";
import {
  Loader2,
  RefreshCw,
  Users,
  CalendarDays,
  Trophy,
  CircleDot,
} from "lucide-react";

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getWinRate(owner: CrmOverviewOwnerPerformance): number {
  const closed = owner.won + owner.lost;
  if (closed === 0) return 0;
  return Math.round((owner.won / closed) * 100);
}

export default function CrmOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<CrmOverviewResponse | null>(null);

  const load = async (opts?: { silent?: boolean }) => {
    if (opts?.silent) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await getCrmOverview();
      setData(result);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to load CRM overview");
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const topOwner = useMemo(() => {
    if (!data?.ownerPerformance?.length) return null;
    return data.ownerPerformance[0];
  }, [data?.ownerPerformance]);

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="inline-flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading CRM overview...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">CRM Overview</h1>
          <p className="text-sm text-muted-foreground">
            Summary of contacts, leads, and owner performance.
          </p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">No data available right now.</p>
            <Button className="mt-4" variant="outline" onClick={() => load()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">CRM Overview</h1>
          <p className="text-sm text-muted-foreground">
            Contacts created, cleared leads, and team ownership performance.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Last updated: {formatDateTime(data.generatedAt)}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => load({ silent: true })}
          disabled={refreshing}
        >
          {refreshing ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Refreshing...
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </span>
          )}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.contactsCreated.day}</div>
            <div className="text-xs text-muted-foreground">Contacts created</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.contactsCreated.week}</div>
            <div className="text-xs text-muted-foreground">Contacts created</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.contactsCreated.month}</div>
            <div className="text-xs text-muted-foreground">Contacts created</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">This Year</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.contactsCreated.year}</div>
            <div className="text-xs text-muted-foreground">Contacts created</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Lifetime</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.contactsCreated.lifetime}</div>
            <div className="text-xs text-muted-foreground">Contacts created</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CircleDot className="h-4 w-4" />
              Lead Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Total</span><span className="font-semibold">{data.leads.total}</span></div>
            <div className="flex justify-between"><span>Open</span><span className="font-semibold">{data.leads.open}</span></div>
            <div className="flex justify-between"><span>Won</span><span className="font-semibold">{data.leads.won}</span></div>
            <div className="flex justify-between"><span>Lost</span><span className="font-semibold">{data.leads.lost}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Cleared Leads
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Today</span><span className="font-semibold">{data.clearedLeads.day}</span></div>
            <div className="flex justify-between"><span>Week</span><span className="font-semibold">{data.clearedLeads.week}</span></div>
            <div className="flex justify-between"><span>Month</span><span className="font-semibold">{data.clearedLeads.month}</span></div>
            <div className="flex justify-between"><span>Year</span><span className="font-semibold">{data.clearedLeads.year}</span></div>
            <div className="flex justify-between"><span>Lifetime</span><span className="font-semibold">{data.clearedLeads.lifetime}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Top Owner
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topOwner ? (
              <div className="space-y-2">
                <div className="font-medium text-sm break-all">{topOwner.ownerEmail}</div>
                <div className="text-xs text-muted-foreground">Cleared: {topOwner.cleared}</div>
                <div className="text-xs text-muted-foreground">Total assigned: {topOwner.totalAssigned}</div>
                <div className="text-xs text-muted-foreground">Win rate: {getWinRate(topOwner)}%</div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No owner data yet.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Owner Performance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Owner</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assigned</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Open</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Won</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lost</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cleared</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Win rate</th>
                </tr>
              </thead>
              <tbody>
                {data.ownerPerformance.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 px-4 text-sm text-center text-muted-foreground">
                      No owner performance data found.
                    </td>
                  </tr>
                ) : (
                  data.ownerPerformance.map((row) => (
                    <tr key={row.ownerUserId ?? "unassigned"} className="border-b hover:bg-muted/20">
                      <td className="py-3 px-4 text-sm break-all">{row.ownerEmail}</td>
                      <td className="py-3 px-4 text-sm">{row.totalAssigned}</td>
                      <td className="py-3 px-4 text-sm">{row.open}</td>
                      <td className="py-3 px-4 text-sm">{row.won}</td>
                      <td className="py-3 px-4 text-sm">{row.lost}</td>
                      <td className="py-3 px-4 text-sm font-medium">{row.cleared}</td>
                      <td className="py-3 px-4 text-sm">{getWinRate(row)}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
