# Build Issues and Solutions

## Case-Sensitivity Issue (Pre-existing)

### Problem

The codebase has a case-sensitivity mismatch between store filenames and their imports:

**Actual files (capital case):**
- `stores/Device.ts`
- `stores/Menu.ts`
- `stores/Order.ts`
- `stores/Session.ts`

**Import statements (lowercase):**
```typescript
import { useMenuStore } from '~/stores/menu'
import { useDeviceStore } from '~/stores/device'
import { useOrderStore } from '~/stores/order'
import { useSessionStore } from '~/stores/session'
```

This works on case-insensitive filesystems (macOS, Windows) but fails on Linux (CI/CD, production servers).

### Error Message

```
Error: [vite:load-fallback] Could not load /path/to/stores/menu (imported by middleware/menu-check.ts): 
ENOENT: no such file or directory, open '/path/to/stores/menu'
```

### Solution

**Option 1: Rename files to lowercase (Recommended)**

Rename the store files to match import conventions:
```bash
cd stores/
git mv Device.ts device.ts
git mv Menu.ts menu.ts
git mv Order.ts order.ts
git mv Session.ts session.ts
```

**Option 2: Update all imports to use capital case**

Update all 50+ import statements across the codebase to match the actual filenames:
```typescript
import { useMenuStore } from '~/stores/Menu'
import { useDeviceStore } from '~/stores/Device'
// etc...
```

### Recommendation

**Option 1** (renaming files) is preferred because:
- Lowercase filenames are the JavaScript/TypeScript convention
- Easier to maintain consistency going forward
- Single-step fix vs updating 50+ files

This issue is **not related** to the Capacitor integration and exists in the original codebase.

## Next Steps for Development

1. Fix the case-sensitivity issue using Option 1 above
2. Run `npm run build` to verify the fix
3. Proceed with Capacitor platform setup:
   ```bash
   npm run cap:add:android
   npm run cap:add:ios
   ```
4. Build and test native apps per [docs/CAPACITOR.md](CAPACITOR.md)
