# Along Carpooling App — Complete Design System Specification

* **Project:** Along — Carpooling App | UX/UI Case Study
* **Original Designer:** Pranjul Chawla
* **Primary Source:** [Along Carpooling App UX/UI Case Study on Behance](https://www.behance.net/gallery/258872423/Along-Carpooling-App-UXUI-Case-Study)
* **Specification Scope:** Full visual identity, design tokens, component anatomy, state definitions, and screen-by-screen UI inventory extracted from the Behance case study, augmented with clearly labeled **Recommended Implementation Specs** where the original case study omitted raw pixel/numeric values.

---

## 1. Brand Identity & Visual Language

### 1.1 Brand Foundations (Documented in Case Study)

| Attribute | Specification |
| :--- | :--- |
| **Product Name** | Along |
| **Tagline** | *"Carpool your way."* |
| **Core Brand Values** | Trust, Convenience, Flexibility, Comfort, Community |
| **Brand Personality** | Clean, approachable, trustworthy, utility-first, modern commuter-friendly |
| **Primary Platform Target** | Mobile-first (iOS & Android), adaptable to responsive Web |

### 1.2 Logo Concept & App Icon

* **Logo Anatomy:** Combines three symbolic elements into a unified mark:
  1. The letter **`A`** representing *Along*.
  2. A **curved/flowing path stroke** representing the shared route and journey.
  3. A **circular node/dot** representing people traveling together.
* **App Icon Construction:** The stylized blue curved **`A`** mark with its circular node centered on a deep near-black background (`#050412`), ensuring high contrast on both light and dark OS home screens.
* **Clear Space & Minimum Size *(Recommended Implementation Spec)*:** Maintain clear space equal to at least `0.25x` of the mark height on all sides; minimum digital render height `24px` for navbar marks and `48px` for launcher icons.

### 1.3 Illustration Style

* **Visual Style:** Flat / line-art editorial illustrations combining crisp dark outlines (`#050412`) with selective fills in Primary Blue (`#1E90FF`) and Light Sky Blue (`#8DCCFF`) over clean white or soft neutral surfaces.
* **Usage Contexts:** Onboarding slides, empty states (e.g., no rides found, no bookings yet), booking confirmations, luggage fit guidance, and verification prompts.

---

## 2. Color System

### 2.1 Documented Brand Palette (Explicit HEX from Behance)

| Token Name | Role | HEX | Primary Usage |
| :--- | :--- | :--- | :--- |
| `--color-brand-primary` | Primary Blue | `#1E90FF` | Primary CTAs, active navigation/tab states, active toggles, verification checkmarks, selected cards, focus borders, map route polylines |
| `--color-brand-secondary` | Light Sky Blue | `#8DCCFF` | Soft highlights, smart banner accents, selected card tints, illustration fills, secondary visual cues |
| `--color-neutral-ink` | Dark Navy / Near Black | `#050412` | Primary headings, primary body copy, primary icons, app icon background |
| `--color-neutral-surface` | Light Ice / Soft Grey-Blue | `#E9EEF5` | Secondary card surfaces, input fills/dividers, segmented control tracks, neutral badges |

### 2.2 Visually Observed UI & Semantic Colors

*(Observed in the high-fidelity screens; exact HEX values were not published in the Behance palette slide. Recommended implementation HEX values are provided for engineering parity.)*

| Token Name | Role | Recommended HEX *(Impl. Spec)* | Observed Usage in Screens |
| :--- | :--- | :--- | :--- |
| `--color-bg-canvas` | Pure White | `#FFFFFF` | Primary screen canvas, elevated ride cards, bottom sheets, secondary button fill |
| `--color-text-secondary` | Muted Slate Grey | `#5E6878` | Subtitles, timestamps, route metadata, secondary labels, inactive tab icons |
| `--color-text-tertiary` | Subtle Grey | `#8E98A8` | Input placeholders, disabled labels, helper hints |
| `--color-border-default` | Soft Divider Border | `#DCE3EE` | Card outlines, input borders (unfocused), list separators, social auth button border |
| `--color-status-success` | Success Green | `#16A34A` | `Confirmed` booking badge text/icon, live `ETA` / *"is on the way"* indicator dot |
| `--color-status-success-bg` | Success Surface Tint | `#DCFCE7` | Soft background fill for `Confirmed` pill badges and positive fit banners |
| `--color-status-info-bg` | Info / Standby Tint | `#EBF5FF` | Background for `Standby` badges, selected luggage cards, and AI Overview highlights |
| `--color-status-warning` | Warning Amber | `#D97706` | Tight luggage capacity caution, pending driver response warnings |
| `--color-status-danger` | Error / Destructive Red | `#DC2626` | Form validation errors, cancellation actions, destructive confirmations |
| `--color-rating-star` | Star Gold | `#F59E0B` | Filled driver/passenger rating stars on ride cards and profiles |
| `--color-backdrop` | Modal Dim Overlay | `rgba(5, 4, 18, 0.45)` | Dimmed scrim behind filter bottom sheets and confirmation modals |

### 2.3 Contrast & Accessibility Rules

* Primary button (`#FFFFFF` text on `#1E90FF` fill): Keep button text **SemiBold (600) at `>= 15px–16px`** or darken interactive hover/pressed states to `#1574D6` to ensure comfortable legibility and WCAG AA compliance.
* Primary body text (`#050412` on `#FFFFFF` and `#E9EEF5`) exceeds WCAG AAA (`> 14:1` contrast).

---

## 3. Typography System

### 3.1 Font Family (Documented in Case Study)

* **Primary Typeface:** **`Plus Jakarta Sans`** (Google Fonts; geometric neo-grotesque with high legibility on mobile UIs and crisp numerals for pricing and times).
* **Fallback Stack *(Recommended Implementation Spec)*:** `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`

### 3.2 Type Scale & Hierarchy

*(The case study specifies `Plus Jakarta Sans` and shows clear weight/size hierarchy across screens, without listing exact `px` values. Sizes below are Recommended Implementation Specs aligned to the visual proportions of the screens.)*

| Role / Token | Weight | Size / Line-Height *(Impl. Spec)* | Letter Spacing | Observed Usage & Examples |
| :--- | :--- | :--- | :--- | :--- |
| **Display / Hero** | ExtraBold (800) / Bold (700) | `28px / 34px` | `-0.02em` | Onboarding headlines (*"Find people going your way."*, *"Share your ride, split the cost."*) |
| **Screen Title (H1)** | Bold (700) | `22px / 28px` | `-0.015em` | Main screen headers, confirmation titles |
| **Section Heading (H2)** | SemiBold (600) / Bold (700) | `18px / 24px` | `-0.01em` | Section headers (*"Quick Search"*, *"Ride amenities"*, *"AI Overview"*) |
| **Card Title / Price (H3)** | SemiBold (600) / Bold (700) | `16px / 22px` | `0em` | Driver names, per-seat price callouts, route city names |
| **Body Default** | Regular (400) | `14px / 20px` | `0em` | Ride descriptions, profile bio, chat messages, policy notes |
| **Body Medium / Control** | Medium (500) / SemiBold (600) | `14px / 20px` | `0em` | Input text, tab labels, checkbox labels, button labels (`15px–16px` for primary CTAs) |
| **Caption / Metadata** | Regular (400) / Medium (500) | `12px / 16px` | `0.01em` | Departure/arrival timestamps, seat availability counts, review counts |
| **Overline / Field Label** | SemiBold (600) | `11px / 14px` | `0.06em` (Uppercase) | Search form micro-labels (`FROM`, `TO`, `DATE`, `PASSENGERS`), status pill badges |

---

## 4. Layout, Grid, Spacing, Border Radius & Elevation

*(Exact numeric tokens were not published in Behance; the following specifications formalize the visual rules observed across all screens using an 8pt base grid.)*

### 4.1 Layout & Responsive Breakpoints *(Impl. Spec)*

| Viewport | Layout Structure | Margins / Gutters | Max Content Width |
| :--- | :--- | :--- | :--- |
| **Mobile (`< 640px`)** | Single-column vertical scroll with fixed Bottom Navigation Bar | `16px` horizontal padding; `12px–16px` vertical gap | `100%` |
| **Tablet (`640px–1023px`)** | Centered single-column or 2-column ride card grid | `24px` horizontal padding; `16px` gutter | `720px` |
| **Desktop Web (`>= 1024px`)** | Top navigation bar (replacing bottom bar) + sticky filter sidebar + 1–2 column ride feed | `32px` horizontal padding; `24px` gutter | `1200px` |

### 4.2 Spacing Scale *(8pt Base Grid — Impl. Spec)*

| Token | Value | Typical Usage |
| :--- | :--- | :--- |
| `--space-1` | `4px` | Icon-to-text gap inside badges, tight metadata pairs |
| `--space-2` | `8px` | Element spacing inside cards, chip gaps, label-to-input gap |
| `--space-3` | `12px` | Standard gap between stacked list items and compact card padding |
| `--space-4` | `16px` | Screen horizontal padding, standard card internal padding, form field spacing |
| `--space-5` | `20px` | Bottom sheet horizontal padding, modal padding |
| `--space-6` | `24px` | Section-to-section vertical separation |
| `--space-8` | `32px` | Major layout breaks, empty state illustration spacing |

### 4.3 Border Radius Tiers

| Tier | Observed Pattern | Recommended Value *(Impl. Spec)* | Applied Components |
| :--- | :--- | :--- | :--- |
| **Small** | Subtle rounding | `8px` | Checkboxes, small tags, OTP input boxes |
| **Medium** | Soft rounded | `12px` | Text inputs, primary/secondary buttons, amenity cards, luggage selectable cards |
| **Large** | Card rounding | `16px` | Ride cards, main search card, profile summary cards, AI Overview card |
| **Sheet** | Top-only rounding | `24px 24px 0 0` | Bottom sheets (Filters, Luggage selector, Booking confirmation) |
| **Pill** | Full capsule | `9999px` | Status badges (`Confirmed`, `Standby`), Segmented controls, Toggle switches |
| **Circle** | Full circle | `50%` | User avatars, circular FABs, central `+` Publish button, stepper nodes |

### 4.4 Elevation & Shadows

| Level | Observed Usage | Recommended CSS *(Impl. Spec)* |
| :--- | :--- | :--- |
| **Level 0 (Flat)** | Secondary surfaces, bordered amenity cards, inline inputs | `none` (defined by `1px solid #DCE3EE` border or `#E9EEF5` fill) |
| **Level 1 (Card)** | Floating search card on Home, interactive ride cards | `0 2px 8px rgba(5, 4, 18, 0.06)` |
| **Level 2 (Floating)** | Bottom Navigation Bar, central `+` Publish CTA, floating Chat button | `0 6px 20px rgba(30, 144, 255, 0.22)` (for primary FAB) / `0 4px 16px rgba(5, 4, 18, 0.08)` |
| **Level 3 (Overlay)** | Filter Bottom Sheets, confirmation dialogs | `0 -8px 32px rgba(5, 4, 18, 0.14)` + dimmed backdrop `rgba(5, 4, 18, 0.45)` |

---

## 5. Iconography System

* **Primary Style (Outline / Line-Art):** Uniform stroke weight (`1.75px–2px` at `24px` grid), rounded caps and joins (compatible with libraries such as **Lucide**, **Iconsax Outline**, or **Phosphor Regular**).
  * Used in: Bottom Navigation Bar (inactive), form field leading icons (location pin, calendar, passenger count), swap arrows, amenities (AC snowflake, max-2-in-back seats, pet paw, instant bolt, no-smoking), luggage sizes, notification bell, back arrow, search magnifier.
* **Semantic Style (Filled):** Used selectively for status emphasis and active states:
  * Verified driver/user badge (filled `#1E90FF` shield/check).
  * Rating stars (filled gold).
  * Live ETA status indicator (filled green dot).
  * AI Overview sparkle icon.
  * Active Bottom Nav icon (filled or `#1E90FF` tinted).

---

## 6. UI Component Library

### 6.1 Buttons

| Variant | Anatomy & Styling | States | Observed Examples |
| :--- | :--- | :--- | :--- |
| **Primary Filled** | Fill `#1E90FF`, text `#FFFFFF`, SemiBold, radius `12px`, min-height `48px`, full-width on mobile forms | **Hover/Active:** darker blue (`#1574D6`); **Disabled:** `#E9EEF5` fill + muted grey text; **Loading:** inline white spinner | `Search Rides`, `Continue`, `Next`, `Publish Ride`, `Confirm Booking` |
| **Secondary Outlined** | Fill `#FFFFFF`, border `1.5px solid #1E90FF`, text `#1E90FF`, radius `12px`, min-height `48px` | **Hover/Active:** `#EBF5FF` fill; **Disabled:** `#DCE3EE` border + grey text | `Back to Search`, `Cancel Request` |
| **Social Auth Button** | Fill `#FFFFFF`, border `1px solid #DCE3EE`, left-aligned provider icon (Google) + centered `#050412` label | **Hover/Active:** `#E9EEF5` fill | `Continue with Google` |
| **Circular CTA / FAB** | Circle (`48px–56px`), fill `#1E90FF`, centered white arrow or `+` icon, Level 2 blue-tinted shadow | **Pressed:** slight scale (`0.96`) + `#1574D6` fill | Central `Publish (+)` nav button, onboarding next arrow, floating chat button |

### 6.2 Inputs & Form Controls

* **Search & Location Input Group:** Stacked `FROM` and `TO` fields with uppercase micro-labels, leading location/pin icons, and a circular overlapping **Swap Button** (vertical double-arrow) positioned on the right edge between both inputs.
* **Date & Passenger Picker Inputs:** Side-by-side compact inputs (`DATE`, `PASSENGERS`) with leading calendar and person icons that open native/custom date pickers or stepper controls.
* **Phone Number Input:** Unified bordered field with a country code selector prefix (e.g., `+91` with dropdown chevron), a vertical divider (`#DCE3EE`), and the numeric phone input.
* **4-Digit OTP Input:** Four equal square/rounded boxes (`48px–56px`) arranged horizontally; inactive boxes use `#DCE3EE` border, active/focused box highlights with `2px solid #1E90FF`.
* **Toggle Switch:** Pill-shaped track (`44px × 24px`); off state uses `#E9EEF5` / grey track, on state fills with `#1E90FF` with white circular thumb (used for *Live Location Sharing* and *Instant Booking*).
* **Amenity Checkbox Cards:** Full-width bordered containers (`12px` radius) pairing an amenity icon + label on the left with a checkbox on the right (AC, Max 2 in back, Pets allowed, Instant booking, Smoking allowed). Selected state highlights border in `#1E90FF`.
* **Radio Buttons & Dual-Thumb Range Slider:** Used inside the Filter Bottom Sheet for sorting/single-choice options and selecting a **Departure Time Window** (e.g., `06:00 AM – 11:00 AM`) with active `#1E90FF` track segment between two circular thumbs.
* **Selectable Luggage Cards:** 3-option interactive card selector (`Small`, `Medium`, `Large`) featuring luggage icon, size title, and dimension/weight hint. Selected card switches to `#1E90FF` border and soft `#EBF5FF` background tint.

### 6.3 Navigation Components

* **Top App Bar:** Height `56px`; Home displays the **Along** wordmark/logo on the left and a notification bell icon (with unread indicator dot) on the right; inner screens show a back arrow + screen title + optional trailing action.
* **Bottom Navigation Bar (Mobile):** Fixed bottom bar (`64px` height + safe-area inset) with 5 destinations:
  1. `Search`
  2. `Your Rides`
  3. `Publish (+)` — Elevated circular `#1E90FF` center button rising slightly above the bar
  4. `Chat`
  5. `Profile`
* **Segmented Controls:** Pill/rounded container with `#E9EEF5` track and white elevated active pill for binary switching:
  * Auth: `Phone` | `Email`
  * Rides: `Booked` | `Published`
  * Chat: `Individual` | `Groups`
* **Underline Sub-Tabs:** Horizontal scrollable or 4-column tab strip with a `2px` `#1E90FF` bottom indicator under the active tab (`Upcoming`, `Standby`, `Past`, `Cancelled`).

### 6.4 Cards, Steppers, Sheets & Feedback States

* **Ride Card (Core Marketplace Unit):**
  * **Top Section:** Vertical route timeline (origin dot → vertical line → destination pin) paired with departure/arrival times, city/pickup labels, and duration.
  * **Right/Header Callout:** Per-seat price in bold `#050412` and remaining seat count.
  * **Footer Section:** Driver circular avatar, full name + blue verification badge, star rating, and quick amenity/status badges (`Instant`, `Confirmed`, `Standby`).
* **Profile & Trust Cards:**
  * **Identity Header:** Large circular avatar, full name, rating summary, and join date.
  * **Verification Checklist Card:** Verified indicators for Government ID, Email, and Phone Number.
  * **AI Overview Card:** Highlighted card with sparkle icon summarizing passenger/driver feedback and reliability trends.
  * **3-Column Stats Card:** Evenly divided metric strip (e.g., Rides Completed, Rating, Response/Reliability).
* **7-Step Multi-Step Stepper (Publish Flow):** Horizontal row of 7 circular nodes connected by progress lines — completed nodes filled `#1E90FF` (with check or solid dot), active node ringed in `#1E90FF`, upcoming nodes in `#E9EEF5`.
* **Bottom Sheets:** Slide-up overlay sheets with top drag handle (`36px × 4px` `#DCE3EE` pill), header title + Reset/Close action, scrollable body, and sticky footer CTA (used for `Filters`).
* **Badges & Smart Banners:**
  * **Status Pills:** `Confirmed` (green tint + green text), `Standby` (blue tint + `#1E90FF` text), `Cancelled` (muted/red tint).
  * **Smart Fit Banner:** Soft blue/green inline callout inside booking flow predicting whether the selected luggage size fits the driver's trunk based on trunk photo & capacity.
  * **Live ETA Banner:** Green-dot active banner showing driver's live arrival estimate (*"Driver is on the way • ETA X mins"*) when location sharing is enabled.
* **Empty & Confirmation States:** Centered flat line-art illustration (`#050412` + `#1E90FF` + `#8DCCFF`), bold headline, short helper sentence, and a single Primary or Secondary CTA.

---

## 7. Complete Screen-by-Screen UI Inventory

| Module | Screens Identified in Case Study |
| :--- | :--- |
| **Onboarding & Auth** | Splash Screen, Onboarding Carousel (value propositions), Login (`Phone` / `Email` / `Google`), 4-Digit OTP Verification, Complete Profile |
| **Search & Booking** | Home Search + `Quick Search` Saved Routes, Search Results Feed, Filter Bottom Sheet (Time Range Slider, Amenities, Sort), Ride Details, Seat & Luggage Selection + Trunk Fit Check, Booking Confirmation / Standby Confirmation |
| **Your Rides** | Rides Hub (`Booked` / `Published` Segmented Control × `Upcoming` / `Standby` / `Past` / `Cancelled` Sub-tabs), Live Trip Status & ETA View |
| **Publish Ride (`+`)** | 7-Step Publish Wizard (Route/Pickup & Dropoff, Date & Time, Seats & Pricing, Trunk Photo & Luggage Capacity, Live Location Toggle, Ride Amenities, Review & Publish Confirmation) |
| **Chat & Community** | Chat List (`Individual` / `Groups` Segmented Control), 1-to-1 Trip Chat Thread, Commuter Group Thread |
| **Profile & Trust** | User Profile (Verification Badges, Bio, `AI Overview`, 3-Column Stats, Reviews), Government ID Verification, Settings |

---

## 8. Undocumented Specifications in Original Behance Case Study

For full transparency, the following items were **not** explicitly published as numeric specs or standalone diagrams on the [Behance project page](https://www.behance.net/gallery/258872423/Along-Carpooling-App-UXUI-Case-Study) and are therefore marked as *Recommended Implementation Specs* in Sections 2–4 above:

* Exact `px`/`pt` values for typography sizes, line heights, and letter spacing.
* Exact grid column counts, spacing tokens, border radius numbers, and CSS box-shadow strings.
* Official HEX codes for secondary semantic colors (Success Green, Warning Amber, Error Red, Neutral Greys, Star Gold).
* Standalone Information Architecture (IA) or User Flow diagram images (extracted directly from the high-fidelity screens and final concepts).