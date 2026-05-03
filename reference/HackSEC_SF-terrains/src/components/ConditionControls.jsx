import { CONDITION_FIELDS, CONDITION_SECTIONS } from "../data/conditions";

const FIELD_MAP = Object.fromEntries(CONDITION_FIELDS.map((f) => [f.id, f]));

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

export function ConditionControls({ input, setField }) {
  return (
    <>
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
