"use client"

import { useMemo } from "react"
import { usePathname, useRouter } from "next/navigation"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const routes = [
  { label: "Data View", value: "/" },
  { label: "Reports", value: "/reports" },
]

export function AppNavigation() {
  const pathname = usePathname()
  const router = useRouter()

  const activeValue = useMemo(() => {
    const matching = routes.find((route) => route.value !== "/" && pathname.startsWith(route.value))
    return matching?.value ?? "/"
  }, [pathname])

  return (
    <Tabs
      value={activeValue}
      onValueChange={(value) => {
        if (value !== activeValue) {
          router.push(value)
        }
      }}
      className="w-full"
    >
      <TabsList className="w-full justify-start gap-1">
        {routes.map((route) => (
          <TabsTrigger key={route.value} value={route.value} className="px-4">
            {route.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}


