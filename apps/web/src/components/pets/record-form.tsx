"use client";

import type { RecordKind } from "@pintopets/api-contract";
import { Alert, AlertDescription } from "@pintopets/ui/components/alert";
import { Button } from "@pintopets/ui/components/button";
import { describedBy, Field } from "@pintopets/ui/components/field";
import { Input } from "@pintopets/ui/components/input";
import { NativeSelect } from "@pintopets/ui/components/native-select";
import { Textarea } from "@pintopets/ui/components/textarea";
import { useId, useState, useTransition } from "react";
import { saveRecordAction } from "@/app/pets/actions";
import { parsePounds, toGrams } from "@/lib/format";
import { type FieldUi, RECORD_UI } from "@/lib/records-ui";

type Row = Record<string, unknown>;

function todayLocal(): string {
  return new Date().toLocaleDateString("en-CA");
}
function nowLocal(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function initialValue(field: FieldUi, row: Row | null, weightUnit: "kg" | "g"): string {
  const v = row?.[field.apiName];
  switch (field.type) {
    case "weight":
      return typeof v === "number" ? String(weightUnit === "kg" ? v / 1000 : v) : "";
    case "money":
      return typeof v === "number" ? (v / 100).toFixed(2) : "";
    case "datetime":
      return typeof v === "string" ? isoToLocalInput(v) : field.defaultNow ? nowLocal() : "";
    case "date":
      return typeof v === "string" ? v : field.defaultNow ? todayLocal() : "";
    case "checkbox":
      return v === false ? "" : "on";
    case "select":
      return typeof v === "string" ? v : (field.options?.[0]?.value ?? "");
    default:
      return typeof v === "string" ? v : "";
  }
}

/** Turns the form into the API payload (units, money, local time → ISO). */
function toPayload(
  fields: FieldUi[],
  fd: FormData,
  weightUnit: "kg" | "g",
): { payload: Row; errors: Record<string, string> } {
  const payload: Row = {};
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const raw = fd.get(f.name);
    const value = typeof raw === "string" ? raw.trim() : "";
    switch (f.type) {
      case "weight": {
        const unit = fd.get(`${f.name}Unit`) === "g" ? "g" : weightUnit;
        const grams = toGrams(value, unit);
        if (grams === null) errors[f.apiName] = "Please enter a weight above zero";
        else payload[f.apiName] = grams;
        break;
      }
      case "money": {
        if (!value) payload[f.apiName] = null;
        else {
          const pence = parsePounds(value);
          if (pence === null) errors[f.apiName] = "Please enter an amount like 45.50";
          else payload[f.apiName] = pence;
        }
        break;
      }
      case "datetime":
        payload[f.apiName] = value ? new Date(value).toISOString() : "";
        break;
      case "checkbox":
        payload[f.apiName] = raw === "on";
        break;
      default:
        payload[f.apiName] = value;
    }
  }
  return { payload, errors };
}

export function RecordForm({
  petId,
  kind,
  record,
  weightUnit = "kg",
  onDone,
}: {
  petId: string;
  kind: RecordKind;
  record: Row | null;
  weightUnit?: "kg" | "g";
  onDone: () => void;
}) {
  const ui = RECORD_UI[kind];
  const formId = useId();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(fd: FormData) {
    const { payload, errors: clientErrors } = toPayload(ui.fields, fd, weightUnit);
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      setMessage("Please check the highlighted fields.");
      return;
    }
    startTransition(async () => {
      const result = await saveRecordAction(petId, kind, record?.id ?? null, payload);
      if (result.ok) onDone();
      else {
        setErrors(result.fieldErrors);
        setMessage(result.message);
      }
    });
  }

  return (
    <form
      onSubmit={(e) => (e.preventDefault(), submit(new FormData(e.currentTarget)))}
      className="flex flex-col gap-4"
      noValidate
    >
      {message ? (
        <Alert variant="warning" role="alert">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      {ui.fields.map((f) => {
        const id = `${formId}-${f.name}`;
        const error = errors[f.apiName];
        const common = {
          id,
          name: f.name,
          "aria-invalid": error ? true : undefined,
          "aria-describedby": describedBy(id, f.hint, error),
          defaultValue: initialValue(f, record, weightUnit),
        };
        if (f.type === "checkbox") {
          return (
            <div key={f.name} className="flex items-center gap-3">
              <input
                id={id}
                name={f.name}
                type="checkbox"
                defaultChecked={initialValue(f, record, weightUnit) === "on"}
                className="accent-primary size-5"
              />
              <label htmlFor={id} className="text-sm font-semibold">
                {f.label}
              </label>
            </div>
          );
        }
        return (
          <Field
            key={f.name}
            id={id}
            label={f.label}
            hint={f.hint}
            error={error}
            required={f.required}
          >
            {f.type === "textarea" ? (
              <Textarea {...common} rows={3} />
            ) : f.type === "select" ? (
              <NativeSelect {...common}>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect>
            ) : f.type === "weight" ? (
              <div className="flex gap-2">
                <Input
                  {...common}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  className="flex-1"
                />
                <NativeSelect
                  name={`${f.name}Unit`}
                  defaultValue={weightUnit}
                  aria-label="Unit"
                  className="w-24"
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                </NativeSelect>
              </div>
            ) : (
              <Input
                {...common}
                type={
                  f.type === "date" ? "date" : f.type === "datetime" ? "datetime-local" : "text"
                }
                inputMode={f.type === "money" ? "decimal" : undefined}
                placeholder={f.placeholder}
                required={f.required}
              />
            )}
          </Field>
        );
      })}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : record ? "Save changes" : `Add ${ui.singular}`}
        </Button>
      </div>
    </form>
  );
}
