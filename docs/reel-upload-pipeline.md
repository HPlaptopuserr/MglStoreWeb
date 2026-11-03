# Resumable reel uploads

Personal MGL uploads and organization uploads in the web/org portals use the
same authenticated `private-parts-v1` protocol. A source can be up to 1 GiB and
180 seconds; only the processed, validated video is published.

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
FFmpeg converts to H.264/AAC MP4, at most 720p/30fps, 1.6 Mbps video plus 96 kbps
audio, with fast-start playback. The output must be below 45 MiB, so the existing
50 MiB per-object storage limit remains sufficient. The worker publishes through
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
   as before; their limits must allow 45 MiB MP4 output. No paid plan is required
   merely to accept larger source videos, since source parts stay below 4 MiB.
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
   protocol.

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
