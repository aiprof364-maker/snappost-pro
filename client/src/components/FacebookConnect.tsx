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
import { useState } from "react";
import { toast } from "sonner";

type FacebookConnectProps = {
  compact?: boolean;
  postReady?: boolean;
  pendingPostId?: number;
  onPageConnected?: () => void;
};

function PageCreationHelp() {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
      <p className="font-semibold text-foreground">No Facebook Page yet?</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5">
        <li>Open Facebook while signed in to your personal profile.</li>
        <li>Create a Page for your business and add its name and category.</li>
        <li>Return here, connect Facebook, then choose that Page.</li>
      </ol>
      <a
        href="https://www.facebook.com/pages/create/"
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex font-semibold text-primary underline underline-offset-4 hover:text-primary/80"
      >
        Create a Facebook Page →
      </a>
    </div>
  );
}

export default function FacebookConnect({
  compact = false,
  postReady = false,
  pendingPostId,
  onPageConnected,
}: FacebookConnectProps) {
  const utils = trpc.useUtils();
  const statusQuery = trpc.facebook.status.useQuery();
  const [selectedBusiness, setSelectedBusiness] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const businessesQuery = trpc.facebook.listBusinesses.useQuery(undefined, {
    enabled: Boolean(
      statusQuery.data?.connection && !statusQuery.data.connection.pageId
    ),
  });
  const pagesQuery = trpc.facebook.listPages.useQuery(
    { businessId: selectedBusiness?.id ?? "" },
    {
      enabled: Boolean(selectedBusiness?.id),
    }
  );

  const getAuthUrl = trpc.facebook.getAuthUrl.useMutation({
    onSuccess: data => {
      if (data.url) window.location.href = data.url;
    },
    onError: e => toast.error(e.message),
  });

  const selectPage = trpc.facebook.selectPage.useMutation({
    onSuccess: () => {
      toast.success("Business portfolio and Facebook Page connected.");
      utils.facebook.status.invalidate();
      utils.account.overview.invalidate();
      onPageConnected?.();
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
  const startFacebookConnection = () => {
    if (pendingPostId) {
      window.sessionStorage.setItem(
        "snappost-pending-facebook-post",
        String(pendingPostId)
      );
    }
    getAuthUrl.mutate({ origin: window.location.origin });
  };

  return (
    <div
      className={compact ? "" : "rounded-xl border border-border bg-card p-6"}
    >
      {!compact && (
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1877F2]/10 text-[#1877F2]">
            <Facebook className="h-5 w-5" />
          </span>
          <h3 className="font-display text-lg font-bold">Facebook Page</h3>
        </div>
      )}

      {statusQuery.isLoading ? (
        <Loader2 className="mt-4 h-5 w-5 animate-spin text-muted-foreground" />
      ) : !data?.configured ? (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-muted-foreground">
            Facebook Page connection is unavailable right now. Your saved draft
            will remain here until it can be connected and published.
          </p>
        </div>
      ) : connection?.connected && connection.pageName ? (
        <div className="mt-4">
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>
              Ready to publish to <strong>{connection.pageName}</strong>.
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
            Choose your business portfolio, then the Page where this saved draft
            will publish:
          </p>
          <div className="mt-3 space-y-3">
            <Select
              onValueChange={businessId => {
                const business = (businessesQuery.data ?? []).find(
                  item => item.id === businessId
                );
                setSelectedBusiness(
                  business ? { id: business.id, name: business.name } : null
                );
              }}
              disabled={businessesQuery.isLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a business portfolio" />
              </SelectTrigger>
              <SelectContent>
                {(businessesQuery.data ?? []).map(business => (
                  <SelectItem key={business.id} value={business.id}>
                    {business.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBusiness && (
              <Select
                onValueChange={pageId =>
                  selectPage.mutate({
                    businessId: selectedBusiness.id,
                    businessName: selectedBusiness.name,
                    pageId,
                  })
                }
                disabled={pagesQuery.isLoading || selectPage.isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a Page" />
                </SelectTrigger>
                <SelectContent>
                  {(pagesQuery.data ?? []).map(page => (
                    <SelectItem key={page.id} value={page.id}>
                      {page.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {(businessesQuery.isError || pagesQuery.isError) && (
            <div className="mt-3 rounded-lg bg-amber-500/10 p-3 text-xs text-muted-foreground">
              <p>
                Facebook could not read your business portfolio or its Pages.
                Reconnect and accept the requested business and Page access.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={startFacebookConnection}
                disabled={getAuthUrl.isPending}
              >
                {getAuthUrl.isPending
                  ? "Opening Facebook..."
                  : "Reconnect Facebook"}
              </Button>
            </div>
          )}
          {businessesQuery.data?.length === 0 && (
            <>
              <div className="mt-3 rounded-lg bg-amber-500/10 p-3 text-xs text-muted-foreground">
                No business portfolios are available with this connection yet.
                Reconnect to refresh your Facebook permissions and business
                access.
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={startFacebookConnection}
                disabled={getAuthUrl.isPending}
              >
                {getAuthUrl.isPending
                  ? "Opening Facebook..."
                  : "Reconnect Facebook"}
              </Button>
              <PageCreationHelp />
            </>
          )}
          {selectedBusiness &&
            pagesQuery.data?.length === 0 &&
            !pagesQuery.isLoading && (
              <>
                <div className="mt-3 rounded-lg bg-amber-500/10 p-3 text-xs text-muted-foreground">
                  No Pages are available in this business portfolio with
                  publishing access.
                </div>
                <PageCreationHelp />
              </>
            )}
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">
            {postReady
              ? "Your draft is saved. Connect the one Facebook Page where you want to publish it."
              : "Connect the one Facebook Page where you want to publish your posts."}
          </p>
          <PageCreationHelp />
          <Button
            className="mt-4 gap-2 bg-[#1877F2] hover:bg-[#1877F2]/90"
            onClick={startFacebookConnection}
            disabled={getAuthUrl.isPending}
          >
            {getAuthUrl.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Facebook className="h-4 w-4" /> Connect Facebook Page
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
