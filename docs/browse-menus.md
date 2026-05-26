# Browse Menu API Reference

> **Audience:** Backend developers and integrators working with the Woosoo Nexus API.
> This document describes server-side controller and resource behaviour in the
> `woosoo-nexus` repository. It is stored here for cross-repo reference because
> the Tablet Ordering PWA consumes these endpoints directly.

**Controller file (woosoo-nexus):** `app/Http/Controllers/Api/V1/BrowseMenuApiController.php`

Base URL used in examples: `https://192.168.1.31` (restaurant server). Replace with your
actual `PUBLIC_HOST` in other environments.

---

## Controller Overview

Provides read-only API endpoints that return menus, modifier groups, and modifiers for device
and client apps. Uses `MenuRepository`, stored procedures, and two resource transformers:
`MenuResource` and `MenuModifierResource`.

**Key files (all in woosoo-nexus):**
- Controller: `app/Http/Controllers/Api/V1/BrowseMenuApiController.php`
- Resources: `app/Http/Resources/MenuResource.php`, `app/Http/Resources/MenuModifierResource.php`
- Routes: `routes/api.php`

---

## Resource Schemas

### MenuResource

| Field | Type | Notes |
|---|---|---|
| `id` | integer | |
| `group` | string\|null | |
| `category` | string\|null | |
| `course` | string\|null | |
| `name` | string | |
| `kitchen_name` | string\|null | |
| `receipt_name` | string\|null | |
| `price` | string | Formatted to two decimals, e.g. `"12.50"` — parse to number for arithmetic |
| `is_taxable` | boolean\|null | |
| `is_available` | boolean\|null | |
| `is_discountable` | boolean\|null | |
| `img_url` | string | URL; falls back to placeholder asset |
| `tax` | object\|null | Present only when `tax` relation is loaded |
| `tax_amount` | number\|null | |
| `modifiers` | array | Array of `MenuModifierResource` objects; empty array if none |

### MenuModifierResource

| Field | Type | Notes |
|---|---|---|
| `id` | integer | |
| `menu_group_id` | integer\|null | |
| `group` | string\|null | |
| `name` | string | |
| `category` | string\|null | |
| `kitchen_name` | string\|null | |
| `receipt_name` | string\|null | |
| `price` | string | Formatted, two decimals |
| `description` | string\|null | |
| `is_available` | boolean\|null | |
| `is_modifier` | boolean\|null | |
| `is_modifier_only` | boolean\|null | |
| `img_url` | string | URL; placeholder fallback |

---

## Route Mapping

| Method | Path | Handler |
|---|---|---|
| GET | `/menus` | `getMenus` |
| GET | `/menus/with-modifiers` | `getMenusWithModifiers` |
| GET | `/menus/modifier-groups` | `getAllModifierGroups` |
| GET | `/menus/modifiers` | `getMenuModifiers` |
| GET | `/menus/modifier-groups/{id}/modifiers` | `getMenuModifiersByGroup` |
| GET | `/menus/course` | `getMenusByCourse` |
| GET | `/menus/group` | `getMenusByGroup` |
| GET | `/menus/category` | `getMenusByCategory` |
| GET | `/menus/bundle` | `MenuBundleController` (separate controller) |

---

## Endpoint Details

### GET /menus

- **Query params:** `menu_id` (optional, integer)
- **Behaviour:** Calls `MenuRepository::getMenus()`, eager-loads `modifiers` and `image`, returns `MenuResource::collection(...)`.
- **Response (200):** Array of `MenuResource` objects.

```bash
curl -X GET "https://192.168.1.31/api/menus"
```

Example item:
```json
{
  "id": 123,
  "group": "Mains",
  "category": "Beef",
  "course": "Main",
  "name": "Grilled Steak",
  "kitchen_name": "Steak",
  "receipt_name": "STK",
  "price": "25.00",
  "is_taxable": true,
  "is_available": true,
  "is_discountable": false,
  "img_url": "https://192.168.1.31/images/menu-placeholder/1.jpg",
  "tax": null,
  "tax_amount": 2.5,
  "modifiers": []
}
```

---

### GET /menus/with-modifiers

- **Query params:** none
- **Behaviour:** Uses a hard-coded mapping for parent menu IDs (46, 47, 48) and filters modifiers by `receipt_name`. Attaches a `modifiers` collection to each parent menu model then returns `MenuResource::collection(...)`.
- **Response (200):** Array of `MenuResource` objects, each with `modifiers` filled.
- **On error:** Returns `{ "error": "Failed to retrieve object-based grouped modifiers." }` with HTTP 500.

```bash
curl -X GET "https://192.168.1.31/api/menus/with-modifiers"
```

---

### GET /menus/modifier-groups

- **Query params:** `modifiers` (optional, boolean)
- **Behaviour:** Returns `MenuRepository::getAllModifierGroups()` output.

Response fields per record:

| Field | Type |
|---|---|
| `id` | integer |
| `name` | string |
| `is_available` | boolean |
| `index` | integer |
| `display_in_pos` | integer |
| `menu_group_id` | integer |
| `menu_group_name` | string |
| `menu_tax_type_id` | integer\|null |
| `menu_category_id` | integer\|null |
| `menu_course_type_id` | integer\|null |
| `is_discountable` | boolean |
| `is_taxable` | boolean |

```bash
curl -X GET "https://192.168.1.31/api/menus/modifier-groups?modifiers=1"
```

---

### GET /menus/modifiers

- **Query params:** none
- **Behaviour:** Runs stored procedure `CALL get_menu_modifiers()`, groups results by `group.name`, maps each group to `MenuModifierResource::collection()`.
- **Response (200):** Object keyed by group name → array of `MenuModifierResource` objects.

```bash
curl -X GET "https://192.168.1.31/api/menus/modifiers"
```

Example response structure:
```json
{
  "PORK": [ { "id": 456, "name": "Bacon", "price": "1.50", ... } ],
  "BEEF": [ ... ]
}
```

---

### GET /menus/modifier-groups/{id}/modifiers

- **Path param:** `id` (integer)
- **Behaviour:** Returns `MenuModifierResource::collection(...)` for modifiers belonging to the requested modifier-group ID.
- **Response (200):** Array of `MenuModifierResource` objects.

---

### GET /menus/course

- **Query params:** `course` (required, string)
- **Behaviour:** Runs `CALL get_menus_by_course(?)`, plucks IDs, returns `MenuResource::collection(...)`.

```bash
curl -G "https://192.168.1.31/api/menus/course" --data-urlencode "course=starter"
```

---

### GET /menus/category

- **Query params:** `category` (required, string)
- **Behaviour:** Runs `CALL get_menus_by_category(?)`, plucks IDs, returns `MenuResource::collection(...)`.

```bash
curl -G "https://192.168.1.31/api/menus/category" --data-urlencode "category=drinks"
```

---

### GET /menus/group

- **Query params:** `group` (required, string)
- **Behaviour:** Uses `MenuRepository::getMenusByGroup($group)` to fetch IDs then returns `MenuResource::collection(...)`.

```bash
curl -G "https://192.168.1.31/api/menus/group" --data-urlencode "group=Sides"
```

---

## Known Issues and Implementation Notes

| Issue | Detail |
|---|---|
| `price` is a formatted string | Clients must parse to number for arithmetic operations |
| `getMenuModifiers` returns an object, not an array | Keyed by group name → array of modifier resources |
| Stored-procedure call inconsistency | `CALL get_menu_modifiers()` vs `CALL get_menu_modifiers` — standardise to `CALL get_menu_modifiers()` |
| `getMenuModifiersByGroup` handler | Route exists; verify the handler is implemented in the controller before relying on it |
| `getAllModifierGroups` returns raw repository output | Consider wrapping in a Resource for consistent API shape |
| Error handling inconsistency | Some methods throw after logging; others return JSON error objects — prefer JSON error objects with appropriate HTTP status codes |
