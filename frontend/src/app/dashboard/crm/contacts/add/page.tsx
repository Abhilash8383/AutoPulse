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

export default function AddContactPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [title, setTitle] = useState("");
  const [departments, setDepartments] = useState("");
  const [email, setEmail] = useState("");
  const [productTags, setProductTags] = useState("");
  const [seniority, setSeniority] = useState("");
  const [country, setCountry] = useState("");
  const [phoneCode, setPhoneCode] = useState("+91");
  const [corporatePhone, setCorporatePhone] = useState("");
  const [linkedIn, setLinkedIn] = useState("");
  const [facebook, setFacebook] = useState("");
  const [twitter, setTwitter] = useState("");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Contact saved (frontend only — no backend).");
  };

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-fluid-2xl font-bold text-foreground sm:text-2xl lg:text-3xl xl:text-4xl">
          Add New Contact
        </h1>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="default" className="min-w-[80px]" asChild>
            <Link href="/dashboard/crm/contacts">Close</Link>
          </Button>
          <Button type="submit" form="add-contact-form" size="default" className="min-w-[80px]">
            Save
          </Button>
        </div>
      </div>

      <form id="add-contact-form" onSubmit={handleSave}>
        <Card className="shadow-sm">
          <CardContent className="px-6 sm:px-8 py-6 sm:py-8 space-y-8">
            {/* Contact Information */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-5">
                Contact Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              {/* Left column */}
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium">
                    First Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="eg: Timothy"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-10 text-sm sm:text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium">Title</Label>
                  <Input
                    id="title"
                    placeholder="eg: CTO"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-10 text-sm sm:text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="departments" className="text-sm font-medium">Departments</Label>
                  <Input
                    id="departments"
                    placeholder="eg: Engineering & Technical"
                    value={departments}
                    onChange={(e) => setDepartments(e.target.value)}
                    className="h-10 text-sm sm:text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="eg: timothy.collinson@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 text-sm sm:text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="productTags" className="text-sm font-medium">Product Tags</Label>
                  <Input
                    id="productTags"
                    placeholder="Select existing tag or type to create new..."
                    value={productTags}
                    onChange={(e) => setProductTags(e.target.value)}
                    className="h-10 text-sm sm:text-base"
                  />
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium">
                    Last Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="eg: Collinson"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-10 text-sm sm:text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seniority" className="text-sm font-medium">Seniority</Label>
                  <Input
                    id="seniority"
                    placeholder="eg: C suite"
                    value={seniority}
                    onChange={(e) => setSeniority(e.target.value)}
                    className="h-10 text-sm sm:text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-sm font-medium">
                    Country <span className="text-destructive">*</span>
                  </Label>
                  <Select value={country || undefined} onValueChange={setCountry}>
                    <SelectTrigger id="country" className="h-10 text-sm sm:text-base">
                      <SelectValue placeholder="Eg. India" />
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
                  <Label htmlFor="corporatePhone" className="text-sm font-medium">
                    Corporate Phone <span className="text-destructive">*</span>
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
                      id="corporatePhone"
                      type="tel"
                      placeholder="Phone Number"
                      className="flex-1 h-10 text-sm sm:text-base"
                      value={corporatePhone}
                      onChange={(e) => setCorporatePhone(e.target.value)}
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
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="linkedin" className="text-sm font-medium">LinkedIn</Label>
              <Input
                id="linkedin"
                type="url"
                placeholder="eg: http://www.linkedin.com/in/username"
                value={linkedIn}
                onChange={(e) => setLinkedIn(e.target.value)}
                className="h-10 text-sm sm:text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facebook" className="text-sm font-medium">Facebook</Label>
              <Input
                id="facebook"
                type="url"
                placeholder="eg: https://facebook.com/username"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                className="h-10 text-sm sm:text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twitter" className="text-sm font-medium">Twitter</Label>
              <Input
                id="twitter"
                type="url"
                placeholder="eg: https://twitter.com/username"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
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
