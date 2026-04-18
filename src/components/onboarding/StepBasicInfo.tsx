"use client";

import { useState } from "react";

interface BasicInfo {
  full_name: string;
  current_role_title: string;
  years_of_experience: number | "";
  target_roles: string;
}

interface Props {
  initial: Partial<BasicInfo>;
  onNext: (data: BasicInfo) => void;
}

export function StepBasicInfo({ initial, onNext }: Props) {
  const [form, setForm] = useState<BasicInfo>({
    full_name: initial.full_name ?? "",
    current_role_title: initial.current_role_title ?? "",
    years_of_experience: initial.years_of_experience ?? "",
    target_roles: initial.target_roles ?? "",
  });

  const valid =
    form.full_name.trim() &&
    form.current_role_title.trim() &&
    form.years_of_experience !== "" &&
    form.target_roles.trim();

  function field(key: keyof BasicInfo) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-text-primary">
          First, let&apos;s get to know you
        </h2>
        <p className="text-text-secondary">
          This helps us tailor everything to your situation.
        </p>
      </div>

      <div className="space-y-4">
        <Field label="Your name" htmlFor="full_name">
          <input
            id="full_name"
            type="text"
            placeholder="Alex Johnson"
            value={form.full_name}
            onChange={field("full_name")}
            className="input"
          />
        </Field>

        <Field label="Current role" htmlFor="current_role_title">
          <input
            id="current_role_title"
            type="text"
            placeholder="Software Engineer at Acme Inc."
            value={form.current_role_title}
            onChange={field("current_role_title")}
            className="input"
          />
        </Field>

        <Field label="Years of experience" htmlFor="years_of_experience">
          <input
            id="years_of_experience"
            type="number"
            min={0}
            max={50}
            placeholder="3"
            value={form.years_of_experience}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                years_of_experience:
                  e.target.value === "" ? "" : Number(e.target.value),
              }))
            }
            className="input"
          />
        </Field>

        <Field
          label="Roles you're targeting"
          htmlFor="target_roles"
          hint="Separate with commas — e.g. Product Manager, Growth PM"
        >
          <input
            id="target_roles"
            type="text"
            placeholder="Product Manager, Growth PM"
            value={form.target_roles}
            onChange={field("target_roles")}
            className="input"
          />
        </Field>
      </div>

      <button
        onClick={() => valid && onNext(form)}
        disabled={!valid}
        className="btn-primary w-full"
      >
        Looks good, next →
      </button>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-text-primary"
      >
        {label}
      </label>
      {hint && <p className="text-xs text-text-secondary">{hint}</p>}
      {children}
    </div>
  );
}
