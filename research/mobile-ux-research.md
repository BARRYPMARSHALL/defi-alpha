# Mobile-First Design Patterns for a DeFi Yield App — Research Report (2025–2026)

## 1. Information architecture: bottom tabs win, hamburgers lose

Bottom tab bars are the dominant pattern because they keep top-level destinations thumb-reachable and visible. Apple HIG's tab bar guidance limits tabs to **2–5** ([HIG tab bars](https://github.com/raintree-technology/hig-doctor/blob/main/skills/hig-components-layout/references/tab-bars.md)), and Material 3's navigation bar is designed for **3–5 destinations**, recommending a drawer only for 6+ ([M3 navigation bar](https://m3.material.io/components/navigation-bar/overview)). In May 2025, Material 3 Expressive explicitly *dropped nav drawers on phones* in favor of short bottom bars — Google's own guidance now favors tabs over hamburgers ([9to5Google](https://9to5google.com/2025/05/14/material-3-expressive-navigation/)). Hidden-in-hamburger features measurably reduce adoption ([menu placement](https://productgrowth.in/resources/playbooks/product/menu-placement-adoption/)).

**Rules for your app:**
- **5 tabs max**, ordered by frequency: e.g. **Home (dashboard) · Vaults/Pools (browse) · Portfolio · Activity · Settings/More**. Robinhood, Coinbase, Cash App and Revolut all sit at 5 tabs; the pattern is validated in design teardowns ([Robinhood iOS critique](https://ixd.prattsi.org/2025/02/design-critique-robinhood-ios-app/)).
- First tab = overview of *the user's money*, not marketing. Detail screens (vault page, tx receipt) are pushed, not tabbed; drill into a tab, never into another tab.
- Keep hierarchy flat: tab → list → detail → action sheet. The dashboard is a summary card stack + one primary action, per fintech UX guidance ([ffnext](https://www.ffnext.io/blog/fintech-app-design)).

## 2. The "pools list" problem: card lists, not tables

On phones, dense tables fail. Best practice is **card lists with progressive disclosure**: each vault is a card showing APY, TVL, and 24h change; tap to expand or open detail ([Stubbs: data-heavy fintech interfaces](https://stubbs.pro/blog/article/designing-data-heavy-fintech-interfaces); [complex data tables](https://smart-interface-design-patterns.com/articles/complex-tables/)). Where a real grid is unavoidable (e.g. multi-column comparisons), the proven pattern is **horizontal scroll with a frozen first column** and sticky headers ([optimizing tables for mobile](https://askhndigests.com/blog/optimizing-data-tables-mobile-ux)).

- **Sorting:** tap the header chip to cycle sort; always show active sort + direction. Never offer 10 sort options on the home list — surface 3–4 (APY, TVL, Risk, Newest) and push the rest behind filters.
- **Pull-to-refresh:** keep showing the **last-known data while refreshing** — only show skeletons on true first load, never when data already exists ([UX SE on skeletons during refresh](https://ux.stackexchange.com/questions/151031/should-a-skeleton-loading-effect-be-used-when-refreshing-a-view-with-data-alread)). Base app's engineering team made instant perceived load their core goal by prefetching and rendering cached data first ([Base prefetching at scale](https://blog.base.dev/base-app-prefetching-at-scale)).
- **Skeletons:** shimmer placeholders matched to real card geometry, ~300–600ms minimum display to avoid flash; animate via transform, not opacity-only.

## 3. Filters: chips + bottom sheet, never a filter page

- **Chip filters** (M3 filter chips) for the 3–5 most common quick filters — "Stablecoins", "High APY", "Audited" ([M3 chips](https://m3.material.io/components/chips/overview)).
- **Advanced filters in a bottom sheet** (M3 modal bottom sheet / `ModalBottomSheet`), never a separate screen — the sheet keeps context and supports multi-select, ranges, and toggles ([UX SE: filter options in mobile lists](https://ux.stackexchange.com/questions/151323/best-way-of-showing-filter-options-in-list-reports-mobile-app)).
- Show **active filter count** on the trigger ("Filters · 2"); provide search within long lists (token search, not page search); persist a "Saved filters / Watchlist" concept for repeat users.

## 4. Notifications: transactional beats promotional

Fintech push notifications build trust when they're **personal, timely, and deep-linked** — e.g. "Your vault APY rose to 18.4%" tapping straight to that vault ([OneSignal: fintech trust & messaging](https://onesignal.com/blog/building-trust-and-driving-revenue-growth-with-fintech-messaging/)). For a yield app: alerts for **APY changes (up and down), TVL thresholds, harvest/deposit confirmations, and price moves**. Ask permission in context (after the user enables an alert), never at first launch; make alert creation a one-tap affordance on each vault card; support quiet-time rules. In-app notification center (bell on Home) mirrors push so nothing is lost.

## 5. Typography, spacing, theming: what separates premium from amateur

- **Tabular numerals** (`font-variant-numeric: tabular-nums`) so APY/TVL columns don't jitter; this is a deliberate, well-documented fintech pattern ([Actual Budget PR #6661](https://github.com/actualbudget/actual/pull/6661); Binance ships a dedicated numeral font, BinancePlex, for financial data ([Binance design notes](https://www.explainx.ai/designs/voltagent-awesome-design-md/binance/design-md)).
- **One number-formatting system, enforced globally**: fixed decimal rules per asset (e.g. stablecoins → 2dp, APY → 1dp), consistent sign/color conventions (green = up, red = down — never inverted), and a single formatter module ([Balancer's number formatting system](https://deepwiki.com/balancer/frontend-monorepo/10.5-number-formatting-system)).
- **Type scale:** 3–4 sizes only (display 32–40 / title 20–22 / body 15–17 / caption 12–13); monospace or tabular for all numbers; line-height 1.4–1.5. **8pt spacing grid**; cards 12–16px radius with 1px hairline borders in light mode, elevated fills in dark.
- **Dark mode first** for crypto; restrict palette to ~4 neutrals + 1–2 semantic accents (success/danger) + one brand color ([Coinbase design system, open sourced](https://www.coinbase.com/zh-sg/blog/Coinbase-has-open-sourced-its-design-system)). Amateur signals: glow effects, gradients on numbers, rainbow APY badges, drop shadows — all banned.
- Animate numbers with rolling/tweened counters (Coinbase ships `RollingNumber` for exactly this ([CDS RollingNumber](https://cds.coinbase.com/components/numbers/RollingNumber/))).

## 6. Visual trust: security, transparency, empty states

- **Surface security signals near money actions**: biometric confirmation dialogs, "Connected wallet: 0x1a2…f9" with copy, 2FA badges, and clear transaction preview screens (what changes, fees, slippage) ([U1Core: financial products people trust](https://www.u1core.com/fintech-ux-design-how-to-design-a-financial-product-people-trust/); [DEV: trust principles in fintech](https://dev.to/pocketportfolioapp/designing-trust-ux-principles-in-fintech-apps-2gfo)).
- **Clean numbers = trust**: no trailing noise, no fake precision ("18.427%"), amounts always paired with fiat equivalent.
- **Empty states are the trust moment**: distinguish "no data yet" (educate + primary CTA, e.g. deposit screen) from "service unavailable" (error + retry + live status) — never blur them ([UX SE: service unavailable vs empty state](https://ux.stackexchange.com/questions/155367/best-practices-for-displaying-service-unavailable-vs-empty-state-in-financia)); a loss-making or zero-APY portfolio should never be rendered as an error.

## 7. Reference examples of mobile-first dashboards

- **Real products to study:** Coinbase app (5-tab, huge-number dashboard, open-source design system — [Coinbase blog](https://www.coinbase.com/en-nl/blog/building-economic-freedom-one-pixel-at-a-time)), Robinhood (zero-clutter numbers, critique: [ixd.prattsi.org](https://ixd.prattsi.org/2025/02/design-critique-robinhood-ios-app/)), Base app (instant cached data: [blog.base.dev](https://blog.base.dev/base-app-prefetching-at-scale)), and DeFi-native mobile: Zapper, DeBank, Zerion ([DeFi tracker comparison](https://cleansky.io/compare/)) and Beefy (vault-card UX validated by user research: [deepwork.studio](https://deepwork.studio/project/beefy-finance)).
- **Visual references:** Finvest smart home dashboard ([Dribbble/Orbix](https://dribbble.com/shots/26080910-Finvest-Smart-Finance-Home-Dashboard-UI-Orbix-Studio)), Apex Wealth portfolio tracker ([Dribbble](https://dribbble.com/shots/27587298-Apex-Wealth-Investment-Portfolio-Asset-Tracking-Mobile-App)), Zenvest banking concept ([Muzli](https://me.muz.li/orbix-studio/zenvest-fintech-banking-app-design-2)).

## 8. Performance expectations on mobile

- **Perceived speed is the product**: render cached/stale data instantly, refresh silently in the background — this is literally Base app's architecture ([prefetching at scale](https://blog.base.dev/base-app-prefetching-at-scale)).
- **Budgets:** treat **LCP < 2.5s** (p75 on mid-range devices) as the target for financial services; LCP is a known pain point in finance sites, so preload hero data and avoid render-blocking JS ([Frameleads LCP for financial services](https://www.frameleads.com/finance/lcp); [Strapi 2025 performance checklist](https://strapi.io/blog/frontend-performance-checklist)). Keep initial JS bundle lean and code-split per route; lazy-load charts (they're the heaviest dependency in a yield app).
- **Image weight:** replace hero illustrations with CSS/SVG; WebP/AVIF for anything photographic; icon fonts or inline SVG over image sprites. Skeletons + prefetch cover the flash-of-loading problem.

**Top 5 rules to implement in React:** (1) 5 bottom tabs, Home = your money; (2) vaults = card list with 3–4 chip sorts + bottom-sheet filters; (3) tabular numerals + one global number formatter; (4) stale-while-refresh and skeletons only on first load; (5) dark-first theme, 8pt grid, no gradients/glow.
