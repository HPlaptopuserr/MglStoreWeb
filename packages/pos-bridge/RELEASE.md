# Windows bridge release handoff

A cloud API/Admin/Vendor deployment does **not** install or update the cashier
bridge. The desktop pairing shortcut exists only after the new Windows bridge
distribution has been installed on that cashier PC. Keep existing unenrolled
cashiers on their existing integration until an operator deliberately migrates
that register using an Admin pairing code.

## What this repository currently provides

- `package:windows` calls `scripts/package-windows.ps1` on Windows.
- The default output directory is `C:\tmp\mgl-pos-bridge-release`.
- `mgl-pos-bridge-android-pgw.zip` contains compiled code, production dependencies,
  bundled `runtime\node.exe`, installer scripts and the Desktop shortcut helper.
- `MGL-POS-Bridge-android-pgw-Installer.exe` is produced only when Windows
  `iexpress.exe` is available and succeeds. Otherwise the ZIP is the supported
  build output; extract it and run `install-android-pgw.cmd`.
- `render.yaml` builds the API and Next.js apps. It does not run this Windows
  packager or publish its output.
- `.github/workflows/quality.yml` runs Ubuntu quality checks.
- `.github/workflows/pos-bridge-windows.yml` builds native Windows assets on
  `windows-latest`, runs the bridge unit suite, then smoke-tests the extracted
  distribution's bundled runtime in mock mode. It does not scan USB terminals,
  charge a card, or install startup tasks on the runner.
- The release workflow triggers only on bridge/workflow changes pushed to
  `codex/pax-a35-deploy-20261121`, or an explicit dispatch on that branch. It
  publishes the prerelease tag `pax-a35-bridge-20261121` only after its Windows
  job succeeds. Existing tags/assets are never overwritten automatically.
- Authoring the workflow is not publication. Verify the run and all release
  assets before enabling an Admin download link. Cloud deployment alone is not
  evidence that the Windows installer exists.

## Packaging and delivery

Build from the exact reviewed release checkout on a Windows machine with pnpm
and a Windows Node runtime, using `pnpm --filter @mgl/pos-bridge package:windows`.
The native serialport dependencies must be Windows-compatible; copying a macOS
`node_modules` directory into a ZIP is not a valid Windows distribution. Test
the generated package on the target cashier operating system and architecture.

Record the release commit and SHA-256 of each delivered ZIP/EXE, for example with
`Get-FileHash -Algorithm SHA256 <package>`. Provide that verified package to the
cashier operator through the established file-delivery channel. Publishing a
download is a separate action from building the package.

The Windows release job publishes these public prerelease assets after a successful
build and checksum verification:

- `mgl-pos-bridge-android-pgw.zip`
- `MGL-POS-Bridge-android-pgw-Installer.exe`
- `SHA256SUMS.txt`

The immutable release URL prefix is
`https://github.com/HPlaptopuserr/MglStoreWeb/releases/download/pax-a35-bridge-20261121/`.
Confirm each asset returns successfully before wiring it into Admin. Publication
requires repository Actions to be enabled and the publish job's `GITHUB_TOKEN`
to permit `contents: write` and tag/release creation. The package job has only
`contents: read`, does not persist checkout credentials, and cannot publish.
No Render permissions, credentials, or mutations are part of this workflow.

The tag was checked through GitHub's public API and absent when this workflow was
authored. A tag appearing before publication intentionally stops the job rather
than replacing an existing installer's contents. A rerun after a partial release
requires a maintainer to inspect the existing release before taking further action.

The package currently has no code-signing certificate step. It is an unsigned
prerelease, not a claim of Windows trust/signing or bank hardware certification.
The installer is validated as a generated executable and the extracted bundled
runtime is executed; CI does not run the interactive EXE installer itself.

Do not repurpose the API's image/document upload endpoints for executables. No
upload or download destination should contain pairing credentials, device state,
`bridge.env`, or a cashier payment journal.

## Installing without interrupting a till

Finish and reconcile every payment and terminal command before an upgrade. The
installer checks the existing local guard before stopping the old process, and
pairing also checks the API's register guard. Never remove a guard/journal to make
an upgrade proceed. Preserve `%LOCALAPPDATA%\MGLStore\pos-bridge-data` (or the
configured `BRIDGE_DATA_DIR`) and the existing installed `bridge.env`.

The installer creates the per-user Desktop shortcut **PAX A35 холбох** and uses
`pair.js --if-needed`. Only an existing valid, non-revoked pairing skips the
installation prompt. A new software installation or upgrade with only a legacy
shared key must deliberately pair from Admin; an environment key alone does not
skip this step. The bridge runtime still supports a legacy environment key for
direct advanced/development use, but the Windows installer does not silently
leave the new software in an unenrolled keyed mode. Existing OLD cashier bridge
binaries are not touched by a cloud-only deployment.

The installer always creates the shortcut. To deliberately migrate an idle
register, open it and paste the Admin connection link once; the explicit shortcut
does not use `--if-needed`. COM discovery is the default for a new installation,
so there is no normal URL, secret or COM prompt.

Confirm the installed `/health` response, the Desktop shortcut, automatic login
startup, and Admin heartbeat on the actual Windows PC. Then use the bank's test
terminal/card to verify the amount unit, approval, cancellation, void and
settlement. Linux/macOS virtual-serial tests do not validate Windows driver,
Task Scheduler, COM shortcut or IExpress behavior.

## Legacy Windows 7 package limitation

`package-windows-legacy-win7.cmd` selects a Node 12 runtime and the packager uses
an ES2019 target. The current production source still contains `node:` imports
compiled into CommonJS `require` calls, and `Array.prototype.at`. Changing a
TypeScript target does not polyfill those runtime APIs. Node's module history
lists `node:` support in `require` as added in Node 14.18/16:
[Node.js built-in module history](https://nodejs.org/api/modules.html#built-in-modules).

Do not distribute the newly generated legacy ZIP as Windows 7-compatible until
those runtime incompatibilities are addressed and the package is actually run
under its selected Node 12 runtime on the target Windows system. Existing legacy
cashiers should not be automatically forced into the new pairing/protocol flow
by a cloud-only release.
