"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "../../../supabase/client";

interface NetWorthData {
  date: string;
  assets: number;
  liabilities: number;
  netWorth: number;
}

export default function NetWorthChart() {
  const [netWorthData, setNetWorthData] = useState<NetWorthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<"month" | "quarter" | "year">(
    "month",
  );
  const [currentNetWorth, setCurrentNetWorth] = useState({
    assets: 0,
    liabilities: 0,
    netWorth: 0,
    change: 0,
  });

  const supabase = createClient();

  useEffect(() => {
    async function fetchNetWorthData() {
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

        // In a real app, we would fetch actual net worth data from the database
        // For this demo, we'll generate sample data
        const today = new Date();
        const data: NetWorthData[] = [];

        // Generate data points based on timeframe
        let numPoints = 30; // Default for month
        let dayIncrement = 1;

        if (timeframe === "quarter") {
          numPoints = 90;
          dayIncrement = 3;
        } else if (timeframe === "year") {
          numPoints = 365;
          dayIncrement = 12;
        }

        // Start with base values
        let assets = 125000;
        let liabilities = 45000;

        // Generate data points with some randomness for realistic trends
        for (let i = numPoints; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i * dayIncrement);

          // Add some random fluctuation
          assets += Math.random() * 1000 - 300;
          liabilities += Math.random() * 300 - 150;

          // Ensure values stay reasonable
          assets = Math.max(assets, 100000);
          liabilities = Math.max(liabilities, 40000);

          const netWorth = assets - liabilities;

          data.push({
            date: date.toISOString().split("T")[0],
            assets,
            liabilities,
            netWorth,
          });
        }

        setNetWorthData(data);

        // Set current values
        const latest = data[data.length - 1];
        const previous = data[data.length - 2];
        const percentChange =
          ((latest.netWorth - previous.netWorth) / previous.netWorth) * 100;

        setCurrentNetWorth({
          assets: latest.assets,
          liabilities: latest.liabilities,
          netWorth: latest.netWorth,
          change: percentChange,
        });
      } catch (err) {
        setError("Failed to fetch net worth data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchNetWorthData();
  }, [timeframe]);

  // Function to render the chart
  const renderChart = () => {
    if (netWorthData.length === 0) return null;

    // Find min and max values for scaling
    const allValues = netWorthData.flatMap((d) => [
      d.assets,
      d.liabilities,
      d.netWorth,
    ]);
    const maxValue = Math.max(...allValues);
    const minValue = Math.min(...allValues);
    const range = maxValue - minValue;

    // Chart dimensions
    const height = 200;
    const width = 800;
    const padding = 30;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Scale values to fit chart height
    const scaleY = (value: number) => {
      return chartHeight - ((value - minValue) / range) * chartHeight + padding;
    };

    // Create points for each line
    const netWorthPoints = netWorthData
      .map((d, i) => {
        const x = (i / (netWorthData.length - 1)) * chartWidth + padding;
        const y = scaleY(d.netWorth);
        return `${x},${y}`;
      })
      .join(" ");

    const assetsPoints = netWorthData
      .map((d, i) => {
        const x = (i / (netWorthData.length - 1)) * chartWidth + padding;
        const y = scaleY(d.assets);
        return `${x},${y}`;
      })
      .join(" ");

    const liabilitiesPoints = netWorthData
      .map((d, i) => {
        const x = (i / (netWorthData.length - 1)) * chartWidth + padding;
        const y = scaleY(d.liabilities);
        return `${x},${y}`;
      })
      .join(" ");

    // X-axis labels (dates)
    const dateLabels = [];
    const step = Math.max(1, Math.floor(netWorthData.length / 5)); // Show ~5 labels

    for (let i = 0; i < netWorthData.length; i += step) {
      const date = new Date(netWorthData[i].date);
      const x = (i / (netWorthData.length - 1)) * chartWidth + padding;
      dateLabels.push(
        <text
          key={i}
          x={x}
          y={height - 10}
          textAnchor="middle"
          className="text-xs fill-muted-foreground"
        >
          {date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </text>,
      );
    }

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        {/* Net Worth Line */}
        <polyline
          points={netWorthPoints}
          fill="none"
          stroke="#3b82f6" // blue-500
          strokeWidth="2"
        />

        {/* Assets Line */}
        <polyline
          points={assetsPoints}
          fill="none"
          stroke="#10b981" // emerald-500
          strokeWidth="2"
          strokeDasharray="4"
        />

        {/* Liabilities Line */}
        <polyline
          points={liabilitiesPoints}
          fill="none"
          stroke="#ef4444" // red-500
          strokeWidth="2"
          strokeDasharray="4"
        />

        {/* X-axis */}
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="#e5e7eb" // gray-200
          strokeWidth="1"
        />

        {/* Date labels */}
        {dateLabels}

        {/* Legend */}
        <g transform={`translate(${width - 150}, 20)`}>
          <rect x="0" y="0" width="10" height="10" fill="#3b82f6" />
          <text x="15" y="9" className="text-xs fill-foreground">
            Net Worth
          </text>

          <rect x="0" y="20" width="10" height="10" fill="#10b981" />
          <text x="15" y="29" className="text-xs fill-foreground">
            Assets
          </text>

          <rect x="0" y="40" width="10" height="10" fill="#ef4444" />
          <text x="15" y="49" className="text-xs fill-foreground">
            Liabilities
          </text>
        </g>
      </svg>
    );
  };

  if (loading) {
    return (
      <Card className="w-full bg-card">
        <CardHeader>
          <CardTitle>Net Worth Trend</CardTitle>
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
          <CardTitle>Net Worth Trend</CardTitle>
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
        <CardTitle>Net Worth Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              Total Assets
            </h3>
            <p className="text-2xl font-bold text-blue-600">
              $
              {currentNetWorth.assets.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              Total Liabilities
            </h3>
            <p className="text-2xl font-bold text-red-600">
              $
              {currentNetWorth.liabilities.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              Net Worth
            </h3>
            <p className="text-2xl font-bold text-green-600">
              $
              {currentNetWorth.netWorth.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </p>
            <div className="mt-1 text-xs text-muted-foreground">
              {currentNetWorth.change >= 0 ? "+" : ""}
              {currentNetWorth.change.toFixed(1)}% from previous period
            </div>
          </div>
        </div>

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

          <TabsContent value="month" className="h-64">
            {renderChart()}
          </TabsContent>

          <TabsContent value="quarter" className="h-64">
            {renderChart()}
          </TabsContent>

          <TabsContent value="year" className="h-64">
            {renderChart()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
