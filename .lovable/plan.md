

# ESG Dashboard for ING Bank

## Overview
A professional React dashboard for analyzing Environmental, Social, and Governance (ESG) climate performance data across 8 companies, grouped by sector. The app uses ING's brand orange (#FF6200) as the accent color on a clean white/neutral background.

## Data
- Load `esg_data.json` containing ESG metrics (Scope 1 & Scope 2 emissions, targets, action plans) for 8 companies across 2021–2023
- A single config object defines sector groupings (Energy & Utilities, Technology, Consumer Goods) reused throughout the app
- All values, labels, and scales derived dynamically from the data
- If the JSON is replaced with new data (same schema, different values), the entire app updates without code changes.

## App Structure

### Top Navigation
- Two toggle buttons at the top: **Overview** (default) and **Detailed Report**
- ING-branded header with clean typography

### Overview Mode — Two Charts

**Chart 1: Absolute Emissions by Sector**
- Stacked bar chart (Scope 1 + Scope 2) per company, grouped by sector with sector label headers
- Year selector toggle (2021 / 2022 / 2023)
- Y-axis: "Emissions (tCO2e)", tooltips on hover
- Two stacked colors per bar for Scope 1 vs Scope 2 breakdown

**Chart 2: Year-over-Year Percentage Change**
- Bar chart showing YoY % change in total emissions per company
- Year pair selector: "2021→2022" or "2022→2023"
- Green bars for reductions, red bars for increases
- Companies grouped by sector with sector headers

### Detailed Report Mode
- Placeholder page: "Detailed Report — coming soon"

## Design
- Desktop-optimized, clean professional layout
- ING orange (#FF6200) accent on white/neutral background
- Recharts for all visualizations
- Clear labels, hover tooltips, readable typography

