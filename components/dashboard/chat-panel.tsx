"use client"

import { useState, useRef, useCallback } from "react"
import { Send, Mic, MicOff, Paperclip, X, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { parseAssistantMessage, addTransaction, type AssistantResponse } from "@/lib/api"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  timestamp: Date
  action?: AssistantResponse
  categoryOptions?: string[]
  pendingTransaction?: {
    type: "income" | "expense"
    amount: number
    category: string
    description: string
    date: string
  }
}

interface ChatPanelProps {
  className?: string
  compact?: boolean
  onSpeakingChange?: (speaking: boolean) => void
  placeholder?: string
  useFinanceAI?: boolean
  onTransactionAdded?: () => void
}

const EXPENSE_CATEGORIES = ["Food", "Transport", "Housing", "Utilities", "Entertainment", "Health", "Shopping", "Education", "Insurance", "Other"]

export function ChatPanel({
  className,
  compact = false,
  onSpeakingChange,
  placeholder = "Ask me anything...",
  useFinanceAI = false,
  onTransactionAdded,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [attachedImage, setAttachedImage] = useState<string | null>(null)
  const [pendingAskCategory, setPendingAskCategory] = useState<AssistantResponse | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 100)
  }, [])

  const handleSend = async () => {
    if (!input.trim() && !attachedImage) return

    const userText = input.trim()
    const userMsg: ChatMessage = {
      role: "user",
      content: userText + (attachedImage ? "\n[Image attached]" : ""),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setAttachedImage(null)
    setIsLoading(true)
    onSpeakingChange?.(true)

    try {
      if (useFinanceAI) {
        const result = await parseAssistantMessage(userText)
        handleAssistantResponse(result)
      } else {
        // Simulated response for non-finance contexts
        await new Promise((resolve) => setTimeout(resolve, 1000))
        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: getSimulatedResponse(userText),
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMsg])
      }
    } catch {
      // Fallback if backend is offline
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: getSimulatedResponse(userText),
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMsg])
    }

    setIsLoading(false)
    onSpeakingChange?.(false)
    scrollToBottom()
  }

  function handleAssistantResponse(result: AssistantResponse) {
    if (result.action === "add_transaction" && result.saved) {
      const msg: ChatMessage = {
        role: "assistant",
        content: `Added ${result.type}: ${result.amount} CHF in ${result.category}${result.description ? ` (${result.description})` : ""}.`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, msg])
      onTransactionAdded?.()
    } else if (result.action === "add_transaction" && !result.saved) {
      // Show confirmation before saving
      const msg: ChatMessage = {
        role: "assistant",
        content: `Add ${result.amount} CHF ${result.type} in ${result.category}?`,
        timestamp: new Date(),
        pendingTransaction: {
          type: result.type!,
          amount: result.amount!,
          category: result.category!,
          description: result.description || "",
          date: result.date || new Date().toISOString().split("T")[0],
        },
      }
      setMessages((prev) => [...prev, msg])
    } else if (result.action === "ask_category") {
      setPendingAskCategory(result)
      const cats = result.categories || EXPENSE_CATEGORIES
      const msg: ChatMessage = {
        role: "assistant",
        content: `I detected ${result.amount} CHF (${result.type}). Which category?`,
        timestamp: new Date(),
        categoryOptions: cats,
      }
      setMessages((prev) => [...prev, msg])
    } else if (result.action === "add_savings") {
      if (result.saved) {
        const msg: ChatMessage = {
          role: "assistant",
          content: `Added ${result.amount} CHF to your savings goal.`,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, msg])
        onTransactionAdded?.()
      } else {
        const msg: ChatMessage = {
          role: "assistant",
          content: result.message || "Could not find that savings goal.",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, msg])
      }
    } else {
      const msg: ChatMessage = {
        role: "assistant",
        content: result.message || "I'm here to help with your finances. Try telling me about your spending or income.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, msg])
    }
  }

  async function handleCategorySelect(category: string) {
    if (!pendingAskCategory) return
    setIsLoading(true)

    try {
      const tx = await addTransaction({
        type: pendingAskCategory.type || "expense",
        amount: pendingAskCategory.amount!,
        category,
        description: pendingAskCategory.description || "",
        date: pendingAskCategory.date || new Date().toISOString().split("T")[0],
      })

      const msg: ChatMessage = {
        role: "assistant",
        content: `Added ${tx.amount} CHF ${tx.type} in ${tx.category}.`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, msg])
      onTransactionAdded?.()
    } catch {
      const msg: ChatMessage = {
        role: "assistant",
        content: "Failed to add transaction. Is the backend running?",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, msg])
    }

    setPendingAskCategory(null)
    setIsLoading(false)
    scrollToBottom()
  }

  async function handleConfirmTransaction(tx: ChatMessage["pendingTransaction"]) {
    if (!tx) return
    setIsLoading(true)

    try {
      await addTransaction(tx)
      const msg: ChatMessage = {
        role: "assistant",
        content: `Done! Added ${tx.amount} CHF ${tx.type} in ${tx.category}.`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, msg])
      onTransactionAdded?.()
    } catch {
      const msg: ChatMessage = {
        role: "assistant",
        content: "Failed to add transaction.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, msg])
    }

    setIsLoading(false)
    scrollToBottom()
  }

  const toggleListening = () => {
    setIsListening((prev) => !prev)
  }

  const handleFileAttach = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setAttachedImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Messages area */}
      <div
        className={cn(
          "flex-1 overflow-y-auto px-3 py-2 space-y-3 scrollbar-thin",
          compact ? "max-h-[140px]" : "max-h-[200px]"
        )}
      >
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
            {useFinanceAI
              ? "Tell me about your spending or income..."
              : "Start a conversation..."}
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i}>
            <div className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2 text-xs leading-relaxed",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                )}
              >
                {msg.content}
              </div>
            </div>

            {/* Category selection buttons */}
            {msg.categoryOptions && pendingAskCategory && (
              <div className="flex flex-wrap gap-1.5 mt-2 ml-1">
                {msg.categoryOptions.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategorySelect(cat)}
                    className="rounded-md border border-border bg-secondary px-2 py-1 text-[10px] font-medium text-secondary-foreground active:scale-95 transition-transform cursor-pointer hover:bg-primary hover:text-primary-foreground"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Confirm/Cancel transaction */}
            {msg.pendingTransaction && (
              <div className="flex gap-2 mt-2 ml-1">
                <button
                  type="button"
                  onClick={() => handleConfirmTransaction(msg.pendingTransaction)}
                  className="flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-[10px] font-medium text-accent-foreground active:scale-95 transition-transform cursor-pointer"
                >
                  <Check className="w-3 h-3" /> Confirm
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cancelMsg: ChatMessage = {
                      role: "assistant",
                      content: "Cancelled.",
                      timestamp: new Date(),
                    }
                    setMessages((prev) => [...prev, cancelMsg])
                  }}
                  className="flex items-center gap-1 rounded-md bg-destructive px-2.5 py-1 text-[10px] font-medium text-destructive-foreground active:scale-95 transition-transform cursor-pointer"
                >
                  <X className="w-3 h-3" /> Cancel
                </button>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-lg px-3 py-2 text-xs text-muted-foreground">
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachment preview */}
      {attachedImage && (
        <div className="px-3 pb-1 flex items-center gap-2">
          <div className="relative w-10 h-10 rounded border border-border overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={attachedImage} alt="Attached" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => setAttachedImage(null)}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center cursor-pointer"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
          <span className="text-xs text-muted-foreground">Image attached</span>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-border">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={handleFileAttach}
          className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
          aria-label="Attach image"
        >
          <Paperclip className="w-4 h-4" />
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
        />
        <button
          type="button"
          onClick={toggleListening}
          className={cn(
            "p-1.5 rounded-md transition-colors cursor-pointer",
            isListening
              ? "bg-destructive/20 text-destructive"
              : "hover:bg-secondary text-muted-foreground hover:text-foreground"
          )}
          aria-label={isListening ? "Stop listening" : "Start voice input"}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() && !attachedImage}
          className="p-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function getSimulatedResponse(input: string): string {
  const lower = input.toLowerCase()
  if (lower.includes("weather")) {
    return "Currently 12C and cloudy in Zurich. Expected to clear up this afternoon with highs of 16C."
  }
  if (lower.includes("time")) {
    return `The current time is ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}.`
  }
  if (lower.includes("light") || lower.includes("home")) {
    return "I can help control your smart home devices. Try saying 'turn on living room lights' or 'set thermostat to 22C'."
  }
  if (lower.includes("hello") || lower.includes("hi")) {
    return "Hello! I'm your Pi Assistant. I can help with weather, smart home controls, finance tracking, and more. How can I help?"
  }
  if (lower.includes("spent") || lower.includes("earned") || lower.includes("paid") || lower.includes("income") || lower.includes("expense")) {
    return "I detected a finance-related message. Connect me to your Proxmox backend to automatically track your transactions!"
  }
  return "I understand your request. Connect the Proxmox backend for full AI-powered responses. Try asking about the weather, time, or home controls."
}
