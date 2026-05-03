"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type AnchorOrButton =
  | ({
      href: string;
      onClick?: never;
    } & React.AnchorHTMLAttributes<HTMLAnchorElement>)
  | ({
      href?: undefined;
      onClick?: React.MouseEventHandler<HTMLButtonElement>;
    } & React.ButtonHTMLAttributes<HTMLButtonElement>);

export type TimelineItem = {
  /** Main small label shown near the dot, for example "baseline". */
  label?: string;
  /** Secondary label shown under the rail, for example "D0". */
  caption?: string;
  /** Is this item emphasized. */
  active?: boolean;
} & AnchorOrButton;

export type TimelineRailProps = {
  /** Items in left-to-right order. */
  items: TimelineItem[];

  /** Size density: dot size plus vertical offsets. */
  size?: "sm" | "md";

  /** Visually emphasize the rail up to the last active item. */
  emphasizeActiveTrail?: boolean;

  /** Angle for the top labels in degrees. Use 0 for straight text. */
  labelAngle?: number;

  /** Layout spacing between dots. Tailwind gap classes are allowed. */
  gapClassName?: string;

  /** Visual customization. */
  lineColorClass?: string;
  lineThickness?: number;
  dotClass?: string;
  dotActiveClass?: string;

  /** Slots for precise control. */
  className?: string;
  railClassName?: string;
  itemClassName?: string;
  labelClassName?: string;
  captionClassName?: string;

  /** Optional renderers to fully control content. */
  renderLabel?: (item: TimelineItem, index: number) => React.ReactNode;
  renderCaption?: (item: TimelineItem, index: number) => React.ReactNode;
};

/** SRP: purely visual timeline rail. No data fetching or state kept here. */
export default function TimelineRail({
  items,
  size = "md",
  emphasizeActiveTrail = true,
  labelAngle = 45,
  gapClassName = "gap-14",
  lineColorClass = "bg-zinc-300 dark:bg-zinc-700",
  lineThickness = 6,
  dotClass = "bg-zinc-400 dark:bg-zinc-600",
  dotActiveClass = "bg-zinc-900 dark:bg-zinc-100",
  className,
  railClassName,
  itemClassName,
  labelClassName,
  captionClassName,
  renderLabel,
  renderCaption,
}: TimelineRailProps) {
  const lastActive = React.useMemo(() => {
    let idx = -1;
    items.forEach((item, index) => {
      if (item.active) idx = index;
    });
    return idx;
  }, [items]);

  const dotSize = size === "sm" ? 14 : 18;
  const topOffset = size === "sm" ? -22 : -26;
  const captionOffset = size === "sm" ? 18 : 22;

  return (
    <section aria-label="timeline" className={cn("relative w-full", className)}>
      <div
        aria-hidden
        className={cn("absolute left-0 right-0", railClassName)}
        style={{
          top: 0,
          height: lineThickness,
          transform: `translateY(${captionOffset * -1}px)`,
        }}
      >
        <div className={cn("h-full rounded-full", lineColorClass)} />

        {emphasizeActiveTrail && lastActive >= 0 && (
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-zinc-900 dark:bg-zinc-100"
            style={{
              width: `${items.length > 1 ? (lastActive / (items.length - 1)) * 100 : 0}%`,
            }}
          />
        )}
      </div>

      <ol
        className={cn("relative flex items-center", gapClassName)}
        style={{ marginTop: captionOffset, paddingTop: Math.max(captionOffset / 4, 4) }}
        role="list"
      >
        {items.map((item, index) => {
          const isActive = !!item.active;
          return (
            <li
              key={index}
              className={cn("relative flex flex-col items-center", itemClassName)}
            >
              {item.label && (
                <span
                  className={cn(
                    "absolute -top-3 -translate-y-full select-none text-[11px] text-zinc-500 dark:text-zinc-400",
                    labelClassName
                  )}
                  style={{
                    transform: `translateY(${topOffset}px) rotate(${-Math.abs(labelAngle)}deg)`,
                    transformOrigin: "bottom center",
                  }}
                  aria-hidden
                >
                  {renderLabel ? renderLabel(item, index) : item.label}
                </span>
              )}

              {item.href ? (
                <a
                  href={item.href}
                  className={cn(
                    "relative rounded-full ring-2 ring-black/5 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
                    isActive ? dotActiveClass : dotClass
                  )}
                  style={{ width: dotSize, height: dotSize }}
                  aria-current={isActive ? "step" : undefined}
                  aria-label={item.label ?? item.caption ?? `Step ${index + 1}`}
                  title={item.label ?? item.caption}
                />
              ) : (
                <button
                  type="button"
                  onClick={item.onClick}
                  className={cn(
                    "relative rounded-full ring-2 ring-black/5 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
                    isActive ? dotActiveClass : dotClass
                  )}
                  style={{ width: dotSize, height: dotSize }}
                  aria-current={isActive ? "step" : undefined}
                  aria-label={item.label ?? item.caption ?? `Step ${index + 1}`}
                  title={item.label ?? item.caption}
                />
              )}

              {item.caption && (
                <span
                  className={cn(
                    "absolute select-none text-xs text-zinc-600 dark:text-zinc-300",
                    captionClassName
                  )}
                  style={{ transform: `translateY(${captionOffset}px)` }}
                  aria-hidden
                >
                  {renderCaption ? renderCaption(item, index) : item.caption}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
