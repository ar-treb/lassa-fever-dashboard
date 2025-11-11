import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"

interface StateMultiSelectProps {
  states: string[]
  value: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
  label: string
}

export function StateMultiSelect({ states, value, onChange, disabled, label }: StateMultiSelectProps) {
  const [open, setOpen] = useState(false)

  const toggleValue = (stateName: string) => {
    onChange(
      value.includes(stateName)
        ? value.filter((item) => item !== stateName)
        : [...value, stateName]
    )
  }

  const clearSelection = () => {
    onChange([])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
        >
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <Command>
          <CommandInput placeholder="Search states..." />
          <CommandList>
            <CommandEmpty>No states found.</CommandEmpty>
            <CommandGroup>
              <CommandItem onSelect={clearSelection} className="cursor-pointer font-medium text-primary">
                Clear selection
              </CommandItem>
              <Separator className="my-1" />
              {states.map((state) => {
                const isChecked = value.includes(state)
                return (
                  <CommandItem
                    key={state}
                    onSelect={() => toggleValue(state)}
                    className="flex cursor-pointer items-center gap-2"
                  >
                    <Checkbox checked={isChecked} className="pointer-events-none" />
                    <span>{state}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

