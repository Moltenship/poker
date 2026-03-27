import { useState, useEffect } from "react"
import { useQuery } from "convex/react"
import { useSessionMutation } from "@/hooks/useSession"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react"

interface JiraImportModalProps {
  roomId: Id<"rooms">
  isOpen: boolean
  onClose: () => void
  hasExistingTasks: boolean
}

export function JiraImportModal({
  roomId,
  isOpen,
  onClose,
  hasExistingTasks,
}: JiraImportModalProps) {
  const [projectKey, setProjectKey] = useState("")
  const [jqlFilter, setJqlFilter] = useState("")
  const [localStatus, setLocalStatus] = useState<"idle" | "importing" | "error" | "success">("idle")

  // @ts-expect-error Backend not updated yet
  const triggerImport = useSessionMutation(api.jira.triggerJiraImport)
  // @ts-expect-error Backend not updated yet
  const importStatusQuery = useQuery(api.jira.getImportStatus, { roomId }) as { status: "idle" | "importing" | "error" | "success", error?: string, taskCount?: number } | undefined

  useEffect(() => {
    if (importStatusQuery && importStatusQuery.status !== "idle") {
      setLocalStatus(importStatusQuery.status as "idle" | "importing" | "error" | "success")
    }
  }, [importStatusQuery?.status])

  useEffect(() => {
    if (!isOpen) {
      setProjectKey("")
      setJqlFilter("")
      setLocalStatus("idle")
    }
  }, [isOpen])

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalStatus("importing")
    try {
      await triggerImport({
        roomId,
        projectKey,
        jqlFilter: jqlFilter.trim() || undefined,
      })
    } catch (err: any) {
      setLocalStatus("error")
    }
  }

  const handleTryAgain = () => {
    setLocalStatus("idle")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import from Jira</DialogTitle>
        </DialogHeader>

        {localStatus === "idle" && (
          <form onSubmit={handleImport} className="grid gap-4 py-4">
            {hasExistingTasks && (
              <div className="flex items-start gap-2 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p>Re-import will update existing tasks. New tasks will be added.</p>
              </div>
            )}
            
            <div className="grid gap-2">
              <label htmlFor="projectKey" className="text-sm font-medium">
                Project Key
              </label>
              <Input
                id="projectKey"
                placeholder="e.g. PROJ"
                required
                value={projectKey}
                onChange={(e) => setProjectKey(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="jqlFilter" className="text-sm font-medium">
                JQL Filter (optional)
              </label>
              <textarea
                id="jqlFilter"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="sprint is EMPTY AND statusCategory != Done"
                value={jqlFilter}
                onChange={(e) => setJqlFilter(e.target.value)}
              />
            </div>
            <div className="mt-4 flex justify-end">
              <Button type="submit">Import</Button>
            </div>
          </form>
        )}

        {localStatus === "importing" && (
          <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <Loader2 data-testid="loading-spinner" className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Importing tasks from Jira...</p>
          </div>
        )}

        {localStatus === "success" && (
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">Import complete!</h3>
              <p className="text-sm text-muted-foreground">
                Imported successfully. {importStatusQuery?.taskCount || 0} tasks added.
              </p>
            </div>
            <Button onClick={onClose} className="mt-4 w-full">Close</Button>
          </div>
        )}

        {localStatus === "error" && (
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <div className="space-y-1">
              <h3 className="font-semibold text-lg text-destructive">Import Failed</h3>
              <p className="text-sm text-muted-foreground">
                {importStatusQuery?.error || "An unknown error occurred"}
              </p>
            </div>
            <Button onClick={handleTryAgain} variant="outline" className="mt-4 w-full">
              Try Again
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
