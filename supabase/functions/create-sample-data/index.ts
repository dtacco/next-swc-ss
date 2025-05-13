import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    // Create a Supabase client with the Admin key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_KEY") ?? "",
    );

    // Get the user from the request
    const authHeader = req.headers.get("Authorization")!;
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Create sample accounts
    const accounts = [
      {
        user_id: user.id,
        name: "Main Checking",
        type: "checking",
        balance: 4250.75,
        institution: "Chase Bank",
        account_number: "****1234",
        is_active: true,
      },
      {
        user_id: user.id,
        name: "Savings",
        type: "savings",
        balance: 12500.5,
        institution: "Bank of America",
        account_number: "****5678",
        is_active: true,
      },
      {
        user_id: user.id,
        name: "Credit Card",
        type: "credit",
        balance: -1250.3,
        institution: "Citi",
        account_number: "****9012",
        is_active: true,
      },
    ];

    const { data: accountsData, error: accountsError } = await supabaseAdmin
      .from("accounts")
      .upsert(accounts)
      .select();

    if (accountsError) {
      throw accountsError;
    }

    // Create sample budgets
    const currentDate = new Date();
    const startOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    );
    const endOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0,
    );

    const budgets = [
      {
        user_id: user.id,
        category: "Food & Dining",
        amount: 500,
        start_date: startOfMonth.toISOString(),
        end_date: endOfMonth.toISOString(),
      },
      {
        user_id: user.id,
        category: "Transportation",
        amount: 200,
        start_date: startOfMonth.toISOString(),
        end_date: endOfMonth.toISOString(),
      },
      {
        user_id: user.id,
        category: "Entertainment",
        amount: 150,
        start_date: startOfMonth.toISOString(),
        end_date: endOfMonth.toISOString(),
      },
    ];

    const { data: budgetsData, error: budgetsError } = await supabaseAdmin
      .from("budgets")
      .upsert(budgets)
      .select();

    if (budgetsError) {
      throw budgetsError;
    }

    // Create sample transactions
    const transactions = [];
    const categories = [
      "Food & Dining",
      "Transportation",
      "Entertainment",
      "Shopping",
      "Utilities",
    ];
    const descriptions = [
      "Grocery Store",
      "Restaurant",
      "Gas Station",
      "Uber",
      "Movie Theater",
      "Online Shopping",
      "Electric Bill",
      "Water Bill",
      "Internet Service",
      "Coffee Shop",
    ];

    // Generate 30 random transactions over the last month
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));

      const isIncome = Math.random() > 0.7; // 30% chance of being income
      const category = isIncome
        ? "Income"
        : categories[Math.floor(Math.random() * categories.length)];
      const description = isIncome
        ? "Salary"
        : descriptions[Math.floor(Math.random() * descriptions.length)];
      const amount = isIncome
        ? Math.floor(Math.random() * 1000) + 1000 // Income between $1000-$2000
        : Math.floor(Math.random() * 100) + 10; // Expense between $10-$110

      transactions.push({
        user_id: user.id,
        account_id: accountsData[0].id, // Use the first account
        amount: amount,
        description: description,
        category: category,
        transaction_date: date.toISOString(),
        is_income: isIncome,
      });
    }

    const { data: transactionsData, error: transactionsError } =
      await supabaseAdmin.from("transactions").upsert(transactions).select();

    if (transactionsError) {
      throw transactionsError;
    }

    // Create sample notifications
    const notifications = [
      {
        user_id: user.id,
        title: "Budget Alert",
        message:
          "You've reached 90% of your Food & Dining budget for this month.",
        type: "warning",
        is_read: false,
        created_at: new Date().toISOString(),
      },
      {
        user_id: user.id,
        title: "Unusual Activity",
        message: "Large transaction of $523.45 detected at Amazon.com.",
        type: "warning",
        is_read: false,
        created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      },
      {
        user_id: user.id,
        title: "Bill Reminder",
        message: "Your electricity bill is due in 3 days.",
        type: "info",
        is_read: false,
        created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      },
      {
        user_id: user.id,
        title: "Savings Goal Achieved",
        message:
          "Congratulations! You've reached your Emergency Fund goal of $5,000.",
        type: "success",
        is_read: true,
        created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      },
    ];

    const { data: notificationsData, error: notificationsError } =
      await supabaseAdmin.from("notifications").upsert(notifications).select();

    if (notificationsError) {
      throw notificationsError;
    }

    return new Response(
      JSON.stringify({
        message: "Sample data created successfully",
        accounts: accountsData,
        budgets: budgetsData,
        transactions: transactionsData.length,
        notifications: notificationsData,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error creating sample data:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
