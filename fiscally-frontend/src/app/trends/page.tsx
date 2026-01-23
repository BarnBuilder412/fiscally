"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { ChevronLeft, Calendar, Zap, Lock, Dumbbell, Bike } from "lucide-react"
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts"
import Link from "next/link"

const data = [
    { name: "M", value: 400 },
    { name: "T", value: 300 },
    { name: "W", value: 550 },
    { name: "T", value: 450 },
    { name: "F", value: 600 },
    { name: "S", value: 700 },
    { name: "S", value: 800 },
]

export default function Trends() {
    return (
        <div className="min-h-screen bg-secondary/30 p-4 space-y-6 pb-24">
            {/* Header */}
            <header className="sticky top-0 z-10 flex items-center justify-between bg-background/80 backdrop-blur-md border-b border-border -mx-4 -mt-4 px-4 py-4 mb-4">
                <Link href="/">
                    <Button variant="ghost" size="icon" className="rounded-full">
                        <ChevronLeft className="h-6 w-6 text-foreground" />
                    </Button>
                </Link>
                <div className="text-center">
                    <h1 className="text-lg font-bold text-foreground">Regret Report</h1>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest">DopamineAudit</p>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full">
                    <Calendar className="h-5 w-5 text-foreground" />
                </Button>
            </header>

            {/* Insight Card */}
            <Card className="bg-card shadow-sm border-none">
                <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <Zap className="h-3 w-3 text-primary" />
                        </div>
                        <span className="text-xs font-bold text-primary uppercase">AI Emotional Audit</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        You spent <span className="font-bold text-destructive">24% more</span> on impulse buys during high-stress hours this Tuesday. Your <span className="font-bold text-primary">Lockdown</span> feature could have saved you <span className="font-bold text-foreground">$84.50</span>.
                    </p>
                </CardContent>
            </Card>

            {/* Chart Section */}
            <div className="space-y-2">
                <div className="flex justify-between items-end px-1">
                    <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Weekly Spend vs Stress</p>
                        <h2 className="text-3xl font-bold text-foreground mt-1">$1,240.00</h2>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center justify-end gap-1 text-xs font-bold text-primary">
                            <Zap className="h-3 w-3" />
                            <span>Avg Stress: 7.2</span>
                        </div>
                        <p className="text-[10px] font-bold text-emerald-600 mt-0.5">+12% vs last week</p>
                    </div>
                </div>

                <div className="h-48 w-full -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                itemStyle={{ color: 'var(--foreground)', fontSize: '12px', fontWeight: 'bold' }}
                                labelStyle={{ display: 'none' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="var(--primary)"
                                strokeWidth={3}
                                strokeDasharray="5 5"
                                fillOpacity={1}
                                fill="url(#colorValue)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="flex justify-between px-4 text-xs font-bold text-muted-foreground/50">
                    <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                <Card className="bg-card shadow-sm border-none">
                    <CardContent className="p-4">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Stress Spend</span>
                        <p className="text-2xl font-bold text-destructive mt-1">$432.50</p>
                    </CardContent>
                </Card>
                <Card className="bg-card shadow-sm border-none">
                    <CardContent className="p-4">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Wellness</span>
                        <p className="text-2xl font-bold text-emerald-600 mt-1">$120.00</p>
                    </CardContent>
                </Card>
            </div>

            {/* Lockdown Toggle */}
            <div className="rounded-2xl bg-primary p-1 shadow-lg shadow-primary/20">
                <div className="bg-primary rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                            <Lock className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-sm">Activate Lockdown</h3>
                            <p className="text-[10px] text-white/80 font-medium">PAUSE IMPULSE SPEND</p>
                        </div>
                    </div>
                    <Switch className="data-[state=checked]:bg-white data-[state=unchecked]:bg-white/30" thumbClassName="data-[state=checked]:bg-primary" />
                </div>
            </div>

            {/* Transactions */}
            <div className="space-y-3">
                <Card className="bg-card shadow-sm border-none">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                                <Dumbbell className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-foreground">City Fitness</h3>
                                <div className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5">
                                    #HealthyHabit 😇
                                </div>
                            </div>
                        </div>
                        <span className="font-bold text-foreground">-$120.00</span>
                    </CardContent>
                </Card>

                <Card className="bg-card shadow-sm border-none">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                                <Bike className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-foreground">Express Eats</h3>
                                <div className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5">
                                    #StressSpending 😤
                                </div>
                            </div>
                        </div>
                        <span className="font-bold text-foreground">-$42.15</span>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
