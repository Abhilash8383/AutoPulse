"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, CalendarIcon } from "lucide-react";

const PHONE_CODES = ["+91", "+1", "+44", "+61", "+81", "+86", "+33", "+49"];

const PIPELINE_OPTIONS = ["Sales", "Partner", "Enterprise"];
const DEAL_TYPE_OPTIONS = ["New Business", "Existing Business", "Renewal"];
const REFERRAL_SOURCE_OPTIONS = ["Website", "Referral", "Campaign", "Direct"];
const DEAL_STAGE_OPTIONS = ["Qualification", "Proposal", "Negotiation", "Closed Won", "Closed Lost"];
const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Urgent"];

export default function AddDealPage() {
  const [dealName, setDealName] = useState("");
  const [pipeline, setPipeline] = useState("");
  const [dealOwner, setDealOwner] = useState("");
  const [dealType, setDealType] = useState("");
  const [amount, setAmount] = useState("");
  const [closedDate, setClosedDate] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [dealStage, setDealStage] = useState("");
  const [priority, setPriority] = useState("");
  const [productTags, setProductTags] = useState("");
  const [phoneCode, setPhoneCode] = useState("+81");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Deal saved (frontend only — no backend).");
  };

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto">
      {/* Back button */}
      <div>
        <Button variant="ghost" size="sm" className="gap-2 -ml-2" asChild>
          <Link href="/dashboard/crm/deals">
            <ArrowLeft className="h-4 w-4" />
            Back to Deals
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-fluid-2xl font-bold text-foreground sm:text-2xl lg:text-3xl xl:text-4xl">
          Create New Deal
        </h1>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="default" className="min-w-[80px]" asChild>
            <Link href="/dashboard/crm/deals">Close</Link>
          </Button>
          <Button type="submit" form="add-deal-form" size="default" className="min-w-[80px]">
            Save
          </Button>
        </div>
      </div>

      <form id="add-deal-form" onSubmit={handleSave}>
        <Card className="shadow-sm">
          <CardContent className="px-6 sm:px-8 py-6 sm:py-8 space-y-8">
            {/* Basic Information */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-5">
                Basic Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                <div className="space-y-2">
                  <Label htmlFor="dealName" className="text-sm font-medium">
                    Deal Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="dealName"
                    placeholder="eg: Lifetime opportunity deal"
                    value={dealName}
                    onChange={(e) => setDealName(e.target.value)}
                    className="h-10 text-sm sm:text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pipeline" className="text-sm font-medium">
                    select Pipeline <span className="text-destructive">*</span>
                  </Label>
                  <Select value={pipeline || undefined} onValueChange={setPipeline}>
                    <SelectTrigger id="pipeline" className="h-10 text-sm sm:text-base">
                      <SelectValue placeholder="Select Pipeline" />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_OPTIONS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* Dependent Properties */}
            <section className="pt-4 border-t border-border">
              <h2 className="text-lg font-semibold text-foreground mb-5">
                Dependent Properties
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="dealOwner" className="text-sm font-medium">
                      Deal Owner <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="dealOwner"
                      placeholder="Search for partners"
                      value={dealOwner}
                      onChange={(e) => setDealOwner(e.target.value)}
                      className="h-10 text-sm sm:text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-sm font-medium">
                      Amount
                    </Label>
                    <Input
                      id="amount"
                      placeholder="eg: 2000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="h-10 text-sm sm:text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="referralSource" className="text-sm font-medium">
                      Referral Source <span className="text-destructive">*</span>
                    </Label>
                    <Select value={referralSource || undefined} onValueChange={setReferralSource}>
                      <SelectTrigger id="referralSource" className="h-10 text-sm sm:text-base">
                        <SelectValue placeholder="Select Referral Source" />
                      </SelectTrigger>
                      <SelectContent>
                        {REFERRAL_SOURCE_OPTIONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="dealType" className="text-sm font-medium">
                      Deal Type <span className="text-destructive">*</span>
                    </Label>
                    <Select value={dealType || undefined} onValueChange={setDealType}>
                      <SelectTrigger id="dealType" className="h-10 text-sm sm:text-base">
                        <SelectValue placeholder="Select Deal Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEAL_TYPE_OPTIONS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="closedDate" className="text-sm font-medium">
                      Closed Date <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="closedDate"
                        type="date"
                        placeholder="Select Closed Date"
                        value={closedDate}
                        onChange={(e) => setClosedDate(e.target.value)}
                        className="h-10 text-sm sm:text-base pr-9"
                      />
                      <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dealStage" className="text-sm font-medium">
                      Deal Stage <span className="text-destructive">*</span>
                    </Label>
                    <Select value={dealStage || undefined} onValueChange={setDealStage}>
                      <SelectTrigger id="dealStage" className="h-10 text-sm sm:text-base">
                        <SelectValue placeholder="Select Deal Stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEAL_STAGE_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="mt-6 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="priority" className="text-sm font-medium">
                    Priority <span className="text-destructive">*</span>
                  </Label>
                  <Select value={priority || undefined} onValueChange={setPriority}>
                    <SelectTrigger id="priority" className="h-10 text-sm sm:text-base">
                      <SelectValue placeholder="Select Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="productTags" className="text-sm font-medium">
                    Product Tags
                  </Label>
                  <Input
                    id="productTags"
                    placeholder="Select or type to create tags..."
                    value={productTags}
                    onChange={(e) => setProductTags(e.target.value)}
                    className="h-10 text-sm sm:text-base"
                  />
                </div>
              </div>
            </section>

            {/* Phone */}
            <section className="pt-4 border-t border-border">
              <h2 className="text-lg font-semibold text-foreground mb-5">
                Phone
              </h2>
              <div className="flex gap-2 max-w-md">
                <Select value={phoneCode} onValueChange={setPhoneCode}>
                  <SelectTrigger className="w-24 shrink-0 h-10 text-sm sm:text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PHONE_CODES.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Phone Number"
                  className="flex-1 h-10 text-sm sm:text-base"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            </section>

            {/* Associate deal with */}
            <section className="pt-4 border-t border-border">
              <h2 className="text-lg font-semibold text-foreground mb-5">
                Associate deal with
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                <div className="space-y-2">
                  <Label htmlFor="company" className="text-sm font-medium">
                    Company
                  </Label>
                  <Input
                    id="company"
                    placeholder="Type to search for companies"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="h-10 text-sm sm:text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact" className="text-sm font-medium">
                    Contact
                  </Label>
                  <Input
                    id="contact"
                    placeholder="Search and select contact"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="h-10 text-sm sm:text-base"
                  />
                </div>
              </div>
            </section>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
