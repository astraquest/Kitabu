# Kitabu AI Play Store Image Assets

Generated on 2026-07-07 for the v1.2 Play Store listing refresh.

## Research rules applied

- App icon: 512 x 512 PNG with alpha, under 1024 KB.
- Feature graphic: 1024 x 500 JPEG or 24-bit PNG, no alpha.
- Phone screenshots: minimum two required; at least four 1080 x 1920 portrait screenshots are recommended for promotional eligibility.
- Screenshots should demonstrate the actual app experience and avoid misleading claims.
- Taglines should be minimal, legible, and not use ranking, price, promotion, testimonial, or call-to-action language.
- Avoid device imagery and Google Play badges in preview assets.
- Tablet screenshots should support large-screen listings; the generated tablet assets use portrait 9:16-compatible dimensions.

Primary references:

- Google Play preview asset requirements: https://support.google.com/googleplay/android-developer/answer/9866151
- Google Play Asset Library workflow: https://support.google.com/googleplay/android-developer/answer/16386748
- Android device art note: https://developer.android.com/distribute/marketing-tools/device-art-generator

## Upload set

Use these first for the default store listing.

### Icon

- `icon/kitabu-playstore-icon-512.png`

### Feature Graphic

- `feature-graphic/kitabu-feature-graphic-1024x500.png`

### Phone Screenshots

Upload in this order:

1. `phone/phone-01-kitabu-library.png`
2. `phone/phone-02-ask-rafiki.png`
3. `phone/phone-03-teacher-progress.png`
4. `phone/phone-04-start-learning.png`

### 7-inch Tablet Screenshots

1. `tablet-7-inch/7in-01-kitabu-library.png`
2. `tablet-7-inch/7in-02-ask-rafiki.png`
3. `tablet-7-inch/7in-03-teacher-progress.png`

### 10-inch Tablet Screenshots

1. `tablet-10-inch/10in-01-kitabu-library.png`
2. `tablet-10-inch/10in-02-ask-rafiki.png`
3. `tablet-10-inch/10in-03-teacher-progress.png`

## Fallback screenshots

`phone-original-fallback/` contains conservative real screenshots with no marketing overlay. Use them if Play review objects to stylized screenshots.

## Build

Run from the repo root:

```powershell
python native-app\src\assets\playstore\build_playstore_assets.py
```

The builder uses:

- Real app screenshots from `artifacts/play-screenshots/play-upload`
- The current Kitabu 512px icon
- An imagegen-created brand backdrop saved in `source/`
