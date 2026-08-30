import ModulePage from "@/components/dashboard/ModulePage";
import StatCard from "@/components/dashboard/StatCard";
import DashTable, { DashCell, DashRow, StatusPill } from "@/components/dashboard/DashTable";
import { useHandle } from "@/hooks/useTender";
import { useTenderSession } from "@/lib/tender-session";
import { useWallet } from "@/lib/wallet/wallet-context";

const truncate = (value: string) =>
  value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toISOString().slice(0, 10);
};

/** Framed message used for every non-data state, so they all read the same. */
function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="glass rounded-2xl p-6 md:p-8">
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2">{title}</p>
      <p className="mt-3 font-body text-[15px] leading-[1.65] text-muted2 max-w-prose">{body}</p>
    </div>
  );
}

/**
 * Overview: the connected handle's live registration and allocation, read from
 * GET /api/v1/handles/:handle. Everything here comes off that response — the
 * rail has no aggregate or history endpoint, so nothing is summarised across
 * handles and no figure on this page is synthesised.
 */
export default function Overview() {
  const { handle } = useTenderSession();
  const { address: wallet } = useWallet();
  const { data, isLoading, error } = useHandle(handle);

  const elections = data?.elections ?? [];
  const allocated = (data?.totalBasisPoints ?? 0) / 100;
  const fullyAllocated = data?.totalBasisPoints === 10_000;
  // The API keys writes on handle + owner wallet, so a mismatch means this
  // session can read the handle but every write will be rejected.
  const isOwner = Boolean(data && wallet && data.ownerWallet === wallet);

  return (
    <ModulePage
      index="01"
      label="OVERVIEW"
      title={handle ? `@${handle}` : "Your handle."}
      blurb="Registration and target allocation for the handle this terminal is acting as."
    >
      {!handle && (
        <Notice
          title="NO HANDLE SET"
          body="Set a handle from the bar at the top of the page to load its elections. If you do not have one yet, claim it first."
        />
      )}

      {handle && isLoading && <Notice title="LOADING" body={`Reading @${handle} from the rail.`} />}

      {handle && error && (
        <Notice
          title="NOT FOUND"
          body={
            error instanceof Error
              ? error.message
              : `@${handle} could not be read from the rail.`
          }
        />
      )}

      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          <StatCard label="Elections Set" value={elections.length} delta={`${elections.length === 1 ? "asset" : "assets"} elected`} deltaTone={elections.length ? "success" : "warning"} />
          <StatCard
            label="Allocated"
            value={allocated}
            format={(n) => `${n.toFixed(n % 1 === 0 ? 0 : 2)}%`}
            delta={fullyAllocated ? "fully allocated" : `${(100 - allocated).toFixed(2)}% unassigned`}
            deltaTone={fullyAllocated ? "success" : "warning"}
          />
        </div>
      )}

      {data && (
        <div className="glass rounded-2xl p-5 md:p-6 flex flex-col gap-4">
          <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
            HANDLE
          </span>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <div className="flex items-baseline justify-between gap-4 min-w-0">
              <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">Owner</dt>
              <dd className="font-mono text-xs text-foreground truncate" title={data.ownerWallet}>
                {truncate(data.ownerWallet)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 min-w-0">
              <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
                This wallet
              </dt>
              <dd>
                <StatusPill
                  tone={!wallet ? "muted" : isOwner ? "success" : "red"}
                  label={!wallet ? "not connected" : isOwner ? "owner" : "not owner"}
                />
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 min-w-0">
              <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
                Registered
              </dt>
              <dd className="font-mono text-xs text-foreground">{formatDate(data.createdAt)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 min-w-0">
              <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
                Updated
              </dt>
              <dd className="font-mono text-xs text-foreground">{formatDate(data.updatedAt)}</dd>
            </div>
          </dl>
        </div>
      )}

      {data && elections.length > 0 && (
        <DashTable
          caption="TARGET ALLOCATION"
          columns={["Asset", "Mint", "Basis points", "Share"]}
          minWidth="min-w-[560px]"
        >
          {elections.map((election) => {
            const pct = election.basisPoints / 100;
            return (
              <DashRow key={election.mint || election.symbol}>
                <DashCell className="text-foreground">{election.symbol}</DashCell>
                <DashCell className="font-mono text-xs text-muted2">
                  <span title={election.mint}>{truncate(election.mint)}</span>
                </DashCell>
                <DashCell className="font-mono text-xs">{election.basisPoints}</DashCell>
                <DashCell className="font-mono text-xs text-foreground">
                  <span className="flex items-center gap-3">
                    <span className="h-1 w-24 shrink-0 rounded-full bg-hairline overflow-hidden">
                      <span className="block h-full bg-red" style={{ width: `${pct}%` }} />
                    </span>
                    {pct}%
                  </span>
                </DashCell>
              </DashRow>
            );
          })}
        </DashTable>
      )}

      {data && elections.length === 0 && (
        <Notice
          title="NO ELECTIONS"
          body="This handle is registered but has no target allocation yet. Set one in Elections and inbound payments will settle into it."
        />
      )}
    </ModulePage>
  );
}
