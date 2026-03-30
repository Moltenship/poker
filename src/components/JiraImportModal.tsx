import { useState } from "react"
import { useAction, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
import type { JiraIssue } from "../../convex/jira"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react"

interface JiraImportModalProps {
  roomId: Id<"rooms">
  isOpen: boolean
  onClose: () => void
  defaultProjectKey?: string
}

type Step = "form" | "fetching" | "select" | "saving" | "success" | "error"

export function JiraImportModal({
  roomId,
  isOpen,
  onClose,
  defaultProjectKey,
}: JiraImportModalProps) {
  const [step, setStep] = useState<Step>("form")
  const [projectKey, setProjectKey] = useState(defaultProjectKey ?? "")
  const [jql, setJql] = useState("")
  const [issues, setIssues] = useState<JiraIssue[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState("")

  const fetchBacklog = useAction(api.jira.fetchJiraBacklog)
  const importTasks = useMutation(api.jira.importSelectedTasks)

  const handleClose = () => {
    onClose()
    // reset after animation
    setTimeout(() => {
      setStep("form")
      setProjectKey(defaultProjectKey ?? "")
      setJql("")
      setIssues([])
      setSelected(new Set())
      setError("")
    }, 200)
  }

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectKey.trim() && !jql.trim()) return
    setStep("fetching")
    try {
      const result = await fetchBacklog({
        jiraProjectKey: projectKey.trim(),
        jql: jql.trim() || undefined,
      })
      setIssues(result)
      setSelected(new Set(result.map((i) => i.key)))
      setStep("select")
    } catch (err: any) {
      setError(err.message ?? "Failed to fetch backlog")
      setStep("error")
    }
  }

  const handleImport = async () => {
    setStep("saving")
    try {
      const toImport = issues
        .filter((i) => selected.has(i.key))
        .map((i) => ({
          key: i.key,
          title: i.title,
          description: i.description || undefined,
          url: i.url,
        }))
      await importTasks({ roomId, tasks: toImport })
      setStep("success")
    } catch (err: any) {
      setError(err.message ?? "Failed to import tasks")
      setStep("error")
    }
  }

  const toggleAll = () => {
    if (selected.size === issues.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(issues.map((i) => i.key)))
    }
  }

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import from Jira</DialogTitle>
        </DialogHeader>

        {/* Step: form */}
        {step === "form" && (
          <form onSubmit={handleFetch} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="projectKey" className="text-sm font-medium">
                Project Key
              </label>
              <Input
                id="projectKey"
                placeholder="BRV"
                value={projectKey}
                onChange={(e) => setProjectKey(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="jql" className="text-sm font-medium">
                JQL Filter <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                id="jql"
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder={`project = "${projectKey || "BRV"}" AND sprint is EMPTY AND statusCategory != Done`}
                value={jql}
                onChange={(e) => setJql(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to fetch all backlog items for the project.
              </p>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={!projectKey.trim() && !jql.trim()}>
                Fetch Backlog
              </Button>
            </div>
          </form>
        )}

        {/* Step: fetching */}
        {step === "fetching" && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 className="size-7 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Fetching backlog from Jira…</p>
          </div>
        )}

        {/* Step: select */}
        {step === "select" && (
          <div className="space-y-3">
            {issues.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No backlog items found.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Checkbox
                      checked={selected.size === issues.length}
                      onCheckedChange={toggleAll}
                    />
                    {selected.size === issues.length ? "Deselect all" : "Select all"}
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {selected.size} / {issues.length} selected
                  </span>
                </div>
                <Separator />
                <ScrollArea className="h-72">
                  <div className="space-y-px pr-3">
                    {issues.map((issue) => (
                      <div
                        key={issue.key}
                        onClick={() => toggle(issue.key)}
                        className="flex items-start gap-3 rounded-md px-2 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          checked={selected.has(issue.key)}
                          onCheckedChange={() => toggle(issue.key)}
                          className="mt-0.5 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <a
                              href={issue.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs font-mono text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                            >
                              {issue.key}
                              <ExternalLink className="size-2.5" />
                            </a>
                            <Badge variant="secondary" className="text-[10px] h-4 px-1">
                              {issue.status}
                            </Badge>
                          </div>
                          <p className="text-sm truncate mt-0.5">{issue.title}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep("form")}>
                Back
              </Button>
              <Button
                size="sm"
                disabled={selected.size === 0}
                onClick={handleImport}
              >
                Add {selected.size > 0 ? `${selected.size} ` : ""}task{selected.size !== 1 ? "s" : ""} to room
              </Button>
            </div>
          </div>
        )}

        {/* Step: saving */}
        {step === "saving" && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 className="size-7 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Adding tasks to room…</p>
          </div>
        )}

        {/* Step: success */}
        {step === "success" && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <CheckCircle2 className="size-12 text-green-500" />
            <div className="space-y-1">
              <p className="font-semibold">{selected.size} task{selected.size !== 1 ? "s" : ""} added</p>
              <p className="text-sm text-muted-foreground">Ready to estimate.</p>
            </div>
            <Button className="w-full" onClick={handleClose}>Close</Button>
          </div>
        )}

        {/* Step: error */}
        {step === "error" && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <AlertTriangle className="size-12 text-destructive" />
            <div className="space-y-1">
              <p className="font-semibold text-destructive">Something went wrong</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setStep("form")}>
              Try Again
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
