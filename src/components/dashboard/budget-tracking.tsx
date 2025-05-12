"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusIcon, AlertCircleIcon } from "lucide-react";
import { createClient } from "../../../supabase/client";

interface Budget {
  id: string;
  category: string;
  amount: number;
  start_date: string;
  end_date: string;
}

interface Transaction {
  id: string;
  category: string;
  amount: number;
  transaction_date: string;
  is_income: boolean;
}

interface BudgetProgress {
  id: string;
  category: string;
  budgetAmount: number;
  spentAmount: number;
  percentage: number;
  remainingAmount: number;
  startDate: Date;
  endDate: Date;
  status: "on-track" | "warning" | "over-budget";
}

const CATEGORIES = [
  "Food & Dining",
  "Shopping",
  "Housing",
  "Transportation",
  "Entertainment",
  "Healthcare",
  "Utilities",
  "Travel",
  "Education",
  "Personal Care",
  "Gifts & Donations",
  "Other",
];

export default function BudgetTracking() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetProgress, setBudgetProgress] = useState<BudgetProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // New budget form state
  const [newBudget, setNewBudget] = useState({
    category: "",
    amount: "",
    startDate: "",
    endDate: "",
  });

  const supabase = createClient();

  useEffect(() => {
    async function fetchBudgetsAndTransactions() {
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

        // Fetch budgets
        const { data: budgetsData, error: budgetsError } = await supabase
          .from("budgets")
          .select("*")
          .eq("user_id", user.id);

        if (budgetsError) {
          setError(budgetsError.message);
          return;
        }

        // Fetch transactions for the current month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const endOfMonth = new Date();
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);
        endOfMonth.setDate(0);
        endOfMonth.setHours(23, 59, 59, 999);

        const { data: transactionsData, error: transactionsError } =
          await supabase
            .from("transactions")
            .select("*")
            .eq("user_id", user.id)
            .eq("is_income", false) // Only expenses for budget tracking
            .gte("transaction_date", startOfMonth.toISOString())
            .lte("transaction_date", endOfMonth.toISOString());

        if (transactionsError) {
          setError(transactionsError.message);
          return;
        }

        // If no data, create sample data
        if (!budgetsData || budgetsData.length === 0) {
          const sampleBudgets: Budget[] = [
            {
              id: "sample-1",
              category: "Food & Dining",
              amount: 500,
              start_date: startOfMonth.toISOString(),
              end_date: endOfMonth.toISOString(),
            },
            {
              id: "sample-2",
              category: "Transportation",
              amount: 200,
              start_date: startOfMonth.toISOString(),
              end_date: endOfMonth.toISOString(),
            },
            {
              id: "sample-3",
              category: "Entertainment",
              amount: 150,
              start_date: startOfMonth.toISOString(),
              end_date: endOfMonth.toISOString(),
            },
          ];

          setBudgets(sampleBudgets);

          // Generate sample transactions
          const sampleTransactions: Transaction[] = [];

          sampleBudgets.forEach((budget) => {
            // Generate 3-5 transactions per budget category
            const numTransactions = Math.floor(Math.random() * 3) + 3;

            for (let i = 0; i < numTransactions; i++) {
              const date = new Date();
              date.setDate(date.getDate() - Math.floor(Math.random() * 30));

              // Make some budgets go over, some under
              let multiplier = 1;
              if (budget.category === "Food & Dining") multiplier = 1.2; // Over budget
              if (budget.category === "Transportation") multiplier = 0.7; // Under budget

              const amount = Math.floor(Math.random() * 50 + 10) * multiplier;

              sampleTransactions.push({
                id: `sample-trans-${budget.category}-${i}`,
                category: budget.category,
                amount: amount,
                transaction_date: date.toISOString(),
                is_income: false,
              });
            }
          });

          setTransactions(sampleTransactions);
          calculateBudgetProgress(sampleBudgets, sampleTransactions);
        } else {
          setBudgets(budgetsData);
          setTransactions(transactionsData || []);
          calculateBudgetProgress(budgetsData, transactionsData || []);
        }
      } catch (err) {
        setError("Failed to fetch budget data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    function calculateBudgetProgress(
      budgets: Budget[],
      transactions: Transaction[],
    ) {
      const progress: BudgetProgress[] = budgets.map((budget) => {
        // Sum transactions for this budget category
        const categoryTransactions = transactions.filter(
          (t) => t.category === budget.category,
        );
        const spentAmount = categoryTransactions.reduce(
          (sum, t) => sum + Number(t.amount),
          0,
        );

        // Calculate percentage and status
        const percentage = (spentAmount / Number(budget.amount)) * 100;
        let status: "on-track" | "warning" | "over-budget" = "on-track";

        if (percentage >= 100) {
          status = "over-budget";
        } else if (percentage >= 80) {
          status = "warning";
        }

        return {
          id: budget.id,
          category: budget.category,
          budgetAmount: Number(budget.amount),
          spentAmount,
          percentage,
          remainingAmount: Number(budget.amount) - spentAmount,
          startDate: new Date(budget.start_date),
          endDate: new Date(budget.end_date),
          status,
        };
      });

      // Sort by percentage (highest first)
      progress.sort((a, b) => b.percentage - a.percentage);

      setBudgetProgress(progress);
    }

    fetchBudgetsAndTransactions();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewBudget((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (value: string) => {
    setNewBudget((prev) => ({ ...prev, category: value }));
  };

  const handleCreateBudget = async () => {
    try {
      // Validate form
      if (
        !newBudget.category ||
        !newBudget.amount ||
        !newBudget.startDate ||
        !newBudget.endDate
      ) {
        alert("Please fill in all fields");
        return;
      }

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("User not authenticated");
        return;
      }

      // Create new budget
      const { data, error } = await supabase
        .from("budgets")
        .insert([
          {
            user_id: user.id,
            category: newBudget.category,
            amount: parseFloat(newBudget.amount),
            start_date: new Date(newBudget.startDate).toISOString(),
            end_date: new Date(newBudget.endDate).toISOString(),
          },
        ])
        .select();

      if (error) {
        throw error;
      }

      // Update state with new budget
      if (data && data.length > 0) {
        setBudgets((prev) => [...prev, data[0]]);

        // Recalculate budget progress
        const updatedBudgets = [...budgets, data[0]];
        calculateBudgetProgress(updatedBudgets, transactions);
      }

      // Reset form and close dialog
      setNewBudget({
        category: "",
        amount: "",
        startDate: "",
        endDate: "",
      });
      setDialogOpen(false);
    } catch (err) {
      console.error("Error creating budget:", err);
      alert("Failed to create budget. Please try again.");
    }
  };

  function calculateBudgetProgress(
    budgets: Budget[],
    transactions: Transaction[],
  ) {
    const progress: BudgetProgress[] = budgets.map((budget) => {
      // Sum transactions for this budget category
      const categoryTransactions = transactions.filter(
        (t) => t.category === budget.category,
      );
      const spentAmount = categoryTransactions.reduce(
        (sum, t) => sum + Number(t.amount),
        0,
      );

      // Calculate percentage and status
      const percentage = (spentAmount / Number(budget.amount)) * 100;
      let status: "on-track" | "warning" | "over-budget" = "on-track";

      if (percentage >= 100) {
        status = "over-budget";
      } else if (percentage >= 80) {
        status = "warning";
      }

      return {
        id: budget.id,
        category: budget.category,
        budgetAmount: Number(budget.amount),
        spentAmount,
        percentage,
        remainingAmount: Number(budget.amount) - spentAmount,
        startDate: new Date(budget.start_date),
        endDate: new Date(budget.end_date),
        status,
      };
    });

    // Sort by percentage (highest first)
    progress.sort((a, b) => b.percentage - a.percentage);

    setBudgetProgress(progress);
  }

  if (loading) {
    return (
      <Card className="w-full bg-card">
        <CardHeader>
          <CardTitle>Budget Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-60">
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
          <CardTitle>Budget Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-60">
            <p className="text-red-500">Error: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Budget Tracking</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8">
              <PlusIcon className="h-4 w-4 mr-1" />
              New Budget
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Budget</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newBudget.category}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">Budget Amount ($)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  value={newBudget.amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    value={newBudget.startDate}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    name="endDate"
                    type="date"
                    value={newBudget.endDate}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <Button onClick={handleCreateBudget} className="mt-2">
                Create Budget
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {budgetProgress.length > 0 ? (
          <div className="space-y-4">
            {budgetProgress.map((budget) => (
              <div key={budget.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">{budget.category}</div>
                    <div className="text-xs text-muted-foreground">
                      ${budget.spentAmount.toFixed(2)} of $
                      {budget.budgetAmount.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-sm font-medium">
                    {budget.status === "over-budget" && (
                      <div className="flex items-center text-red-500">
                        <AlertCircleIcon className="h-4 w-4 mr-1" />
                        Over budget
                      </div>
                    )}
                    {budget.status === "warning" && (
                      <div className="flex items-center text-amber-500">
                        <AlertCircleIcon className="h-4 w-4 mr-1" />
                        Warning
                      </div>
                    )}
                    {budget.status === "on-track" && (
                      <div className="text-green-500">On track</div>
                    )}
                  </div>
                </div>
                <Progress
                  value={budget.percentage > 100 ? 100 : budget.percentage}
                  className={`h-2 ${budget.status === "over-budget" ? "bg-red-100" : budget.status === "warning" ? "bg-amber-100" : "bg-green-100"}`}
                  indicatorClassName={
                    budget.status === "over-budget"
                      ? "bg-red-500"
                      : budget.status === "warning"
                        ? "bg-amber-500"
                        : "bg-green-500"
                  }
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 space-y-2">
            <p className="text-muted-foreground">No budgets found</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(true)}
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Create your first budget
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
