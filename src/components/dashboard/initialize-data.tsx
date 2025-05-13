"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "../../../supabase/client";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function InitializeData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleInitializeData = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const { data, error } = await supabase.functions.invoke(
        "supabase-functions-create-sample-data",
      );

      if (error) {
        throw error;
      }

      setSuccess(true);
      // Refresh the page after a short delay to show the new data
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (err) {
      console.error("Error initializing data:", err);
      setError(err.message || "Failed to initialize data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/30">
      <h3 className="text-lg font-medium mb-2">Initialize Sample Data</h3>
      <p className="text-sm text-muted-foreground mb-4 text-center">
        Create sample accounts, transactions, budgets, and notifications to
        explore the dashboard features.
      </p>
      <Button
        onClick={handleInitializeData}
        disabled={loading || success}
        className="w-full max-w-xs"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Initializing...
          </>
        ) : success ? (
          "Data Initialized Successfully!"
        ) : (
          "Initialize Sample Data"
        )}
      </Button>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      {success && (
        <p className="mt-2 text-sm text-green-500">
          Sample data created successfully! Refreshing page...
        </p>
      )}
    </div>
  );
}
