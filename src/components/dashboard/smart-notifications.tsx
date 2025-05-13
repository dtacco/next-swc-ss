"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertCircleIcon,
  BellIcon,
  CheckCircleIcon,
  XIcon,
} from "lucide-react";
import { createClient } from "../../../supabase/client";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "warning" | "info" | "success";
  is_read: boolean;
  created_at: string;
}

export default function SmartNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function fetchNotifications() {
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

        // Fetch notifications
        const { data: notificationsData, error: notificationsError } =
          await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (notificationsError) {
          setError(notificationsError.message);
          return;
        }

        // If no data, create sample data
        if (!notificationsData || notificationsData.length === 0) {
          const sampleNotifications: Notification[] = [
            {
              id: "sample-1",
              title: "Budget Alert",
              message:
                "You've reached 90% of your Food & Dining budget for this month.",
              type: "warning",
              is_read: false,
              created_at: new Date().toISOString(),
            },
            {
              id: "sample-2",
              title: "Unusual Activity",
              message: "Large transaction of $523.45 detected at Amazon.com.",
              type: "warning",
              is_read: false,
              created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            },
            {
              id: "sample-3",
              title: "Bill Reminder",
              message: "Your electricity bill is due in 3 days.",
              type: "info",
              is_read: false,
              created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
            },
            {
              id: "sample-4",
              title: "Savings Goal Achieved",
              message:
                "Congratulations! You've reached your Emergency Fund goal of $5,000.",
              type: "success",
              is_read: true,
              created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            },
          ];

          setNotifications(sampleNotifications);
        } else {
          setNotifications(notificationsData);
        }
      } catch (err) {
        setError("Failed to fetch notifications");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchNotifications();

    // Set up realtime subscription
    const channel = supabase
      .channel("notifications-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          setNotifications((current) => [
            payload.new as Notification,
            ...current,
          ]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markAsRead = async (id: string) => {
    try {
      // Update in database
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);

      if (error) throw error;

      // Update local state
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id
            ? { ...notification, is_read: true }
            : notification,
        ),
      );
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      // Delete from database
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Update local state
      setNotifications((current) =>
        current.filter((notification) => notification.id !== id),
      );
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertCircleIcon className="h-5 w-5 text-amber-500" />;
      case "success":
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case "info":
      default:
        return <BellIcon className="h-5 w-5 text-blue-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "warning":
        return "bg-amber-50 border-amber-200";
      case "success":
        return "bg-green-50 border-green-200";
      case "info":
      default:
        return "bg-blue-50 border-blue-200";
    }
  };

  if (loading) {
    return (
      <Card className="w-full bg-card">
        <CardHeader>
          <CardTitle>Smart Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-40">
            <p className="text-muted-foreground">Loading notifications...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full bg-card">
        <CardHeader>
          <CardTitle>Smart Notifications</CardTitle>
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
        <CardTitle className="flex items-center gap-2">
          <BellIcon className="h-5 w-5" />
          Smart Notifications
          {notifications.filter((n) => !n.is_read).length > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-red-500 rounded-full">
              {notifications.filter((n) => !n.is_read).length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notifications.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg border flex items-start justify-between ${getNotificationColor(notification.type)} ${notification.is_read ? "opacity-70" : ""}`}
              >
                <div className="flex gap-3">
                  <div className="mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">
                      {notification.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {!notification.is_read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => markAsRead(notification.id)}
                      title="Mark as read"
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => deleteNotification(notification.id)}
                    title="Delete notification"
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 space-y-2">
            <p className="text-muted-foreground">No notifications</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
