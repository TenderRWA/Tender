import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "@/lib/router-compat";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useComingSoon } from "@/components/ComingSoonModal";
import { useHandleAvailability, useRegisterHandle } from "@/hooks/useTender";
import ConnectWalletButton from "@/components/wallet/ConnectWalletButton";
import WalletModal from "@/components/wallet/WalletModal";
import AssetPickerModal from "@/components/dashboard/AssetPickerModal";
import { useTenderSession } from "@/lib/tender-session";
import { useWallet } from "@/lib/wallet/wallet-context";
import {
  getInitialTokenColor,
  extractDominantColorFromImage,
} from "@/lib/token-color";
import { Search, Plus, Trash2, ChevronDown, Check, Sparkles } from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const ROLES = ["Receiver", "Sender", "Team-DAO", "Staker"] as const;
type Role = (typeof ROLES)[number];

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
const MAX_ELECTION_ASSETS = 10;

const API_BASE = import.meta.env.VITE_API_URL || "https://api.tenderrwa.com";

export interface AssetOption {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  iconUrl?: string;
  underlyingTicker?: string;
}

// Curated default popular stocks for instant selector rendering
const DEFAULT_FEATURED_ASSETS: AssetOption[] = [
  {
    symbol: "SPYx",
    name: "S&P 500 ETF",
    mint: "XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W",
    decimals: 8,
    iconUrl: "https://cdn.prod.website-files.com/655f3efc4be468487052e35a/685116624ae31d5ceb724895_Ticker%3DSPX%2C%20Company%20Name%3DSP500%2C%20size%3D256x256.svg",
    underlyingTicker: "SPY",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    decimals: 6,
    iconUrl: "https://coin-images.coingecko.com/coins/images/6319/large/usdc.png?1696506694",
  },
  {
    symbol: "GLDx",
    name: "Gold International",
    mint: "Xs64245JybP9rgXJZJZcxKKRwqJnRpGKzoKtVNcyhoS",
    decimals: 8,
    iconUrl: "https://cdn.prod.website-files.com/655f3efc4be468487052e35a/6a7099dd071779fc9537d8a0_ZJGLDx.png",
    underlyingTicker: "GLD",
  },
  {
    symbol: "NVDAx",
    name: "NVIDIA Corp",
    mint: "Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh",
    decimals: 8,
    iconUrl: "https://cdn.prod.website-files.com/655f3efc4be468487052e35a/6a58e2348398e0f63e6ef6d1_NVDAx.png",
    underlyingTicker: "NVDA",
  },
  {
    symbol: "TSLAx",
    name: "Tesla Inc",
    mint: "XsHtf5bL6x8i7YrEdkGZ9wPvTz5eBqC4uFwA9bV8yZ7",
    decimals: 8,
    iconUrl: "https://cdn.prod.website-files.com/655f3efc4be468487052e35a/6a58e25d2ea99a6d0c1e0b57_TSLAx.png",
    underlyingTicker: "TSLA",
  },
  {
    symbol: "AAPLx",
    name: "Apple Inc",
    mint: "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp",
    decimals: 8,
    iconUrl: "https://cdn.prod.website-files.com/655f3efc4be468487052e35a/6a58e1c667468160352efdf1_AAPLx.png",
    underlyingTicker: "AAPL",
  },
  {
    symbol: "QQQx",
    name: "Nasdaq-100 ETF",
    mint: "Xs9mQZ4bA6yV3sK2dJ8fT1rL7uP5nC9wE3vH8kM6xQ4",
    decimals: 8,
    iconUrl: "https://cdn.prod.website-files.com/655f3efc4be468487052e35a/6851165e317b2b73ecb1313e_Ticker%3DNDX%2C%20Company%20Name%3DNASDAQ100%2C%20size%3D256x256.svg",
    underlyingTicker: "QQQ",
  },
  {
    symbol: "MSFTx",
    name: "Microsoft Corp",
    mint: "Xs5vQ8kP9nL2dJ7rT1mC4wE6uH3bA8yV5sK9fM7xQ2",
    decimals: 8,
    iconUrl: "https://cdn.prod.website-files.com/655f3efc4be468487052e35a/6a58e217578ec09be4d35e1c_MSFTx.png",
    underlyingTicker: "MSFT",
  },
  {
    symbol: "AMZNx",
    name: "Amazon.com Inc",
    mint: "Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg",
    decimals: 8,
    iconUrl: "https://cdn.prod.website-files.com/655f3efc4be468487052e35a/6a58e1d51a0298d9e7fb3911_AMZNx.png",
    underlyingTicker: "AMZN",
  },
  {
    symbol: "GOOGLx",
    name: "Alphabet Inc",
    mint: "XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN",
    decimals: 8,
    iconUrl: "https://cdn.prod.website-files.com/655f3efc4be468487052e35a/6a58e1a967468160352efc1d_GOOGLx.png",
    underlyingTicker: "GOOGL",
  },
  {
    symbol: "METAX",
    name: "Meta Platforms",
    mint: "Xs7kP4bA6yV3sK2dJ8fT1rL7uP5nC9wE3vH8kM6xQ8",
    decimals: 8,
    iconUrl: "https://cdn.prod.website-files.com/655f3efc4be468487052e35a/6a58e202578ec09be4d35db5_METAx.png",
    underlyingTicker: "META",
  },
  {
    symbol: "COINx",
    name: "Coinbase Global",
    mint: "Xs7ZdzSHLU9ftNJsii5fCeJhoRWSC32SQGzGQtePxNu",
    decimals: 8,
    iconUrl: "https://cdn.prod.website-files.com/655f3efc4be468487052e35a/6a58e1eb705fa97f5d6f461a_COINx.png",
    underlyingTicker: "COIN",
  },
  {
    symbol: "PLTRx",
    name: "Palantir Tech",
    mint: "Xs4mQZ4bA6yV3sK2dJ8fT1rL7uP5nC9wE3vH8kM6xQ9",
    decimals: 8,
    iconUrl: "https://cdn.prod.website-files.com/655f3efc4be468487052e35a/6a58e23f03b573bb85973dd2_PLTRx.png",
    underlyingTicker: "PLTR",
  },
  {
    symbol: "SOL",
    name: "Solana Native",
    mint: "11111111111111111111111111111111",
    decimals: 9,
    iconUrl: "https://coin-images.coingecko.com/coins/images/4128/large/solana.png?1718769756",
  },
];

export interface ElectionItem {
  id: string;
  symbol: string;
  name: string;
  mint: string;
  percent: number;
  color: string;
  iconUrl?: string;
}

function roleFromQuery(raw: string | null): Role {
  const v = (raw ?? "").toLowerCase();
  if (v.includes("send")) return "Sender";
  if (v.includes("team") || v.includes("dao")) return "Team-DAO";
  if (v.includes("stak") || v.includes("tender")) return "Staker";
  return "Receiver";
}

/* ---------------------------------- pie ---------------------------------- */

function DynamicElectionRing({ items }: { items: ElectionItem[] }) {
  const r = 76;
  const C = 2 * Math.PI * r;
  const total = items.reduce((sum, item) => sum + item.percent, 0);

  let cursor = 0;
  const segments = items.map((item) => {
    const frac = total > 0 ? item.percent / Math.max(total, 100) : 0;
    const len = Math.max(frac * C - 3, 0);
    const seg = (
      <circle
        key={item.id}
        cx="100"
        cy="100"
        r={r}
        fill="none"
        stroke={item.color}
        strokeWidth={item.percent > 0 ? 22 : 0}
        strokeDasharray={`${len} ${C - len}`}
        strokeDashoffset={-cursor + C / 4}
        style={{ transition: "stroke-dasharray 400ms ease-out, stroke-dashoffset 400ms ease-out, stroke 300ms ease" }}
      />
    );
    cursor += frac * C;
    return seg;
  });

  return (
    <div className="relative mx-auto w-full max-w-[260px]">
      <svg viewBox="0 0 200 200" className="w-full h-auto" aria-hidden>
        <circle cx="100" cy="100" r={r} fill="none" stroke="#E3E3E6" strokeWidth="22" />
        {segments}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-3xl font-medium tracking-[-0.03em] text-ink">
          {total}%
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
          ELECTION
        </span>
      </div>
    </div>
  );
}

/** Right-hand sticky preview: on-chain account card with live handle + dynamic pie. */
function DynamicPreviewCard({
  handle,
  availability,
  items,
  role,
}: {
  handle: string;
  availability: "idle" | "checking" | "available" | "taken" | "invalid";
  items: ElectionItem[];
  role: Role;
}) {
  return (
    <div className="rounded border border-hairline bg-card2 dot-matrix-dark p-8 md:p-10 lg:sticky lg:top-28">
      <div className="flex items-center gap-4">
        <img src="/logo.png" alt="TENDER mark" className="h-10 w-auto" />
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-medium tracking-[-0.02em] text-ink">
            @{handle.trim() || "yourhandle"}
          </p>
          <p
            className={cn(
              "font-mono text-[10px] uppercase tracking-[0.12em]",
              availability === "available" && "text-success",
              availability === "taken" && "text-red",
              availability === "invalid" && "text-red",
              availability === "checking" && "text-muted2",
              availability === "idle" && "text-muted2"
            )}
          >
            {availability === "available"
              ? "● AVAILABLE"
              : availability === "taken"
                ? "● TAKEN"
                : availability === "invalid"
                  ? "● INVALID FORMAT"
                  : availability === "checking"
                    ? "● CHECKING REGISTRY..."
                    : "ELECTION REGISTRY"}
          </p>
        </div>
      </div>

      <div className="my-8">
        <DynamicElectionRing items={items} />
      </div>

      <div className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-3 max-h-[160px] overflow-y-auto pr-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded border border-hairline bg-base px-3 py-2 text-center"
          >
            <span
              className="mx-auto mb-1 block h-1.5 w-4 rounded-full"
              style={{ backgroundColor: item.color }}
              aria-hidden
            />
            <span className="font-mono text-xs text-secondary2 block truncate">
              {item.symbol} {item.percent}%
            </span>
          </div>
        ))}
      </div>

      <p className="border-t border-hairline pt-5 font-mono text-[10px] uppercase leading-relaxed tracking-[0.12em] text-muted2">
        {role.toUpperCase()} · SETTLES VIA JUPITER & RELAY · NON-CUSTODIAL · SOLANA
      </p>
    </div>
  );
}

/* ---------------------------------- form ---------------------------------- */

const fieldVariants = {
  hidden: { y: 24, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.6, ease: EASE } },
};

export default function ClaimForm({ embedded = false }: { embedded?: boolean }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [handle, setHandle] = useState("");
  const [checked, setChecked] = useState("");
  const [role, setRole] = useState<Role>(() => roleFromQuery(searchParams.get("role")));
  const [done, setDone] = useState(false);
  const [claimedHandle, setClaimedHandle] = useState("");
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const comingSoon = useComingSoon();
  const { address, walletName } = useWallet();
  const wallet = address;
  const { setHandle: setSessionHandle } = useTenderSession();

  // Dynamic election items with derived brand colors
  const [items, setItems] = useState<ElectionItem[]>([
    {
      id: "item-1",
      symbol: "SPYx",
      name: "S&P 500 ETF",
      mint: "XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W",
      percent: 50,
      color: getInitialTokenColor("SPYx"),
      iconUrl: DEFAULT_FEATURED_ASSETS[0].iconUrl,
    },
    {
      id: "item-2",
      symbol: "NVDAx",
      name: "NVIDIA Corp",
      mint: "Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh",
      percent: 30,
      color: getInitialTokenColor("NVDAx"),
      iconUrl: DEFAULT_FEATURED_ASSETS[3].iconUrl,
    },
    {
      id: "item-3",
      symbol: "USDC",
      name: "USD Coin",
      mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      percent: 20,
      color: getInitialTokenColor("USDC"),
      iconUrl: DEFAULT_FEATURED_ASSETS[1].iconUrl,
    },
  ]);

  const [availableAssets, setAvailableAssets] = useState<AssetOption[]>(DEFAULT_FEATURED_ASSETS);
  const [activePickerIndex, setActivePickerIndex] = useState<number | null>(null);

  // Load catalog on mount & extract colors for any non-canonical items
  useEffect(() => {
    async function fetchAssets() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/assets?limit=1000`);
        if (res.ok) {
          const data = await res.json();
          const combined = [
            ...(data.baseCurrencies || []),
            ...(data.assets || data.featured || []),
          ];
          if (combined.length > 0) {
            setAvailableAssets(combined);
          }
        }
      } catch (e) {
        // fallback
      }
    }
    fetchAssets();
  }, []);

  // Dynamically resolve image colors on mount or whenever item icons change
  useEffect(() => {
    items.forEach(async (item) => {
      if (item.iconUrl) {
        const extracted = await extractDominantColorFromImage(item.iconUrl, item.symbol);
        if (extracted && extracted !== item.color) {
          setItems((prev) =>
            prev.map((it) => (it.id === item.id ? { ...it, color: extracted } : it))
          );
        }
      }
    });
  }, [items.map((i) => i.iconUrl).join(",")]);

  // Real-time automatic debounce on handle input
  useEffect(() => {
    const clean = handle.trim().toLowerCase();
    const timer = setTimeout(() => {
      setChecked(clean);
    }, 250);
    return () => clearTimeout(timer);
  }, [handle]);

  const total = items.reduce((sum, item) => sum + item.percent, 0);
  const validTotal = total === 100;

  const validHandleFormat = HANDLE_RE.test(checked);
  const availabilityQuery = useHandleAvailability(checked, validHandleFormat);

  const availability: "idle" | "checking" | "available" | "taken" | "invalid" = useMemo(() => {
    if (!checked) return "idle";
    if (!validHandleFormat) return "invalid";
    if (availabilityQuery.isLoading) return "checking";
    if (availabilityQuery.data) {
      return availabilityQuery.data.registered ? "taken" : "available";
    }
    return "idle";
  }, [checked, validHandleFormat, availabilityQuery.isLoading, availabilityQuery.data]);

  const register = useRegisterHandle();
  const canSubmit =
    availability === "available" &&
    validTotal &&
    Boolean(wallet) &&
    !register.isPending;

  const summary = useMemo(() => {
    const allocString = items.map((it) => `${it.symbol} ${it.percent}%`).join(" / ");
    return `@${handle.trim()} - ${allocString} - ${role.toUpperCase()}`;
  }, [handle, items, role]);

  const updateItemPercent = (id: string, newPercent: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, percent: newPercent } : item))
    );
  };

  const updateItemAsset = async (index: number, newAsset: AssetOption) => {
    const initialColor = getInitialTokenColor(newAsset.symbol);

    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        symbol: newAsset.symbol,
        name: newAsset.name,
        mint: newAsset.mint,
        iconUrl: newAsset.iconUrl,
        color: initialColor,
      };
      return copy;
    });

    if (newAsset.iconUrl) {
      const extractedColor = await extractDominantColorFromImage(newAsset.iconUrl, newAsset.symbol);
      setItems((prev) => {
        const copy = [...prev];
        if (copy[index]) {
          copy[index] = { ...copy[index], color: extractedColor };
        }
        return copy;
      });
    }
  };

  const addAssetItem = async () => {
    if (items.length >= MAX_ELECTION_ASSETS) return;
    const existingSymbols = new Set(items.map((i) => i.symbol));
    const nextAsset = availableAssets.find((a) => !existingSymbols.has(a.symbol)) || availableAssets[3];
    const initialColor = getInitialTokenColor(nextAsset.symbol);

    const newItemId = `item-${Date.now()}`;

    setItems((prev) => [
      ...prev,
      {
        id: newItemId,
        symbol: nextAsset.symbol,
        name: nextAsset.name,
        mint: nextAsset.mint,
        percent: 0,
        color: initialColor,
        iconUrl: nextAsset.iconUrl,
      },
    ]);

    if (nextAsset.iconUrl) {
      const extracted = await extractDominantColorFromImage(nextAsset.iconUrl, nextAsset.symbol);
      setItems((prev) =>
        prev.map((it) => (it.id === newItemId ? { ...it, color: extracted } : it))
      );
    }
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const balanceEvenly = () => {
    const count = items.length;
    const baseShare = Math.floor(100 / count);
    const remainder = 100 % count;

    setItems((prev) =>
      prev.map((it, idx) => ({
        ...it,
        percent: idx === 0 ? baseShare + remainder : baseShare,
      }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !wallet) return;

    // Filter out 0% allocations so only active legs are committed
    const elections = items
      .filter((it) => it.percent > 0)
      .map((it) => ({
        symbol: it.symbol,
        mint: it.mint,
        basisPoints: it.percent * 100,
      }));

    const cleanHandle = handle.trim().toLowerCase();

    try {
      await register.mutateAsync({
        handle: cleanHandle,
        ownerWallet: wallet,
        metadata: { role, submittedAt: new Date().toISOString() },
        elections,
      });

      // Auto-activate the newly claimed handle immediately in session
      setSessionHandle(cleanHandle);
      setClaimedHandle(cleanHandle);
      setDone(true);
    } catch (err) {
      console.error("Handle registration failed:", err);
    }
  };

  const inputCls =
    "w-full rounded border border-hairline bg-base px-4 py-3.5 font-mono text-sm text-ink caret-red placeholder:text-muted2 outline-none transition-colors duration-150 focus:border-red";

  return (
    <section id="claim" className={embedded ? "" : "scroll-mt-24 border-t border-hairline"}>
      <div className={embedded ? "" : "mx-auto max-w-container px-5 py-24 md:px-10 md:py-40"}>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ staggerChildren: 0.08 }}
          className="grid gap-10 lg:grid-cols-[55fr_45fr] lg:gap-16"
        >
          {/* Form card / success panel */}
          <motion.div variants={fieldVariants} style={{ perspective: 1200 }}>
            <AnimatePresence mode="wait" initial={false}>
              {done ? (
                <motion.div
                  key="success"
                  initial={{ rotateY: 8, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: -8, opacity: 0 }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="flex h-full flex-col justify-between gap-8 rounded border border-hairline bg-card2 p-8 md:p-12 shadow-2xl relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 h-48 w-48 bg-red/10 rounded-full blur-3xl pointer-events-none" />

                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-success font-semibold">
                        ACTIVE IN TERMINAL SESSION
                      </span>
                    </div>

                    <h3 className="font-display text-3xl font-medium leading-[1.1] tracking-[-0.02em] text-ink md:text-4xl">
                      @{claimedHandle || handle} claimed.
                      <br />
                      Election recorded.
                    </h3>

                    <p className="mt-3 font-body text-[14px] leading-relaxed text-secondary2">
                      Your sovereign portfolio election is pinned to your wallet. Every incoming settlement converts atomically into your elected mix.
                    </p>

                    {/* Elected Portfolio Summary Chips */}
                    <div className="mt-6 flex flex-wrap gap-2">
                      {items
                        .filter((it) => it.percent > 0)
                        .map((it) => (
                          <div
                            key={it.id}
                            className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-base px-3 py-1 font-mono text-xs text-ink"
                          >
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: it.color }}
                              aria-hidden
                            />
                            <span className="font-bold">{it.symbol}</span>
                            <span className="text-secondary2">{it.percent}%</span>
                          </div>
                        ))}
                    </div>

                    <div className="mt-6 rounded border border-hairline/80 bg-base/60 p-4">
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
                        OWNER WALLET
                      </p>
                      <p className="font-mono text-xs text-ink break-all mt-0.5">
                        {wallet}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-hairline">
                    <button
                      type="button"
                      onClick={() => navigate("/dashboard")}
                      className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded bg-red px-6 py-3.5 font-body text-sm font-semibold uppercase tracking-[0.08em] text-white transition-all duration-150 hover:bg-red-hover hover:-translate-y-0.5 shadow-md"
                    >
                      Open Terminal Dashboard →
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDone(false);
                        setHandle("");
                        setChecked("");
                        setClaimedHandle("");
                      }}
                      className="w-full sm:w-auto inline-flex items-center justify-center rounded border border-hairline bg-base px-5 py-3.5 font-mono text-xs uppercase tracking-[0.08em] text-secondary2 hover:text-ink hover:border-red transition-colors"
                    >
                      Claim Another
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  exit={{ rotateY: -8, opacity: 0 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  onSubmit={handleSubmit}
                  className="rounded border border-hairline bg-card2 p-8 md:p-12"
                >
                  {!embedded && (
                    <motion.div variants={fieldVariants}>
                      <h2 className="font-display text-[28px] font-medium leading-[1.1] tracking-[-0.02em] text-ink">
                        Claim your handle
                      </h2>
                      <p className="mt-3 font-body text-[15px] leading-[1.65] text-secondary2">
                        Reserve a name in the election registry and pin your receive
                        mix before mainnet-beta opens.
                      </p>
                    </motion.div>
                  )}

                  {/* 1. Handle */}
                  <motion.div variants={fieldVariants} className="mt-10">
                    <label
                      htmlFor="claim-handle"
                      className="mb-3 block font-mono text-xs uppercase tracking-[0.12em] text-secondary2"
                    >
                      Handle
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-sm text-muted2">
                        @
                      </span>
                      <input
                        id="claim-handle"
                        type="text"
                        value={handle}
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="yourname"
                        onChange={(e) => setHandle(e.target.value)}
                        className={cn(
                          inputCls,
                          "pl-9",
                          availability === "available" && "border-success/60",
                          (availability === "taken" || availability === "invalid") && "border-red"
                        )}
                      />
                      <span
                        className={cn(
                          "pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-[0.12em]",
                          availability === "available" && "text-success",
                          availability === "checking" && "text-muted2",
                          (availability === "taken" || availability === "invalid") && "text-red"
                        )}
                      >
                        {availability === "checking" && "CHECKING…"}
                        {availability === "available" && "✓ AVAILABLE"}
                        {availability === "taken" && "✕ TAKEN"}
                        {availability === "invalid" && "✕ INVALID"}
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
                      3-20 chars · a-z 0-9 _ · registry-checked automatically
                    </p>
                  </motion.div>

                  {/* 2. Dynamic Election Selectors & Sliders */}
                  <motion.div variants={fieldVariants} className="mt-10">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
                        Your election
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={balanceEvenly}
                          className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.08em] text-muted2 hover:text-ink transition-colors"
                        >
                          <Sparkles className="h-3 w-3 text-red" />
                          Balance
                        </button>
                        <span
                          className={cn(
                            "font-mono text-xs uppercase tracking-[0.12em]",
                            validTotal ? "text-success" : "animate-pulse text-red"
                          )}
                          aria-live="polite"
                        >
                          TOTAL {total}%
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4 rounded border border-hairline bg-base p-5">
                      <div
                        data-lenis-prevent="true"
                        onWheel={(e) => e.stopPropagation()}
                        onTouchMove={(e) => e.stopPropagation()}
                        className="max-h-[380px] overflow-y-auto overscroll-contain space-y-4 pr-1"
                        style={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}
                      >
                        {items.map((item, index) => (
                          <div key={item.id} className="space-y-2 border-b border-hairline/60 pb-3 last:border-0 last:pb-0">
                            <div className="flex items-center justify-between">
                              {/* Asset Selector Trigger with Image-Derived Dot */}
                              <button
                                type="button"
                                onClick={() => setActivePickerIndex(index)}
                                className="group inline-flex items-center gap-2 rounded border border-hairline bg-card2 px-2.5 py-1.5 hover:border-red transition-colors"
                              >
                                <span
                                  className="h-2 w-2 rounded-full shrink-0 transition-colors"
                                  style={{ backgroundColor: item.color }}
                                  aria-hidden
                                />
                                {item.iconUrl ? (
                                  <img
                                    src={item.iconUrl}
                                    alt={item.symbol}
                                    className="h-4 w-4 rounded-full object-cover shrink-0"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = "none";
                                    }}
                                  />
                                ) : null}
                                <span className="font-mono text-xs font-bold text-ink uppercase">
                                  {item.symbol}
                                </span>
                                <span className="hidden sm:inline font-body text-[11px] text-muted2 truncate max-w-[120px]">
                                  {item.name}
                                </span>
                                <ChevronDown className="h-3.5 w-3.5 text-muted2 group-hover:text-red transition-colors" />
                              </button>

                              {/* Percentage display + Delete button */}
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-xs font-semibold text-secondary2">
                                  {item.percent}%
                                </span>
                                {items.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeItem(item.id)}
                                    className="text-muted2 hover:text-red p-1 transition-colors"
                                    title="Remove asset"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Percentage Slider with Dynamic Asset Accent */}
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={5}
                              value={item.percent}
                              aria-label={`${item.symbol} percentage`}
                              onChange={(e) => updateItemPercent(item.id, Number(e.target.value))}
                              style={{ accentColor: item.color }}
                              className="h-1 w-full cursor-pointer appearance-none rounded bg-hairline"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Add Asset Button (Up to 10 assets) */}
                      {items.length < MAX_ELECTION_ASSETS && (
                        <button
                          type="button"
                          onClick={addAssetItem}
                          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-hairline py-2.5 font-mono text-xs uppercase tracking-[0.08em] text-muted2 hover:border-red hover:text-ink transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5 text-red" />
                          Add Receive Asset ({items.length}/{MAX_ELECTION_ASSETS})
                        </button>
                      )}
                    </div>

                    {!validTotal && (
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-red">
                        Election must total exactly 100% to claim (Current: {total}%).
                      </p>
                    )}
                  </motion.div>

                  {/* 3. Role pills */}
                  <motion.div variants={fieldVariants} className="mt-10">
                    <span className="mb-3 block font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
                      I am a…
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {ROLES.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r)}
                          aria-pressed={role === r}
                          className={cn(
                            "rounded border px-4 py-2.5 font-mono text-xs uppercase tracking-[0.08em] transition-colors duration-150",
                            role === r
                              ? "border-red bg-red text-white"
                              : "border-hairline bg-base text-secondary2 hover:border-red hover:text-ink"
                          )}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </motion.div>

                  {/* 4. Owner wallet */}
                  <motion.div variants={fieldVariants} className="mt-10">
                    <span className="mb-3 block font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
                      Owner wallet
                    </span>
                    <div className="rounded border border-hairline bg-base p-5">
                      <ConnectWalletButton />
                      {wallet && (
                        <p className="mt-3 break-all font-mono text-xs text-secondary2">
                          {walletName} · {wallet}
                        </p>
                      )}
                    </div>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
                      The wallet that will own the handle and receive every settled leg
                    </p>
                  </motion.div>

                  {/* 5. Submit Button */}
                  <motion.div variants={fieldVariants} className="mt-10">
                    {!wallet ? (
                      <motion.button
                        type="button"
                        onClick={() => setWalletModalOpen(true)}
                        whileTap={{ scale: 0.96 }}
                        className="flex w-full items-center justify-center gap-2 rounded px-8 py-4 font-body text-sm font-semibold uppercase tracking-[0.08em] bg-red text-white hover:bg-red-hover transition-all duration-150 cursor-pointer shadow-md"
                      >
                        Connect Wallet to Claim
                      </motion.button>
                    ) : (
                      <motion.button
                        type="submit"
                        disabled={!canSubmit}
                        whileTap={canSubmit ? { scale: 0.96 } : undefined}
                        className={cn(
                          "flex w-full items-center justify-center gap-2 rounded px-8 py-4 font-body text-sm font-semibold uppercase tracking-[0.08em] transition-all duration-150",
                          canSubmit
                            ? "bg-red text-white hover:-translate-y-0.5 hover:bg-red-hover cursor-pointer"
                            : "cursor-not-allowed bg-raised text-muted2"
                        )}
                      >
                        {register.isPending
                          ? "Claiming…"
                          : !handle.trim()
                            ? "Enter a Handle"
                            : availability === "checking"
                              ? "Checking Availability…"
                              : availability === "taken"
                                ? "Handle is Already Taken"
                                : availability === "invalid"
                                  ? "Invalid Handle Format"
                                  : !validTotal
                                    ? `Total Must Be 100% (${total}%)`
                                    : "✓ Claim Handle"}
                      </motion.button>
                    )}
                    {register.isError && (
                      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-red">
                        {register.error.message}
                      </p>
                    )}
                  </motion.div>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Live dynamic preview */}
          <motion.div variants={fieldVariants}>
            <DynamicPreviewCard
              handle={handle}
              availability={availability}
              items={items}
              role={role}
            />
          </motion.div>
        </motion.div>
      </div>

      {/* Asset Picker Modal */}
      <AssetPickerModal
        isOpen={activePickerIndex !== null}
        onClose={() => setActivePickerIndex(null)}
        currentSymbol={activePickerIndex !== null ? items[activePickerIndex]?.symbol : ""}
        initialAssets={availableAssets}
        onSelect={(newAsset) => {
          if (activePickerIndex !== null) {
            updateItemAsset(activePickerIndex, newAsset);
          }
        }}
      />

      {/* Wallet Modal */}
      <WalletModal open={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
    </section>
  );
}
