import React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, X, UserPlus, Eye } from "lucide-react";
import { Visitor, PhoneLookup } from "../types";
import { formatDate, getInitials } from "../utils/formatters";
import { VISITOR_PAGE_SIZE } from "../constants";
import { Pagination } from "./Pagination";

interface VisitorsTabProps {
  visitors: Visitor[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClearSearch: () => void;
  currentPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  pageLoading: boolean;
  phoneLookups: Record<string, PhoneLookup>;
  onViewDetails: (visitor: Visitor) => void;
}

export function VisitorsTab({
  visitors,
  searchQuery,
  onSearchChange,
  onClearSearch,
  currentPage,
  totalItems,
  onPageChange,
  pageLoading,
  phoneLookups,
  onViewDetails,
}: VisitorsTabProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / VISITOR_PAGE_SIZE));
  const paginatedVisitors = visitors.slice(
    (currentPage - 1) * VISITOR_PAGE_SIZE,
    currentPage * VISITOR_PAGE_SIZE,
  );

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="   Search by name, phone number, or email..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-14 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {searchQuery && (
          <p className="text-xs text-muted-foreground mt-2">
            {visitors.length} result{visitors.length !== 1 ? "s" : ""} found
          </p>
        )}
      </div>

      {/* Visitor List */}
      {visitors.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm sm:text-base">
                No visitors found. Create your first visitor to get started.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Visitor
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Contact
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Last Visit
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Sessions
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Interested Models
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedVisitors.map((visitor) => {
                      const initials = getInitials(
                        visitor.firstName,
                        visitor.lastName,
                      );
                      const lastVisit =
                        visitor.sessions && visitor.sessions.length > 0
                          ? formatDate(
                              visitor.sessions.sort(
                                (a, b) =>
                                  new Date(b.createdAt).getTime() -
                                  new Date(a.createdAt).getTime(),
                              )[0].createdAt,
                            )
                          : formatDate(visitor.createdAt);

                      return (
                        <tr
                          key={visitor.id}
                          className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => onViewDetails(visitor)}
                        >
                          {/* Visitor Column */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm flex-shrink-0">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {[visitor.firstName, visitor.lastName].filter(Boolean).join(" ") || "—"}
                                </p>
                                {visitor.email && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {visitor.email}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Contact Column */}
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <p className="text-sm">
                                {(visitor.whatsappNumber ?? "").trim() || "No phone"}
                              </p>
                            </div>
                          </td>

                          {/* Last Visit Column */}
                          <td className="py-3 px-4">
                            <p className="text-sm">{lastVisit}</p>
                          </td>

                          {/* Sessions Column */}
                          <td className="py-3 px-4">
                            <Badge
                              variant="secondary"
                              className="text-xs font-medium"
                            >
                              {visitor.sessions?.length || 0} session
                              {(visitor.sessions?.length || 0) !== 1 ? "s" : ""}
                            </Badge>
                          </td>

                          {/* Interested Models Column */}
                          <td className="py-3 px-4">
                            {visitor.interests &&
                            visitor.interests.length > 0 ? (
                              <div className="space-y-1">
                                {visitor.interests
                                  .slice(0, 2)
                                  .map((interest, idx) => (
                                    <p
                                      key={idx}
                                      className="text-xs text-muted-foreground"
                                    >
                                      {interest.model.category.name} -{" "}
                                      {interest.model.name}
                                    </p>
                                  ))}
                                {visitor.interests.length > 2 && (
                                  <p className="text-xs text-muted-foreground">
                                    +{visitor.interests.length - 2} more
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                None
                              </span>
                            )}
                          </td>

                          {/* Actions Column */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {phoneLookups[visitor.whatsappNumber ?? ""]
                                ?.digitalEnquiry && (
                                <Link
                                  href="/dashboard/digital-enquiry"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Badge
                                    variant="outline"
                                    className="text-xs cursor-pointer hover:bg-primary/10 transition-colors"
                                  >
                                    Digital
                                  </Badge>
                                </Link>
                              )}
                              {phoneLookups[visitor.whatsappNumber ?? ""]
                                ?.deliveryUpdate && (
                                <Link
                                  href="/dashboard/delivery-update"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Badge
                                    variant="outline"
                                    className="text-xs cursor-pointer hover:bg-primary/10 transition-colors"
                                  >
                                    Delivery
                                  </Badge>
                                </Link>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onViewDetails(visitor);
                                }}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            loading={pageLoading}
          />
        </>
      )}
    </div>
  );
}
