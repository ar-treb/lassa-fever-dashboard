interface SectionListProps {
  title: string
  items: string[]
}

export function SectionList({ title, items }: SectionListProps) {
  if (!items.length) {
    return null
  }

  return (
    <section className="space-y-2">
      <h3 className="text-lg font-semibold">{title}</h3>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="text-muted-foreground">
            • {item}
          </li>
        ))}
      </ul>
    </section>
  )
}

