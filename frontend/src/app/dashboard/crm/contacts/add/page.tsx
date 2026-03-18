"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
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
import { createContact } from "@/services/api/contact.service";

const PHONE_CODES = ["+91", "+1", "+44", "+61", "+81", "+86", "+33", "+49"] as const;

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export default function AddContactPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneCode, setPhoneCode] = useState<(typeof PHONE_CODES)[number]>("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  const whatsappNumber = useMemo(() => {
    const digits = digitsOnly(phoneNumber);
    return `${phoneCode}${digits}`;
  }, [phoneCode, phoneNumber]);

  const validate = () => {
    const fn = firstName.trim();
    const ln = lastName.trim();
    const digits = digitsOnly(phoneNumber);
    if (!fn) return "First name is required";
    if (!ln) return "Last name is required";
    if (!digits) return "WhatsApp number is required";
    if (digits.length < 8) return "Phone number looks too short";
    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setSaving(true);
    try {
      const res = await createContact({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        whatsappNumber,
        email: email.trim() ? email.trim() : undefined,
        address: address.trim() ? address.trim() : undefined,
      });
      toast.success("Contact created");
      router.push(`/dashboard/crm/leads/${res.lead.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to create contact");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto">
      {/* Back button */}
      <div>
        <Button variant="ghost" size="sm" className="gap-2 -ml-2" asChild>
          <Link href="/dashboard/crm/contacts">
            <ArrowLeft className="h-4 w-4" />
            Back to Contacts
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-fluid-2xl font-bold text-foreground sm:text-2xl lg:text-3xl xl:text-4xl">
          Add New Contact
        </h1>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="default" className="min-w-[80px]" asChild>
            <Link href="/dashboard/crm/contacts">Close</Link>
          </Button>
          <Button
            type="submit"
            form="add-contact-form"
            size="default"
            className="min-w-[110px]"
            disabled={saving}
          >
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </span>
            ) : (
              "Save"
            )}
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
                    placeholder="eg: Rahul"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-10 text-sm sm:text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="eg: rahul@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 text-sm sm:text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium">
                    Address
                  </Label>
                  <Input
                    id="address"
                    placeholder="eg: Bhubaneswar"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
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
                    placeholder="eg: Kumar"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-10 text-sm sm:text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsappNumber" className="text-sm font-medium">
                    WhatsApp Number <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Select
                      value={phoneCode}
                      onValueChange={(v) =>
                        setPhoneCode(v as (typeof PHONE_CODES)[number])
                      }
                    >
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
                      id="whatsappNumber"
                      type="tel"
                      placeholder="eg: 9876543210"
                      className="flex-1 h-10 text-sm sm:text-base"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Will be saved as <span className="font-medium text-foreground">{whatsappNumber}</span>
                  </div>
                </div>
              </div>
            </div>
            </section>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
