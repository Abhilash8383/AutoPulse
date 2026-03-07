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
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, Clock, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = ["To Do", "In Progress", "Completed"];
const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Urgent"];
const ASSOCIATED_TYPE_OPTIONS = ["Contacts", "Leads", "Deals", "Teams", "Partners"];
const TASK_TYPE_OPTIONS = ["To-Do", "Call", "Meeting", "Follow-up"];
const TIMEZONE_OPTIONS = [
  "(GMT+5:30) Chennai, Kolkata, Mumbai, New Delhi",
  "(GMT+0:00) London",
  "(GMT-5:00) New York",
  "(GMT+1:00) Paris, Berlin",
];

export default function AddTaskPage() {
  const [taskName, setTaskName] = useState("");
  const [status, setStatus] = useState("To Do");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [associatedType, setAssociatedType] = useState("Contacts");
  const [associatedSearch, setAssociatedSearch] = useState("");
  const [timeZone, setTimeZone] = useState(TIMEZONE_OPTIONS[0]);
  const [notes, setNotes] = useState("");
  const [assignee, setAssignee] = useState("");
  const [reminder, setReminder] = useState("30 Minutes Before");
  const [setToRepeat, setSetToRepeat] = useState(false);
  const [taskType, setTaskType] = useState("To-Do");
  const [tags, setTags] = useState("");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Task saved (frontend only — no backend).");
  };

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto">
      <form id="add-task-form" onSubmit={handleSave}>
        {/* Header: Task name (prominent) + Close & Save */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <Input
              id="taskName"
              placeholder="Task name"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className="h-12 text-base font-medium placeholder:font-normal"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="default" className="min-w-[80px]" asChild>
              <Link href="/dashboard/crm/tasks">Close</Link>
            </Button>
            <Button type="submit" size="default" className="min-w-[80px]" style={{ backgroundColor: "#1976B8" }}>
              Save
            </Button>
          </div>
        </div>

        <Card className="shadow-sm mt-6">
          <CardContent className="px-6 sm:px-8 py-6 sm:py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left column */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Status
                  </Label>
                  <div className="flex flex-wrap gap-1 p-1 rounded-lg border bg-muted/30">
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatus(s)}
                        className={cn(
                          "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                          status === s
                            ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Due Date
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="h-10 text-sm sm:text-base pl-3 pr-9"
                      />
                      <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                    <div className="relative w-[120px] sm:w-[140px]">
                      <Input
                        type="time"
                        value={dueTime}
                        onChange={(e) => setDueTime(e.target.value)}
                        className="h-10 text-sm sm:text-base pl-3 pr-9"
                      />
                      <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5" />
                    Associated With
                  </Label>
                  <div className="flex gap-2">
                    <Select value={associatedType} onValueChange={setAssociatedType}>
                      <SelectTrigger className="w-[130px] shrink-0 h-10 text-sm sm:text-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSOCIATED_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Type to search..."
                      value={associatedSearch}
                      onChange={(e) => setAssociatedSearch(e.target.value)}
                      className="flex-1 h-10 text-sm sm:text-base"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Time Zone
                  </Label>
                  <Select value={timeZone} onValueChange={setTimeZone}>
                    <SelectTrigger className="h-10 text-sm sm:text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Notes
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Add notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[120px] text-sm sm:text-base resize-y"
                  />
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Priority
                  </Label>
                  <div className="flex flex-wrap gap-1 p-1 rounded-lg border bg-muted/30">
                    {PRIORITY_OPTIONS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={cn(
                          "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                          priority === p
                            ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Assignee
                  </Label>
                  <Input
                    placeholder="Search for user..."
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    className="h-10 text-sm sm:text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Reminder
                  </Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      value={reminder}
                      onChange={(e) => setReminder(e.target.value)}
                      className="h-10 text-sm sm:text-base flex-1"
                    />
                    <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={setToRepeat}
                        onChange={(e) => setSetToRepeat(e.target.checked)}
                        className="rounded border-input"
                      />
                      <span className="text-sm text-muted-foreground">Set to repeat</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Task Type
                  </Label>
                  <Select value={taskType} onValueChange={setTaskType}>
                    <SelectTrigger className="h-10 text-sm sm:text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_TYPE_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Tags
                  </Label>
                  <Input
                    placeholder="Select or type to create..."
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="h-10 text-sm sm:text-base"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
