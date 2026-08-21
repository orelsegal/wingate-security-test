import type { ContentField } from "../../data/types";

interface Props {
  field: ContentField;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  error?: string;
}

/** One answer field. Type and requirement come from the content file only. */
export function AnswerField({ field, value, onChange, readOnly, error }: Props) {
  const id = `f-${field.id}`;
  const describedBy = [field.help ? `${id}-help` : null, error ? `${id}-err` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="field">
      <label className="field__label" htmlFor={field.type === "choice" ? undefined : id}>
        {field.label}
        {field.required && (
          <span className="field__req" aria-hidden="true">
            {" *"}
          </span>
        )}
        {field.required && <span className="sr-only"> (שדה חובה)</span>}
      </label>

      {field.help && (
        <p className="field__help" id={`${id}-help`}>
          {field.help}
        </p>
      )}

      {field.type === "long" && (
        <textarea
          id={id}
          className="textarea"
          value={value}
          placeholder={field.placeholder}
          readOnly={readOnly}
          aria-describedby={describedBy || undefined}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.type === "short" && (
        <input
          id={id}
          type="text"
          className="input"
          value={value}
          placeholder={field.placeholder}
          readOnly={readOnly}
          aria-describedby={describedBy || undefined}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.type === "choice" && (
        <div className="choice-list" role="radiogroup" aria-label={field.label}>
          {(field.options ?? []).map((option) => (
            <label
              key={option}
              className={`choice${value === option ? " choice--selected" : ""}`}
            >
              <input
                type="radio"
                name={id}
                value={option}
                checked={value === option}
                disabled={readOnly}
                onChange={() => onChange(option)}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      )}

      {error && (
        <p className="field__error" id={`${id}-err`}>
          {error}
        </p>
      )}
    </div>
  );
}
