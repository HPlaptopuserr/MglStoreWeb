# Resumable reel uploads

Personal MGL uploads and organization uploads in the web/org portals use the
same authenticated `private-parts-v1` protocol. The mobile picker has no file-size or duration restriction. The server accepts
sources up to 2,147,483,647 bytes (the existing database Int capacity), with no
reel duration cutoff; only complete, validated video is published. This remains a
finite storage/compute budget, not unlimited hosting.

The API creates an account-bound upload session, fixes its audience and metadata,
and issues short-lived signed URLs for immutable 4 MiB source parts. Sources
stay in the private `reel-upload-parts` bucket, including when the intended reel
is public. No storage service key reaches a client. Each retry checks which
parts have committed. Flutter persists a content fingerprint and session ID;
web clients persist a bounded content fingerprint and session ID. Reselecting
the same file with the same details resumes its previous upload. Source parts
expire after 24 hours; cleanup waits an extra three hours for issued upload
links to expire.

After all parts match their expected sizes, a durable database job assembles
them on temporary disk. FFprobe validates real media/duration/dimensions;
FFmpeg converts to H.264/AAC MP4, at most 1080p/30fps, CRF 20 video plus 192 kbps
audio, with fast-start playback. Original 4K/HEVC sources are accepted, but the
published version is 1080p, not a lossless original. Duration is never silently
cut to three minutes. Encoder output is bounded to 1 GiB and checked for full
duration before publication. Output uploads use TUS with 6 MiB chunks and
HEAD-based offset recovery, without loading the entire video into RAM. The worker publishes through
the existing createReel service, preserving review and PRIVATE visibility.
Sources and temporary files are cleaned up; failed jobs can retry without
re-uploading. Account ownership, organization permissions, database leases,
and a stable Reel ID prevent cross-account access and duplicate publication.

## Deployment

1. Deploy the API and migration `20261022110000_resumable_reel_uploads` before
   the updated clients. Render's existing API build command applies migrations
   and regenerates the Prisma client. Review other pending changes separately.
2. Install with the checked-in pnpm workspace file. It permits the FFmpeg and
   platform FFprobe installer scripts; the binaries must be executable. Set
   FFMPEG_PATH and FFPROBE_PATH only when supplying managed system binaries.
3. Production requires SUPABASE_URL and SUPABASE_SERVICE_KEY. The staging bucket
   is created privately, limited to 4 MiB and application/octet-stream. An
   existing bucket is checked for privacy. Configure `reels` and `private-reels`
   with their existing public/private visibility. For large high-quality output,
   set the Supabase project global file-size limit to at least 1 GiB **before
   rollout**; the worker raises an existing bucket limit to 1 GiB only when output exceeds
   that bucket limit, preserving
   its privacy. A Supabase Free project (50 MiB global maximum) cannot provide
   this output capacity. Do not upgrade billing automatically. The API returns
   a recoverable storage-configuration error if the provider refuses the limit.
   Source parts remain 4 MiB.
4. One job runs at a time per worker process, with two encoder threads and a
   renewable database lease. The API starts an embedded worker by default.
   For higher upload volume use `pnpm --filter @mgl/api reels:worker` in a
   dedicated worker process, and set REEL_UPLOAD_WORKER_ENABLED=false on API
   instances. Do not set it false on the worker. Budget temporary disk for the
   largest source plus the processed output per concurrent worker. Real-world
   CPU time, concurrency, storage and egress depend on the hosting plan.
5. Deploy the web/org portals and mobile update. Older mobile/server versions
   retain their advertised multipart contract during rollout. The new app does
   not attempt a large multipart upload against a server that lacks the new
   protocol. Deploy this API update before removing mobile duration/size limits.
   Mobile start/complete/status calls and part transfers retry transient failures;
   status polling no longer incorrectly fails after 15 minutes of processing.
   iOS/Android may suspend an app in the background: this is resumable foreground
   transfer, not a native background upload service. Server processing continues
   after the app closes. Reselect the same file/details to reconnect to its job.

## Verification

- `pnpm --filter @mgl/api type-check`
- `pnpm --filter @mgl/web exec tsc --noEmit`
- `pnpm --filter @mgl/org exec tsc --noEmit`
- `pnpm --filter @mgl/ui type-check`
- `pnpm --filter @mgl/api exec tsx --test 'src/services/reel-upload/*.test.ts' src/routes/content/reel-uploads.routes.test.ts`
- `pnpm --filter @mgl/api exec tsx --test ../../packages/ui/test/reel-upload.test.ts`
- `pnpm --filter @mgl/api reels:check-local`

The last command is guarded to a local database and local storage. It creates a
disposable author and a real MOV over 50 MiB, uploads through the HTTP routes,
resumes after two parts, runs the real encoder and tests idempotent publication.
It removes only its own user, session, reel, storage objects and temporary files.

The pipeline handles durable upload/processing; it is not an HLS adaptive bitrate
service. Output is a fast-start MP4 served through existing storage/CDN playback.
Sources: TikTok's Media Transfer Guide and Supabase's resumable/signed-upload
and file-limit documentation.

Storage requirements: https://supabase.com/docs/guides/storage/uploads/file-limits
TUS protocol: https://supabase.com/docs/guides/storage/uploads/resumable-uploads
