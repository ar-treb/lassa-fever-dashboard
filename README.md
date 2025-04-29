# Lassa Fever Dashboard

A dashboard for visualizing weekly Lassa fever data across Nigerian states from 2021-2025.

## Features

- **Time Series Visualization**: Track trends of suspected cases, confirmed cases, and deaths over time
- **Weekly Case Summaries**: View detailed statistics for any selected week
- **State-by-State Breakdown**: Analyze data by Nigerian state
- **Interactive Filters**: Filter data by year, week, and state

## Data Structure

The dashboard connects to a Supabase database with the following table structure:

\`\`\`sql
CREATE TABLE lassa_fever_data (
  id SERIAL PRIMARY KEY,
  year INTEGER NOT NULL,
  week INTEGER NOT NULL,
  week_formatted TEXT NOT NULL, -- Format: YYYY-WXX (e.g., 2021-W01)
  state TEXT NOT NULL,
  suspected INTEGER NOT NULL DEFAULT 0,
  confirmed INTEGER NOT NULL DEFAULT 0,
  deaths INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add a unique constraint to prevent duplicate entries
  UNIQUE(year, week, state)
);
\`\`\`

## Environment Variables

The application requires the following environment variables:

\`\`\`
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
\`\`\`

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000) in your browser
