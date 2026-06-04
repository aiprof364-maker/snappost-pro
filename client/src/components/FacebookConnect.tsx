import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Facebook, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function FacebookConnect() {
  const utils = trpc.useUtils();
  const statusQuery = trpc.facebook.status.useQuery();
  const pagesQuery = trpc.facebook.listPages.useQuery(undefined, {
    enabled: Boolean(statusQuery.data?.connection),
  });

  const getAuthUrl = trpc.facebook.getAuthUrl.useMutation({
    onSuccess: data => {
      if (data.url) window.location.href = data.url;
    },
    onError: e => toast.error(e.message),
  });

  const selectPage = trpc.facebook.selectPage.useMutation({
    onSuccess: () => {
      toast.success("Facebook page connected.");
      utils.facebook.status.invalidate();
      utils.account.overview.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const disconnect = trpc.facebook.disconnect.useMutation({
    onSuccess: () => {
      toast.success("Disconnected.");
      utils.facebook.status.invalidate();
      utils.account.overview.invalidate();
    },
  });

  const data = statusQuery.data;
  const connection = data?.connection;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1877F2]/10 text-[#1877F2]">
          <Facebook className="h-5 w-5" />
        </span>
        <h3 className="font-display text-lg font-bold">Facebook</h3>
      </div>

      {statusQuery.isLoading ? (
        <Loader2 className="mt-4 h-5 w-5 animate-spin text-muted-foreground" />
      ) : !data?.configured ? (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-muted-foreground">
            Facebook posting is wired and ready. It activates once your Meta app
            credentials are added and the app is approved by Meta.
          </p>
        </div>
      ) : connection?.status === "connected" && connection.pageName ? (
        <div className="mt-4">
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>
              Connected to <strong>{connection.pageName}</strong>
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => disconnect.mutate()}
            disabled={disconnect.isPending}
          >
            Disconnect
          </Button>
        </div>
      ) : connection ? (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">
            Select the page you want to post to:
          </p>
          <div className="mt-3 flex gap-2">
            <Select
              onValueChange={pageId => selectPage.mutate({ pageId })}
              disabled={pagesQuery.isLoading || selectPage.isPending}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a page" />
              </SelectTrigger>
              <SelectContent>
                {(pagesQuery.data ?? []).map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {pagesQuery.data?.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              No pages found on this account yet.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">
            Connect your Facebook page to publish branded posts in one click.
          </p>
          <Button
            className="mt-3 gap-2 bg-[#1877F2] hover:bg-[#1877F2]/90"
            onClick={() =>
              getAuthUrl.mutate({ origin: window.location.origin })
            }
            disabled={getAuthUrl.isPending}
          >
            {getAuthUrl.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Facebook className="h-4 w-4" /> Connect Facebook
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
