"use client"

import { useMemo } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { MoonIcon, SunIcon } from "lucide-react"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"

const routes = [
  { label: "Data View", value: "/" },
  { label: "Reports", value: "/reports" },
]

export function AppNavigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme, resolvedTheme } = useTheme()

  const activeValue = useMemo(() => {
    const matching = routes.find((route) => route.value !== "/" && pathname.startsWith(route.value))
    return matching?.value ?? "/"
  }, [pathname])

  return (
    <div className="flex w-full items-center justify-between gap-4">
      <Tabs
        value={activeValue}
        onValueChange={(value) => {
          if (value !== activeValue) {
            router.push(value)
          }
        }}
        className="flex-1"
      >
        <TabsList className="justify-start gap-1 rounded-xl bg-muted p-1">
          {routes.map((route) => (
            <TabsTrigger
              key={route.value}
              value={route.value}
              className="min-w-[170px] justify-center rounded-lg px-7 py-2 font-mono text-sm tracking-wide text-muted-foreground transition-colors data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=inactive]:hover:bg-muted/70 data-[state=inactive]:hover:text-foreground"
            >
              {route.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Button
        variant="outline"
        size="icon"
        onClick={() => {
          const nextTheme = (resolvedTheme ?? theme) === "dark" ? "light" : "dark"
          setTheme(nextTheme)
        }}
        aria-label="Toggle theme"
      >
        {(resolvedTheme ?? theme) === "dark" ? (
          <SunIcon className="h-4 w-4 text-orange-500" />
        ) : (
          <MoonIcon className="h-4 w-4 text-blue-600" />
        )}
      </Button>
    </div>
  )
}
