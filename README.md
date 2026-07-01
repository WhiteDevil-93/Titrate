# Titrate - ICU Dosing Guide

> Offline-capable Progressive Web App (PWA) for the Chris Hani Baragwanath Academic Hospital ICU Dosing Card -- 2024 protocols.

Created by **Tashriq Hendricks** & **Kimi**.

---

## What's Inside

Titrate is a clinical reference app designed for ICU environments. It provides:

- **7 clinical categories**: Resuscitation, Airway & Ventilation, Sedation & Neuro, Antimicrobials, Metabolic, Toxicology, and Formulae
- **Real-time search** across all drugs, conditions, and dosing protocols
- **Interactive inotrope calculators** for Adrenaline, Noradrenaline, and Dobutamine
- **Clinical badges** highlighting first-line drugs, cautions, and warnings
- **Full offline support** -- works without internet after first load
- **Installable on home screen** -- behaves like a native app

---

## Live Web App (Beta)

**URL**: `https://whitedevil-93.github.io/Titrate/`

### To install on your phone:
1. Open the URL in your browser
2. **Android (Chrome)**: Tap the menu (3 dots) -> "Add to Home Screen"
3. **iOS (Safari)**: Tap Share -> "Add to Home Screen"
4. The app installs and works completely offline

---

## Native Android App

### Option 1: GitHub Actions CI/CD (Easiest)

Every push to `main` automatically builds the APK via GitHub Actions.

1. Go to [Actions](https://github.com/WhiteDevil-93/Titrate/actions) tab
2. Click the latest workflow run
3. Download the APK artifact

To trigger a build manually:
1. Go to Actions -> "Build Android APK"
2. Click "Run workflow"

To set up the CI workflow, create `.github/workflows/build-android.yml` in this repo with this content:

```yaml
name: Build Android APK

on:
  push:
    branches: [ main ]
    tags: [ 'v*' ]
  workflow_dispatch:

jobs:
  build-android:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Install Capacitor
        run: |
          npm install -g @capacitor/cli
          npm install @capacitor/core @capacitor/android

      - name: Init Capacitor
        run: npx cap init Titrate com.tashriqhendricks.titrate --web-dir . --no-interaction

      - name: Add Android Platform
        run: npx cap add android

      - name: Sync Web Assets
        run: npx cap sync android

      - name: Build Debug APK
        run: |
          cd android
          chmod +x gradlew
          ./gradlew assembleDebug

      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: titrate-apk
          path: android/app/build/outputs/apk/debug/app-debug.apk
```

### Option 2: Build Locally

**Prerequisites:**
- Node.js 18+ and npm
- Java JDK 17+
- Android Studio (for SDK + emulator)

**Steps:**

```bash
# Clone the repo
git clone https://github.com/WhiteDevil-93/Titrate.git
cd Titrate

# Install Capacitor
npm install @capacitor/core @capacitor/android
npm install -g @capacitor/cli

# Initialize Capacitor
npx cap init Titrate com.tashriqhendricks.titrate --web-dir .

# Add Android platform
npx cap add android

# Sync web assets
npx cap sync android

# Build debug APK
cd android
./gradlew assembleDebug

# APK will be at:
# android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Native iOS App

iOS builds require macOS and Xcode.

**Prerequisites:**
- macOS with Xcode 15+
- Node.js 18+ and npm

**Steps:**

```bash
# Clone and setup
git clone https://github.com/WhiteDevil-93/Titrate.git
cd Titrate

# Install Capacitor
npm install @capacitor/core @capacitor/ios
npm install -g @capacitor/cli

# Initialize and add iOS
npx cap init Titrate com.tashriqhendricks.titrate --web-dir .
npx cap add ios
npx cap sync ios

# Open in Xcode
npx cap open ios

# In Xcode: Product -> Archive -> Distribute App
```

---

## Project Structure

```
Titrate/
|-- index.html              # Main app UI
|-- app.js                  # App logic, search, calculators
|-- data.json               # Clinical protocols (2024 Bara ICU)
|-- manifest.json           # PWA manifest
|-- service-worker.js       # Offline caching
|-- capacitor.config.json   # Capacitor configuration
|-- package.json            # Node dependencies + build scripts
|-- icon-192.svg            # App icon (192x192)
|-- icon-512.svg            # App icon (512x512)
|-- .gitignore              # Git ignore rules
|-- README.md               # This file
```

---

## Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **PWA**: Service Worker, Web App Manifest
- **Native Wrapper**: Capacitor 6.x
- **CI/CD**: GitHub Actions
- **Icons**: SVG (scalable, lightweight)

---

## Data Sources

All clinical data is derived from the **Chris Hani Baragwanath Academic Hospital ICU Dosing Card** and its **2024 updates**, including:

- Noradrenaline as first-line vasopressor
- TLD (TDF + 3TC + DTG) as first-line HIV regimen
- Updated surgical prophylaxis dosing
- Artesunate for severe malaria
- CRE infection protocols

**Disclaimer**: This app is for clinical reference only. Always verify doses before administration.

---

## License

MIT

---

**Titrate v1.0** - Bara ICU Dosing Guide - 2024
