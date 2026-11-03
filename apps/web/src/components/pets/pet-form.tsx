"use client";

import type { Pet } from "@pintopets/api-contract";
import { Alert, AlertDescription } from "@pintopets/ui/components/alert";
import { Button } from "@pintopets/ui/components/button";
import { describedBy, Field } from "@pintopets/ui/components/field";
import { Input } from "@pintopets/ui/components/input";
import { NativeSelect } from "@pintopets/ui/components/native-select";
import { Textarea } from "@pintopets/ui/components/textarea";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import { createPetAction, saveRecordAction, updatePetAction } from "@/app/pets/actions";
import { formatHands, parseHands, toGrams } from "@/lib/format";

export interface SpeciesOption {
  slug: string;
  name: string;
  tracksHeightInHands: boolean;
  requiresFreeText: boolean;
  smallAnimal: boolean;
  breeds: { slug: string; name: string }[];
}

/** Estimated date of birth from an age in years and months. */
function estimatedDob(years: number, months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - (years * 12 + months));
  return d.toLocaleDateString("en-CA");
}

export function PetForm({ species, pet }: { species: SpeciesOption[]; pet?: Pet }) {
  const router = useRouter();
  const id = useId();
  const [speciesSlug, setSpeciesSlug] = useState(pet?.species.slug ?? "");
  const [dobMode, setDobMode] = useState<"date" | "age">(
    pet?.dateOfBirthIsEstimate ? "age" : "date",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const current = useMemo(
    () => species.find((s) => s.slug === speciesSlug),
    [species, speciesSlug],
  );
  const editing = Boolean(pet);

  const fid = (n: string) => `${id}-${n}`;
  const err = (n: string) => errors[n];
  const aria = (n: string, hint?: string) => ({
    id: fid(n),
    name: n,
    "aria-invalid": err(n) ? true : undefined,
    "aria-describedby": describedBy(fid(n), hint, err(n)),
  });

  function submit(fd: FormData) {
    const s = (k: string) => {
      const v = fd.get(k);
      return typeof v === "string" ? v.trim() : "";
    };
    const clientErrors: Record<string, string> = {};
    let dateOfBirth = "";
    let dateOfBirthIsEstimate = false;
    if (dobMode === "date") dateOfBirth = s("dateOfBirth");
    else {
      const y = Number(s("ageYears") || 0);
      const m = Number(s("ageMonths") || 0);
      if (y || m) {
        dateOfBirth = estimatedDob(y, m);
        dateOfBirthIsEstimate = true;
      }
    }
    let heightInches: number | null = null;
    if (current?.tracksHeightInHands && s("height")) {
      heightInches = parseHands(s("height"));
      if (heightInches === null) clientErrors.heightInches = "Use hands, e.g. 15.2";
    }
    const unit = current?.smallAnimal ? "g" : "kg";
    const initialWeight = !editing && s("weight") ? toGrams(s("weight"), unit) : null;
    if (!editing && s("weight") && initialWeight === null)
      clientErrors.weight = "Please enter a weight above zero";
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      setMessage("Please check the highlighted fields.");
      return;
    }

    const payload = {
      name: s("name"),
      speciesSlug: s("speciesSlug"),
      speciesOther: s("speciesOther"),
      breedSlugs: [s("breed"), s("breed2")].filter(Boolean),
      sex: s("sex") || "unknown",
      neutered: s("neutered") || "unknown",
      dateOfBirth,
      dateOfBirthIsEstimate,
      colourMarkings: s("colourMarkings"),
      heightInches,
      passportNumber: s("passportNumber"),
      insuranceProvider: s("insuranceProvider"),
      insurancePolicyRef: s("insurancePolicyRef"),
      vetPracticeName: s("vetPracticeName"),
      vetPracticePhone: s("vetPracticePhone"),
      emergencyContactName: s("emergencyContactName"),
      emergencyContactPhone: s("emergencyContactPhone"),
      notes: s("notes"),
    };

    startTransition(async () => {
      if (pet) {
        const r = await updatePetAction(pet.id, payload);
        if (!r.ok) return (setErrors(r.fieldErrors), setMessage(r.message));
        router.push(`/pets/${pet.id}` as Route);
        return;
      }
      const r = await createPetAction(payload);
      if (!r.ok) return (setErrors(r.fieldErrors), setMessage(r.message));
      if (initialWeight) {
        await saveRecordAction(r.data.id, "weights", null, {
          measuredOn: new Date().toLocaleDateString("en-CA"),
          weightGrams: initialWeight,
        });
      }
      router.push(`/pets/${r.data.id}` as Route);
    });
  }

  const [ageDefault] = useState(() => {
    if (!pet?.dateOfBirth) return { y: "", m: "" };
    const months = Math.max(
      0,
      Math.round((Date.now() - Date.parse(`${pet.dateOfBirth}T00:00:00Z`)) / (30.44 * 86_400_000)),
    );
    return { y: String(Math.floor(months / 12)), m: String(months % 12) };
  });

  return (
    <form
      onSubmit={(e) => (e.preventDefault(), submit(new FormData(e.currentTarget)))}
      className="flex flex-col gap-5"
      noValidate
    >
      {message ? (
        <Alert variant="warning" role="alert">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <Field id={fid("name")} label="Name" required error={err("name")}>
        <Input
          {...aria("name")}
          defaultValue={pet?.name}
          autoComplete="off"
          required
          maxLength={60}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={fid("speciesSlug")} label="Species" required error={err("speciesSlug")}>
          <NativeSelect
            {...aria("speciesSlug")}
            value={speciesSlug}
            onChange={(e) => setSpeciesSlug(e.target.value)}
            required
          >
            <option value="" disabled>
              Choose…
            </option>
            {species.map((sp) => (
              <option key={sp.slug} value={sp.slug}>
                {sp.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        {current?.requiresFreeText ? (
          <Field
            id={fid("speciesOther")}
            label="What kind of animal?"
            required
            error={err("speciesOther")}
          >
            <Input {...aria("speciesOther")} defaultValue={pet?.speciesOther ?? ""} />
          </Field>
        ) : null}
      </div>

      {current && current.breeds.length > 1 ? (
        <div className="grid gap-5 sm:grid-cols-2" key={current.slug}>
          <Field id={fid("breed")} label="Breed" error={err("breedSlugs")}>
            <NativeSelect
              {...aria("breed")}
              defaultValue={pet?.species.slug === current.slug ? (pet?.breeds[0]?.slug ?? "") : ""}
            >
              <option value="">Not sure</option>
              {current.breeds.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id={fid("breed2")} label="Crossed with (optional)">
            <NativeSelect
              {...aria("breed2")}
              defaultValue={pet?.species.slug === current.slug ? (pet?.breeds[1]?.slug ?? "") : ""}
            >
              <option value="">—</option>
              {current.breeds
                .filter((b) => b.slug !== "mixed-unknown")
                .map((b) => (
                  <option key={b.slug} value={b.slug}>
                    {b.name}
                  </option>
                ))}
            </NativeSelect>
          </Field>
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={fid("sex")} label="Sex">
          <NativeSelect {...aria("sex")} defaultValue={pet?.sex ?? "unknown"}>
            <option value="unknown">Not sure</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </NativeSelect>
        </Field>
        <Field id={fid("neutered")} label="Neutered or spayed">
          <NativeSelect {...aria("neutered")} defaultValue={pet?.neutered ?? "unknown"}>
            <option value="unknown">Not sure</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </NativeSelect>
        </Field>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold">Age</legend>
        <div className="flex flex-wrap gap-4 text-sm" role="radiogroup">
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="radio"
              name="dobMode"
              checked={dobMode === "date"}
              onChange={() => setDobMode("date")}
              className="accent-primary size-4"
            />
            I know the date of birth
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="radio"
              name="dobMode"
              checked={dobMode === "age"}
              onChange={() => setDobMode("age")}
              className="accent-primary size-4"
            />
            I only know roughly how old
          </label>
        </div>
        {dobMode === "date" ? (
          <Field id={fid("dateOfBirth")} label="Date of birth" error={err("dateOfBirth")}>
            <Input
              {...aria("dateOfBirth")}
              type="date"
              max={new Date().toLocaleDateString("en-CA")}
              defaultValue={pet?.dateOfBirthIsEstimate ? "" : (pet?.dateOfBirth ?? "")}
            />
          </Field>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Field id={fid("ageYears")} label="Years">
              <Input
                {...aria("ageYears")}
                type="number"
                inputMode="numeric"
                min={0}
                max={60}
                defaultValue={ageDefault.y}
              />
            </Field>
            <Field id={fid("ageMonths")} label="Months">
              <Input
                {...aria("ageMonths")}
                type="number"
                inputMode="numeric"
                min={0}
                max={11}
                defaultValue={ageDefault.m}
              />
            </Field>
          </div>
        )}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={fid("colourMarkings")} label="Colour and markings">
          <Input
            {...aria("colourMarkings")}
            defaultValue={pet?.colourMarkings ?? ""}
            placeholder="e.g. Black with white chest"
          />
        </Field>
        {current?.tracksHeightInHands ? (
          <Field
            id={fid("height")}
            label="Height (hands)"
            hint="e.g. 15.2"
            error={err("heightInches")}
          >
            <Input
              {...aria("height", "e.g. 15.2")}
              inputMode="decimal"
              defaultValue={formatHands(pet?.heightInches ?? null)?.replace(" hh", "") ?? ""}
            />
          </Field>
        ) : null}
        {!editing ? (
          <Field
            id={fid("weight")}
            label={`Current weight (${current?.smallAnimal ? "g" : "kg"})`}
            hint="Optional. You can add more weigh-ins later."
            error={err("weight")}
          >
            <Input
              {...aria("weight", "Optional. You can add more weigh-ins later.")}
              inputMode="decimal"
            />
          </Field>
        ) : null}
      </div>

      <details className="group rounded-xl border p-4 open:pb-5">
        <summary className="cursor-pointer text-sm font-semibold">
          More details: vet, insurance, passport, emergency contact
        </summary>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Field id={fid("vetPracticeName")} label="Vet practice">
            <Input {...aria("vetPracticeName")} defaultValue={pet?.vetPracticeName ?? ""} />
          </Field>
          <Field id={fid("vetPracticePhone")} label="Vet phone">
            <Input
              {...aria("vetPracticePhone")}
              type="tel"
              defaultValue={pet?.vetPracticePhone ?? ""}
            />
          </Field>
          <Field id={fid("insuranceProvider")} label="Insurance provider">
            <Input {...aria("insuranceProvider")} defaultValue={pet?.insuranceProvider ?? ""} />
          </Field>
          <Field id={fid("insurancePolicyRef")} label="Policy reference">
            <Input {...aria("insurancePolicyRef")} defaultValue={pet?.insurancePolicyRef ?? ""} />
          </Field>
          <Field
            id={fid("passportNumber")}
            label="Passport number"
            hint="Pet passport or horse passport."
          >
            <Input
              {...aria("passportNumber", "Pet passport or horse passport.")}
              defaultValue={pet?.passportNumber ?? ""}
            />
          </Field>
          <div className="hidden sm:block" />
          <Field id={fid("emergencyContactName")} label="Emergency contact">
            <Input
              {...aria("emergencyContactName")}
              defaultValue={pet?.emergencyContactName ?? ""}
            />
          </Field>
          <Field id={fid("emergencyContactPhone")} label="Emergency contact phone">
            <Input
              {...aria("emergencyContactPhone")}
              type="tel"
              defaultValue={pet?.emergencyContactPhone ?? ""}
            />
          </Field>
          <Field id={fid("notes")} label="Notes" className="sm:col-span-2">
            <Textarea {...aria("notes")} defaultValue={pet?.notes ?? ""} rows={3} />
          </Field>
        </div>
      </details>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : editing ? "Save changes" : "Add pet"}
        </Button>
      </div>
    </form>
  );
}
