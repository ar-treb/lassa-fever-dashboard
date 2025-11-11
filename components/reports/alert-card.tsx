import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface AlertCardProps {
  title: string
  description: string
  variant: "default" | "destructive"
}

export function AlertCard({ title, description, variant }: AlertCardProps) {
  const isDestructive = variant === "destructive"

  return (
    <Card className={isDestructive ? "border-destructive/50 bg-destructive/10" : undefined}>
      <CardHeader>
        <CardTitle className={isDestructive ? "text-destructive" : undefined}>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={isDestructive ? "text-destructive" : "text-muted-foreground"}>{description}</p>
      </CardContent>
    </Card>
  )
}

