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
import { ArrowLeft } from "lucide-react";

const COUNTRY_OPTIONS = [
  "India",
  "United States",
  "United Kingdom",
  "Australia",
  "Canada",
  "Germany",
  "Singapore",
];

const PHONE_CODES = ["+91", "+1", "+44", "+61", "+81", "+86", "+33", "+49"];

export default function AddLeadPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCode, setPhoneCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [productTags, setProductTags] = useState("");
  const [linkedIn, setLinkedIn] = useState("");
  const [facebook, setFacebook] = useState("");
  const [twitter, setTwitter] = useState("");
  const [website, setWebsite] = useState("");
  const [associateCompany, setAssociateCompany] = useState("");
  const [associateContact, setAssociateContact] = useState("");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Lead saved (frontend only — no backend).");
  };

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto">
      {/* Back button */}
      <div>
        <Button variant="ghost" size="sm" className="gap-2 -ml-2" asChild>
          <Link href="/dashboard/crm/leads">
            <ArrowLeft className="h-4 w-4" />
            Back to Leads
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-fluid-2xl font-bold text-foreground sm:text-2xl lg:text-3xl xl:text-4xl">
          Create New Lead
        </h1>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="default" className="min-w-[80px]" asChild>
            <Link href="/dashboard/crm/leads">Close</Link>
          </Button>
          <Button type="submit" form="add-lead-form" size="default" className="min-w-[80px]">
            Save
          </Button>
        </div>
      </div>

      <form id="add-lead-form" onSubmit={handleSave}>
        <Card className="shadow-sm">
          <CardContent className="px-6 sm:px-8 py-6 sm:py-8 space-y-8">
            {/* Basic Information */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-5">
                Basic Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium">
                      First Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      placeholder="eg: John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="h-10 text-sm sm:text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle" className="text-sm font-medium">
                      Job Title
                    </Label>
                    <Input
                      id="jobTitle"
                      placeholder="eg: Product Manager"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      className="h-10 text-sm sm:text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country" className="text-sm font-medium">
                      Country
                    </Label>
                    <Select value={country || undefined} onValueChange={setCountry}>
                      <SelectTrigger id="country" className="h-10 text-sm sm:text-base">
                        <SelectValue placeholder="eg: India" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRY_OPTIONS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="eg: example@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-10 text-sm sm:text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="productTags" className="text-sm font-medium">
                      Product Tags
                    </Label>
                    <Input
                      id="productTags"
                      placeholder="Select existing tag or type to create new..."
                      value={productTags}
                      onChange={(e) => setProductTags(e.target.value)}
                      className="h-10 text-sm sm:text-base"
                    />
                  </div>
                </div>
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium">
                      Last Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="lastName"
                      placeholder="eg: Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-10 text-sm sm:text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyName" className="text-sm font-medium">
                      Company Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="companyName"
                      placeholder="eg: Google"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="h-10 text-sm sm:text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">
                      Phone
                    </Label>
                    <div className="flex gap-2">
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
                  </div>
                </div>
              </div>
            </section>

            {/* Social Media */}
            <section className="pt-4 border-t border-border">
              <h2 className="text-lg font-semibold text-foreground mb-5">
                Social Media
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="linkedin" className="text-sm font-medium">
                      LinkedIn
                    </Label>
                    <Input
                      id="linkedin"
                      type="url"
                      placeholder="eg: http://linkedin.com/34923042"
                      value={linkedIn}
                      onChange={(e) => setLinkedIn(e.target.value)}
                      className="h-10 text-sm sm:text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="twitter" className="text-sm font-medium">
                      X (Twitter)
                    </Label>
                    <Input
                      id="twitter"
                      type="url"
                      placeholder="eg: http://x.com/34923042"
                      value={twitter}
                      onChange={(e) => setTwitter(e.target.value)}
                      className="h-10 text-sm sm:text-base"
                    />
                  </div>
                </div>
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="facebook" className="text-sm font-medium">
                      Facebook
                    </Label>
                    <Input
                      id="facebook"
                      type="url"
                      placeholder="eg: http://facebook.com/34923042"
                      value={facebook}
                      onChange={(e) => setFacebook(e.target.value)}
                      className="h-10 text-sm sm:text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website" className="text-sm font-medium">
                      Website
                    </Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder="eg: https://example.com"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="h-10 text-sm sm:text-base"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Associate Lead With */}
            <section className="pt-4 border-t border-border">
              <h2 className="text-lg font-semibold text-foreground mb-5">
                Associate Lead With
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                <div className="space-y-2">
                  <Label htmlFor="associateCompany" className="text-sm font-medium">
                    Company
                  </Label>
                  <Input
                    id="associateCompany"
                    placeholder="eg: Google"
                    value={associateCompany}
                    onChange={(e) => setAssociateCompany(e.target.value)}
                    className="h-10 text-sm sm:text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="associateContact" className="text-sm font-medium">
                    Contact
                  </Label>
                  <Input
                    id="associateContact"
                    placeholder="eg: John Doe"
                    value={associateContact}
                    onChange={(e) => setAssociateContact(e.target.value)}
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
