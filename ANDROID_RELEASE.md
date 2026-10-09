# WarehouseHub Android — Build & Release Guide

## 1. Overview

WarehouseHub is an Expo SDK 57 / React Native 0.86 Android e-commerce application connected to Supabase (`Selly-build`, ref: `ccrqznclaegjiaubtwij`).

- **Application Name**: WarehouseHub
- **Android Package**: `com.warehousehub.app`
- **Expo SDK**: 57.0.x
- **Navigation**: Expo Router (file-based)

---

## 2. Local Testing (Expo Go & Dev Server)

### Prerequisites
- Node.js 18+ (tested on Node v24)
- Android device or emulator with Expo Go app installed

### Start Dev Server
```bash
npx expo start
```

Press `a` in the terminal to launch the Android emulator, or scan the QR code using the Expo Go camera on your physical Android device.

---

## 3. Building an Installable Android APK (Internal Preview)

To build a standalone `.apk` file that can be installed on any Android phone (without Expo Go or Google Play):

1. **Log in to EAS** (free Expo account):
   ```bash
   npx eas login
   ```

2. **Trigger the Cloud APK Build**:
   ```bash
   npx eas build --profile preview --platform android
   ```

3. **Download & Install**:
   Once EAS completes the build, it outputs a download link and QR code for the `.apk` file. Open the link on the Android device and tap **Install**.

---

## 4. Building Production App Bundle (AAB for Google Play)

To build a signed Android App Bundle (`.aab`) ready for submission to the Google Play Console:

```bash
npx eas build --profile production --platform android
```

EAS automatically manages the Android keystore / signing certificate.

---

## 5. End-to-End Smoke Test Checklist

| Step | Flow | Expected Result | Verified |
|------|------|-----------------|----------|
| 1 | **Launch App** | App opens directly to `/(shop)/home` without errors. | [x] |
| 2 | **Catalogue Browsing** | 6 categories and 16 published products display with images, prices, and stock badges. | [x] |
| 3 | **Search & Filter** | Typing in search bar filters live; category pills isolate categories; sort reorders products. | [x] |
| 4 | **Product Details** | Tapping a product opens `/(shop)/product/[id]`. Variant selection updates price delta and stock. | [x] |
| 5 | **Add to Basket** | Tapping "Add to Cart" updates the cart count badge on the header. | [x] |
| 6 | **Basket Management** | Opening `/(shop)/cart` shows line items, stepper adjusts quantity (clamped at stock), subtotal updates. | [x] |
| 7 | **Authentication** | Sign in / register / forgot-password screens operate with friendly error handling. | [x] |
| 8 | **Checkout** | Completing shipping address and tapping "Place Order" performs live server verification and creates order. | [x] |
| 9 | **Order Confirmation** | Order confirmation email triggered and order appears in `/(shop)/orders`. | [x] |
| 10 | **Account Profile** | `/(shop)/account` displays user name, email, member since date, and allows full name editing. | [x] |
