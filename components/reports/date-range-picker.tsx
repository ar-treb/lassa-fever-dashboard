import { useMemo } from "react"
import {
  endOfMonth,
  endOfQuarter,
  endOfYear,
  format,
  isSameDay,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  subMonths,
  subQuarters,
  subYears,
} from "date-fns"
import type { DateRange } from "react-day-picker"
import { Calendar } from "@/components/ui/calendar"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface DateRangePickerProps {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  maxDate: Date
  onComplete?: () => void
}

export function DateRangePicker({ value, onChange, maxDate, onComplete }: DateRangePickerProps) {
  const months = useMemo(() => {
    const entries: { label: string; range: DateRange }[] = []
    for (let i = 0; i < 12; i += 1) {
      const monthStart = startOfMonth(subMonths(maxDate, i))
      const monthEnd = endOfMonth(monthStart)
      entries.push({
        label: format(monthStart, "MMM yyyy"),
        range: { from: monthStart, to: monthEnd },
      })
    }
    return entries
  }, [maxDate])

  const quarters = useMemo(() => {
    const entries: { label: string; range: DateRange }[] = []
    for (let i = 0; i < 8; i += 1) {
      const quarterStart = startOfQuarter(subQuarters(maxDate, i))
      const quarterEnd = endOfQuarter(quarterStart)
      const quarterNumber = Math.floor(quarterStart.getMonth() / 3) + 1
      entries.push({
        label: `Q${quarterNumber} ${quarterStart.getFullYear()}`,
        range: { from: quarterStart, to: quarterEnd },
      })
    }
    return entries
  }, [maxDate])

  const years = useMemo(() => {
    const entries: { label: string; range: DateRange }[] = []
    for (let i = 0; i < 6; i += 1) {
      const yearStart = startOfYear(subYears(maxDate, i))
      const yearEnd = endOfYear(yearStart)
      entries.push({
        label: `${yearStart.getFullYear()}`,
        range: { from: yearStart, to: yearEnd },
      })
    }
    return entries
  }, [maxDate])

  const isSameRange = (range: DateRange) => {
    if (!value?.from || !value?.to) return false
    return isSameDay(range.from as Date, value.from) && isSameDay(range.to as Date, value.to)
  }

  const applyQuickRange = (range: DateRange) => {
    onChange(range)
    onComplete?.()
  }

  const handleCalendarSelect = (range: DateRange | undefined) => {
    onChange(range)
    if (range?.from && range?.to) {
      onComplete?.()
    }
  }

  return (
    <Tabs defaultValue="custom" className="w-[640px]">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="custom">Custom</TabsTrigger>
        <TabsTrigger value="quick-months">Months</TabsTrigger>
        <TabsTrigger value="quick-ranges">Quarters & Years</TabsTrigger>
      </TabsList>
      <TabsContent value="custom" className="p-4 pt-2">
        <Calendar
          initialFocus
          mode="range"
          numberOfMonths={2}
          selected={value}
          onSelect={handleCalendarSelect}
          disabled={(date) => date > maxDate}
        />
      </TabsContent>
      <TabsContent value="quick-months" className="p-4 pt-2">
        <ScrollArea className="h-[280px] pr-2">
          <div className="grid gap-2">
            {months.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => applyQuickRange(option.range)}
                className={cn(
                  "flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                  isSameRange(option.range) ? "border-primary bg-primary/10" : "border-border"
                )}
              >
                <span>{option.label}</span>
                <span className="text-muted-foreground text-xs">
                  {format(option.range.from as Date, "MMM d")} – {format(option.range.to as Date, "MMM d")}
                </span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </TabsContent>
      <TabsContent value="quick-ranges" className="p-4 pt-2">
        <div className="space-y-4">
          <section>
            <h4 className="mb-2 text-sm font-semibold text-muted-foreground">Recent quarters</h4>
            <div className="grid gap-2">
              {quarters.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => applyQuickRange(option.range)}
                  className={cn(
                    "flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                    isSameRange(option.range) ? "border-primary bg-primary/10" : "border-border"
                  )}
                >
                  <span>{option.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {format(option.range.from as Date, "MMM d")} – {format(option.range.to as Date, "MMM d")}
                  </span>
                </button>
              ))}
            </div>
          </section>
          <section>
            <h4 className="mb-2 text-sm font-semibold text-muted-foreground">Recent years</h4>
            <div className="grid gap-2">
              {years.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => applyQuickRange(option.range)}
                  className={cn(
                    "flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                    isSameRange(option.range) ? "border-primary bg-primary/10" : "border-border"
                  )}
                >
                  <span>{option.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {format(option.range.from as Date, "MMM d yyyy")} – {format(option.range.to as Date, "MMM d yyyy")}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </TabsContent>
    </Tabs>
  )
}

