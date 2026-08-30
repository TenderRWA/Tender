/**
 * Site-wide ambient background.
 *
 * This was a looping "glass waves" film. It was pulled: motion behind live
 * figures competed with them for attention, and it cost a 27 MB video on every
 * route that used it. What stays is the still ground the film sat under — a
 * near-white wash with a faint red bloom, so pages are not stark white.
 *
 * Static by design: no video, no image, no timers. Purely painted.
 */
export default function SiteBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-base"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60rem 40rem at 15% -10%, color-mix(in oklab, var(--color-red) 7%, transparent), transparent 70%)," +
            "radial-gradient(50rem 36rem at 90% 5%, color-mix(in oklab, var(--color-ink) 5%, transparent), transparent 72%)",
        }}
      />
    </div>
  );
}
