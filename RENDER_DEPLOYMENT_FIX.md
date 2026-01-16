# Render Deployment Fix - Cannot find module dist/index.js

## Issue
Error: `Cannot find module '/opt/render/project/src/dist/index.js'`

## Root Cause
The build command wasn't creating the `dist/index.js` file properly, or the build wasn't running.

## Fixes Applied

1. ✅ Added `build:server` script to `package.json` (as alias for `build`)
2. ✅ Updated `render.yaml` to use `npm run build` 
3. ✅ Updated `nixpacks.toml` to use `npm run build`

## Build Process

The build command:
```bash
esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
```

This should create:
- `dist/index.js` - The bundled server file

## Verification

### Local Test
```bash
cd nesthome-backend
npm install
npm run build
ls -la dist/
```

You should see `dist/index.js` file.

### Render Deployment

1. **Check Build Logs:**
   - Go to Render Dashboard → Your Service → Logs
   - Look for the build phase
   - Verify it shows: `npm run build` completing successfully
   - Check that `dist/index.js` is created

2. **Check Start Command:**
   - The start command is: `npm start`
   - Which runs: `node dist/index.js`
   - Make sure the file exists at this path

## Common Issues

### Issue: Build succeeds but file not found
**Fix:** Check that `outdir=dist` is correct in the esbuild command

### Issue: Build fails
**Fix:** 
- Check for missing dependencies
- Verify Node.js version (should be 22 based on nixpacks.toml)
- Check TypeScript errors

### Issue: Wrong path
**Fix:** The error shows `/opt/render/project/src/dist/index.js`
- Render uses `/opt/render/project/src/` as the working directory
- So `dist/index.js` should be at `/opt/render/project/src/dist/index.js`
- This matches our build output

## Next Steps

1. **Commit and push:**
   ```bash
   cd nesthome-backend
   git add package.json render.yaml nixpacks.toml
   git commit -m "Fix build command for Render deployment"
   git push
   ```

2. **Redeploy on Render:**
   - Render will auto-deploy on push
   - Or manually trigger redeploy in Render dashboard

3. **Monitor Build Logs:**
   - Watch the build phase
   - Verify `dist/index.js` is created
   - Check for any errors

## Alternative: If Still Failing

If the build still fails, try this alternative build command in `package.json`:

```json
"build": "mkdir -p dist && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"
```

This explicitly creates the `dist` directory first.
