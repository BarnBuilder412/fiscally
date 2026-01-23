"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { ChevronLeft, User, Bell, Moon, Shield, CreditCard, LogOut } from "lucide-react"
import Link from "next/link"

export default function Settings() {
    return (
        <div className="min-h-screen bg-secondary/30 p-4 space-y-6 pb-24">
            {/* Header */}
            <header className="sticky top-0 z-10 flex items-center gap-4 bg-background/80 backdrop-blur-md border-b border-border -mx-4 -mt-4 px-4 py-4 mb-4">
                <Link href="/">
                    <Button variant="ghost" size="icon" className="rounded-full">
                        <ChevronLeft className="h-6 w-6 text-foreground" />
                    </Button>
                </Link>
                <h1 className="text-xl font-bold tracking-tight text-foreground">Config</h1>
            </header>

            {/* Profile Section */}
            <Card className="bg-card shadow-sm border-none">
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-orange-300 overflow-hidden border-2 border-background shadow-sm">
                        <div className="h-full w-full bg-gradient-to-br from-orange-300 to-orange-500" />
                    </div>
                    <div>
                        <h2 className="font-bold text-lg">Alex Morgan</h2>
                        <p className="text-sm text-muted-foreground">alex.morgan@example.com</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">PRO PLAN</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* App Settings */}
            <div className="space-y-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">App Settings</h3>

                <Card className="bg-card shadow-sm border-none">
                    <CardContent className="p-0 divide-y">
                        <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                                    <Bell className="h-4 w-4 text-foreground" />
                                </div>
                                <span className="font-medium text-sm">Notifications</span>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                                    <Moon className="h-4 w-4 text-foreground" />
                                </div>
                                <span className="font-medium text-sm">Dark Mode</span>
                            </div>
                            <Switch />
                        </div>
                        <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                                    <Shield className="h-4 w-4 text-foreground" />
                                </div>
                                <span className="font-medium text-sm">Security</span>
                            </div>
                            <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-180" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Agent Settings */}
            <div className="space-y-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Agent Configuration</h3>

                <Card className="bg-card shadow-sm border-none">
                    <CardContent className="p-0 divide-y">
                        <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                                    <CreditCard className="h-4 w-4 text-foreground" />
                                </div>
                                <div>
                                    <p className="font-medium text-sm">Auto-Negotiate</p>
                                    <p className="text-[10px] text-muted-foreground">Allow agents to negotiate bills</p>
                                </div>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <div className="p-4">
                            <div className="flex justify-between mb-2">
                                <span className="font-medium text-sm">Risk Tolerance</span>
                                <span className="text-xs font-bold text-primary">MODERATE</span>
                            </div>
                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                <div className="h-full bg-primary w-[50%]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Button variant="destructive" className="w-full h-12 rounded-xl font-bold">
                <LogOut className="mr-2 h-4 w-4" />
                Log Out
            </Button>
        </div>
    )
}
