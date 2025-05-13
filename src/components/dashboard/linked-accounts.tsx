"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusIcon, CreditCardIcon, BankIcon, WalletIcon } from "lucide-react";
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
import { createClient } from "../../../supabase/client";

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  institution: string;
  account_number: string;
  is_active: boolean;
}

export default function LinkedAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // New account form state
  const [newAccount, setNewAccount] = useState({
    name: "",
    type: "",
    balance: "",
    institution: "",
    account_number: "",
  });

  const supabase = createClient();

  useEffect(() => {
    async function fetchAccounts() {
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

        // Fetch accounts
        const { data: accountsData, error: accountsError } = await supabase
          .from("accounts")
          .select("*")
          .eq("user_id", user.id);

        if (accountsError) {
          setError(accountsError.message);
          return;
        }

        // If no data, create sample data
        if (!accountsData || accountsData.length === 0) {
          const sampleAccounts: Account[] = [
            {
              id: "sample-1",
              name: "Main Checking",
              type: "checking",
              balance: 4250.75,
              institution: "Chase Bank",
              account_number: "****1234",
              is_active: true,
            },
            {
              id: "sample-2",
              name: "Savings",
              type: "savings",
              balance: 12500.5,
              institution: "Bank of America",
              account_number: "****5678",
              is_active: true,
            },
            {
              id: "sample-3",
              name: "Credit Card",
              type: "credit",
              balance: -1250.3,
              institution: "Citi",
              account_number: "****9012",
              is_active: true,
            },
          ];

          setAccounts(sampleAccounts);
        } else {
          setAccounts(accountsData);
        }
      } catch (err) {
        setError("Failed to fetch account data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchAccounts();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewAccount((prev) => ({ ...prev, [name]: value }));
  };

  const handleTypeChange = (value: string) => {
    setNewAccount((prev) => ({ ...prev, type: value }));
  };

  const handleCreateAccount = async () => {
    try {
      // Validate form
      if (
        !newAccount.name ||
        !newAccount.type ||
        !newAccount.balance ||
        !newAccount.institution ||
        !newAccount.account_number
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

      // Create new account
      const { data, error } = await supabase
        .from("accounts")
        .insert([
          {
            user_id: user.id,
            name: newAccount.name,
            type: newAccount.type,
            balance: parseFloat(newAccount.balance),
            institution: newAccount.institution,
            account_number: newAccount.account_number,
            is_active: true,
          },
        ])
        .select();

      if (error) {
        throw error;
      }

      // Update state with new account
      if (data && data.length > 0) {
        setAccounts((prev) => [...prev, data[0]]);
      }

      // Reset form and close dialog
      setNewAccount({
        name: "",
        type: "",
        balance: "",
        institution: "",
        account_number: "",
      });
      setDialogOpen(false);
    } catch (err) {
      console.error("Error creating account:", err);
      alert("Failed to create account. Please try again.");
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "checking":
        return <BankIcon className="h-5 w-5" />;
      case "savings":
        return <WalletIcon className="h-5 w-5" />;
      case "credit":
        return <CreditCardIcon className="h-5 w-5" />;
      default:
        return <BankIcon className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <Card className="w-full bg-card">
        <CardHeader>
          <CardTitle>Linked Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-40">
            <p className="text-muted-foreground">Loading accounts...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full bg-card">
        <CardHeader>
          <CardTitle>Linked Accounts</CardTitle>
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
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Linked Accounts</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8">
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Account</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Account Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={newAccount.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Main Checking"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Account Type</Label>
                <Select
                  value={newAccount.type}
                  onValueChange={handleTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Checking</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="credit">Credit Card</SelectItem>
                    <SelectItem value="investment">Investment</SelectItem>
                    <SelectItem value="loan">Loan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="balance">Current Balance ($)</Label>
                <Input
                  id="balance"
                  name="balance"
                  type="number"
                  step="0.01"
                  value={newAccount.balance}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="institution">Financial Institution</Label>
                <Input
                  id="institution"
                  name="institution"
                  value={newAccount.institution}
                  onChange={handleInputChange}
                  placeholder="e.g. Chase Bank"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="account_number">
                  Account Number (Last 4 digits)
                </Label>
                <Input
                  id="account_number"
                  name="account_number"
                  value={newAccount.account_number}
                  onChange={handleInputChange}
                  placeholder="****1234"
                  maxLength={8}
                />
              </div>
              <Button onClick={handleCreateAccount} className="mt-2">
                Add Account
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {accounts.length > 0 ? (
          <div className="space-y-4">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${account.type === "credit" ? "bg-red-100" : "bg-blue-100"}`}
                  >
                    {getAccountIcon(account.type)}
                  </div>
                  <div>
                    <h3 className="font-medium">{account.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {account.institution} • {account.account_number}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold ${account.balance < 0 ? "text-red-600" : "text-green-600"}`}
                  >
                    {account.balance < 0 ? "-" : ""}$
                    {Math.abs(account.balance).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {account.type} Account
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 space-y-2">
            <p className="text-muted-foreground">No accounts linked</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(true)}
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Link your first account
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
