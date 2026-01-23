"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bell, Sun, Snowflake, Brain, Zap, ChevronRight, TrendingUp } from "lucide-react"
import { BarChart, Bar, ResponsiveContainer, Cell } from "recharts"
import Link from "next/link"

const spendingData = [
  { name: "M", value: 30 },
  { name: "T", value: 60 },
  { name: "W", value: 25 },
  { name: "T", value: 80 },
  { name: "F", value: 45 },
  { name: "S", value: 55 },
  { name: "S", value: 90 },
]

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-secondary/30 p-4 space-y-6">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-background/80 backdrop-blur-md border-b border-border -mx-4 -mt-4 px-4 py-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background shadow-sm border">
            <div className="h-6 w-6 bg-primary rounded-md" /> {/* Placeholder logo */}
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide text-foreground">FISCALLY</h1>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-[10px] font-medium text-muted-foreground tracking-wider">AI ACTIVE</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="rounded-full h-9 w-9 bg-background shadow-sm">
            <Sun className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-full h-9 w-9 bg-background shadow-sm">
            <Bell className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-card shadow-sm border-none">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Agent Savings</span>
            <div className="mt-1">
              <span className="text-2xl font-bold text-primary">$1,240.50</span>
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs font-medium text-emerald-600">
              <TrendingUp className="h-3 w-3" />
              <span>+12.4%</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card shadow-sm border-none">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Net Worth</span>
            <div className="mt-1">
              <span className="text-2xl font-bold text-foreground">$84.2k</span>
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs font-medium text-emerald-600">
              <TrendingUp className="h-3 w-3" />
              <span>+3.4%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Autonomous Engines</h2>

        {/* SubZero Card */}
        <Card className="bg-card shadow-sm border-none overflow-hidden">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Snowflake className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-lg">SubZero</h3>
                </div>
                <p className="text-sm text-muted-foreground">Autonomous Negotiations</p>
                <p className="text-xs font-bold text-primary mt-2">3 ACTIVE TASKS</p>
                <Link href="/saving">
                  <Button className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 font-semibold text-xs h-9 px-6">
                    LIVE UPDATE
                  </Button>
                </Link>
              </div>
              <div className="relative h-24 w-24 flex items-center justify-center">
                {/* Simple circular progress placeholder */}
                <div className="absolute inset-0 rounded-full border-4 border-muted" />
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent border-l-transparent rotate-45" />
                <div className="text-center">
                  <span className="block text-xl font-bold">70%</span>
                  <span className="block text-[8px] text-muted-foreground uppercase">Saved</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* DopamineAudit Card */}
        <Card className="bg-card shadow-sm border-none">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                  <Brain className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                <h3 className="font-bold text-lg">DopamineAudit</h3>
              </div>
              <div className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded-md uppercase">
                High Volatility
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Spending Correlation</p>

            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spendingData}>
                  <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                    {spendingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 6 ? 'var(--primary)' : 'var(--muted-foreground)'} opacity={index === 6 ? 1 : 0.3} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
              <p>Spikes correlate with <span className="font-bold text-foreground">"Low Energy"</span> periods.</p>
              <ChevronRight className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        {/* ThesisFlow Card */}
        <Card className="bg-card shadow-sm border-none">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-lg">ThesisFlow</h3>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
