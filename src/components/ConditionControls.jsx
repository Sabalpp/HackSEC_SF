import { CONDITION_FIELDS, CONDITION_SECTIONS } from "../data/conditions";

const FIELD_MAP = Object.fromEntries(CONDITION_FIELDS.map((f) => [f.id, f]));

const LIVE_LABEL = {
  idle: "Live",
  pulling: "Pulling…",
  assessing: "Assessing…",
  done: "Live",
};

function RangeField({ field, value, onChange }) {
  return (
    <div className="field">
      <div className="field__row">
        <span className="field__label">{field.label}</span>
        <span className="field__value">
          {value}{field.unit ? ` ${field.unit}` : ""}
        </span>
      </div>
      <input
        type="range"
        min={field.min}
        max={field.max}
        step={field.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function ChoiceField({ field, value, onChange }) {
  return (
    <div className="field">
      <div className="field__row">
        <span className="field__label">{field.label}</span>
      </div>
      <div className="choice-group">
        {field.options.map((opt) => (
          <button
            key={opt}
            className="choice-button"
            data-active={opt === value}
            onClick={() => onChange(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function ModeButtons({ briefing, onDefault }) {
  const stage = briefing?.stage ?? "idle";
  const error = briefing?.error;
  const snapshot = briefing?.snapshot;
  const busy = stage === "pulling" || stage === "assessing";
  const live = stage === "done" && snapshot;

  return (
    <div className="section">
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          type="button"
          className="run-sim-button"
          onClick={onDefault}
          data-active={!live}
          style={{ flex: 1 }}
          disabled={busy}
        >
          Default
        </button>
        <button
          type="button"
          className="run-sim-button"
          onClick={briefing?.run}
          data-active={!!live}
          style={{ flex: 1 }}
          disabled={busy || !briefing}
        >
          {LIVE_LABEL[stage] ?? "Live"}
        </button>
      </div>
      {error && (
        <div className="field__row" style={{ color: "#ff8080" }}>
          {error}
        </div>
      )}
      {snapshot && !error && (
        <div className="field__row" style={{ opacity: 0.7, fontSize: "0.8em" }}>
          {snapshot.weather.tempC.toFixed(1)}°C ·{" "}
          {snapshot.weather.relativeHumidity}% RH
          {snapshot.cams ? ` · dust ${snapshot.cams.dustLoad}` : " · no dust data"}
        </div>
      )}
    </div>
  );
}

export function ConditionControls({ input, setField, briefing, onDefault }) {
  return (
    <>
      <ModeButtons briefing={briefing} onDefault={onDefault} />
      {CONDITION_SECTIONS.map((section) => (
        <div className="section" key={section.id}>
          <div>
            <div className="section__title">{section.title}</div>
            <div className="section__desc">{section.description}</div>
          </div>
          {section.fields.map((id) => {
            const field = FIELD_MAP[id];
            if (!field) return null;
            const value = input[id];
            if (field.kind === "range") {
              return (
                <RangeField
                  key={id}
                  field={field}
                  value={value}
                  onChange={(v) => setField(id, v)}
                />
              );
            }
            return (
              <ChoiceField
                key={id}
                field={field}
                value={value}
                onChange={(v) => setField(id, v)}
              />
            );
          })}
        </div>
      ))}
    </>
  );
}
