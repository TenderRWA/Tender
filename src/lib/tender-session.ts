import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Which handle the terminal is acting as. The owner wallet is not stored here —
 * it comes from the connected Wallet Standard account (see lib/wallet).
 */
interface TenderSession {
  handle: string;
  setHandle: (handle: string) => void;
  clear: () => void;
}

const normalizeHandle = (raw: string) => raw.trim().replace(/^@/, "").toLowerCase();

export const useTenderSession = create<TenderSession>()(
  persist(
    (set) => ({
      handle: "",
      setHandle: (handle) => set({ handle: normalizeHandle(handle) }),
      clear: () => set({ handle: "" }),
    }),
    { name: "tender-session" },
  ),
);
