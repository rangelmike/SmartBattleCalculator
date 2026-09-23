import { Children, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

const panelLabels = ["My Team", "Field", "Opponent Team"] as const;

export function CalculatorPanelCarousel({ children }: { children: ReactNode }) {
  const panels = Children.toArray(children);
  const trackRef = useRef<HTMLDivElement>(null);
  const [activePanel, setActivePanel] = useState(0);
  const [panelHeight, setPanelHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const panel = trackRef.current?.children[activePanel] as HTMLElement | undefined;
    if (!panel) return;
    const measure = () => setPanelHeight(Math.ceil(panel.getBoundingClientRect().height));
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [activePanel]);

  function showPanel(index: number) {
    setActivePanel(index);
    trackRef.current?.scrollTo({ left: index * trackRef.current.clientWidth, behavior: "smooth" });
  }

  function updateActivePanel() {
    const track = trackRef.current;
    if (!track || !track.clientWidth) return;
    setActivePanel(Math.max(0, Math.min(2, Math.round(track.scrollLeft / track.clientWidth))));
  }

  return <>
    <nav className="grid grid-cols-3 border-b border-border pt-4 xl:hidden" aria-label="Calculator panels">
      {panelLabels.map((label, index) => (
        <button key={label} className={`min-w-0 border-b-2 px-1 py-2.5 text-xs font-semibold sm:text-sm ${activePanel === index ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`} type="button" aria-current={activePanel === index ? "page" : undefined} onClick={() => showPanel(index)}>{label}</button>
      ))}
    </nav>
    <div
      ref={trackRef}
      className="flex min-w-0 items-start snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden h-[var(--mobile-panel-height,auto)] xl:grid xl:h-auto xl:items-stretch xl:overflow-visible xl:snap-none xl:grid-cols-[minmax(0,1fr)_minmax(280px,350px)_minmax(0,1fr)] xl:gap-6"
      style={panelHeight ? { "--mobile-panel-height": `${panelHeight + 48}px` } as CSSProperties : undefined}
      role="region"
      aria-label="Calculator lower panels"
      onScroll={updateActivePanel}
    >
      {panels.map((panel, index) => <div key={panelLabels[index]} className="w-full min-w-0 shrink-0 snap-start xl:w-auto xl:shrink">{panel}</div>)}
    </div>
  </>;
}
