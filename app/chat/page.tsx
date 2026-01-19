"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ChatPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Lassa Fever AI Assistant</h1>
        <p className="text-muted-foreground">
          Chat with an AI assistant specialized in Lassa fever data and insights
        </p>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Chatbot</CardTitle>
          <CardDescription>
            Ask questions about Lassa fever surveillance data, trends, and insights
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex w-full items-center justify-center overflow-hidden rounded-b-lg bg-background">
            <iframe
              src="https://artreb9924-lf-chatbot-2012-2025.hf.space"
              className="h-[1200px] w-full border-0"
              title="Lassa Fever Chatbot"
              allow="clipboard-read; clipboard-write"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

