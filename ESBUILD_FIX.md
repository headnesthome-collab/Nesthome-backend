# Fix for esbuild "not found" Error

## Issue
Build failing with: `sh: 1: esbuild: not found` (Status 127)

## Root Cause
Even though `esbuild` is in dependencies, the binary might not be in PATH during build. Using `npx` ensures it finds the locally installed esbuild.

## Fixes Applied

1. ✅ Changed build commands to use `npx esbuild` instead of `esbuild`
2. ✅ Updated to use `npm ci` for more reliable installs
3. ✅ `esbuild` is in `dependencies` (moved from devDependencies)

## Build Command Now
```bash
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
```

## Why `npx`?
- `npx` looks for binaries in `node_modules/.bin/`
- Ensures the locally installed esbuild is used
- Works even if esbuild isn't globally installed

## Alternative Solutions (if still failing)

### Option 1: Use full path
```json
"build": "mkdir -p dist && ./node_modules/.bin/esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"
```

### Option 2: Install esbuild globally in build
```yaml
buildCommand: npm install -g esbuild && npm ci && npm run build
```

### Option 3: Use npm scripts with explicit path
```json
"build": "mkdir -p dist && node_modules/.bin/esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"
```

## Verification

After deploying, check build logs:
1. Go to Render Dashboard → Your Service → Logs
2. Look for the build phase
3. Should see: `npx esbuild server/index.ts...`
4. Should complete without "not found" errors

## Next Steps

1. Commit and push:
   ```bash
   git add package.json render.yaml nixpacks.toml
   git commit -m "Use npx esbuild to fix command not found"
   git push
   ```

2. Monitor the new deployment
3. Check build logs for success
