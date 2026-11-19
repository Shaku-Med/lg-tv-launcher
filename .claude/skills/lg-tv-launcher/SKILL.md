---
name: lg-tv-launcher
description: Install, customize, update or troubleshoot the Homeboard custom home screen on an LG webOS TV through Developer Mode, or make it the TV's startup screen on a rooted TV. Use when the user wants to put this launcher on their LG TV, change its apps, icons, weather, wallpapers, photo slideshow or theme, reinstall it after edits, make it open on power on, secure root SSH, or fix "No matched device", getkey or app launch problems.
---

# Install Homeboard on an LG TV

You are helping someone put this repo's launcher (a webOS web app, id `dev.homeboard.launcher`) on their own LG TV.
The repo root is the app folder: `appinfo.json`, `index.html`, `app.js`, `style.css`, `config.js`, `icons/`, `wallpapers/`.

Work through the steps in order. Do the computer side yourself; the TV side is the user's, so tell them exactly
what to press and wait for them. Keep messages short and concrete.

## Ground rules

- **Never type the Developer Mode passphrase or the user's LG password yourself**, and don't ask them to paste it
  in chat. The passphrase is entered by the user in their own terminal when `--getkey` prompts for it.
- Ask before installing anything (`@webos-tools/cli` is ~36 MB from npm) or downloading icons.
- The TV's IP is private to the user: don't write it into any repo file, commit, or README.
- If the user plans to publish their fork, their `config.js` coordinates and `wallpapers/` photos stay out of it
  (`wallpapers/` is already gitignored).

## 1. Check the computer

```bash
node --version
ares --version
```

- Node must be 20+. If missing, point them to https://nodejs.org.
- If `ares` is missing, ask, then run `npm install -g @webos-tools/cli`. npm may report blocked install scripts
  for `@webos-tools/cli`, `ssh2` and `cpu-features`: on Windows these are not needed (the CLI's postinstall only
  chmods files on macOS/Linux; the others are optional native speedups). Confirm with `ares-package --version`.

## 2. Developer Mode on the TV (user does this)

Tell the user:

1. Create a free account at https://webostv.developer.lge.com (Sign In → Sign Up) with **email + password**.
   "Login with Google" won't work on the TV, which only takes email + password. They may already have an LG account:
   on the TV, Settings → General → LG Account shows it.
2. On the TV: LG Content Store → install **Developer Mode** → sign in → turn **Dev Mode Status** ON (TV restarts).
3. Open Developer Mode again → turn **Key Server** ON.
4. Send you the **IP address** shown there (not the passphrase).

## 3. Connect to the TV

Register the TV (replace the IP):

```bash
ares-setup-device --add tv --info "{'host':'<TV_IP>','port':'9922','username':'prisoner','default':true}"
```

Important: the CLI stores devices in `%APPDATA%\.webos` (Windows) or `~/.webos`. If your shell is sandboxed,
the write may not reach the user's real profile and later commands fail with `No matched device <name> : tv`.
Run the setup and every later `ares-*` command that talks to the TV **in the user's own terminal** when you can
(a terminal tab tool, or give them the command to run).

Get the SSH key. This prompts for the passphrase, which the user types:

```bash
ares-novacom --device tv --getkey
```

Then check:

```bash
ares-device --device tv --system-info
```

`sdkVersion` 4.x or newer is required (webOS 4 = Chromium 53, which this app is written for). Older TVs
(webOS 3.x) lack CSS variables and won't render correctly.

## 4. Customize (ask what they want)

Edit `config.js`:

- Weather: city name + latitude/longitude (ask for their city; you can look up approximate coordinates).
  Leave `null` to hide weather.
- `apps`: their streaming apps by webOS id (table in README). Reorder to taste.
- `icon`: an SVG name in `icons/`. Bundled: netflix, youtube, spotify, appletv, browser. For others, Simple Icons
  (CC0) has most brands at `https://cdn.jsdelivr.net/npm/simple-icons@16.38.0/icons/<slug>.svg`. Ask before
  downloading, then check the SVG contains only shapes (no `<script>`, `on*=` handlers, `href`, `foreignObject`).
  Prime Video and Disney+ are not in Simple Icons; those tiles show the typeset name.
- `theme`, `clock24h`, `ambientMinutes`, `motion`, `wallpapers` (files the user puts in `wallpapers/`),
  `wallpaperSeconds`, `slideshowSeconds`.
- Photo slideshow: `python tools/make_wallpapers.py "<photo folder>"` (needs Pillow; ask before `pip install pillow`).
  It writes full screen 1920x1080 slides plus `wallpapers/list.js`, strips EXIF/GPS, and everything it writes is
  gitignored. These are the user's private photos: never commit them, upload them, or open them more than needed.
- App icon / splash: SVG sources in `tools/icon/`, rebuilt with `python tools/icon/make_icons.py` (Edge or Chrome
  plus ffmpeg).

Validate after editing: `node --check config.js`.

Optional preview: serve the folder (`python -m http.server 8130`) and open `http://localhost:8130`.
Launching apps only works on the TV.

## 5. Package, install, launch

Run from the folder that contains the repo folder (`<repo>` = its folder name):

```bash
ares-package <repo> -o <repo>-dist -e README.md -e docs -e .claude -e LICENSE -e .gitignore -e .git -e tools
ares-install --device tv <repo>-dist/dev.homeboard.launcher_<version>_all.ipk
ares-launch --device tv dev.homeboard.launcher
```

`<version>` is the `version` in `appinfo.json`. Bump it when the TV keeps showing a cached old icon.

Tell the user it appears as **Home** in the app bar and to move it to the front.
Ask them to confirm on the TV: clock, Apps row with logos, Watch row, and that OK on a tile opens the app.

Repeat step 5 after every change.

## 6. Keep it running

Developer Mode sessions expire (the Developer Mode app shows **Remain Session**). When it runs out,
dev apps stop launching. Tell the user to press **Extend** in the Developer Mode app now and then.

## Troubleshooting

- **`No matched device`**: see the sandbox note in step 3. `ares-setup-device --list` shows what's registered.
- **`--getkey` hangs or fails**: Key Server is off, wrong IP, or TV and computer on different networks.
- **Packaging warns about `requiredACG`**: `appinfo.json` must keep `"requiredACG": ["application.launcher"]`
  (needed on webOS 27+, ignored on older versions).
- **Tiles show names instead of real TV icons**: expected. Sideloaded apps get
  `Denied method call "listLaunchPoints"` and run in a sandbox that can't see system apps, so icons are bundled.
- **Live debugging**: `ares-inspect --device tv --app dev.homeboard.launcher` prints a DevTools URL
  (`ws://localhost:<port>/devtools/page/<id>`). webOS 4's Chrome 53 inspector doesn't support `awaitPromise`
  in `Runtime.evaluate`; store async results on `window` and read them with a second evaluate.
- **App's own CSP** only allows `connect-src https://api.open-meteo.com`; any new network source must be added
  to the `<meta http-equiv="Content-Security-Policy">` in `index.html`.

## Rooted TVs (optional)

Rooting is the user's decision on their own device. Explain the risk once, then help without lecturing.
Check https://cani.rootmy.tv for their firmware and follow the webosbrew.org guide.

While rooting:

- Quick Start+ must be off.
- **The LG Developer Mode app must be uninstalled before any reboot after rooting.** Otherwise it wipes
  `/media/developer`, including Homebrew Channel, and they have to root again.

After root, follow the README's "Rooted TVs" section in order:

1. **Secure SSH.** Homebrew's root SSH password is `alpine` until `/home/root/.ssh/authorized_keys` exists, and
   `passwd` fails because `/etc` is read only. Make a key with `ssh-keygen`, copy the `.pub` to that file, test key
   login, then reboot the TV. Verify afterwards over the key that `/etc/shadow` no longer has a bind mount
   (`grep " /etc/shadow " /proc/mounts` prints nothing). Never type a password yourself; the user types `alpine`
   that last time in their own terminal. Don't read or list their `~/.ssh` folder unless they ask.
2. **Startup screen.** Package the app, then
   `python tools/rooted/make_bundle.py <ipk> homeboard-setup.sh` and run it with
   `ssh -i <key> root@<TV_IP> sh -s < homeboard-setup.sh` (on Windows inside `cmd /c "..."`). Expect `INSTALLED`,
   `WATCHER RUNNING`, `== done`. It installs through `luna://com.webos.appInstallService/dev/install` and adds
   `/var/lib/webosbrew/init.d/homeboard` (source: `tools/rooted/homeboard-autostart.sh`), which opens the app
   20 s after boot and after every wake from standby. Its log is `/var/run/homeboard-watch.log`.
3. **Optional:** LG Input Hook mapping a remote button to
   `luna-send -n 1 luna://com.webos.applicationManager/launch '{"id":"dev.homeboard.launcher"}'`.

Firmware updates can remove root; suggest turning off automatic updates.
