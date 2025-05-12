"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "../../../supabase/client";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  transaction_date: string;
  is_income: boolean;
}

interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

const COLORS = [
  "#3B82F6", // blue-500
  "#EF4444", // red-500
  "#10B981", // emerald-500
  "#F59E0B", // amber-500
  "#8B5CF6", // violet-500
  "#EC4899", // pink-500
  "#6366F1", // indigo-500
  "#14B8A6", // teal-500
  "#F97316", // orange-500
  "#8B5CF6", // violet-500
];

export default function SpendingAnalytics() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<"month" | "quarter" | "year">(
    "month",
  );

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

        // Calculate date range based on timeframe
        const endDate = new Date();
        const startDate = new Date();

        if (timeframe === "month") {
          startDate.setMonth(startDate.getMonth() - 1);
        } else if (timeframe === "quarter") {
          startDate.setMonth(startDate.getMonth() - 3);
        } else if (timeframe === "year") {
          startDate.setFullYear(startDate.getFullYear() - 1);
        }

        // Fetch transactions for the selected timeframe
        const { data: transactionsData, error: transactionsError } =
          await supabase
            .from("transactions")
            .select("*")
            .eq("user_id", user.id)
            .eq("is_income", false) // Only expenses for spending analytics
            .gte("transaction_date", startDate.toISOString())
            .lte("transaction_date", endDate.toISOString())
            .order("transaction_date", { ascending: false });

        if (transactionsError) {
          setError(transactionsError.message);
          return;
        }

        // If no data, create sample data
        if (!transactionsData || transactionsData.length === 0) {
          const sampleCategories = [
            "Food & Dining",
            "Shopping",
            "Housing",
            "Transportation",
            "Entertainment",
            "Healthcare",
            "Utilities",
            "Travel",
          ];

          const sampleTransactions: Transaction[] = [];

          // Generate 20 sample transactions
          for (let i = 0; i < 20; i++) {
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 30));

            sampleTransactions.push({
              id: `sample-${i}`,
              description: `Sample Transaction ${i + 1}`,
              amount: Math.floor(Math.random() * 200) + 10,
              category:
                sampleCategories[
                  Math.floor(Math.random() * sampleCategories.length)
                ],
              transaction_date: date.toISOString(),
              is_income: false,
            });
          }

          setTransactions(sampleTransactions);
          processCategories(sampleTransactions);
        } else {
          setTransactions(transactionsData);
          processCategories(transactionsData);
        }
      } catch (err) {
        setError("Failed to fetch transaction data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    function processCategories(transactions: Transaction[]) {
      // Group transactions by category and sum amounts
      const categoryMap = new Map<string, number>();
      let totalSpending = 0;

      transactions.forEach((transaction) => {
        const amount = Number(transaction.amount);
        totalSpending += amount;

        if (categoryMap.has(transaction.category)) {
          categoryMap.set(
            transaction.category,
            categoryMap.get(transaction.category)! + amount,
          );
        } else {
          categoryMap.set(transaction.category, amount);
        }
      });

      // Convert map to array and calculate percentages
      const categoryArray: CategoryData[] = Array.from(
        categoryMap.entries(),
      ).map(([category, amount], index) => ({
        category,
        amount,
        percentage: totalSpending > 0 ? (amount / totalSpending) * 100 : 0,
        color: COLORS[index % COLORS.length],
      }));

      // Sort by amount (highest first)
      categoryArray.sort((a, b) => b.amount - a.amount);

      setCategoryData(categoryArray);
    }

    fetchTransactions();
  }, [timeframe]);

  if (loading) {
    return (
      <Card className="w-full bg-card">
        <CardHeader>
          <CardTitle>Spending Analytics</CardTitle>
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
          <CardTitle>Spending Analytics</CardTitle>
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
      <CardHeader>
        <CardTitle>Spending Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="month" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger
              value="month"
              onClick={() => setTimeframe("month")}
              className={
                timeframe === "month" ? "data-[state=active]:bg-primary" : ""
              }
            >
              Month
            </TabsTrigger>
            <TabsTrigger
              value="quarter"
              onClick={() => setTimeframe("quarter")}
              className={
                timeframe === "quarter" ? "data-[state=active]:bg-primary" : ""
              }
            >
              Quarter
            </TabsTrigger>
            <TabsTrigger
              value="year"
              onClick={() => setTimeframe("year")}
              className={
                timeframe === "year" ? "data-[state=active]:bg-primary" : ""
              }
            >
              Year
            </TabsTrigger>
          </TabsList>

          <TabsContent value="month" className="mt-0">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <div className="relative">
                <div className="w-full aspect-square relative">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    {categoryData.length > 0 ? (
                      renderPieChart(categoryData)
                    ) : (
                      <text
                        x="50"
                        y="50"
                        textAnchor="middle"
                        className="text-sm fill-muted-foreground"
                      >
                        No data available
                      </text>
                    )}
                  </svg>
                </div>
              </div>

              {/* Category Legend */}
              <div className="flex flex-col space-y-2">
                {categoryData.map((category, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <div
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm">{category.category}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">
                        ${category.amount.toFixed(2)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({category.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-2">Recent Transactions</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {transactions.slice(0, 5).map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {transaction.category} •{" "}
                        {new Date(
                          transaction.transaction_date,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-sm font-medium">
                      ${Number(transaction.amount).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="quarter" className="mt-0">
            {/* Same content structure as month, data is already filtered by the useEffect */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="relative">
                <div className="w-full aspect-square relative">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    {categoryData.length > 0 ? (
                      renderPieChart(categoryData)
                    ) : (
                      <text
                        x="50"
                        y="50"
                        textAnchor="middle"
                        className="text-sm fill-muted-foreground"
                      >
                        No data available
                      </text>
                    )}
                  </svg>
                </div>
              </div>

              <div className="flex flex-col space-y-2">
                {categoryData.map((category, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <div
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm">{category.category}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">
                        ${category.amount.toFixed(2)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({category.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="year" className="mt-0">
            {/* Same content structure as month, data is already filtered by the useEffect */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="relative">
                <div className="w-full aspect-square relative">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    {categoryData.length > 0 ? (
                      renderPieChart(categoryData)
                    ) : (
                      <text
                        x="50"
                        y="50"
                        textAnchor="middle"
                        className="text-sm fill-muted-foreground"
                      >
                        No data available
                      </text>
                    )}
                  </svg>
                </div>
              </div>

              <div className="flex flex-col space-y-2">
                {categoryData.map((category, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <div
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm">{category.category}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">
                        ${category.amount.toFixed(2)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({category.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Helper function to render pie chart
function renderPieChart(categoryData: CategoryData[]) {
  let startAngle = 0;
  const radius = 50;
  const cx = 50;
  const cy = 50;

  return categoryData.map((category, index) => {
    // Calculate angles for pie slice
    const angle = (category.percentage / 100) * 360;
    const endAngle = startAngle + angle;

    // Convert angles to radians
    const startAngleRad = ((startAngle - 90) * Math.PI) / 180;
    const endAngleRad = ((endAngle - 90) * Math.PI) / 180;

    // Calculate points on the circle
    const x1 = cx + radius * Math.cos(startAngleRad);
    const y1 = cy + radius * Math.sin(startAngleRad);
    const x2 = cx + radius * Math.cos(endAngleRad);
    const y2 = cy + radius * Math.sin(endAngleRad);

    // Determine if the arc should be drawn as a large arc
    const largeArcFlag = angle > 180 ? 1 : 0;

    // Create the SVG path for the pie slice
    const pathData = [
      `M ${cx},${cy}`,
      `L ${x1},${y1}`,
      `A ${radius},${radius} 0 ${largeArcFlag},1 ${x2},${y2}`,
      "Z",
    ].join(" ");

    // Update the start angle for the next slice
    startAngle = endAngle;

    return (
      <path
        key={index}
        d={pathData}
        fill={category.color}
        stroke="white"
        strokeWidth="0.5"
      />
    );
  });
}
