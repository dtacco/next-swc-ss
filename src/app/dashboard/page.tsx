import DashboardNavbar from "@/components/dashboard-navbar";
import { createClient } from "../../../supabase/server";
import {
  InfoIcon,
  UserCircle,
  WalletIcon,
  BarChart3Icon,
  PiggyBankIcon,
  LineChartIcon,
} from "lucide-react";
import { redirect } from "next/navigation";
import { SubscriptionCheck } from "@/components/subscription-check";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

// Dynamically import components to improve initial load time
const IncomeExpenses = dynamic(
  () => import("@/components/dashboard/income-expenses"),
  {
    ssr: false,
    loading: () => <div className="h-64 bg-card rounded-xl animate-pulse" />,
  },
);

const SpendingAnalytics = dynamic(
  () => import("@/components/dashboard/spending-analytics"),
  {
    ssr: false,
    loading: () => <div className="h-96 bg-card rounded-xl animate-pulse" />,
  },
);

const BudgetTracking = dynamic(
  () => import("@/components/dashboard/budget-tracking"),
  {
    ssr: false,
    loading: () => <div className="h-96 bg-card rounded-xl animate-pulse" />,
  },
);

const LinkedAccounts = dynamic(
  () => import("@/components/dashboard/linked-accounts"),
  {
    ssr: false,
    loading: () => <div className="h-64 bg-card rounded-xl animate-pulse" />,
  },
);

const SmartNotifications = dynamic(
  () => import("@/components/dashboard/smart-notifications"),
  {
    ssr: false,
    loading: () => <div className="h-64 bg-card rounded-xl animate-pulse" />,
  },
);

const NetWorthChart = dynamic(
  () => import("@/components/dashboard/net-worth-chart"),
  {
    ssr: false,
    loading: () => <div className="h-96 bg-card rounded-xl animate-pulse" />,
  },
);

export default async function Dashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  return (
    <SubscriptionCheck>
      <DashboardNavbar />
      <main className="w-full">
        <div className="container mx-auto px-4 py-8 flex flex-col gap-8">
          {/* Header Section */}
          <header className="flex flex-col gap-4">
            <h1 className="text-3xl font-bold">Financial Dashboard</h1>
            <div className="bg-secondary/50 text-sm p-3 px-4 rounded-lg text-muted-foreground flex gap-2 items-center">
              <InfoIcon size="14" />
              <span>Welcome to your personal finance dashboard</span>
            </div>
          </header>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4 flex flex-col items-center justify-center">
                <WalletIcon className="h-8 w-8 text-blue-500 mb-2" />
                <h3 className="font-medium text-center">
                  Connect Bank Account
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  asChild
                >
                  <Link href="#linked-accounts">Connect</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4 flex flex-col items-center justify-center">
                <BarChart3Icon className="h-8 w-8 text-green-500 mb-2" />
                <h3 className="font-medium text-center">View Transactions</h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  asChild
                >
                  <Link href="#spending-analytics">View</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4 flex flex-col items-center justify-center">
                <PiggyBankIcon className="h-8 w-8 text-amber-500 mb-2" />
                <h3 className="font-medium text-center">Set Savings Goal</h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  asChild
                >
                  <Link href="#budget-tracking">Set Goal</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4 flex flex-col items-center justify-center">
                <LineChartIcon className="h-8 w-8 text-purple-500 mb-2" />
                <h3 className="font-medium text-center">Investment Insights</h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  asChild
                >
                  <Link href="#net-worth">Explore</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Smart Notifications */}
          <div id="notifications">
            <SmartNotifications />
          </div>

          {/* Income vs Expenses Section */}
          <div id="income-expenses">
            <IncomeExpenses />
          </div>

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Spending Analytics */}
            <div className="md:col-span-1" id="spending-analytics">
              <SpendingAnalytics />
            </div>

            {/* Budget Tracking */}
            <div className="md:col-span-1" id="budget-tracking">
              <BudgetTracking />
            </div>
          </div>

          {/* Net Worth Section */}
          <div id="net-worth">
            <NetWorthChart />
          </div>

          {/* Linked Accounts Section */}
          <div id="linked-accounts">
            <LinkedAccounts />
          </div>

          {/* User Profile Section */}
          <section className="bg-card rounded-xl p-6 border shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <UserCircle size={48} className="text-primary" />
              <div>
                <h2 className="font-semibold text-xl">User Profile</h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 overflow-hidden">
              <pre className="text-xs font-mono max-h-48 overflow-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
          </section>
        </div>
      </main>
    </SubscriptionCheck>
  );
}
