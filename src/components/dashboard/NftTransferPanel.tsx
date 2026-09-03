import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, ExternalLink, RefreshCw, Search } from "lucide-react";

import {
  MintLink,
  NftIdentity,
  NftThumb,
  SovereignDeliveryNote,
} from "@/components/dashboard/NftMedia";
import {
  isSolanaAddress,
  truncateMint,
  useHandle,
  useNftMetadata,
  useTransferNft,
  useWalletNfts,
} from "@/hooks/useTender";
import { useWallet } from "@/lib/wallet/wallet-context";
import type { NftMetadata } from "@/types/tender";

const inputCls =
  "w-full glass-soft rounded-xl px-4 py-3 font-body text-sm text-foreground placeholder:text-muted2 focus:outline-none focus:border-red focus:ring-2 focus:ring-red/25 transition-all duration-150";

/** Turns raw API/wallet errors into something a payer can act on. */
function formatNftError(raw: string): string {
  const low = (raw || "").toLowerCase();
  if (low.includes("user rejected") || low.includes("cancelled") || low.includes("declined")) {
    return "Transfer was cancelled in your wallet.";
  }
  if (low.includes("not found") || low.includes("404")) {
    return "This collectible endpoint isn't available on the rail yet. Check back once the NFT release is deployed.";
  }
  if (low.includes("handle") && low.includes("not")) {
    return "That tag isn't registered on the rail, so it has no wallet to deliver to.";
  }
  if (low.includes("insufficient") || low.includes("rent")) {
    return "Not enough SOL to cover network rent for the recipient's token account.";
  }
  if (low.includes("owner") || low.includes("balance") || low.includes("token account")) {
    return "This wallet doesn't currently hold that collectible.";
  }
  return raw || "Unable to build the transfer for this collectible.";
}

/* ------------------------------------------------------------------ */
/* Picker                                                              */
/* ------------------------------------------------------------------ */

function PickerCard({
  nft,
  selected,
  onSelect,
}: {
  nft: NftMetadata;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      title={nft.name || nft.mint}
      className={`group flex flex-col gap-2 rounded-xl border p-2 text-left transition-all duration-150 cursor-pointer ${
        selected
          ? "border-ink bg-raised shadow-xs"
          : "border-hairline bg-base/70 hover:border-ink/40 hover:-translate-y-0.5"
      }`}
    >
      <NftThumb nft={nft} size="xl" />
      <span className="min-w-0 px-0.5 pb-0.5">
        <span className="block truncate font-body text-xs font-semibold text-foreground">
          {nft.name || "Unnamed"}
        </span>
        <span className="mt-0.5 block truncate font-mono text-[10px] text-muted2">
          {truncateMint(nft.mint)}
        </span>
      </span>
    </button>
  );
}

function NftPicker({
  wallet,
  selectedMint,
  onSelect,
}: {
  wallet: string | null;
  selectedMint: string;
  onSelect: (nft: NftMetadata) => void;
}) {
  const { data, isLoading, isError, error, refetch, isFetching } = useWalletNfts(wallet);
  const [filter, setFilter] = useState("");

  const nfts = useMemo(() => data?.nfts ?? [], [data?.nfts]);
  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return nfts;
    return nfts.filter(
      (n) => n.name?.toLowerCase().includes(q) || n.mint.toLowerCase().includes(q),
    );
  }, [nfts, filter]);

  if (!wallet) {
    return (
      <p className="rounded-xl border border-hairline bg-base/70 px-4 py-3 font-body text-xs text-muted2">
        Connect your wallet to browse the collectibles it holds.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-hairline bg-base/70 p-2">
            <div className="aspect-square w-full animate-pulse rounded-xl bg-hairline/70" />
            <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-hairline/70" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-red/30 bg-red/10 p-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red" />
        <div className="min-w-0">
          <p className="font-body text-xs leading-relaxed text-foreground/90">
            {formatNftError(error?.message ?? "")}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-red hover:underline cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" />
            Retry scan
          </button>
        </div>
      </div>
    );
  }

  if (!nfts.length) {
    return (
      <p className="rounded-xl border border-hairline bg-base/70 px-4 py-3 font-body text-xs text-muted2">
        No collectibles found in this wallet. You can still paste a mint address below.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted2" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by name or mint"
            className={`${inputCls} py-2.5 pl-9 text-xs`}
          />
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          title="Rescan wallet"
          className="shrink-0 rounded-xl border border-hairline p-2.5 text-muted2 transition-colors hover:text-foreground cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {shown.length === 0 ? (
        <p className="px-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted2">
          No match for “{filter.trim()}”
        </p>
      ) : (
        <div className="menu-scroll grid max-h-[320px] grid-cols-2 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-3">
          {shown.map((nft) => (
            <PickerCard
              key={nft.mint}
              nft={nft}
              selected={nft.mint === selectedMint}
              onSelect={() => onSelect(nft)}
            />
          ))}
        </div>
      )}

      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted2">
        {nfts.length} collectible{nfts.length === 1 ? "" : "s"} held
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

interface NftTransferPanelProps {
  /** Shared with the token composer so switching modes keeps the recipient. */
  handle: string;
  onHandleChange: (value: string) => void;
  onNftSettled?: (result: { signature: string; nft: NftMetadata; handle: string }) => void;
}

/**
 * Direct collectible transfer composer.
 *
 * Deliberately separate from the token composer: there is no amount, no
 * election to slice and no route to quote, so reusing that layout would only
 * add controls that do nothing.
 */
export default function NftTransferPanel({
  handle,
  onHandleChange,
  onNftSettled,
}: NftTransferPanelProps) {
  const { address: wallet } = useWallet();
  const transfer = useTransferNft();

  const [selected, setSelected] = useState<NftMetadata | null>(null);
  const [mintInput, setMintInput] = useState("");
  const [receipt, setReceipt] = useState<{
    signature: string;
    nft: NftMetadata;
    handle: string;
  } | null>(null);

  const cleanHandle = handle.trim().replace(/^@/, "").toLowerCase();
  const {
    data: handleData,
    isLoading: handleLoading,
    isError: handleNotFound,
  } = useHandle(cleanHandle);

  // Resolve a pasted mint so the payer sees what they are about to send.
  const pasted = useNftMetadata(mintInput);
  const pastedNft = pasted.data?.nft;

  useEffect(() => {
    if (pastedNft) setSelected(pastedNft);
  }, [pastedNft]);

  const ready = Boolean(wallet) && Boolean(selected?.mint) && cleanHandle.length > 0;

  const send = () => {
    if (!ready || !wallet || !selected || transfer.isPending) return;
    transfer.mutate(
      {
        userWallet: wallet,
        nftMint: selected.mint,
        recipientTag: cleanHandle,
        recipientWallet: handleData?.ownerWallet || undefined,
      },
      {
        onSuccess: (res) => {
          const receiptData = {
            signature: res.signature,
            nft: res.nft,
            handle: res.recipientHandle || cleanHandle,
          };
          setReceipt(receiptData);
          onNftSettled?.(receiptData);
          setSelected(null);
          setMintInput("");
        },
      },
    );
  };

  return (
    <>
      {/* Composer */}
      <div className="xl:col-span-7 glass rounded-2xl p-6 md:p-8 flex flex-col gap-6">
        <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
          COLLECTIBLE TRANSFER
        </span>

        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
              RECIPIENT HANDLE
            </span>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-sm text-muted2">
                @
              </span>
              <input
                value={handle}
                onChange={(e) => onHandleChange(e.target.value)}
                placeholder="ninjastorm"
                className={`${inputCls} pl-8 font-mono`}
              />
            </div>
          </label>

          {cleanHandle.length > 0 && (
            <div className="pt-0.5">
              {handleLoading ? (
                <div className="flex items-center gap-2 px-1 text-muted2 font-mono text-[11px]">
                  <div className="w-3 h-3 border border-hairline border-t-red rounded-full animate-spin" />
                  <span>Resolving @{cleanHandle} on TENDER rail…</span>
                </div>
              ) : handleData?.ownerWallet ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-base/80 border border-hairline">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {handleData.metadata?.avatar ? (
                      <img
                        src={handleData.metadata.avatar}
                        alt=""
                        className="w-7 h-7 rounded-lg object-cover border border-hairline shrink-0"
                      />
                    ) : (
                      <span className="w-7 h-7 rounded-lg bg-raised border border-hairline flex items-center justify-center font-mono text-xs font-semibold text-foreground shrink-0">
                        {handleData.handle.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          @{handleData.handle}
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-success/10 text-[9px] font-mono text-success uppercase">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Verified Tag
                        </span>
                      </div>
                      <a
                        href={`https://solscan.io/account/${handleData.ownerWallet}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[10px] text-muted2 hover:text-foreground flex items-center gap-1 truncate"
                        title={handleData.ownerWallet}
                      >
                        <span>Wallet: {truncateMint(handleData.ownerWallet, 4, 4)}</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      </a>
                    </div>
                  </div>
                </div>
              ) : handleNotFound && cleanHandle.length >= 3 ? (
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-warning/10 border border-warning/25 text-warning font-mono text-[11px]">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>@{cleanHandle} is not registered yet on TENDER rail.</span>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
            CHOOSE A COLLECTIBLE
          </span>
          <NftPicker
            wallet={wallet}
            selectedMint={selected?.mint ?? ""}
            onSelect={(nft) => {
              setSelected(nft);
              setMintInput("");
            }}
          />
        </div>

        <label className="flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
            OR PASTE A MINT ADDRESS
          </span>
          <input
            value={mintInput}
            onChange={(e) => setMintInput(e.target.value)}
            placeholder="7sm142JgXr3u5e2HXMfimidVPjZWwZNQr4oTBckQELJr"
            spellCheck={false}
            className={`${inputCls} font-mono text-xs`}
          />
          {mintInput.trim().length > 0 && !isSolanaAddress(mintInput) && (
            <span className="font-mono text-[10px] text-muted2">
              Keep typing — a Solana mint is 32–44 base58 characters.
            </span>
          )}
          {pasted.isLoading && (
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted2">
              Resolving metadata…
            </span>
          )}
          {pasted.isError && (
            <span className="font-mono text-[10px] text-red">
              {formatNftError(pasted.error?.message ?? "")}
            </span>
          )}
        </label>

        {/* Explainer Notice */}
        <div className="rounded-xl border border-hairline bg-base/60 px-4 py-3">
          <p className="font-body text-xs text-secondary2 leading-relaxed">
            <strong className="text-foreground font-medium">Sovereign direct delivery:</strong> Transferred 1:1 to {cleanHandle ? `@${cleanHandle}` : "the recipient tag"}&apos;s connected Solana wallet with zero DEX selling and zero election slicing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <button
            type="button"
            disabled={!ready || transfer.isPending}
            onClick={send}
            className={`font-body font-semibold text-sm uppercase tracking-[0.08em] rounded-xl px-8 py-3.5 transition-all duration-150 ${
              ready && !transfer.isPending
                ? "bg-red hover:bg-red-hover text-white hover:-translate-y-0.5 cursor-pointer"
                : "bg-hairline text-muted2 cursor-not-allowed"
            }`}
          >
            {transfer.isPending
              ? "TRANSFERRING VIA WALLET…"
              : cleanHandle
                ? `TRANSFER NFT TO @${cleanHandle.toUpperCase()}`
                : "TRANSFER NFT"}
          </button>
          {!wallet && (
            <span className="font-body text-xs text-muted2">
              Connect your wallet to sign the transfer.
            </span>
          )}
        </div>

        {transfer.isError && (
          <div className="rounded-lg border border-red/30 bg-red/10 p-3.5">
            <p className="font-mono text-xs font-medium text-red">
              {formatNftError(transfer.error.message)}
            </p>
          </div>
        )}
      </div>

      {/* Delivery preview */}
      <div className="xl:col-span-5 glass glass-interactive rounded-2xl p-5 md:p-6 flex flex-col gap-5 min-w-0">
        <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
          DELIVERY PREVIEW {cleanHandle ? `· ${cleanHandle.toUpperCase()}` : ""}
        </span>

        <AnimatePresence mode="wait" initial={false}>
          {receipt ? (
            <motion.div
              key="receipt"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-4"
            >
              <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-success">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Delivered to @{receipt.handle}
              </span>
              <div className="rounded-xl border border-hairline bg-base/80 p-4">
                <NftIdentity nft={receipt.nft} size="md" />
              </div>
              <a
                href={`https://solscan.io/tx/${receipt.signature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-mono text-xs text-success hover:underline"
              >
                <span>View transaction</span>
                <ExternalLink className="h-3 w-3" />
              </a>
              <button
                type="button"
                onClick={() => setReceipt(null)}
                className="w-fit font-mono text-[10px] uppercase tracking-[0.1em] text-muted2 hover:text-foreground cursor-pointer"
              >
                Send another →
              </button>
            </motion.div>
          ) : selected ? (
            <motion.div
              key={selected.mint}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4"
            >
              <NftThumb nft={selected} size="xl" className="max-w-[220px]" />
              <div className="min-w-0">
                <span className="block truncate font-display text-lg font-semibold text-foreground">
                  {selected.name || "Unnamed collectible"}
                </span>
                <div className="mt-1 flex items-center gap-2">
                  {selected.symbol && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted2">
                      {selected.symbol}
                    </span>
                  )}
                  <MintLink mint={selected.mint} head={6} tail={6} />
                </div>
              </div>

              <dl className="flex flex-col gap-2 border-t border-hairline/60 pt-4">
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted2">
                    Quantity
                  </dt>
                  <dd className="font-mono text-xs font-semibold text-foreground">1 of 1</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted2">
                    Route
                  </dt>
                  <dd className="font-mono text-xs font-semibold text-foreground">
                    Direct · no DEX
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted2">
                    Recipient
                  </dt>
                  <dd className="min-w-0 truncate font-mono text-xs font-semibold text-foreground">
                    {cleanHandle ? `@${cleanHandle}` : "—"}
                  </dd>
                </div>
              </dl>

              <SovereignDeliveryNote handle={cleanHandle} />
            </motion.div>
          ) : (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-body text-xs leading-relaxed text-muted2"
            >
              Pick a collectible to preview exactly what lands in the recipient&apos;s wallet.
              Nothing is swapped, sold, or sliced across their election.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
