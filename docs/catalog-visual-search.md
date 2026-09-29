# Catalog visual search — v2 implementation

Implemented locally on 2026-09-28. This is a working feature upgrade, not evidence of Taobao/Pinduoduo-scale retrieval quality or a production deployment.

## Shopper flow

Full-screen camera → capture or album photo → local crop/90° rotation → explicit “search this area” confirmation → results → optional text/price/orderability/sort → existing product details/cart.

- The camera opens above the root navigator, covering the shell navigation. It has back/title overlays, QR handoff, lens switching, torch, an animated shutter, and an expandable album/session-history drawer. Camera initialization, release, capture and switching are serialized; camera ownership pauses through gallery/crop/results/QR and app inactivity. Captured temporary files are removed after reading.
- Album thumbnails use `photo_manager`, limited to the newest 60 accessible images and loaded lazily. Opening the camera only checks existing photo permissions; a separate user action requests access. Limited access is supported, and the system photo picker remains available after denial or on unsupported platforms. Only the selected image is exported at its original aspect ratio within 1600 pixels. Session search history holds at most six cropped images in memory and clears on leaving the camera.
- Cropping runs on-device, strips metadata by rasterizing and caps its output at 1024 pixels on the longest edge. The editor bounds decoding to 24 MP/1600 pixels, disposes native image resources, supports independent corner resizing, whole-selection movement, rotation and accessible edge sliders. The original image can be restored.
- Text refinement reuses the shared Mongolian/Latin normalization and lexical scorer. Significant query terms must match catalog metadata. Reciprocal rank fusion combines visual and lexical rank, never raw score scales. This is keyword refinement, not arbitrary natural-language reasoning or visual color detection.
- Results use a flat white two-column product grid, a compact query thumbnail and a pinned category/sort toolbar. The thumbnail scrolls away while a close action remains available. Category selection and displayed discounted-price sorting operate locally over the returned candidates (at most 40), without uploading the image again. Relevance restores response order. There is no fabricated best-selling rank.
- Text, price-range and orderability refinements live in a separate confirmation sheet; dismissal preserves the applied options. API price-range filters and its optional price ordering use catalog base price in MNT. The results toolbar instead sorts by the displayed discounted price. Orderability follows the existing storefront rule: positive stock or preorder. Checkout revalidates availability.
- The image action stays available when the text search field is populated, and transfers that query to image search.
- Changes to server refinements invalidate old results; cancellation/disposal prevents old responses from replacing a new search. No auto-upload on image selection, capture or recovery. The crop confirmation explicitly starts the search, including after re-cropping from results.

## Public API

`GET /api/catalog/search/capabilities` returns an `image` object:

```json
{"enabled":true,"ready":true,"degraded":false,"maxBytes":5242880,"formats":["jpeg","png","webp"],"responseVersion":2,"hybrid":true,"filters":["inStock","priceMin","priceMax","sort"]}
```

Readiness validates the active snapshot and loads the local model when needed. POST independently rechecks it. A disabled/unready server receives no image upload from the new mobile client. A 404 capability route identifies an older deployment; only image-only requests are sent there. Refinements are never silently dropped.

`POST /api/catalog/visual-search` accepts one multipart `image` plus these optional string fields:

| Field | Constraint |
|---|---|
| `query` | Trimmed, ≤160 characters, no control characters |
| `inStock` | `true` or `false`; stock or preorder |
| `priceMin`, `priceMax` | Nonnegative decimal, ≤2 decimals, ≤1e12; min ≤ max |
| `sort` | `relevance`, `price_asc`, `price_desc` |
| `responseVersion` | `1` or `2`; defaults to `1` |

Unknown/duplicate fields fail validation. Uploads accept JPG/PNG/WebP, ≤5 MB/24 MP, no animated images, minimum 32 pixels per dimension. Server preprocessing corrects orientation, removes metadata, flattens to white and contains the image in 224×224.

Legacy responses retain `productIds`, `indexedProducts`, `partial`, `indexedAt`. Opt-in v2 additionally returns `products` and `outcome` (`matches`, `no_match`, `no_filter_match`, `empty_catalog`). Up to 40 results; no pagination. Products use an explicit public projection with fresh price/stock/discounts and no supplier documents, cost prices or warehouse data. Both current-public eligibility and image identity are rechecked before the response, without an administrator bypass or a cached second HTTP GET. Legacy clients still make their old GET; v2 is the preferred contract.

Every response carries `Cache-Control: no-store` and a generated `X-Request-Id`. Errors contain `code`, `message`, `requestId`, `retryable`; 429 includes `Retry-After`. Statuses: 400 invalid fields/upload; 413 size; 422 image decode; 429 busy/rate limit; 503 unavailable. A cancelled/disconnected request does not send results. The rate limit remains 12 POSTs/minute/IP; account-based quotas and distributed limiting remain deployment follow-up work.

## Encoder and concurrency

- Pinned `Xenova/clip-vit-base-patch32`, revision `d15189d7028b43f1d3e65039190477f6af591c2a`, q8/512 dimensions. Model downloads are allowed only during indexing; API requests use the local cache.
- The 0.70 cosine threshold remains an **uncalibrated baseline**, not confidence or exact-SKU proof.
- At most five buffered requests and one active inference. Four waiting inferences, FIFO, maximum two-second queue wait; overflow/deadline returns 429. Waiting cancellations remove their queued work. Active native inference finishes safely; a cancelled request is discarded before further catalog work.
- All candidates are checked in bounded database batches; the old first-1,000-ID eligibility cutoff is gone. This is exact in-memory retrieval, not a distributed ANN service. Large-catalog latency still needs measurement.
- No shopper images are saved server-side or sent to external model providers. No photo bytes, embeddings or signed URLs are logged.

## Index lifecycle

Snapshot schema 2 adds `contentHash` and `embeddingVersion` (model revision, quantization and preprocessing). Schema 1 and mismatched processing versions are rejected; rebuild during upgrade.

Run from `apps/api`:

```sh
pnpm visual-search:index
```

Each reconciliation fetches current catalog image bytes, including unchanged URLs. Unchanged content reuses embeddings; changed bytes re-encode automatically. `-- --force` re-encodes everything. Transient storage failures retry twice with bounded backoff; permanent failures do not retry. Only configured Supabase storage and `https://mglstore.mn/mgl-water/` are allowed; redirects/arbitrary hosts stay rejected.

`build.lock` prevents overlapping builders. A crashed builder may leave a lock: confirm that its recorded PID is no longer running before manually removing it. A candidate covering <95% of eligible products is rejected, retaining the active snapshot. A genuinely empty catalog is a valid snapshot. Validate the complete snapshot before atomic rename; retain one compatible `index.json.previous` for rollback. The API reloads on path/inode/mtime/size changes.

A failed-image or >24-hour-old snapshot returns `partial`. This is **not** live catalog coverage: new products and mutable-URL changes wait for reconciliation. Publication and image URL/ID changes are checked at response time. Scheduled refresh, exact live coverage and update-lag telemetry are still required before broad release.

## Local activation and deployment boundary

- Install with the existing lockfile; Transformers shares the API's Sharp version. Flutter adds `camera` 0.12.1 and `photo_manager` 3.12.0. Camera audio is disabled. Native permissions cover the camera and images; no microphone, video-library or media-location access is requested.
- `VISUAL_SEARCH_CACHE_DIR` selects a private absolute cache directory; otherwise `.cache/visual-search` under the API working directory. Configure `SUPABASE_URL` for catalog image storage.
- `VISUAL_SEARCH_ENABLED=true` enables the feature. **Explicit `false` always disables it**, even with `MGL_LOCAL_DEV=true`. With no explicit setting, local development enables it.
- The development index has been rebuilt to schema 2. No DB migration, remote deployment, production environment change or scheduler was created.
- Current inference runs in the API process. Before broad production use, move it behind a private worker boundary and load immutable versioned model/index artifacts from private storage. Measure peak native RSS, cold starts, load, cancellation and index swaps.
- Render disks cannot be shared between services or accessed by cron jobs. Do not deploy an API and a separate Render cron assuming a common filesystem. Build/version/upload the artifact, then download/validate/swap it in the inference service.
- Roll back with `VISUAL_SEARCH_ENABLED=false`. For index-only rollback, stop the builder, validate/copy a compatible `index.json.previous` through an atomic temporary rename, then recheck readiness. Model/preprocessing and snapshot must roll back together.

## Quality evaluation

The old `verify-visual-search.ts` remains a developer smoke test using catalog images/derivatives. It is not an accuracy benchmark.

A new evaluator consumes independent local images and human labels:

```sh
pnpm visual-search:evaluate ./dataset/manifest.json ./report.json --gate
```

Manifest shape (replace placeholders with real images/IDs):

```json
{"version":1,"queries":[
  {"id":"camera-001","image":"images/camera-001.jpg","category":"shoes","group":"product-family-session-001","split":"test","source":"camera","grades":{"actual-product-id":2,"useful-alternative-id":1}},
  {"id":"negative-001","image":"images/negative-001.jpg","category":"out-of-catalog","group":"negative-session-001","split":"test","source":"negative","grades":{}}
]}
```

`split` supports `calibration`/`test`. Group product families/sessions consistently; the parser rejects cross-split group reuse. It rejects duplicate query IDs/images, exact reference-image copies, invalid grades and missing indexed labels. Files must remain inside the dataset directory. Humans must verify provenance: byte hashes cannot detect all transformed copies or incorrect labels. The test split alone contributes metrics.

Reports contain exact Recall@5, useful Hit@5, negative false-positive rate, nDCG@10, per-category results and warm local-service p95. The gate fails on insufficient evidence (<200 positive, <100 negative, <100 exact queries), <5 categories/20 positives each, exact Recall@5 <90%, useful Hit@5 <85% (category <75%), negative false positives >5%, or p95 >2 s. This gate does not certify HTTP/mobile latency, privacy, load or production readiness; those need separate checks. Report files contain no query photos or paths.

The local catalog currently contains 14 products/16 images. At least one reference photo is a city/building rather than a product. Correct image-to-product mapping and independent real-photo queries are prerequisites to a meaningful quality comparison. This task did not alter business catalog data.

## Verification boundary

The Android profile build, Flutter static analysis and 246 Flutter tests pass. The API type check and 240 API tests pass. Camera ownership, stale initialization/capture, gallery cancellation, confirmation-before-upload, shell navigation and 320×640/844×390 layouts at 2× text have automated regression coverage. Result tests cover category selection, stable discounted-price ordering, pinned navigation and refinement confirmation/dismissal. Native camera capture, crop, empty search results, gallery permission and album-image export were exercised on an Android emulator with fixture images. A catalog-photo query returned 12 products; loaded product images, pinned scrolling, ascending prices and product-detail navigation were also checked. This does not certify physical-device camera quality, iOS behavior, Android process-death recovery or production retrieval accuracy.

## Sources

- [Transformers.js 3.8.1 image features](https://huggingface.co/docs/transformers.js/v3.8.1/api/pipelines#module_pipelines.ImageFeatureExtractionPipeline)
- [Pinned model](https://huggingface.co/Xenova/clip-vit-base-patch32/tree/d15189d7028b43f1d3e65039190477f6af591c2a)
- [Reciprocal rank fusion](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/reciprocal-rank-fusion)
- [Render disk limitations](https://render.com/docs/disks#disk-limitations-and-considerations)
- [Render cron jobs](https://render.com/docs/cronjobs)

- [Flutter camera plugin](https://pub.dev/packages/camera)
- [Photo library plugin and limited access](https://pub.dev/packages/photo_manager)
