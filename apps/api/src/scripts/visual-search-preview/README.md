# Public-catalog device preview

This development runner uses the existing visual-search encoder, ranking, validation,
queue and HTTP routes against the unauthenticated production storefront. It never
reads production database credentials or writes catalog data. It binds only to
`127.0.0.1:4001`; the device connects through `adb reverse`.

The public adapter selects storefront fields, discards internal fields from older
API responses and re-reads matching products at query and response time. Stock is
already normalized by the public API and must not be converted again.

From `apps/api`, set `VISUAL_SEARCH_CACHE_DIR` to a separate absolute directory
containing `public-catalog-preview` in its name. Reuse the pinned model cache by
symlinking its `models` child to the existing visual-search model cache. Set
`SUPABASE_URL` to the verified public catalog's storage origin **for this process**.
Do not replace the regular development index or change shared `.env` files.

```sh
pnpm exec tsx src/scripts/visual-search-preview/build.ts
pnpm exec tsx src/scripts/visual-search-preview/serve.ts
```

The builder reads at most 10,000 public products, up to three images per product,
with three bounded download workers and the existing inference queue. Publication
requires the normal ≥95% product coverage gate. It does not schedule refreshes.

Build the Flutter store app in profile mode with:

```sh
flutter build apk --profile --target-platform android-arm64 \
  --dart-define=STORE_DEVELOPMENT_ENVIRONMENT=public_catalog_preview
adb -s DEVICE_SERIAL reverse tcp:4001 tcp:4001
adb -s DEVICE_SERIAL install -r build/app/outputs/flutter-apk/app-profile.apk
```

The selected development environment is saved on the device, so an ordinary
`flutter run` or hot restart keeps the public catalog instead of silently returning
to the local water catalog. Run with `STORE_DEVELOPMENT_ENVIRONMENT=local` to reset,
or `production` to select the real API without the local image-search worker.
Release builds ignore the saved selection. The store app also provides
`bash tool/run_public_catalog_preview.sh DEVICE_SERIAL` as a launch helper.

The image worker uses an independent unauthenticated Dio client, accepts loopback
HTTP origins only and receives only image-search capabilities/uploads.
`API_BASE_URL` and `IMAGE_SEARCH_PREVIEW_URL` remain explicit development overrides.
Keep the Mac, preview process and USB connection active during testing. Closing
the process and removing the reverse mapping stops the temporary service.

This setup exercises real catalog data and mobile integration. It does not deploy
the new backend, certify search quality or provide an always-on production service.
