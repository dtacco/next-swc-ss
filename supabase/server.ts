import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const createClient = async () => {
  try {
    const cookieStore = cookies();

    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            try {
              return cookieStore.getAll().map(({ name, value }) => ({
                name,
                value,
              }));
            } catch (error) {
              // If cookies() is called in an environment where it's not allowed
              console.error("Error accessing cookies:", error);
              return [];
            }
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch (error) {
              // If cookies() is called in an environment where it's not allowed
              console.error("Error setting cookies:", error);
            }
          },
        },
      },
    );
  } catch (error) {
    console.error("Error creating Supabase client:", error);
    // Return a minimal client that won't throw errors
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => [],
          setAll: () => {},
        },
      },
    );
  }
};
