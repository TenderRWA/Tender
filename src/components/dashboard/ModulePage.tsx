import { Children, type ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import SectionMarker from "@/components/SectionMarker";

interface ModulePageProps {
  index: string;
  label: string;
  title: string;
  blurb?: string;
  children: ReactNode;
}

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

/**
 * Module page wrapper: SectionMarker + display heading + mount fade/slide,
 * with a slight stagger across the cards inside each module.
 */
export default function ModulePage({ index, label, title, blurb, children }: ModulePageProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="min-w-0"
    >
      <div className="[&>div]:mb-8">
        <SectionMarker index={index} label={label} />
      </div>
      <h1 className="font-display font-semibold text-3xl md:text-5xl leading-[1.05] tracking-[-0.03em] text-foreground">
        {title}
      </h1>
      {blurb && (
        <p className="mt-4 font-body text-[15px] md:text-[17px] leading-[1.65] text-secondary2 max-w-2xl">
          {blurb}
        </p>
      )}
      <motion.div
        initial={reduce ? false : "hidden"}
        animate="show"
        variants={containerVariants}
        className="mt-8 md:mt-10 flex flex-col gap-6"
      >
        {Children.map(children, (child) =>
          child == null || child === false ? null : (
            <motion.div variants={itemVariants} className="min-w-0">
              {child}
            </motion.div>
          )
        )}
      </motion.div>
    </motion.div>
  );
}
