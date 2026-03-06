"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import apiClient from "@/lib/api";
import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { ThemeSwitcherButtons } from "@/components/theme-switcher-buttons";
import { useTheme } from "@/lib/theme-provider";
import { PermissionsProvider, usePermissions } from "@/contexts/permissions";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  DoorOpen,
  Globe,
  MessageSquare,
  Package,
  MapPin,
  Building2,
  BarChart3,
  PanelLeftClose,
  PanelLeft,
  UserCircle,
  Filter,
  CircleDollarSign,
  CheckSquare,
} from "lucide-react";

const SIDEBAR_COLLAPSED_KEY = "moto-sidebar-collapsed";

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
  const { user, loading, isAdmin, isSuperAdmin, hasPermission } =
    usePermissions();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Restore and persist sidebar collapsed state (client-only to avoid hydration mismatch)
  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored === "true") setSidebarCollapsed(true);
  }, []);
  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Set browser tab title to organization name (fallback to Autopulse)
  useEffect(() => {
    const title =
      user?.organization?.name || user?.dealership?.name || "Autopulse";
    if (typeof document !== "undefined") {
      document.title = title;
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout");
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile/Tablet Header */}
      <header className="fixed top-0 left-0 right-0 z-50 lg:hidden border-b bg-card/95 backdrop-blur-sm supports-[backdrop-filter]:bg-card/80">
        <div className="flex items-center justify-between p-3 sm:p-4">
          <div className="flex items-center h-10 sm:h-12">
            <img
              src="/autopluse-black.png"
              alt="Brand Logo"
              className="h-full w-auto object-contain dark:hidden"
            />
            <img
              src="/autopluse-white.png"
              alt="Brand Logo"
              className="h-full w-auto object-contain hidden dark:block"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="shrink-0 min-h-[44px] min-w-[44px]"
            aria-label={sidebarOpen ? "Close menu" : "Open menu"}
          >
            {sidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </header>

      {/* Mobile/Tablet Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden mt-14 sm:mt-16 sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed left-0 top-0 z-40 h-screen w-64 sm:w-64 md:w-72 border-r bg-gradient-to-b from-card to-card/95 shadow-lg sidebar-enter lg:relative lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:shadow-none lg:z-auto transition-[width] duration-200 overflow-x-hidden ${
            sidebarOpen
              ? "translate-x-0 pt-14 sm:pt-16 lg:pt-0"
              : "-translate-x-full"
          } ${sidebarCollapsed ? "lg:w-16" : "lg:w-56 xl:w-60"}`}
        >
          <TooltipProvider delayDuration={0}>
          <div className="flex flex-col h-full items-stretch py-3 px-3 min-w-0 overflow-x-hidden">
            {/* Logo + desktop sidebar toggle */}
            <div className="mb-1 hidden md:flex items-center justify-center w-full px-2 min-h-[3.5rem]">
              {!sidebarCollapsed && (
                <>
                  <img
                    src="/autopluse-black.png"
                    alt="Logo"
                    className="h-14 w-full object-contain dark:hidden"
                  />
                  <img
                    src="/autopluse-white.png"
                    alt="Logo"
                    className="h-14 w-full object-contain hidden dark:block"
                  />
                </>
              )}
              {sidebarCollapsed && (
                <>
                  <img
                    src="/autopluse-black.png"
                    alt="Logo"
                    className="h-8 w-8 object-contain dark:hidden"
                  />
                  <img
                    src="/autopluse-white.png"
                    alt="Logo"
                    className="h-8 w-8 object-contain hidden dark:block"
                  />
                </>
              )}
            </div>
            {/* Powered by link - hide when collapsed */}
            {!sidebarCollapsed && (
              <a
                href="https://prominds.digital/"
                target="_blank"
                rel="noopener noreferrer"
                className="mb-2 hidden md:flex items-center justify-center text-sm text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer px-2"
              >
                Powered by{" "}
                <span className="font-semibold ml-1">Prominds Digital</span>
              </a>
            )}

            {/* Navigation */}
            <nav className="flex-1 flex flex-col items-start space-y-1 w-full overflow-y-auto px-1">
              {/* Dashboard */}
              {hasPermission("dashboard") && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      prefetch={false}
                      href="/dashboard"
                      onClick={() => setSidebarOpen(false)}
                      className="w-full"
                    >
                      <Button
                        variant={pathname === "/dashboard" ? "secondary" : "ghost"}
                        className={`w-full h-10 justify-start relative min-h-[40px] ${sidebarCollapsed ? "lg:justify-center lg:px-0" : ""}`}
                      >
                        <LayoutDashboard
                          className={`h-5 w-5 flex-shrink-0 ${sidebarCollapsed ? "lg:mr-0" : "mr-3"}`}
                          style={{ color: "#1976B8" }}
                        />
                        <span className={`text-sm font-medium ${sidebarCollapsed ? "lg:hidden" : ""}`}>Dashboard</span>
                        {pathname === "/dashboard" && (
                          <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full"
                            style={{ backgroundColor: "#1976B8" }}
                          />
                        )}
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>Dashboard</TooltipContent>
                </Tooltip>
              )}

              {/* Daily Walkins */}
              {(hasPermission("dailyWalkinsVisitors") ||
                hasPermission("dailyWalkinsSessions")) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      prefetch={false}
                      href="/dashboard/daily-walkins"
                      onClick={() => setSidebarOpen(false)}
                      className="w-full"
                    >
                      <Button
                        variant={
                          pathname === "/dashboard/daily-walkins" ||
                          pathname?.startsWith("/dashboard/daily-walkins/")
                            ? "secondary"
                            : "ghost"
                        }
                        className={`w-full h-10 justify-start relative min-h-[40px] ${sidebarCollapsed ? "lg:justify-center lg:px-0" : ""}`}
                      >
                        <DoorOpen
                          className={`h-5 w-5 flex-shrink-0 ${sidebarCollapsed ? "lg:mr-0" : "mr-3"}`}
                          style={{ color: "#1976B8" }}
                        />
                        <span className={`text-sm font-medium ${sidebarCollapsed ? "lg:hidden" : ""}`}>Daily Walkins</span>
                        {(pathname === "/dashboard/daily-walkins" ||
                          pathname?.startsWith("/dashboard/daily-walkins/")) && (
                          <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full"
                            style={{ backgroundColor: "#1976B8" }}
                          />
                        )}
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>Daily Walkins</TooltipContent>
                </Tooltip>
              )}

              {/* Digital Enquiry */}
              {hasPermission("digitalEnquiry") && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      prefetch={false}
                      href="/dashboard/digital-enquiry"
                      onClick={() => setSidebarOpen(false)}
                      className="w-full"
                    >
                      <Button
                        variant={
                          pathname === "/dashboard/digital-enquiry" ||
                          pathname?.startsWith("/dashboard/digital-enquiry/")
                            ? "secondary"
                            : "ghost"
                        }
                        className={`w-full h-10 justify-start relative min-h-[40px] ${sidebarCollapsed ? "lg:justify-center lg:px-0" : ""}`}
                      >
                        <MessageSquare
                          className={`h-5 w-5 flex-shrink-0 ${sidebarCollapsed ? "lg:mr-0" : "mr-3"}`}
                          style={{ color: "#1976B8" }}
                        />
                        <span className={`text-sm font-medium ${sidebarCollapsed ? "lg:hidden" : ""}`}>Digital Enquiry</span>
                        {(pathname === "/dashboard/digital-enquiry" ||
                          pathname?.startsWith("/dashboard/digital-enquiry/")) && (
                          <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full"
                            style={{ backgroundColor: "#1976B8" }}
                          />
                        )}
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>Digital Enquiry</TooltipContent>
                </Tooltip>
              )}

              {/* Field Inquiry */}
              {hasPermission("fieldInquiry") && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      prefetch={false}
                      href="/dashboard/field-inquiry"
                      onClick={() => setSidebarOpen(false)}
                      className="w-full"
                    >
                      <Button
                        variant={
                          pathname === "/dashboard/field-inquiry" ||
                          pathname?.startsWith("/dashboard/field-inquiry/")
                            ? "secondary"
                            : "ghost"
                        }
                        className={`w-full h-10 justify-start relative min-h-[40px] ${sidebarCollapsed ? "lg:justify-center lg:px-0" : ""}`}
                      >
                        <MapPin
                          className={`h-5 w-5 flex-shrink-0 ${sidebarCollapsed ? "lg:mr-0" : "mr-3"}`}
                          style={{ color: "#1976B8" }}
                        />
                        <span className={`text-sm font-medium ${sidebarCollapsed ? "lg:hidden" : ""}`}>Field Inquiry</span>
                        {(pathname === "/dashboard/field-inquiry" ||
                          pathname?.startsWith("/dashboard/field-inquiry/")) && (
                          <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full"
                            style={{ backgroundColor: "#1976B8" }}
                          />
                        )}
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>Field Inquiry</TooltipContent>
                </Tooltip>
              )}

              {/* Delivery Update */}
              {hasPermission("deliveryUpdate") && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      prefetch={false}
                      href="/dashboard/delivery-update"
                      onClick={() => setSidebarOpen(false)}
                      className="w-full"
                    >
                      <Button
                        variant={
                          pathname === "/dashboard/delivery-update" ||
                          pathname?.startsWith("/dashboard/delivery-update/")
                            ? "secondary"
                            : "ghost"
                        }
                        className={`w-full h-10 justify-start relative min-h-[40px] ${sidebarCollapsed ? "lg:justify-center lg:px-0" : ""}`}
                      >
                        <Package
                          className={`h-5 w-5 flex-shrink-0 ${sidebarCollapsed ? "lg:mr-0" : "mr-3"}`}
                          style={{ color: "#1976B8" }}
                        />
                        <span className={`text-sm font-medium ${sidebarCollapsed ? "lg:hidden" : ""}`}>Delivery Update</span>
                        {(pathname === "/dashboard/delivery-update" ||
                          pathname?.startsWith("/dashboard/delivery-update/")) && (
                          <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full"
                            style={{ backgroundColor: "#1976B8" }}
                          />
                        )}
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>Delivery Update</TooltipContent>
                </Tooltip>
              )}

              {/* CRM */}
              <div className="pt-1.5 border-t w-full">
                {!sidebarCollapsed && (
                  <p className="text-sm text-muted-foreground px-2 py-1.5 uppercase tracking-wider">
                    CRM
                  </p>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      prefetch={false}
                      href="/dashboard/crm/contacts"
                      onClick={() => setSidebarOpen(false)}
                      className="w-full"
                    >
                      <Button
                        variant={
                          pathname === "/dashboard/crm/contacts" ||
                          pathname?.startsWith("/dashboard/crm/contacts/")
                            ? "secondary"
                            : "ghost"
                        }
                        className={`w-full h-10 justify-start relative min-h-[40px] ${sidebarCollapsed ? "lg:justify-center lg:px-0" : ""}`}
                      >
                        <UserCircle
                          className={`h-5 w-5 flex-shrink-0 ${sidebarCollapsed ? "lg:mr-0" : "mr-3"}`}
                          style={{ color: "#1976B8" }}
                        />
                        <span className={`text-sm font-medium ${sidebarCollapsed ? "lg:hidden" : ""}`}>Contacts</span>
                        {(pathname === "/dashboard/crm/contacts" || pathname?.startsWith("/dashboard/crm/contacts/")) && (
                          <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full"
                            style={{ backgroundColor: "#1976B8" }}
                          />
                        )}
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>Contacts</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      prefetch={false}
                      href="/dashboard/crm/leads"
                      onClick={() => setSidebarOpen(false)}
                      className="w-full"
                    >
                      <Button
                        variant={
                          pathname === "/dashboard/crm/leads" || pathname?.startsWith("/dashboard/crm/leads/")
                            ? "secondary"
                            : "ghost"
                        }
                        className={`w-full h-10 justify-start relative min-h-[40px] ${sidebarCollapsed ? "lg:justify-center lg:px-0" : ""}`}
                      >
                        <Filter
                          className={`h-5 w-5 flex-shrink-0 ${sidebarCollapsed ? "lg:mr-0" : "mr-3"}`}
                          style={{ color: "#1976B8" }}
                        />
                        <span className={`text-sm font-medium ${sidebarCollapsed ? "lg:hidden" : ""}`}>Leads</span>
                        {(pathname === "/dashboard/crm/leads" || pathname?.startsWith("/dashboard/crm/leads/")) && (
                          <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full"
                            style={{ backgroundColor: "#1976B8" }}
                          />
                        )}
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>Leads</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      prefetch={false}
                      href="/dashboard/crm/deals"
                      onClick={() => setSidebarOpen(false)}
                      className="w-full"
                    >
                      <Button
                        variant={
                          pathname === "/dashboard/crm/deals" || pathname?.startsWith("/dashboard/crm/deals/")
                            ? "secondary"
                            : "ghost"
                        }
                        className={`w-full h-10 justify-start relative min-h-[40px] ${sidebarCollapsed ? "lg:justify-center lg:px-0" : ""}`}
                      >
                        <CircleDollarSign
                          className={`h-5 w-5 flex-shrink-0 ${sidebarCollapsed ? "lg:mr-0" : "mr-3"}`}
                          style={{ color: "#1976B8" }}
                        />
                        <span className={`text-sm font-medium ${sidebarCollapsed ? "lg:hidden" : ""}`}>Deals</span>
                        {(pathname === "/dashboard/crm/deals" || pathname?.startsWith("/dashboard/crm/deals/")) && (
                          <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full"
                            style={{ backgroundColor: "#1976B8" }}
                          />
                        )}
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>Deals</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      prefetch={false}
                      href="/dashboard/crm/tasks"
                      onClick={() => setSidebarOpen(false)}
                      className="w-full"
                    >
                      <Button
                        variant={
                          pathname === "/dashboard/crm/tasks" || pathname?.startsWith("/dashboard/crm/tasks/")
                            ? "secondary"
                            : "ghost"
                        }
                        className={`w-full h-10 justify-start relative min-h-[40px] ${sidebarCollapsed ? "lg:justify-center lg:px-0" : ""}`}
                      >
                        <CheckSquare
                          className={`h-5 w-5 flex-shrink-0 ${sidebarCollapsed ? "lg:mr-0" : "mr-3"}`}
                          style={{ color: "#1976B8" }}
                        />
                        <span className={`text-sm font-medium ${sidebarCollapsed ? "lg:hidden" : ""}`}>Tasks</span>
                        {(pathname === "/dashboard/crm/tasks" || pathname?.startsWith("/dashboard/crm/tasks/")) && (
                          <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full"
                            style={{ backgroundColor: "#1976B8" }}
                          />
                        )}
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>Tasks</TooltipContent>
                </Tooltip>
              </div>

              {/* Settings */}
              {(hasPermission("settingsProfile") ||
                hasPermission("settingsVehicleModels") ||
                hasPermission("settingsLeadSources") ||
                hasPermission("settingsWhatsApp")) && (
                <div className="pt-1.5 border-t w-full mt-auto">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        prefetch={false}
                        href="/dashboard/global-settings"
                        onClick={() => setSidebarOpen(false)}
                        className="w-full"
                      >
                        <Button
                          variant={
                            pathname === "/dashboard/global-settings"
                              ? "secondary"
                              : "ghost"
                          }
                          className={`w-full h-10 justify-start relative min-h-[40px] ${sidebarCollapsed ? "lg:justify-center lg:px-0" : ""}`}
                        >
                          <Globe
                            className={`h-5 w-5 flex-shrink-0 ${sidebarCollapsed ? "lg:mr-0" : "mr-3"}`}
                            style={{ color: "#1976B8" }}
                          />
                          <span className={`text-sm font-medium ${sidebarCollapsed ? "lg:hidden" : ""}`}>Settings</span>
                          {pathname === "/dashboard/global-settings" && (
                            <div
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full"
                              style={{ backgroundColor: "#1976B8" }}
                            />
                          )}
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>Settings</TooltipContent>
                  </Tooltip>
                </div>
              )}

              {/* Role Management - Admin only */}
              {isAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      prefetch={false}
                      href="/dashboard/role-management"
                      onClick={() => setSidebarOpen(false)}
                      className="w-full"
                    >
                      <Button
                        variant={
                          pathname === "/dashboard/role-management" ||
                          pathname?.startsWith("/dashboard/role-management/")
                            ? "secondary"
                            : "ghost"
                        }
                        className={`w-full h-10 justify-start relative min-h-[40px] ${sidebarCollapsed ? "lg:justify-center lg:px-0" : ""}`}
                      >
                        <Users
                          className={`h-5 w-5 flex-shrink-0 ${sidebarCollapsed ? "lg:mr-0" : "mr-3"}`}
                          style={{ color: "#1976B8" }}
                        />
                        <span className={`text-sm font-medium ${sidebarCollapsed ? "lg:hidden" : ""}`}>Role Management</span>
                        {(pathname === "/dashboard/role-management" ||
                          pathname?.startsWith("/dashboard/role-management/")) && (
                          <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full"
                            style={{ backgroundColor: "#1976B8" }}
                          />
                        )}
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>Role Management</TooltipContent>
                </Tooltip>
              )}

              {/* Organization Management - Super Admin only */}
              {isSuperAdmin && (
                <>
                  {!sidebarCollapsed && (
                    <div className="pt-1.5 border-t w-full lg:block">
                      <p className="text-sm text-muted-foreground px-2 py-1.5 uppercase tracking-wider">
                        Organization
                      </p>
                    </div>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        prefetch={false}
                        href="/dashboard/org-settings"
                        onClick={() => setSidebarOpen(false)}
                        className="w-full"
                      >
                        <Button
                          variant={
                            pathname === "/dashboard/org-settings"
                              ? "secondary"
                              : "ghost"
                          }
                          className={`w-full h-10 justify-start relative min-h-[40px] ${sidebarCollapsed ? "lg:justify-center lg:px-0" : ""}`}
                        >
                          <Building2
                            className={`h-5 w-5 flex-shrink-0 ${sidebarCollapsed ? "lg:mr-0" : "mr-3"}`}
                            style={{ color: "#1976B8" }}
                          />
                          <span className={`text-sm font-medium ${sidebarCollapsed ? "lg:hidden" : ""}`}>Org Settings</span>
                          {pathname === "/dashboard/org-settings" && (
                            <div
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full"
                              style={{ backgroundColor: "#1976B8" }}
                            />
                          )}
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>Org Settings</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        prefetch={false}
                        href="/dashboard/usage-stats"
                        onClick={() => setSidebarOpen(false)}
                        className="w-full"
                      >
                        <Button
                          variant={
                            pathname === "/dashboard/usage-stats"
                              ? "secondary"
                              : "ghost"
                          }
                          className={`w-full h-10 justify-start relative min-h-[40px] ${sidebarCollapsed ? "lg:justify-center lg:px-0" : ""}`}
                        >
                          <BarChart3
                            className={`h-5 w-5 flex-shrink-0 ${sidebarCollapsed ? "lg:mr-0" : "mr-3"}`}
                            style={{ color: "#1976B8" }}
                          />
                          <span className={`text-sm font-medium ${sidebarCollapsed ? "lg:hidden" : ""}`}>Usage Stats</span>
                          {pathname === "/dashboard/usage-stats" && (
                            <div
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full"
                              style={{ backgroundColor: "#1976B8" }}
                            />
                          )}
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>Usage Stats</TooltipContent>
                  </Tooltip>
                </>
              )}
            </nav>

            {/* User actions */}
            <div className="border-t w-full min-w-0 pt-2 space-y-1.5 flex flex-col items-stretch">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    type="button"
                    className={`w-full h-10 justify-start ${sidebarCollapsed ? "lg:justify-center lg:px-0" : ""}`}
                    onClick={handleLogout}
                  >
                    <LogOut
                      className={`h-5 w-5 flex-shrink-0 ${sidebarCollapsed ? "lg:mr-0" : "mr-3"}`}
                      style={{ color: "#1976B8" }}
                    />
                    <span className={`text-sm font-medium ${sidebarCollapsed ? "lg:hidden" : ""}`}>Logout</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>Logout</TooltipContent>
              </Tooltip>
              <div className={`w-full min-w-0 ${sidebarCollapsed ? "lg:flex lg:flex-col lg:items-stretch" : ""}`}>
                <ThemeSwitcherButtons compact={sidebarCollapsed} />
              </div>
            </div>
          </div>
          </TooltipProvider>
        </aside>

        {/* Main content */}
        <main className="flex-1 w-full bg-gradient-to-br from-background to-muted/30 mt-14 sm:mt-16 lg:mt-0 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-16 2xl:px-20 py-3 sm:py-4 md:py-6 lg:py-8 xl:py-10">
          {/* Responsive container: max-width + mx-auto centers content with space on sides */}
          <div className="max-w-[1600px] mx-auto w-full">
            {/* Breadcrumb & Profile Box */}
            <div className="mb-4 sm:mb-6 lg:mb-8 border bg-card rounded-lg px-4 sm:px-5 md:px-6 lg:px-8 py-5 sm:py-6 min-h-[56px] sm:min-h-[60px] flex flex-row items-center justify-between shadow-sm gap-3 sm:gap-4">
              <div className="flex-1 min-w-0 flex items-center gap-3 sm:gap-4">
                {/* Desktop: sidebar toggle in top bar */}
                <div className="hidden lg:flex shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSidebarCollapsed((c) => !c)}
                        className="shrink-0 h-11 w-11"
                        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                      >
                        {sidebarCollapsed ? (
                          <PanelLeft className="h-5 w-5" style={{ color: "#1976B8" }} />
                        ) : (
                          <PanelLeftClose className="h-5 w-5" style={{ color: "#1976B8" }} />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={6}>
                      {sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Breadcrumb />
              </div>
              {/* User Profile Picture */}
              <button
                onClick={() => router.push("/dashboard/global-settings")}
                className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity shrink-0 min-h-[44px]"
                title="Click to go to settings"
              >
                {user?.profilePicture ? (
                  <div
                    className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-md overflow-hidden border-2"
                    style={{ borderColor: "#1976B8" }}
                  >
                    <img
                      src={
                        user.profilePicture.startsWith("http")
                          ? user.profilePicture
                          : `/${user.profilePicture}`
                      }
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-md flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: "#1976B8" }}
                  >
                    Admin
                  </div>
                )}
                <div className="hidden sm:flex flex-col items-start leading-tight">
                  <span className="text-md md:text-base font-medium text-foreground">
                    {user?.email?.split("@")[0] || "User"}
                  </span>
                  {/* <span className="text-xs text-muted-foreground">
                    {user?.dealership?.name
                      ? `${user.dealership.name}${
                          user.dealership.location
                            ? " · " + user.dealership.location
                            : ""
                        }`
                      : "No dealership assigned"}
                  </span> */}
                </div>
              </button>
            </div>
            {/* Page content */}
            <div>{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PermissionsProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </PermissionsProvider>
  );
}
