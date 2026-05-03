import { useMemo } from "react";
import TimelineRail from "@/components/ui/timeline-rail";

function metricValue(metrics, id) {
  return metrics.find((metric) => metric.id === id)?.value ?? 100;
}

function buildTimelineItems(output) {
  const readiness = metricValue(output.metrics, "readiness");
  const mobility = metricValue(output.metrics, "mobility");
  const sensors = metricValue(output.metrics, "sensors");
  const comms = metricValue(output.metrics, "comms");
  const gps = metricValue(output.metrics, "gps");
  const riskCount = output.cards.filter((card) => card.severity !== "green").length;

  return [
    { label: "Baseline", caption: "D0", active: true },
    { label: "Sensors", caption: "D21", active: sensors < 72 },
    { label: "Mobility", caption: "D45", active: mobility < 72 },
    { label: "Comms/GPS", caption: "D60", active: comms < 72 || gps < 72 },
    { label: riskCount ? "Review" : "Ready", caption: "D90", active: readiness >= 70 && riskCount === 0 },
  ];
}

export function MissionTimeline({ output }) {
  const items = useMemo(() => buildTimelineItems(output), [output]);

  return (
    <aside className="mission-timeline" aria-label="90-day mission timeline">
      <div className="mission-timeline__head">
        <span>90-day rail</span>
      </div>
      <TimelineRail
        items={items}
        size="sm"
        labelAngle={0}
        gapClassName="justify-between"
        lineColorClass="mission-rail__track"
        dotClass="mission-rail__dot"
        dotActiveClass="mission-rail__dot mission-rail__dot--active"
        className="mission-rail"
        railClassName="mission-rail__line"
        itemClassName="mission-rail__item"
        labelClassName="mission-rail__label"
        captionClassName="mission-rail__caption"
      />
    </aside>
  );
}
