"use client"

import { useState, useCallback } from "react"
import { HomeScreen } from "@/components/screens/home-screen"
import { FinanceScreen } from "@/components/screens/finance-screen"
import { IncomeExpenseScreen } from "@/components/screens/income-expense-screen"
import { BudgetsScreen } from "@/components/screens/budgets-screen"
import { SavingsScreen } from "@/components/screens/savings-screen"
import { OfflineAIScreen } from "@/components/screens/offline-ai-screen"
import { GestureOverlay } from "@/components/dashboard/gesture-overlay"
import { AutoRefresh } from "@/components/dashboard/auto-refresh"
import type { Screen } from "@/lib/navigation"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("home")
  const [isTransitioning, setIsTransitioning] = useState(false)

  const navigateTo = useCallback((screen: Screen) => {
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentScreen(screen)
      setIsTransitioning(false)
    }, 200)
  }, [])

  const renderScreen = () => {
    switch (currentScreen) {
      case "home":
        return <HomeScreen onNavigate={navigateTo} />
      case "finance":
        return <FinanceScreen onNavigate={navigateTo} />
      case "income":
        return <IncomeExpenseScreen onNavigate={navigateTo} />
      case "budgets":
        return <BudgetsScreen onNavigate={navigateTo} />
      case "savings":
        return <SavingsScreen onNavigate={navigateTo} />
      case "offline-ai":
        return <OfflineAIScreen onNavigate={navigateTo} />
      default:
        return <HomeScreen onNavigate={navigateTo} />
    }
  }

  return (
    <main className="relative w-screen h-screen bg-background overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[200px] h-[200px] rounded-full bg-accent/5 blur-[80px]" />
        <div className="absolute top-0 right-0 w-[150px] h-[150px] rounded-full bg-chart-3/5 blur-[60px]" />
      </div>

      {/* Screen content */}
      <div
        className={cn(
          "relative w-full h-full transition-opacity duration-200",
          isTransitioning ? "opacity-0" : "opacity-100"
        )}
      >
        {renderScreen()}
      </div>

      {/* Gesture overlay */}
      <GestureOverlay onNavigate={navigateTo} />

      {/* Auto-refresh on new deploys */}
      <AutoRefresh />

      {/* Screen indicator */}
      <div className="fixed top-2 right-2 z-50">
        <span className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest">
          {currentScreen.replace("-", " ")}
        </span>
      </div>
    </main>
  )
}
