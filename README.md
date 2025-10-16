# Lassa Fever Dashboard

Interactive Next.js dashboard for analysing Nigeria Centre for Disease Control (NCDC) Lassa fever surveillance data. The app ships with a data exploration view and an AI-assisted report generator that produce concise situation reports from Supabase-backed datasets for 2021–2025.

## Highlights
- Data explorer with year/week/state filters, weekly vs. yearly modes, and responsive Recharts line + bar visualisations
- D3-powered choropleth map that colours Nigerian states by suspected case counts using local GeoJSON assets
- Tabbed navigation between the dashboard and an automated report workspace that summarises Supabase aggregates via OpenAI or Gemini
- Serverless API (`app/api/report`) that validates filters, queries Supabase RPCs, and returns structured JSON sections for downstream rendering
- Dark/light theme support via `next-themes` and a shared design system of shadcn/ui primitives under `components/ui`

## Tech Stack
- **Framework**: Next.js 15 App Router, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui component library, custom theming in `styles/globals.css`
- **Data & APIs**: Supabase (`@supabase/supabase-js`, SSR helpers), RPC functions for distinct filters and summaries
- **Visualisation**: Recharts for series/summary charts, D3 for the interactive map, TopoJSON assets in `public/assets`
- **AI Reporting**: `openai` and `@google/generative-ai` clients with pluggable provider selection
## Project Structure
```text
app/
  layout.tsx             Root layout with theme provider and top-level navigation
  page.tsx               Default data dashboard entry point
  reports/page.tsx       Client-side workflow for generating LLM summaries
  api/report/route.ts    API route producing structured report sections from Supabase + LLM
components/
  app-navigation.tsx     Tab navigation between data and report views
  dashboard.tsx          Main dashboard container, filter state, and data fetching hooks
  NigeriaMap.tsx         D3 choropleth rendered inside StateMap
  state-map.tsx          Wraps NigeriaMap with UI chrome and legend
  summary.tsx            Weekly/yearly KPI cards, bar chart, and tabular breakdown
  time-series-chart.tsx  Recharts line chart for longitudinal trends
  ui/                    shadcn/ui primitives reused across the app
hooks/
  use-mobile.tsx         Responsive helpers for the shadcn sidebar/components
  use-toast.ts           Toast hook shared with the UI system
lib/
  data.ts                Supabase queries for raw case data and filter options
  reports.ts             Aggregate summary RPC call + percentage change helpers
  supabase.ts            Browser-safe Supabase client factory
  llm/                   Report prompt builder and provider-specific clients
  utils.ts               Formatting helpers consumed by UI + prompts
public/
  assets/maps/           GeoJSON map data (Nigeria states)
  placeholder-*.{png,svg,jpg}  Media used by UI components
scripts/
  list-gemini-models.mjs Utility for inspecting enabled Google Gemini models
styles/
  globals.css            Tailwind layer customisations and chart theme tokens
utils/supabase/
  client.ts              Browser client wrapper for Supabase SSR helpers
  server.ts              Route/app client factory for server components
  middleware.ts          Next.js middleware integration scaffold
```

## Data Model & Supabase RPCs
The dashboard expects a Supabase table named `lassa_data` with the following columns (minimum):

- `id` (UUID or integer primary key)
- `full_year` (INT) – calendar year of the record
- `week` (INT) – ISO week number
- `states` (TEXT) – Nigerian state name ("Total" rows are filtered out)
- `suspected`, `confirmed`, `deaths` (INT) – case counts
- Optional legacy columns such as `year` are handled defensively in `lib/data.ts`

Stored procedures (RPC functions) referenced by the app:

- `get_distinct_lassa_full_years()` → array of available years (numeric)
- `get_distinct_lassa_weeks(selected_year INT)` → array of `YYYY-W##` week keys
- `get_distinct_lassa_states()` → list of state names
- `get_lassa_summary(range_start DATE, range_end DATE, state_filters TEXT[])` → aggregate totals + averages for the report generator

Ensure these functions are deployed in Supabase for filters and summaries to populate correctly.

## Environment Variables
Create `.env.local` with the keys needed for Supabase and optional AI report generation:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI report generation (optional, defaults to OpenAI)
REPORT_LLM_PROVIDER=openai           # or "gemini"
OPENAI_API_KEY=sk-...
REPORT_OPENAI_MODEL=gpt-5-mini       # optional override
GEMINI_API_KEY=your_gemini_key       # or GOOGLE_GEMINI_API_KEY
REPORT_GEMINI_MODEL=gemini-2.5-flash # optional override
```

If no AI keys are provided, `/reports` will return configuration errors when attempting to generate summaries.

## Getting Started
1. Install dependencies: `npm install`
2. Duplicate `.env.local` and supply the Supabase + optional AI keys shown above
3. Run the development server: `npm run dev`
4. Visit [http://localhost:3000](http://localhost:3000) for the dashboard and switch to the **Reports** tab for the LLM workflow

## Available Scripts
- `npm run dev` – start the Next.js development server with hot reload
- `npm run build` – create a production build (run before deploying)
- `npm run start` – serve the production build locally
- `npm run lint` – run ESLint using the project configuration

## Notes
- The Nigeria map fetches `/assets/maps/nigeria_states.geojson`; ensure the asset is accessible when hosting statically.
- `scripts/list-gemini-models.mjs` performs network calls; review credentials and request approval before executing.
- Treat lint warnings as failures before committing, and verify environment variables via `.env.local` when working with Supabase.
