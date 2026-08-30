import { motion } from "framer-motion";
import { useComingSoon } from "@/components/ComingSoonModal";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** P3. Chat row - two cards sliding in from opposite sides; both open the coming-soon modal. */
export default function ChatRow() {
  const comingSoon = useComingSoon();

  return (
    <section className="border-t border-hairline">
      <div className="mx-auto max-w-container px-5 py-24 md:px-10 md:py-32">
        <div className="grid gap-6 md:grid-cols-2">
          <motion.div
            initial={{ x: -40, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true, margin: "-15% 0px" }}
            transition={{ duration: 0.8, ease: EASE }}
            className="flex flex-col justify-between gap-10 rounded border border-hairline bg-card2 p-8 transition-colors duration-200 hover:border-red md:p-12"
          >
            <h3 className="font-display text-[28px] font-medium leading-[1.1] tracking-[-0.02em] text-ink md:text-4xl">
              You still have questions?
            </h3>
            <button
              onClick={comingSoon.open}
              className="inline-flex w-fit items-center gap-2 rounded bg-red px-8 py-4 font-body text-sm font-semibold uppercase tracking-[0.08em] text-white transition-all duration-150 hover:-translate-y-0.5 hover:bg-red-hover"
            >
              Let's have a chat →
            </button>
          </motion.div>

          <motion.div
            initial={{ x: 40, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true, margin: "-15% 0px" }}
            transition={{ duration: 0.8, ease: EASE }}
            className="flex flex-col justify-between gap-10 rounded border border-hairline bg-card2 p-8 transition-colors duration-200 hover:border-red md:p-12"
          >
            <h3 className="font-display text-[28px] font-medium leading-[1.1] tracking-[-0.02em] text-ink md:text-4xl">
              Follow the build
            </h3>
<a
              href="https://x.com/TenderRWA"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-2 rounded border border-hairline px-8 py-4 font-body text-sm font-semibold uppercase tracking-[0.08em] text-secondary2 transition-colors duration-150 hover:border-red hover:text-ink"
            >
              @tender on X →
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
