import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Behind a reverse proxy (Railway, Vercel), request.url has the internal host.
  // Use x-forwarded-host to get the real public origin.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const origin = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : new URL(request.url).origin;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
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
