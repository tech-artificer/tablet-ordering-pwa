# Samgyupsal Tablet-Ordering PWA — UI/UX Design System

**Status**: ✅ Foundation Complete | ⏳ Remaining Refinements  
**Date**: April 6, 2026  
**Context**: Premium Korean BBQ (Samgyupsal) kiosk ordering experience

---

## 1. Design Aesthetic

### Color Palette (Warm Grilling Experience)
```
Primary (Gold/Fire):    #F6B56D (warm grill heat)
Primary Dark:           #C78B45 (darker for active states)
Primary Light:          #F9D0A1 (subtle accents)

Secondary (Charcoal):   #1A1A1A (deep background)
Secondary Dark:         #0F0F0F (deepest background)
Accent Warm:            #3D3530 (warm brown-charcoal)

Semantic:
  Success:              #10B981 (fresh, grilled)
  Error:                #EF4444 (alert, stop)
  Warning:              #F59E0B (caution)
```

### Typography
- **Display**: Raleway or serif (Premium headings)
- **Body**: Kanit (Friendly, readable)
- **Mono**: System font family (Code, numbers)

### Spacing & Grid
- **8pt Grid System**: All spacing in multiples of 4px (4, 8, 12, 16, 20, 24, 32, 40, 48...)
- **Tailwind classes**: Use standard utilities (px-4, py-6, gap-8, etc.)
- **Touch targets**: Minimum 44×44px (buttons, inputs)

### Shadows & Effects
```
glow:       0 0 20px rgba(246, 181, 109, 0.25)  [Primary glow]
glow-sm:    0 0 12px rgba(246, 181, 109, 0.15)  [Subtle glow]
warm:       0 4px 16px rgba(0, 0, 0, 0.4)        [Depth shadow]
```

### Animations
```
fade-in:        300ms ease-out (opacity)
slide-up:       400ms ease-out (translateY)
pulse-glow:     2s ease-in-out infinite
```

---

## 2. Screen-by-Screen Design Patterns

### Welcome Screen (index.vue) ✅
**Status**: Complete

**Elements**:
- Hero background: Warm gradient (secondary → accent-warm)
- Flame effect: Subtle (20% opacity)
- Logo: With warm glow halo
- Headline: Large serif + primary accent
- CTA Button: FlameButton variant="primary" size="lg"
- PIN Modal: Calculator numpad for settings access
- Connection Status: Top-left indicator badge

**Accessibility**:
- ✅ Focus ring on all buttons
- ✅ Keyboard navigation (tab through buttons)
- ✅ Color contrast: 4.5:1 (white text on dark backgrounds)
- ✅ ARIA labels on icon buttons

---

### Guest Counter (order/start.vue) ✅
**Status**: Complete

**Elements**:
- Step indicator: "Step 1" at top
- Large title: "How Many Guests?"
- Display: 96px bold number
- Controls: +/- buttons (80×80px, rounded-full)
- Button states: disabled when min/max reached
- Context: "2–20 guests maximum per table"

**Pattern**:
```vue
<button 
  class="w-20 h-20 rounded-full border-2 border-primary/60 bg-white/5 hover:bg-primary/20"
  :disabled="guestCount <= MIN"
/>
```

**UX Notes**:
- Large touch targets (80px) for tablets
- High contrast borders (primary/60)
- Smooth hover → active scale transitions

---

### Package Selection (order/packageSelection.vue) ✅
**Status**: Complete

**Elements**:
- Step indicator: "Step 2" + guest count
- Carousel: prev/next buttons + counter ("1/5")
- Package card: 
  - Title (Raleway, 3xl, white)
  - Description (2 lines max, white/70)
  - Meat list (8 visible items + "more" indicator)
  - Price display (4xl #F6B56D)
  - CTA: FlameButton primary + glow
- Popular badge: Primary/20 ring + star icon

**Styling**:
```vue
<div class="rounded-2xl overflow-hidden bg-gradient-to-br from-primary/15 via-white/5 to-primary/5 ring-1 ring-primary/40">
  <!-- Content -->
</div>
```

**Interactions**:
- Swipe left/right (mobile): navigate carousel
- Click prev/next: navigate carousel
- Card transitions: fade-in/fade-out (300ms)

---

### Menu Screen (menu.vue) — Pattern for Remaining Work
**Status**: ⏳ Needs Enhancement

**Recommended Layout**:
```
┌─────────────────────────────────────────────┐
│ Header: "Order More..." | Cart Badge        │  (sticky top)
├────────┬──────────────────────────────────┬─┤
│ Cats   │ Item Grid (3-4 cols)             │C│  (main area)
│ Menu  │ - PremiumCard per item            │a│
│ Items │ - Image + name + price + qty      │r│
│        │                                   │t│
│        │                                   │S│
│        │                                   │d│
│        │                                   │b│
└────────┴──────────────────────────────────┴─┘
```

**Component Structure**:
- **Category Tabs**: Sticky, horizontal scroll on mobile
  ```vue
  <button 
    v-for="cat in categories"
    :class="{ 'border-b-2 border-primary': activeCategory === cat }"
    class="px-4 py-2 text-white/70 hover:text-white"
  />
  ```
  
- **Item Card** (use PremiumCard):
  ```vue
  <PremiumCard
    :title="item.name"
    :price="`₱${item.price}`"
    :image="item.image"
    :premium="item.is_premium"
  >
    <template #footer>
      <div class="flex items-center gap-2">
        <button @click="decrementItem">−</button>
        <span>{{ quantity }}</span>
        <button @click="incrementItem">+</button>
      </div>
    </template>
  </PremiumCard>
  ```

- **Cart Sidebar** (CartSidebar):
  - Sticky right column
  - Order summary, totals
  - Checkout button (FlameButton primary)
  - Refill mode badge (RefreshCw icon + green)

---

### Review Screen (order/review.vue) ✅
**Status**: Design Updated (Minor)

**Current Implementation**: Good
- Warm background gradient
- Step 3 indicator
- Back button with proper styling
- OrderingStep3ReviewSubmit component (handles submission)
- Confetti celebration on submit

**Next Step**: Ensure OrderingStep3ReviewSubmit uses:
- PremiumCard for order summary
- FlameButton for confetti CTA
- Proper spacing (8pt grid)

---

### In-Session Screen — Pattern for Future
**Status**: ⏳ Needs Creation (check settings.vue or test.vue for pattern)

**Recommended Elements**:
- Order status badge: Icon + status text + timestamp
- Actions grid:
  - "Order More Meats" (Beef, Ribs icons)
  - "Order Sides" (Veggie, Rice icons)
  - "Order Drinks" (Wine, Beer icons)
  - "Call Staff" (Bell icon) → modal with request type
- Order history: Collapsible past orders section
- Session timer: Minutes remaining / Request status

**Styling Pattern**:
```vue
<div class="grid grid-cols-2 gap-4">
  <button class="flex flex-col items-center p-6 rounded-xl bg-primary/20 hover:bg-primary/30">
    <BeefIcon :size="32" class="mb-2" />
    <span class="text-sm font-semibold">Order More</span>
  </button>
</div>
```

---

## 3. Reusable Component Library

### FlameButton
**Variants**: primary | secondary | danger | outline  
**Sizes**: sm | md | lg  
**Props**: variant, size, disabled, @click

```vue
<FlameButton variant="primary" size="lg" @click="submit">
  <PackageIcon :size="20" />
  <span>Submit</span>
</FlameButton>
```

### GlowCard
**Props**: className  
**Children**: Slot content

```vue
<GlowCard class="p-6">
  <h3>Title</h3>
  <p>Content</p>
</GlowCard>
```

### PremiumCard
**Props**: title, subtitle, description, image, price, priceSubtext, premium, interactive, isEmpty, items  
**Slots**: footer

```vue
<PremiumCard 
  title="Premium Package"
  price="₱899"
  :premium="true"
  :items="['Wagyu', 'Pork Belly', 'Shrimp']"
>
  <template #footer>
    <FlameButton @click="select">Select</FlameButton>
  </template>
</PremiumCard>
```

---

## 4. Accessibility Checklist

- [ ] **Color Contrast**: All text meets 4.5:1 ratio (WCAG AA)
- [ ] **Focus States**: Visible focus rings on all interactive elements
- [ ] **Keyboard Navigation**: Tab order matches visual order
- [ ] **Touch Targets**: All buttons 44×44px minimum
- [ ] **ARIA Labels**: Icon-only buttons have aria-label
- [ ] **Semantic HTML**: `<button>`, `<input>`, `<label>` used correctly
- [ ] **Screen Reader**: Logical reading order, skip links if needed
- [ ] **Motion**: Respects prefers-reduced-motion (future enhancement)

---

## 5. Build & Deployment

### Build Command
```bash
npm run build
```

### Output
```
✅ Build complete! → .output/server
📦 Total size: ~48 MB (19 MB gzip)
```

### Preview
```bash
npm run preview
```

---

## 6. Future Enhancements

### Phase 2: Refinements
- Menu screen: Multi-image carousel per item
- Settings screen: Device WiFi/network status
- In-session: Real-time order status polling animation
- Animations: Staggered reveals on carousel changes

### Phase 3: Polish
- Dark mode toggle (theme provider)
- Haptic feedback on button press
- Reduced motion support (prefers-reduced-motion)
- Custom fonts: Load Playfair Display for serif display text

---

## 7. Design Tokens (Tailwind)

All colors, spacing, and effects are defined in `tailwind.config.js`:

```javascript
colors: {
  primary: '#F6B56D',
  secondary: '#1A1A1A',
  accent: '#2A2A2A',
  // ... (see config file for full list)
},
spacing: {
  // Standard 8pt grid (4, 8, 12, 16, 20, 24, 32, 40, 48...)
},
shadows: {
  glow: '0 0 20px rgba(246, 181, 109, 0.25)',
  warm: '0 4px 16px rgba(0, 0, 0, 0.4)',
}
```

---

## Summary

✅ **Completed Screens**:
1. Welcome (index.vue) — Warm hero, PIN modal, connection status
2. Guest Counter (order/start.vue) — Simple, tactile, large numbers
3. Package Selection (order/packageSelection.vue) — Full carousel, meat preview
4. Review (order/review.vue) — Minor styling refresh

⏳ **Pending Screens** (follow same warm aesthetic, use PremiumCard/FlameButton):
1. Menu (menu.vue) — Category tabs, item grid, cart sidebar
2. In-Session — Order status, quick refill buttons, staff calls

**Design Intent**: Every screen should evoke the warmth and excitement of gathering around the grill. Premium Korean BBQ experience from first tap to final order.

