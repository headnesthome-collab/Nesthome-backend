# Fix: Cannot find module dist/index.js

## Issue
Error: `Cannot find module '/opt/render/project/src/dist/index.js'`

## Root Cause
The build might be:
1. Failing silently
2. Creating file in wrong location
3. Not creating the file at all

## Solution Applied

### Changed Build Command
**Before:**
```bash
--outdir=dist
```

**After:**
```bash
--outfile=dist/index.js
```

Using `--outfile` explicitly specifies the output file path, ensuring it's created correctly.

### Added Build Verification
Added post-build checks to verify the file exists:
- `postbuild` script checks if `dist/index.js` exists
- Build commands verify file creation
- Fails fast if file doesn't exist

## Build Process

1. **Install:** `npm ci` - Clean install
2. **Build:** `npm run build` - Creates `dist/index.js`
3. **Verify:** Checks that `dist/index.js` exists
4. **Start:** `npm start` - Runs `node dist/index.js`

## Verification

After build, you should see:
```
✅ Build successful - dist/index.js exists
```

If you see:
```
❌ Build failed - dist/index.js not found
```

Then the build failed and you need to check build logs.

## Debugging

### Check Build Logs on Render
1. Go to Render Dashboard → Your Service → Logs
2. Look for build phase output
3. Check for:
   - `dist/index.js` in file listing
   - Any error messages
   - Build completion status

### Local Test
```bash
cd nesthome-backend
npm install
npm run build
ls -la dist/
# Should show dist/index.js
```

### If Build Succeeds But File Not Found at Runtime

Check:
1. **Working Directory:** Render uses `/opt/render/project/src/`
2. **File Location:** Should be `/opt/render/project/src/dist/index.js`
3. **Start Command:** `npm start` should run from project root

## Alternative: Use Absolute Paths

If relative paths don't work, we can use absolute paths in the build:

```json
"build": "npx esbuild server/index.ts --platform=node --bundle --format=esm --outfile=$(pwd)/dist/index.js --packages=external --target=node20"
```

## Next Steps

1. **Commit and push:**
   ```bash
   git add package.json render.yaml nixpacks.toml
   git commit -m "Fix build output path - use outfile instead of outdir"
   git push
   ```

2. **Monitor build:**
   - Watch Render build logs
   - Verify `dist/index.js` is created
   - Check for any errors

3. **If still failing:**
   - Check build logs for specific errors
   - Verify esbuild is installed
   - Check TypeScript compilation errors
