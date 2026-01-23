"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, TrendingUp, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
    {
        name: "Dash",
        href: "/",
        icon: LayoutDashboard,
    },
    {
        name: "Saving",
        href: "/saving",
        icon: Users,
    },
    {
        name: "Trends",
        href: "/trends",
        icon: TrendingUp,
    },
    {
        name: "Config",
        href: "/settings",
        icon: Settings,
    },
]

export function Navbar() {
    const pathname = usePathname()

    return (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/80 backdrop-blur-lg z-50 shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
            <div className="mx-auto flex h-16 max-w-md items-center justify-around px-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center space-y-1 text-xs font-medium transition-colors hover:text-primary",
                                isActive ? "text-primary" : "text-muted-foreground"
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            <span>{item.name}</span>
                        </Link>
                    )
                })}
                {/* Center Action Button (Floating) */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 pointer-events-none">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg ring-4 ring-background pointer-events-auto cursor-pointer">
                        <div className="h-6 w-6 text-primary-foreground">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="lucide lucide-box"
                            >
                                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                                <path d="m3.3 7 8.7 5 8.7-5" />
                                <path d="M12 22V12" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
