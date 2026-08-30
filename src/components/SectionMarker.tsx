interface SectionMarkerProps {
  index: string; // e.g. "001"
  label: string; // e.g. "WORK"
}

/** `[ 001 / WORK ]` - red square bullet + grey mono text + full-width hairline. */
export default function SectionMarker({ index, label }: SectionMarkerProps) {
  return (
    <div data-reveal className="flex items-center gap-3 mb-12 md:mb-16">
      <span className="w-1.5 h-1.5 bg-red shrink-0" aria-hidden />
      <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2 whitespace-nowrap">
        [ {index} / {label} ]
      </span>
      <span className="flex-1 h-px bg-hairline origin-left" data-hairline aria-hidden />
    </div>
  );
}
