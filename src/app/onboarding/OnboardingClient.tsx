"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { StepResumeUpload } from "@/components/onboarding/StepResumeUpload";
import { StepTargetRole } from "@/components/onboarding/StepTargetRole";
import { StepExtendedProfile } from "@/components/onboarding/StepExtendedProfile";
import type { ResumeJSON, ExtendedProfile } from "@/lib/types";

type Step = 1 | 2 | 3;

interface CollectedData {
  full_name?: string;
  current_role_title?: string;
  current_company?: string | null;
  years_of_experience?: number;
  base_resume?: ResumeJSON;
  target_roles?: string[];
  work_preference?: string[];
  extended_profile?: ExtendedProfile;
}

export default function OnboardingClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [data, setData] = useState<CollectedData>({});
  const [saving, setSaving] = useState(false);

  async function finish(extended_profile?: ExtendedProfile) {
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const merged = { ...data, extended_profile };

    const { error } = await supabase.from("users").upsert({
      id: user.id,
      full_name: merged.full_name ?? null,
      current_role_title: merged.current_role_title ?? null,
      current_company: merged.current_company ?? null,
      years_of_experience: merged.years_of_experience ?? null,
      base_resume: merged.base_resume ?? null,
      target_roles: merged.target_roles ?? [],
      work_preference: merged.work_preference ?? [],
      extended_profile: merged.extended_profile ?? null,
      tone_preference: "balanced",
      onboarding_complete: true,
    });

    if (error) {
      console.error("Failed to save profile:", error);
      setSaving(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-8">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-text-secondary">
            <span>Getting set up</span>
            <span>Step {step} of 3</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        <div className="card p-8">
          {step === 1 && (
            <StepResumeUpload
              onNext={({ profile, resume }) => {
                setData({
                  full_name: profile.full_name,
                  current_role_title: profile.current_role_title,
                  current_company: profile.current_company,
                  years_of_experience: profile.years_of_experience,
                  base_resume: resume,
                });
                setStep(2);
              }}
            />
          )}

          {step === 2 && (
            <StepTargetRole
              currentRole={data.current_role_title ?? ""}
              onNext={(prefs) => {
                setData((d) => ({ ...d, ...prefs }));
                setStep(3);
              }}
              onBack={() => setStep(1)}
              loading={false}
            />
          )}

          {step === 3 && (
            <StepExtendedProfile
              onNext={(ep) => finish(ep)}
              onSkip={() => finish(undefined)}
              onBack={() => setStep(2)}
              loading={saving}
            />
          )}
        </div>
      </div>
    </div>
  );
}
