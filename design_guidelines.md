# Alpha Yield Scout - Design Guidelines

## Design Approach: Utility-First Financial Dashboard

**Selected Approach**: Design System (Function-Differentiated)  
**References**: Linear (clean data presentation), Coinbase/Binance (financial UI patterns), Aave (DeFi clarity)  
**Core Principle**: Information density with clarity - users need to scan, compare, and act on financial data quickly.

---

## Typography System

**Font Stack**: Inter (Google Fonts) for all text
- Headers (H1): text-3xl font-bold tracking-tight
- Section Headers (H2): text-2xl font-semibold
- Data Labels: text-sm font-medium uppercase tracking-wide
- Table Headers: text-xs font-semibold uppercase
- Body/Data: text-base font-normal
- Numbers (APY, TVL): font-mono for alignment and scannability
- Small Data: text-sm

---

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, and 8 consistently
- Component padding: p-4 to p-6
- Section spacing: space-y-6 to space-y-8
- Card padding: p-6
- Table cell padding: px-4 py-3

**Grid Structure**:
- Container: max-w-7xl mx-auto px-4
- Dashboard cards: grid grid-cols-1 md:grid-cols-3 gap-6
- Table: full-width responsive with horizontal scroll on mobile

---

## Component Library

### Header
- Fixed top navigation: h-16 with shadow
- Left: Logo + "Alpha Yield Scout" title (text-xl font-bold)
- Right: Refresh button, Connect Wallet button (primary), Theme toggle
- Mobile: Collapse to hamburger menu

### Summary Cards (Hero Metrics)
- Three cards in row: Total Opportunities, Average APY, Top Chain
- Each card: rounded-lg border with subtle shadow, p-6
- Structure: Large number (text-4xl font-bold), small label below (text-sm)
- Icon in top-right corner from Heroicons

### Main Data Table
- Sticky header row
- Alternating row backgrounds for scannability
- Columns: Chain (with logo/badge), Project, Symbol, TVL (right-aligned mono), APY (right-aligned mono with % badge), IL Risk (badge), Actions
- Sortable headers with arrow indicators
- Row hover state with subtle elevation
- Mobile: Horizontal scroll with sticky first column

### Filters Bar
- Positioned above table
- Layout: flex flex-wrap gap-4 items-center
- Elements: Dropdown selects, range inputs, toggle switches
- "Apply Filters" button (primary), "Reset" link (text)

### Recommendations Sidebar
- Fixed right panel on desktop (w-80), collapsible
- Mobile: Full-width section below table
- Card-based layout: each opportunity in rounded container with p-4
- Shows: Rank badge, Pool name, Risk score, "View Details" link

### Action Buttons (Table)
- Small buttons in button group: "DeFiLlama", "Zap In", "Add Liquidity"
- Size: text-xs px-2 py-1
- Icons from Heroicons (external link, arrows)

### Wallet Connected State
- Show truncated address (0x1234...5678) with copy icon
- "Your Current Yields" expandable section below summary cards
- Comparison cards showing current vs recommended (side-by-side)

### Charts
- Pie chart (Chain Distribution): Using Chart.js, max-w-md centered
- Legend below chart with percentage labels
- Container: rounded-lg border p-6

### Loading States
- Skeleton loaders for cards and table rows
- Spinner for refresh action
- Pulse animation on skeleton elements

### Badges & Tags
- APY badges: rounded-full px-2 py-1 text-xs font-semibold
- Risk indicators: rounded px-2 py-1 text-xs (Low/Medium/High)
- "Hot" tag: Small badge with flame icon for trending pools
- Chain badges: rounded-full with chain logo, compact

---

## Responsive Behavior

**Desktop (lg+)**:
- Sidebar fixed right
- Table shows all columns
- Cards in 3-column grid

**Tablet (md)**:
- Sidebar becomes collapsible drawer
- Table scrolls horizontally
- Cards in 2-column grid

**Mobile (base)**:
- Stack all elements vertically
- Hamburger menu for navigation
- Table: card-based view (each row becomes stacked card)
- Summary cards: single column

---

## Images

**Hero Section**: No hero image needed - this is a functional dashboard, not marketing. Start immediately with summary cards and data.

**Chain Logos**: Small circular logos (w-6 h-6) in table cells and badges. Use placeholder for now: `<!-- CHAIN LOGO: [chain name] -->`

**Icons**: Heroicons throughout for actions, filters, and UI elements (refresh, wallet, external link, chevrons, etc.)

---

## Key UX Patterns

1. **Information Hierarchy**: Numbers first (large, bold mono), labels second (small, muted)
2. **Scannability**: Right-align all numerical data, use consistent badge patterns
3. **Action Clarity**: Primary actions (Connect, Zap In) stand out, secondary actions subtle
4. **Real-time Feedback**: Show last refresh time, loading indicators during updates
5. **Mobile-First Table**: Transform table to cards on mobile for better usability
6. **Zero Empty States**: Show helpful messages when no results match filters

---

## Performance Considerations

- Virtualize table rows for 1000+ pools (use react-window if needed)
- Lazy load recommendations section
- Optimize chart rendering
- Cache filter preferences to localStorage