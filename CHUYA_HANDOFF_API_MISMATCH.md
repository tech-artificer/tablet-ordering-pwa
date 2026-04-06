# CHŪYA HANDOFF: V2 API Implementation for Tablet PWA
**Date:** February 20, 2026  
**Architect:** Ranpo Edogawa  
**Executor:** Chūya Nakahara  
**Priority:** P0 / IMMEDIATE  
**Active Directory:** `apps/woosoo-nexus/` (backend) + `apps/tablet-ordering-pwa/` (frontend — DO NOT TOUCH unless Option B chosen)

---

## The Crime Scene (Summary)

[stores/Menu.ts](c:\deployment-manager-legacy\apps\tablet-ordering-pwa\stores\Menu.ts) calls **8 V2 API endpoints** that **DO NOT EXIST** in backend. App will crash with 404 errors at menu initialization.

**Evidence:**
- Frontend calls: `/api/v2/tablet/packages`, `/api/v2/tablet/meat-categories`, `/api/v2/tablet/categories`, etc.
- Backend routes: Only `/api/menus/*` (V1) exist in [routes/api.php](c:\deployment-manager-legacy\apps\woosoo-nexus\routes\api.php)
- Missing controller: `TabletApiController.php`

---

## Mission Options (CHOOSE ONE)

### **Option A: Implement V2 API in Backend (RECOMMENDED)**
**Time:** 3-4 hours  
**Scope:** Backend only (`apps/woosoo-nexus/`)  
**Approval:** Requires Ranpo sign-off after implementation

### **Option B: Update Menu.ts to V1 API (TACTICAL)**
**Time:** 1-2 hours  
**Scope:** Frontend only (`apps/tablet-ordering-pwa/stores/Menu.ts`)  
**Approval:** Requires Ranpo sign-off after implementation

---

## OPTION A: Implement V2 Tablet API (RECOMMENDED)

### Files to Create/Edit

#### 1. **Create Controller**
**Path:** `apps/woosoo-nexus/app/Http/Controllers/Api/V2/TabletApiController.php`

**Required Methods:**
```php
<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Repositories\Krypton\MenuRepository;
use App\Http\Resources\MenuResource;
use App\Models\Krypton\Menu;

class TabletApiController extends Controller
{
    protected $menuRepository;

    public function __construct(MenuRepository $menuRepository)
    {
        $this->menuRepository = $menuRepository;
    }

    /**
     * GET /api/v2/tablet/packages
     * Returns all package menus (Set Meal A, B, C - IDs 46, 47, 48)
     */
    public function packages(Request $request)
    {
        // Map to V1: GET /api/menus/with-modifiers
        // Implementation:
        // 1. Fetch packages from MenuRepository::getMenusWithModifiers() or Menu::whereIn('id', [46,47,48])
        // 2. Load modifiers using Menu::getModifiers($packageId)
        // 3. Return as MenuResource::collection()
        // 4. Ensure response format: { data: [...], meta: {...} }
    }

    /**
     * GET /api/v2/tablet/meat-categories
     * Returns meat modifier groups (PORK, BEEF, CHICKEN)
     */
    public function meatCategories(Request $request)
    {
        // Map to V1: GET /api/menus/modifier-groups
        // Filter by group name = 'Meat Order' or similar
        // Return unique meat categories from modifier receipt_name prefixes (P*, B*, C*)
    }

    /**
     * GET /api/v2/tablet/categories
     * Returns tablet-specific categories (sides, desserts, beverages, alacarte)
     */
    public function categories(Request $request)
    {
        // Map to V1: Use MenuRepository to fetch categories from POS DB
        // Return: [
        //   { slug: 'sides', name: 'Sides' },
        //   { slug: 'dessert', name: 'Dessert' },
        //   { slug: 'beverage', name: 'Beverage' },
        //   { slug: 'alacarte', name: 'Alacarte' }
        // ]
    }

    /**
     * GET /api/v2/tablet/packages/{id}
     * Returns package details with modifiers
     * ?meat_category=PORK (optional filter)
     */
    public function packageDetails(Request $request, int $id)
    {
        // Map to V1: GET /api/menus?menu_id={id}
        // 1. Fetch package Menu::with(['modifiers','image'])->find($id)
        // 2. If meat_category param exists, filter modifiers by receipt_name prefix
        // 3. Return MenuResource
    }

    /**
     * GET /api/v2/tablet/categories/{slug}/menus
     * Returns menus for a specific category (sides, dessert, beverage)
     */
    public function categoryMenus(Request $request, string $slug)
    {
        // Map to V1: GET /api/menus/category?category={slug}
        // 1. Call MenuRepository::getMenusByCategory($slug)
        // 2. Return MenuResource::collection()
    }
}
```

#### 2. **Register Routes**
**Path:** `apps/woosoo-nexus/routes/api.php`

**Add AFTER Line 72 (in the `middleware(['api'])` group):**
```php
// V2 Tablet API
Route::prefix('v2/tablet')->middleware([\App\Http\Middleware\RequestId::class, 'api'])->group(function () {
    Route::get('/packages', [\App\Http\Controllers\Api\V2\TabletApiController::class, 'packages']);
    Route::get('/meat-categories', [\App\Http\Controllers\Api\V2\TabletApiController::class, 'meatCategories']);
    Route::get('/categories', [\App\Http\Controllers\Api\V2\TabletApiController::class, 'categories']);
    Route::get('/packages/{id}', [\App\Http\Controllers\Api\V2\TabletApiController::class, 'packageDetails']);
    Route::get('/categories/{slug}/menus', [\App\Http\Controllers\Api\V2\TabletApiController::class, 'categoryMenus']);
});
```

### Implementation Guidelines

#### **DO:**
- ✅ Use existing `MenuRepository` for all POS data fetching
- ✅ Reuse `MenuResource` for response formatting
- ✅ Use `Menu::getModifiers($packageId)` for package modifier mapping
- ✅ Validate inputs (package IDs must be 46/47/48, category slugs must be valid)
- ✅ Return proper HTTP status codes (200, 404, 422)
- ✅ Match response format expected by frontend (check Menu.ts line 89, 108, 127, etc.)
- ✅ Test all 5 endpoints with Postman/Thunder Client before sign-off

#### **DON'T:**
- ❌ Touch frontend code (`apps/tablet-ordering-pwa/`)
- ❌ Modify V1 endpoints or `BrowseMenuApiController.php`
- ❌ Add new database tables or migrations
- ❌ Break existing V1 API consumers (woosoo-orderpad may still use V1)
- ❌ Hard-code menu IDs outside of known packages (46, 47, 48)

### Data Mapping Reference

**V1 Endpoints → V2 Tablet Endpoints:**

| V2 Tablet Endpoint | V1 Equivalent | Data Source | Notes |
|--------------------|---------------|-------------|-------|
| `GET /api/v2/tablet/packages` | `GET /api/menus/with-modifiers` | Package menus 46/47/48 | Include modifiers via `Menu::getModifiers()` |
| `GET /api/v2/tablet/meat-categories` | `GET /api/menus/modifier-groups` | Modifier groups (Meat Order) | Extract PORK/BEEF/CHICKEN from receipt_name prefixes |
| `GET /api/v2/tablet/categories` | N/A (new abstraction) | Hard-coded or from POS category table | Return: sides, dessert, beverage, alacarte |
| `GET /api/v2/tablet/packages/{id}` | `GET /api/menus?menu_id={id}` | Menu model + modifiers | Support ?meat_category filter |
| `GET /api/v2/tablet/categories/{slug}/menus` | `GET /api/menus/category?category={slug}` | `MenuRepository::getMenusByCategory()` | Slug values: sides, dessert, beverage, alacarte |

### Testing Checklist (BEFORE Sign-Off)

- [ ] `GET /api/v2/tablet/packages` returns all 3 packages with modifiers
- [ ] `GET /api/v2/tablet/meat-categories` returns PORK/BEEF/CHICKEN groups
- [ ] `GET /api/v2/tablet/categories` returns 4 categories (sides, dessert, beverage, alacarte)
- [ ] `GET /api/v2/tablet/packages/46` returns Set Meal A with modifiers
- [ ] `GET /api/v2/tablet/packages/46?meat_category=PORK` filters modifiers to pork only
- [ ] `GET /api/v2/tablet/categories/sides/menus` returns sides menus
- [ ] `GET /api/v2/tablet/categories/dessert/menus` returns dessert menus
- [ ] All responses match frontend expected format (check Menu.ts lines 89-270)
- [ ] No 500 errors, only 200/404/422 where appropriate
- [ ] No breaking changes to existing V1 endpoints

### Acceptance Criteria

1. All 5 V2 endpoints implemented and working
2. Response formats match PWA expectations (validate against [stores/Menu.ts](c:\deployment-manager-legacy\apps\tablet-ordering-pwa\stores\Menu.ts))
3. No errors in Laravel logs when endpoints are called
4. Routes registered in [routes/api.php](c:\deployment-manager-legacy\apps\woosoo-nexus\routes\api.php)
5. Controller follows Laravel 11 best practices (type hints, validation, resources)
6. Manual test with Thunder Client/Postman shows correct data structure

---

## OPTION B: Update Menu.ts to V1 API (TACTICAL)

### Files to Edit

#### 1. **Update Menu Store**
**Path:** `apps/tablet-ordering-pwa/stores/Menu.ts`

**Changes Required:**

**Line 87 — fetchPackages():**
```typescript
// OLD:
const { data } = await api.get('/api/v2/tablet/packages');

// NEW:
const { data } = await api.get('/api/menus/with-modifiers');
```

**Line 108 — fetchMeatCategories():**
```typescript
// OLD:
const { data } = await api.get('/api/v2/tablet/meat-categories');

// NEW:
const { data } = await api.get('/api/menus/modifier-groups');
// Map response to extract PORK/BEEF/CHICKEN from modifier groups
this.meatCategories = Array.isArray(data.data) 
    ? data.data.map(group => ({
        id: group.id,
        name: extractMeatType(group.name), // PORK/BEEF/CHICKEN
        slug: extractMeatType(group.name).toLowerCase()
    }))
    : [];
```

**Line 127 — fetchTabletCategories():**
```typescript
// Hard-code categories (no V1 equivalent)
this.tabletCategories = [
    { slug: 'sides', name: 'Sides' },
    { slug: 'dessert', name: 'Dessert' },
    { slug: 'beverage', name: 'Beverage' },
    { slug: 'alacarte', name: 'Alacarte' }
];
```

**Line 145 — fetchPackageDetails():**
```typescript
// OLD:
const { data } = await api.get(`/api/v2/tablet/packages/${packageId}`, { params });

// NEW:
const { data } = await api.get(`/api/menus`, { params: { menu_id: packageId, ...params } });
```

**Lines 183, 212, 241, 270 — category menus:**
```typescript
// OLD:
const { data } = await api.get(`/api/v2/tablet/categories/${category.slug}/menus`);

// NEW:
const { data } = await api.get(`/api/menus/category`, { params: { category: category.slug } });
```

### Implementation Guidelines

#### **DO:**
- ✅ Update all 8 V2 endpoint calls to V1 equivalents
- ✅ Map V1 response format to match PWA expectations
- ✅ Test all menu loading flows (packages, categories, modifiers)
- ✅ Preserve error handling and loading states
- ✅ Ensure no TypeScript compilation errors

#### **DON'T:**
- ❌ Touch backend code (`apps/woosoo-nexus/`)
- ❌ Change type definitions in `types/index.ts`
- ❌ Remove existing error handling or loading flags
- ❌ Break other stores that depend on Menu.ts (Order.ts, Session.ts)

### Testing Checklist (BEFORE Sign-Off)

- [ ] App loads menu data without 404 errors
- [ ] Packages display on package selection screen
- [ ] Meat categories load correctly
- [ ] Desserts/sides/beverages load when selected
- [ ] Package details show modifiers
- [ ] No TypeScript errors in terminal
- [ ] No console errors in browser DevTools

### Acceptance Criteria

1. All API calls changed from V2 to V1 endpoints
2. App loads menu data successfully
3. No 404 errors in Network tab
4. Package selection screen shows all 3 packages
5. Category menus load correctly
6. No breaking changes to order flow

---

## Failure Modes to Test (BOTH OPTIONS)

### **Scenario 1: Invalid Package ID**
- Request: `GET /api/v2/tablet/packages/999` (Option A) or `GET /api/menus?menu_id=999` (Option B)
- Expected: 404 Not Found with error message

### **Scenario 2: Invalid Category Slug**
- Request: `GET /api/v2/tablet/categories/invalid/menus` (Option A) or `GET /api/menus/category?category=invalid` (Option B)
- Expected: 404 Not Found or empty array with success status

### **Scenario 3: Empty Modifiers**
- Request: Package that has no modifiers defined
- Expected: Empty modifiers array, not null or undefined

### **Scenario 4: Network Timeout**
- Simulate slow API response (>5s)
- Expected: Loading state shown, timeout handled gracefully

---

## Ranpo's Sign-Off Requirements

### **Option A (Backend Implementation):**
1. All 5 endpoints implemented in `TabletApiController.php`
2. Routes registered in `routes/api.php`
3. Manual test results (Postman/Thunder Client) showing correct responses
4. No 500 errors in Laravel logs
5. Response formats validated against frontend expectations
6. Existing V1 endpoints unaffected (test with woosoo-orderpad if available)

### **Option B (Frontend Update):**
1. All 8 V2 API calls changed to V1 equivalents
2. App successfully loads menu data (screenshot of menu screen)
3. No 404 errors in browser Network tab
4. No TypeScript compilation errors
5. No console errors in DevTools
6. Order flow tested end-to-end (package selection → order submission)

---

## Handoff Checklist

- [ ] Read [CASE_FILE.md](c:\deployment-manager-legacy\apps\tablet-ordering-pwa\CASE_FILE.md) (P0 Blocker section)
- [ ] Choose Option A or Option B (document choice in handoff response)
- [ ] Create implementation plan with file list
- [ ] Execute changes in active directory only
- [ ] Run manual tests (checklist above)
- [ ] Document test results
- [ ] Request Ranpo sign-off with evidence

---

**All clear! This case is closed… unless you've managed to mess it up again.**

— Ranpo Edogawa, Chief Architect
