# Fix for "Cannot find package 'express'" Error

## Issue
Error: `Cannot find package 'express' imported from /opt/render/project/src/dist/index.js`

## Root Cause
The build was using `--packages=external` which tells esbuild NOT to bundle dependencies. This means:
- Dependencies need to be available at runtime
- `node_modules` must be present when running the built file
- But Render might not have `node_modules` in the right location

## Solution

Changed the build to bundle most dependencies, but keep native modules external:

```bash
npx esbuild server/index.ts --platform=node --bundle --format=esm --outdir=dist --external:firebase-admin --external:@neondatabase/serverless
```

### What Changed:
- ✅ Removed `--packages=external` (bundles all dependencies)
- ✅ Added `--external:firebase-admin` (native module, must stay external)
- ✅ Added `--external:@neondatabase/serverless` (native module, must stay external)

### Why:
- Most packages (express, zod, etc.) can be bundled
- Native modules (firebase-admin, @neondatabase/serverless) must stay external
- This creates a mostly self-contained bundle
- Only native modules need `node_modules` at runtime

## Alternative Solution (if bundling causes issues)

If bundling causes problems, we can keep dependencies external but ensure they're installed:

1. **Keep `--packages=external`**
2. **Ensure `node_modules` is available at runtime:**
   - Render should install dependencies during build
   - Make sure `npm ci` runs before build
   - Verify `node_modules` exists in the deployment

## Current Build Command

```json
"build": "mkdir -p dist && npx esbuild server/index.ts --platform=node --bundle --format=esm --outdir=dist --external:firebase-admin --external:@neondatabase/serverless"
```

This will:
- Bundle express, zod, and most other dependencies into `dist/index.js`
- Keep firebase-admin and @neondatabase/serverless external (they need node_modules)

## Runtime Requirements

After build, you still need:
- `node_modules` folder with `firebase-admin` and `@neondatabase/serverless`
- These are installed via `npm ci` during build
- Render should keep `node_modules` after build

## Next Steps

1. **Commit and push:**
   ```bash
   git add package.json
   git commit -m "Bundle dependencies but keep native modules external"
   git push
   ```

2. **Monitor deployment:**
   - Check build logs
   - Verify `dist/index.js` is created
   - Check that it runs without "Cannot find package" errors

## If Still Failing

If you still get module not found errors:

1. **Check if node_modules is preserved:**
   - Render might be cleaning up node_modules after build
   - Check Render build logs

2. **Try fully bundled (no externals):**
   ```json
   "build": "mkdir -p dist && npx esbuild server/index.ts --platform=node --bundle --format=esm --outdir=dist"
   ```
   Note: This might fail for native modules like firebase-admin

3. **Use a different approach:**
   - Don't bundle at all, just copy files
   - Or use a different build tool like `tsc` + `tsup`
