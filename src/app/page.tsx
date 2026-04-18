export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

// Root redirects to login; middleware handles auth-aware routing from there
export default function RootPage() {
  redirect("/login");
}
