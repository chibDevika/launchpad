import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user, session },
      } = await supabase.auth.getUser();

      // getUser doesn't return provider_token — use getSession for that
      const { data: sessionData } = await supabase.auth.getSession();
      const providerToken = sessionData.session?.provider_token;

      if (user) {
        // Save the Google access token so server-side routes can use it
        if (providerToken) {
          await supabase
            .from("users")
            .update({ google_access_token: providerToken })
            .eq("id", user.id);
        }

        const { data: profile } = await supabase
          .from("users")
          .select("onboarding_complete")
          .eq("id", user.id)
          .single();

        if (!profile?.onboarding_complete) {
          return NextResponse.redirect(`${origin}/onboarding`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
