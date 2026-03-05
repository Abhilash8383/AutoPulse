import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare } from "lucide-react";

export default function TasksPage() {
  return (
    <div className="space-y-4 sm:space-y-5 xl:space-y-6">
      <div className="pb-3 border-b">
        <h1 className="text-fluid-2xl font-bold text-foreground">Tasks</h1>
        <p className="text-fluid-xs text-muted-foreground mt-1">Manage your tasks</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" style={{ color: "#1976B8" }} />
            Coming soon
          </CardTitle>
          <CardDescription>This section is under development.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Tasks will be available here soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
