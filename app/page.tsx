"use client"

import { useState, useCallback, useEffect } from "react"
import { HomeScreen } from "@/components/screens/home-screen"
import { FinanceScreen } from "@/components/screens/finance-screen"
import { IncomeExpenseScreen } from "@/components/screens/income-expense-screen"
import { BudgetsScreen } from "@/components/screens/budgets-screen"
import { SavingsScreen } from "@/components/screens/savings-screen"
import { ReportsScreen } from "@/components/screens/reports-screen"
import { OfflineAIScreen } from "@/components/screens/offline-ai-screen"
import { AutoRefresh } from "@/components/dashboard/auto-refresh"
import { FinanceProvider } from "@/lib/finance-context"
import { useGestureControl } from "@/hooks/use-gesture-control"
import type { Screen } from "@/lib/navigation"
import { cn } from "@/lib/utils"
import { Hand } from "lucide-react"

export default function DashboardPage() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("home")
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)

  const navigateTo = useCallback((screen: Screen) => {
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentScreen(screen)
      setIsTransitioning(false)
    }, 200)
  }, [])

  // Handle gesture navigation events
  // This function maps gesture targets to screens and handles special cases like exit
  const handleGestureNavigate = useCallback((target: string, fingers: number) => {
    // Map targets to screens
    const screenMap: Record<string, Screen> = {
      // Main gesture mode (home)
      "finance": "finance",
      "home": "home",
      "offline-ai": "offline-ai",
      "exit": "home", // 4 fingers on home = do nothing or could show exit
      // Finance gesture mode
      "income": "income",
      "budgets": "budgets",
      "savings": "savings",
      "reports": "reports",
    }
    
    if (target === "exit" && currentScreen === "home") {
      // Could trigger exit confirmation here
      return
    }
    
    const screen = screenMap[target]
    if (screen) {
      navigateTo(screen)
    }
  }, [navigateTo, currentScreen])

  const {
    connected: gestureConnected,
    currentMode,
    handDetected,
    switchToGestureMode,
    switchToCameraMode,
    switchToFinanceMode,
  } = useGestureControl({
    onNavigate: handleGestureNavigate,
    enabled: true,
  })

  // Switch gesture modes based on current screen
  useEffect(() => {
    if (currentScreen === "finance") {
      switchToFinanceMode()
    } else if (cameraActive) {
      switchToCameraMode()
    } else {
      switchToGestureMode()
    }
  }, [currentScreen, cameraActive, switchToFinanceMode, switchToCameraMode, switchToGestureMode])

  // Camera toggle callback for HomeScreen
  const handleCameraToggle = useCallback((active: boolean) => {
    setCameraActive(active)
  }, [])

  const renderScreen = () => {
    switch (currentScreen) {
      case "home":
        return <HomeScreen onNavigate={navigateTo} onCameraToggle={handleCameraToggle} />
      case "finance":
        return <FinanceScreen onNavigate={navigateTo} />
      case "income":
        return <IncomeExpenseScreen onNavigate={navigateTo} />
      case "budgets":
        return <BudgetsScreen onNavigate={navigateTo} />
      case "savings":
        return <SavingsScreen onNavigate={navigateTo} />
      case "reports":
        return <ReportsScreen onNavigate={navigateTo} />
      case "offline-ai":
        return <OfflineAIScreen onNavigate={navigateTo} />
      default:
        return <HomeScreen onNavigate={navigateTo} onCameraToggle={handleCameraToggle} />
    }
  }

  return (
    <FinanceProvider>
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

        {/* Hand detection indicator (global, shows on all screens) */}
        {gestureConnected && (
          <div className={cn(
            "fixed bottom-3 left-3 z-50 flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-all duration-300",
            handDetected 
              ? "border-primary/50 bg-primary/10" 
              : "border-glass-border bg-glass/50 backdrop-blur-sm"
          )}>
            <Hand className={cn(
              "w-3.5 h-3.5 transition-colors",
              handDetected ? "text-primary" : "text-muted-foreground/50"
            )} />
            <span className={cn(
              "text-[9px] font-medium transition-colors",
              handDetected ? "text-primary" : "text-muted-foreground/50"
            )}>
              {handDetected ? "Hand Detected" : (gestureConnected ? currentMode : "Offline")}
            </span>
            {handDetected && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
          </div>
        )}

        {/* Auto-refresh on new deploys */}
        <AutoRefresh />

        {/* Screen indicator */}
        <div className="fixed top-2 right-2 z-50">
          <span className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest">
            {currentScreen.replace("-", " ")}
          </span>
        </div>
      </main>
    </FinanceProvider>
  )
}
