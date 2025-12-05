# Quick Start: Making Inventory.co Installable as an App

## 🚀 Step 1: Generate Icons (2 minutes)

1. Open `public/generate-icons.html` in your browser
2. Click **"Generate All Icons"** button
3. All 8 icon files will download automatically
4. Move all downloaded PNG files to `public/icons/` folder

**OR** use an online tool:
- Visit: https://www.pwabuilder.com/imageGenerator
- Upload a 512x512px square logo
- Download and place icons in `public/icons/` folder

## ✅ Step 2: Test Your PWA

1. Start your dev server: `npm run dev`
2. Open browser DevTools (F12)
3. Go to **Application** tab
4. Check **Manifest** - should show your app details
5. Check **Service Workers** - should show "activated and running"

## 📱 Step 3: Install the App

### Desktop (Chrome/Edge):
- Look for install icon (➕) in address bar
- Click and select "Install"

### Mobile:
- Chrome: Menu → "Install app" or "Add to Home screen"
- Safari (iOS): Share → "Add to Home Screen"

## ✨ That's It!

Your app is now installable as a Progressive Web App!

For more details, see `PWA_SETUP.md`

