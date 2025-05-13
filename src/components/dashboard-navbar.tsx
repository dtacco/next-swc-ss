"use client";

import Link from "next/link";
import { createClient } from "../../supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import {
  UserCircle,
  Home,
  Bell,
  Settings,
  CreditCard,
  BarChart3,
  PiggyBank,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function DashboardNavbar() {
  const supabase = createClient();
  const router = useRouter();
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    async function fetchNotificationCount() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", user.id)
          .eq("is_read", false);

        if (!error && data) {
          setUnreadNotifications(data.length);
        }
      } catch (err) {
        console.error("Error fetching notifications:", err);
      }
    }

    fetchNotificationCount();

    // Set up realtime subscription for notifications
    const channel = supabase
      .channel("notifications-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          fetchNotificationCount();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <nav className="w-full border-b border-gray-200 bg-white py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/" prefetch className="text-xl font-bold">
            FinTrack
          </Link>
          <div className="hidden md:flex gap-6 ml-10">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center gap-1"
            >
              <Home className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href="/dashboard/transactions"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center gap-1"
            >
              <BarChart3 className="h-4 w-4" />
              Transactions
            </Link>
            <Link
              href="/dashboard/budgets"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center gap-1"
            >
              <PiggyBank className="h-4 w-4" />
              Budgets
            </Link>
            <Link
              href="/dashboard/accounts"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center gap-1"
            >
              <CreditCard className="h-4 w-4" />
              Accounts
            </Link>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadNotifications > 0 && (
              <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full">
                {unreadNotifications}
              </span>
            )}
          </Button>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <UserCircle className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.push("/");
                }}
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
