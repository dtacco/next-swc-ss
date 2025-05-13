import { createClient } from "../../../../../supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const redirect_to = requestUrl.searchParams.get("redirect_to");

    if (code) {
      const supabase = await createClient();
      await supabase.auth.exchangeCodeForSession(code);
    }

    // URL to redirect to after sign in process completes
    const redirectTo = redirect_to || "/dashboard";
    return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
  } catch (error) {
    console.error("Auth callback error:", error);
    // Redirect to sign-in page with error message
    return NextResponse.redirect(
      new URL("/sign-in?error=Authentication%20failed", request.url),
    );
  }
}
