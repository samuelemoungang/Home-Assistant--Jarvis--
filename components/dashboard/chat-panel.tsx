"use client"

import { useState, useRef, useCallback } from "react"
import { Send, Mic, MicOff, Paperclip, X, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { parseFinanceMessage, addTransaction } from "@/lib/api"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  timestamp: Date
  categoryOptions?: string[]
  pendingCategory?: {
    type: "income" | "expense"
    amount: number
    description: string
  }
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
const INCOME_CATEGORIES = ["Salary", "Freelance", "Investment", "Gift", "Refund", "Other"]

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

    // Short delay for natural feel
    await new Promise((resolve) => setTimeout(resolve, 400))

    if (useFinanceAI) {
      const result = parseFinanceMessage(userText)

      if (result.action === "add_transaction") {
        const msg: ChatMessage = {
          role: "assistant",
          content: `Add ${result.amount} CHF ${result.type} in ${result.category}?`,
          timestamp: new Date(),
          pendingTransaction: {
            type: result.type!,
            amount: result.amount!,
            category: result.category!,
            description: result.description || "",
            date: new Date().toISOString().split("T")[0],
          },
        }
        setMessages((prev) => [...prev, msg])
      } else if (result.action === "ask_category") {
        const cats = result.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
        const msg: ChatMessage = {
          role: "assistant",
          content: `I detected ${result.amount} CHF (${result.type}). Which category?`,
          timestamp: new Date(),
          categoryOptions: cats,
          pendingCategory: {
            type: result.type!,
            amount: result.amount!,
            description: result.description || "",
          },
        }
        setMessages((prev) => [...prev, msg])
      } else {
        const msg: ChatMessage = {
          role: "assistant",
          content: getSimulatedResponse(userText),
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, msg])
      }
    } else {
      const msg: ChatMessage = {
        role: "assistant",
        content: getSimulatedResponse(userText),
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, msg])
    }

    setIsLoading(false)
    onSpeakingChange?.(false)
    scrollToBottom()
  }

  async function handleCategorySelect(category: string, msgIndex: number) {
    const msg = messages[msgIndex]
    if (!msg.pendingCategory) return
    setIsLoading(true)

    try {
      const tx = await addTransaction({
        type: msg.pendingCategory.type,
        amount: msg.pendingCategory.amount,
        category,
        description: msg.pendingCategory.description,
        date: new Date().toISOString().split("T")[0],
      })
      const confirmMsg: ChatMessage = {
        role: "assistant",
        content: `Done! Added ${tx.amount} CHF ${tx.type} in ${tx.category}.`,
        timestamp: new Date(),
      }
      // Remove categoryOptions from the original message to prevent re-selection
      setMessages((prev) => {
        const updated = [...prev]
        updated[msgIndex] = { ...updated[msgIndex], categoryOptions: undefined, pendingCategory: undefined }
        return [...updated, confirmMsg]
      })
      onTransactionAdded?.()
    } catch {
      const errorMsg: ChatMessage = {
        role: "assistant",
        content: "Failed to add transaction. Please try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMsg])
    }

    setIsLoading(false)
    scrollToBottom()
  }

  async function handleConfirmTransaction(msgIndex: number) {
    const msg = messages[msgIndex]
    if (!msg.pendingTransaction) return
    setIsLoading(true)

    try {
      await addTransaction(msg.pendingTransaction)
      const confirmMsg: ChatMessage = {
        role: "assistant",
        content: `Done! Added ${msg.pendingTransaction.amount} CHF ${msg.pendingTransaction.type} in ${msg.pendingTransaction.category}.`,
        timestamp: new Date(),
      }
      setMessages((prev) => {
        const updated = [...prev]
        updated[msgIndex] = { ...updated[msgIndex], pendingTransaction: undefined }
        return [...updated, confirmMsg]
      })
      onTransactionAdded?.()
    } catch {
      const errorMsg: ChatMessage = {
        role: "assistant",
        content: "Failed to add transaction.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMsg])
    }

    setIsLoading(false)
    scrollToBottom()
  }

  function handleCancelTransaction(msgIndex: number) {
    const cancelMsg: ChatMessage = {
      role: "assistant",
      content: "Cancelled.",
      timestamp: new Date(),
    }
    setMessages((prev) => {
      const updated = [...prev]
      updated[msgIndex] = { ...updated[msgIndex], pendingTransaction: undefined }
      return [...updated, cancelMsg]
    })
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
              ? "Try: 'I spent 45 CHF on food' or 'Earned 3000 salary'"
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
            {msg.categoryOptions && msg.pendingCategory && (
              <div className="flex flex-wrap gap-1.5 mt-2 ml-1">
                {msg.categoryOptions.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategorySelect(cat, i)}
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
                  onClick={() => handleConfirmTransaction(i)}
                  className="flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-[10px] font-medium text-accent-foreground active:scale-95 transition-transform cursor-pointer"
                >
                  <Check className="w-3 h-3" /> Confirm
                </button>
                <button
                  type="button"
                  onClick={() => handleCancelTransaction(i)}
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
    return "Currently 12C and cloudy in Zurich. Expected to clear up this afternoon."
  }
  if (lower.includes("time")) {
    return `The current time is ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}.`
  }
  if (lower.includes("hello") || lower.includes("hi")) {
    return "Hello! I'm your Pi Assistant. Try telling me about your spending, like 'I spent 45 CHF on food' and I'll track it for you!"
  }
  if (lower.includes("help")) {
    return "I can track your finances! Try: 'Spent 30 on groceries', 'Earned 5000 salary', 'Paid 120 for insurance'. I'll detect the amount and category automatically."
  }
  return "I'm here to help track your finances. Try saying something like 'I spent 25 CHF on coffee' or 'Earned 3000 from salary'."
}
