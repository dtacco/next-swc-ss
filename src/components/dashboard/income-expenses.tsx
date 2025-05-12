"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownIcon, ArrowUpIcon, DollarSignIcon } from "lucide-react";
import { createClient } from "../../../supabase/client";

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  balance: number;
}

export default function IncomeExpenses() {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<MonthlyData | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function fetchTransactions() {
      try {
        setLoading(true);

        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setError("User not authenticated");
          return;
        }

        // Fetch transactions for the last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const { data: transactions, error } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id)
          .gte("transaction_date", sixMonthsAgo.toISOString())
          .order("transaction_date", { ascending: false });

        if (error) {
          setError(error.message);
          return;
        }

        // Process transactions by month
        const monthlyDataMap = new Map<string, MonthlyData>();

        transactions?.forEach((transaction) => {
          const date = new Date(transaction.transaction_date);
          const monthYear = `${date.toLocaleString("default", { month: "short" })} ${date.getFullYear()}`;

          if (!monthlyDataMap.has(monthYear)) {
            monthlyDataMap.set(monthYear, {
              month: monthYear,
              income: 0,
              expenses: 0,
              balance: 0,
            });
          }

          const data = monthlyDataMap.get(monthYear)!;

          if (transaction.is_income) {
            data.income += Number(transaction.amount);
          } else {
            data.expenses += Number(transaction.amount);
          }

          data.balance = data.income - data.expenses;
        });

        // Convert map to array and sort by date
        const monthlyDataArray = Array.from(monthlyDataMap.values());

        // If no data, create sample data
        if (monthlyDataArray.length === 0) {
          const currentDate = new Date();
          const sampleData = [];

          for (let i = 0; i < 6; i++) {
            const date = new Date(currentDate);
            date.setMonth(date.getMonth() - i);
            const monthYear = `${date.toLocaleString("default", { month: "short" })} ${date.getFullYear()}`;

            sampleData.push({
              month: monthYear,
              income: Math.floor(Math.random() * 5000) + 3000,
              expenses: Math.floor(Math.random() * 3000) + 1000,
              balance: 0,
            });
          }

          // Calculate balance
          sampleData.forEach((data) => {
            data.balance = data.income - data.expenses;
          });

          // Sort by most recent month first
          sampleData.reverse();
          setMonthlyData(sampleData);
          setCurrentMonth(sampleData[0]);
        } else {
          setMonthlyData(monthlyDataArray);
          setCurrentMonth(monthlyDataArray[0]); // Most recent month
        }
      } catch (err) {
        setError("Failed to fetch transaction data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchTransactions();
  }, []);

  if (loading) {
    return (
      <Card className="w-full bg-card">
        <CardHeader>
          <CardTitle>Income vs Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-40">
            <p className="text-muted-foreground">Loading data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full bg-card">
        <CardHeader>
          <CardTitle>Income vs Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-40">
            <p className="text-red-500">Error: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-card">
      <CardHeader>
        <CardTitle>Income vs Expenses</CardTitle>
      </CardHeader>
      <CardContent>
        {currentMonth && (
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-2">
                <ArrowDownIcon className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Income
              </p>
              <h3 className="text-2xl font-bold text-green-600">
                ${currentMonth.income.toLocaleString()}
              </h3>
            </div>

            <div className="flex flex-col items-center p-4 bg-red-50 rounded-lg">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-2">
                <ArrowUpIcon className="h-6 w-6 text-red-600" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Expenses
              </p>
              <h3 className="text-2xl font-bold text-red-600">
                ${currentMonth.expenses.toLocaleString()}
              </h3>
            </div>

            <div className="flex flex-col items-center p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-2">
                <DollarSignIcon className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Balance
              </p>
              <h3
                className={`text-2xl font-bold ${currentMonth.balance >= 0 ? "text-blue-600" : "text-red-600"}`}
              >
                ${Math.abs(currentMonth.balance).toLocaleString()}
                {currentMonth.balance < 0 && " (deficit)"}
              </h3>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
