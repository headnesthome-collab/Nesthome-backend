# Render Build Debug Guide

## Current Error
`Error: Cannot find module '/opt/render/project/src/dist/index.js'`

## Debugging Steps

### 1. Check Render Build Logs

Go to Render Dashboard → Your Service → Logs → Build Logs

Look for:
- ✅ `Build completed. Checking output...`
- ✅ `dist/index.js exists`
- ❌ Any error messages
- ❌ `dist/index.js not found!`

### 2. Verify Build Command

The build command should:
1. Run `npm ci` (install dependencies)
2. Run `npm run build` (compile code)
3. Verify `dist/index.js` exists
4. Exit with error if file doesn't exist

### 3. Check Build Output

In build logs, you should see:
```
Build output:
-rw-r--r-- 1 user user 26K dist/index.js
✅ dist/index.js exists
```

### 4. Common Issues

#### Issue: Build fails before creating file
**Check:** Look for TypeScript errors or esbuild errors in logs

#### Issue: File created but in wrong location
**Check:** Verify working directory is `/opt/render/project/src/`

#### Issue: File exists but start command fails
**Check:** Verify `npm start` runs from project root

### 5. Manual Verification

If you have SSH access to Render:
```bash
cd /opt/render/project/src
ls -la dist/
cat dist/index.js | head -20
```

### 6. Alternative: Use TypeScript Compiler

If esbuild continues to fail, we can use `tsc` instead:

```json
"build": "tsc && cp -r server dist/ && mv dist/server/index.js dist/index.js"
```

But this requires more setup.

## Current Configuration

**Build Command:**
```bash
npm ci && npm run build && echo "Build completed..." && ls -la dist/ && test -f dist/index.js && echo "✅ dist/index.js exists" || (echo "❌ dist/index.js not found!" && exit 1)
```

**Build Script:**
```json
"build": "mkdir -p dist && npx esbuild server/index.ts --platform=node --bundle --format=esm --outfile=dist/index.js --packages=external --target=node20 && echo 'Build output:' && ls -lh dist/index.js"
```

This will:
- Create dist directory
- Build the file
- Show file size
- Verify it exists

## Next Steps

1. **Check Render build logs** for the exact error
2. **Look for** the "Build output:" message
3. **Verify** the file listing shows `dist/index.js`
4. **Check** if build completes successfully

If build succeeds but file still not found at runtime, the issue is with the start command or working directory.
