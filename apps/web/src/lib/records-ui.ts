import type { RecordKind } from "@pintopets/api-contract";
import { formatDate, formatDateTime, formatPounds, formatWeight } from "./format";

/**
 * How each record kind looks in the UI: form fields and list summaries.
 * en-GB dictionary; another language adds a dictionary with the same shape.
 */
export type FieldType =
  "text" | "textarea" | "date" | "datetime" | "select" | "weight" | "money" | "checkbox";

export interface FieldUi {
  /** Form field name. */
  name: string;
  /** API property the value maps to (errors are reported against it). */
  apiName: string;
  label: string;
  type: FieldType;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** Pre-fill new entries with today / now. */
  defaultNow?: boolean;
}

export interface RecordSummary {
  title: string;
  meta: string[];
  /** Highlighted due date (reminders). */
  dueOn?: string | null;
  badge?: { label: string; tone: "default" | "warning" | "urgent" | "expert" | "secondary" };
}

export interface KindUi {
  title: string;
  singular: string;
  description?: string;
  empty: string;
  fields: FieldUi[];
  summary: (row: Record<string, unknown>) => RecordSummary;
}

const notes: FieldUi = { name: "notes", apiName: "notes", label: "Notes", type: "textarea" };
const formatDateTimeOrNull = (v: string | null) => (v ? formatDateTime(v) : null);
const str = (v: unknown) => (typeof v === "string" && v ? v : null);
const num = (v: unknown) => (typeof v === "number" ? v : null);
const compact = (xs: (string | null | false | undefined)[]) =>
  xs.filter((x): x is string => Boolean(x));

const SEVERITY = [
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "severe", label: "Severe" },
];
const severityBadge = (v: unknown): RecordSummary["badge"] =>
  v === "severe"
    ? { label: "Severe", tone: "urgent" }
    : v === "moderate"
      ? { label: "Moderate", tone: "warning" }
      : { label: "Mild", tone: "secondary" };

export const PARASITE_KINDS = [
  { value: "flea", label: "Flea" },
  { value: "worm", label: "Worm" },
  { value: "tick", label: "Tick" },
  { value: "flea_and_tick", label: "Flea and tick" },
  { value: "lungworm", label: "Lungworm" },
  { value: "mite", label: "Mites" },
  { value: "other", label: "Other" },
];
const label = (opts: { value: string; label: string }[], v: unknown) =>
  opts.find((o) => o.value === v)?.label ?? String(v ?? "");

const HORSE_CARE = [
  { value: "farrier", label: "Farrier" },
  { value: "dental", label: "Dental check" },
  { value: "worm_egg_count", label: "Worm egg count" },
];
const DIET_KINDS = [
  { value: "food", label: "Food" },
  { value: "treat", label: "Treat" },
  { value: "supplement", label: "Supplement" },
];
const CONDITION_STATUS = [
  { value: "active", label: "Active" },
  { value: "managed", label: "Managed" },
  { value: "resolved", label: "Resolved" },
];

export const RECORD_UI: Record<RecordKind, KindUi> = {
  weights: {
    title: "Weight",
    singular: "weight",
    empty: "No weights yet. Regular weigh-ins help you and your vet spot changes early.",
    fields: [
      {
        name: "measuredOn",
        apiName: "measuredOn",
        label: "Date",
        type: "date",
        required: true,
        defaultNow: true,
      },
      { name: "weight", apiName: "weightGrams", label: "Weight", type: "weight", required: true },
      notes,
    ],
    summary: (r) => ({
      title: formatWeight(num(r.weightGrams) ?? 0),
      meta: compact([formatDate(str(r.measuredOn)), str(r.notes)]),
    }),
  },
  vaccinations: {
    title: "Vaccinations",
    singular: "vaccination",
    empty: "No vaccinations recorded.",
    fields: [
      {
        name: "vaccine",
        apiName: "vaccine",
        label: "Vaccine",
        type: "text",
        required: true,
        placeholder: "e.g. Leptospirosis booster",
      },
      {
        name: "givenOn",
        apiName: "givenOn",
        label: "Date given",
        type: "date",
        required: true,
        defaultNow: true,
      },
      {
        name: "nextDueOn",
        apiName: "nextDueOn",
        label: "Next due",
        type: "date",
        hint: "We'll remind you before it's due.",
      },
      { name: "batchNumber", apiName: "batchNumber", label: "Batch number", type: "text" },
      { name: "vet", apiName: "vet", label: "Vet or practice", type: "text" },
      notes,
    ],
    summary: (r) => ({
      title: str(r.vaccine) ?? "",
      meta: compact([
        `Given ${formatDate(str(r.givenOn))}`,
        str(r.vet),
        str(r.batchNumber) && `Batch ${str(r.batchNumber)}`,
      ]),
      dueOn: str(r.nextDueOn),
    }),
  },
  "parasite-treatments": {
    title: "Flea, worm and tick",
    singular: "treatment",
    empty: "No flea, worm or tick treatments recorded.",
    fields: [
      {
        name: "kind",
        apiName: "kind",
        label: "Type",
        type: "select",
        required: true,
        options: PARASITE_KINDS,
      },
      { name: "product", apiName: "product", label: "Product", type: "text", required: true },
      {
        name: "givenOn",
        apiName: "givenOn",
        label: "Date given",
        type: "date",
        required: true,
        defaultNow: true,
      },
      {
        name: "nextDueOn",
        apiName: "nextDueOn",
        label: "Next due",
        type: "date",
        hint: "We'll remind you before it's due.",
      },
      notes,
    ],
    summary: (r) => ({
      title: `${label(PARASITE_KINDS, r.kind)}: ${str(r.product) ?? ""}`,
      meta: compact([`Given ${formatDate(str(r.givenOn))}`]),
      dueOn: str(r.nextDueOn),
    }),
  },
  medications: {
    title: "Medicines",
    singular: "medicine",
    description: "Record exactly what your vet prescribed. PintoPets never suggests doses.",
    empty: "No medicines recorded.",
    fields: [
      { name: "name", apiName: "name", label: "Medicine", type: "text", required: true },
      {
        name: "doseAsPrescribed",
        apiName: "doseAsPrescribed",
        label: "Dose (as written by your vet)",
        type: "text",
        required: true,
        hint: "Copy it from the label or prescription. Never change a dose without asking your vet.",
      },
      {
        name: "frequency",
        apiName: "frequency",
        label: "How often",
        type: "text",
        required: true,
        placeholder: "e.g. Twice a day with food",
      },
      {
        name: "startOn",
        apiName: "startOn",
        label: "Start date",
        type: "date",
        required: true,
        defaultNow: true,
      },
      {
        name: "endOn",
        apiName: "endOn",
        label: "End date",
        type: "date",
        hint: "Leave blank if it's ongoing.",
      },
      { name: "prescribedBy", apiName: "prescribedBy", label: "Prescribed by", type: "text" },
      {
        name: "remindersEnabled",
        apiName: "remindersEnabled",
        label: "Remind me when the course ends",
        type: "checkbox",
      },
      notes,
    ],
    summary: (r) => ({
      title: str(r.name) ?? "",
      meta: compact([
        str(r.doseAsPrescribed),
        str(r.frequency),
        `From ${formatDate(str(r.startOn))}`,
      ]),
      badge: str(r.endOn) ? undefined : { label: "Ongoing", tone: "default" },
      dueOn: r.remindersEnabled ? str(r.endOn) : null,
    }),
  },
  "vet-visits": {
    title: "Vet visits",
    singular: "vet visit",
    empty: "No vet visits recorded.",
    fields: [
      {
        name: "visitOn",
        apiName: "visitOn",
        label: "Date",
        type: "date",
        required: true,
        defaultNow: true,
      },
      {
        name: "reason",
        apiName: "reason",
        label: "Reason for visit",
        type: "text",
        required: true,
      },
      { name: "practice", apiName: "practice", label: "Practice", type: "text" },
      { name: "vetName", apiName: "vetName", label: "Vet", type: "text" },
      { name: "outcome", apiName: "outcome", label: "What the vet said", type: "textarea" },
      { name: "cost", apiName: "costPence", label: "Cost (£)", type: "money" },
      {
        name: "followUpOn",
        apiName: "followUpOn",
        label: "Follow-up date",
        type: "date",
        hint: "We'll remind you.",
      },
      notes,
    ],
    summary: (r) => ({
      title: str(r.reason) ?? "",
      meta: compact([
        formatDate(str(r.visitOn)),
        str(r.practice),
        str(r.vetName),
        formatPounds(num(r.costPence)),
      ]),
      dueOn: str(r.followUpOn),
    }),
  },
  conditions: {
    title: "Conditions",
    singular: "condition",
    empty: "No ongoing conditions.",
    fields: [
      { name: "name", apiName: "name", label: "Condition", type: "text", required: true },
      {
        name: "status",
        apiName: "status",
        label: "Status",
        type: "select",
        options: CONDITION_STATUS,
      },
      { name: "diagnosedOn", apiName: "diagnosedOn", label: "Diagnosed", type: "date" },
      notes,
    ],
    summary: (r) => ({
      title: str(r.name) ?? "",
      meta: compact([str(r.diagnosedOn) && `Diagnosed ${formatDate(str(r.diagnosedOn))}`]),
      badge: {
        label: label(CONDITION_STATUS, r.status),
        tone: r.status === "active" ? "warning" : r.status === "resolved" ? "secondary" : "default",
      },
    }),
  },
  allergies: {
    title: "Allergies and intolerances",
    singular: "allergy",
    empty: "No known allergies.",
    fields: [
      { name: "allergen", apiName: "allergen", label: "Allergic to", type: "text", required: true },
      { name: "reaction", apiName: "reaction", label: "Reaction", type: "text" },
      {
        name: "severity",
        apiName: "severity",
        label: "Severity",
        type: "select",
        options: SEVERITY,
      },
      notes,
    ],
    summary: (r) => ({
      title: str(r.allergen) ?? "",
      meta: compact([str(r.reaction)]),
      badge: severityBadge(r.severity),
    }),
  },
  symptoms: {
    title: "Symptom diary",
    singular: "symptom",
    description: "Quick notes of anything unusual, so you can show your vet.",
    empty: "Nothing logged. Use this to note anything unusual, with the date and time.",
    fields: [
      {
        name: "symptom",
        apiName: "symptom",
        label: "What happened",
        type: "text",
        required: true,
        placeholder: "e.g. Sick straight after eating",
      },
      {
        name: "occurredAt",
        apiName: "occurredAt",
        label: "When",
        type: "datetime",
        required: true,
        defaultNow: true,
      },
      {
        name: "severity",
        apiName: "severity",
        label: "How bad",
        type: "select",
        options: SEVERITY,
      },
      notes,
    ],
    summary: (r) => ({
      title: str(r.symptom) ?? "",
      meta: compact([formatDateTimeOrNull(str(r.occurredAt)), str(r.notes)]),
      badge: severityBadge(r.severity),
    }),
  },
  "horse-care": {
    title: "Farrier, dental and worm egg counts",
    singular: "care entry",
    empty: "No farrier visits, dental checks or worm egg counts recorded.",
    fields: [
      {
        name: "kind",
        apiName: "kind",
        label: "Type",
        type: "select",
        required: true,
        options: HORSE_CARE,
      },
      {
        name: "doneOn",
        apiName: "doneOn",
        label: "Date",
        type: "date",
        required: true,
        defaultNow: true,
      },
      { name: "provider", apiName: "provider", label: "Farrier, dentist or lab", type: "text" },
      {
        name: "result",
        apiName: "result",
        label: "Result",
        type: "text",
        placeholder: "e.g. 200 epg",
      },
      {
        name: "nextDueOn",
        apiName: "nextDueOn",
        label: "Next due",
        type: "date",
        hint: "We'll remind you.",
      },
      notes,
    ],
    summary: (r) => ({
      title: label(HORSE_CARE, r.kind),
      meta: compact([formatDate(str(r.doneOn)), str(r.provider), str(r.result)]),
      dueOn: str(r.nextDueOn),
    }),
  },
  "diet-items": {
    title: "Food, treats and supplements",
    singular: "diet item",
    empty: "No food recorded yet.",
    fields: [
      {
        name: "kind",
        apiName: "kind",
        label: "Type",
        type: "select",
        required: true,
        options: DIET_KINDS,
      },
      { name: "product", apiName: "product", label: "Product", type: "text", required: true },
      { name: "brand", apiName: "brand", label: "Brand", type: "text" },
      {
        name: "amount",
        apiName: "amount",
        label: "Amount",
        type: "text",
        placeholder: "e.g. 150 g",
      },
      {
        name: "frequency",
        apiName: "frequency",
        label: "How often",
        type: "text",
        placeholder: "e.g. Twice a day",
      },
      { name: "startedOn", apiName: "startedOn", label: "Started", type: "date" },
      {
        name: "endedOn",
        apiName: "endedOn",
        label: "Stopped",
        type: "date",
        hint: "Leave blank if they still have it.",
      },
      notes,
    ],
    summary: (r) => ({
      title: compact([str(r.brand), str(r.product)]).join(" "),
      meta: compact([
        str(r.amount),
        str(r.frequency),
        str(r.endedOn) && `Stopped ${formatDate(str(r.endedOn))}`,
      ]),
      badge: { label: label(DIET_KINDS, r.kind), tone: str(r.endedOn) ? "secondary" : "default" },
    }),
  },
  "diet-changes": {
    title: "Diet changes",
    singular: "diet change",
    empty: "No diet changes logged.",
    fields: [
      {
        name: "changedOn",
        apiName: "changedOn",
        label: "Date",
        type: "date",
        required: true,
        defaultNow: true,
      },
      {
        name: "description",
        apiName: "description",
        label: "What changed",
        type: "text",
        required: true,
        placeholder: "e.g. Switched to grain-free adult food",
      },
      {
        name: "reaction",
        apiName: "reaction",
        label: "How they took it",
        type: "text",
        placeholder: "e.g. Upset tummy for 2 days",
      },
      notes,
    ],
    summary: (r) => ({
      title: str(r.description) ?? "",
      meta: compact([formatDate(str(r.changedOn)), str(r.reaction)]),
    }),
  },
  "water-notes": {
    title: "Water intake",
    singular: "water note",
    description: "Drinking more or less than usual can matter for kidney and urinary problems.",
    empty: "No water notes.",
    fields: [
      {
        name: "notedOn",
        apiName: "notedOn",
        label: "Date",
        type: "date",
        required: true,
        defaultNow: true,
      },
      {
        name: "observation",
        apiName: "observation",
        label: "What you noticed",
        type: "text",
        required: true,
        placeholder: "e.g. Drinking much more than usual",
      },
      notes,
    ],
    summary: (r) => ({
      title: str(r.observation) ?? "",
      meta: compact([formatDate(str(r.notedOn))]),
    }),
  },
};
