# Homeboard

A clean, modern home screen for LG webOS TVs. Big clock, live weather, your apps as large tiles,
quick access to Live TV and HDMI inputs, a full app drawer, dark / light / auto themes, slow drifting
background light, and an ambient mode that turns into a full screen photo slideshow when nobody is pressing buttons.

![Homeboard on a TV](docs/preview.png)

Plain HTML, CSS and JavaScript. No build step, no dependencies, no account, no tracking.
Runs on LG TVs with **webOS 4 or newer (2018 and later)**. Tested on webOS 4.

> Not affiliated with LG. App logos are trademarks of their owners and are only used to label the tiles.

## Contents

- [Features](#features)
- [Set it up with Claude Code (easiest)](#set-it-up-with-claude-code-easiest)
- [Set it up by hand](#set-it-up-by-hand)
- [Customize](#customize)
- [Updating](#updating)
- [Rooted TVs](#rooted-tvs)
- [Clean up LG's own home screen](#clean-up-lgs-own-home-screen)
- [Troubleshooting](#troubleshooting)
- [Credits](#credits)

## Features

- Remote friendly: arrows to move, OK to open, Back closes the drawer. The Magic Remote pointer works too.
- Weather from [Open-Meteo](https://open-meteo.com) (free, no API key). Your location is rounded to about 1 km.
- Your own photos as wallpapers with a slow crossfade and gentle zoom.
- Ambient mode after a few idle minutes: the tiles fade away and your photos play full screen. Any button wakes it.
- On a rooted TV it can be the screen the TV opens to every time it turns on.
- Twelve themes: Graphite, Paper and Auto, plus colored schemes (Midnight, Ocean, Forest, Sunset, Grape, Rose,
  Sand, Sky, Mint). Open **Theme** on the launcher, move over the schemes to preview them live, press OK to keep
  one or Back to cancel.
- Four layouts from the **Layout** button: Classic, Centered (big clock in the middle), Dashboard (clock on the left,
  apps as a grid) and Minimal (small clock, compact tiles).
- Monochrome logos that follow the theme. Apps without a logo get a clean typeset name.
- Everything is set in one file, `config.js`.

## Set it up with Claude Code (easiest)

This repo ships a Claude skill that walks you through the whole install and does the PC side for you.

1. Install [Claude Code](https://claude.com/claude-code).
2. Clone this repo and open Claude Code inside it:
   ```bash
   git clone https://github.com/Shaku-Med/lg-tv-launcher.git
   cd lg-tv-launcher
   claude
   ```
3. Say: **"install the launcher on my LG TV"**.

Claude picks up the skill in `.claude/skills/lg-tv-launcher/`, checks your PC, installs LG's CLI (it asks first),
tells you what to press on the TV, and packages + installs the app. You only type your TV's passphrase yourself.

Want the skill available in every project? Copy the folder to your personal skills:

```bash
cp -r .claude/skills/lg-tv-launcher ~/.claude/skills/
```

## Set it up by hand

### What you need

- An LG TV with webOS 4+ on the same network as your computer.
- A computer with [Node.js](https://nodejs.org) 20 or newer.
- A free LG developer account.

### 1. Turn on Developer Mode on the TV

1. Create a free account at [webostv.developer.lge.com](https://webostv.developer.lge.com) (Sign In → Sign Up).
   Use **email + password**, not "Login with Google": the TV only accepts an email and password.
2. On the TV, open the **LG Content Store**, search **Developer Mode**, install it.
3. Open **Developer Mode**, sign in with that email and password.
4. Turn **Dev Mode Status** on. The TV restarts.
5. Open **Developer Mode** again and turn **Key Server** on.
6. Note the **IP address** and the **passphrase** on that screen. Don't share the passphrase.

### 2. Install LG's CLI on your computer

```bash
npm install -g @webos-tools/cli
```

### 3. Connect your computer to the TV

Replace the IP with the one your TV shows:

```bash
ares-setup-device --add tv --info "{'host':'192.168.1.50','port':'9922','username':'prisoner','default':true}"
```

```bash
ares-novacom --device tv --getkey
```

Type the passphrase from the TV when asked. Check the connection:

```bash
ares-device --device tv --system-info
```

### 4. Package, install, open

From the folder that **contains** this repo folder:

```bash
ares-package lg-tv-launcher -o lg-tv-launcher-dist -e README.md -e docs -e .claude -e LICENSE -e .gitignore -e .git -e tools
```

```bash
ares-install --device tv lg-tv-launcher-dist/dev.homeboard.launcher_1.0.3_all.ipk
```

The number in the file name is the `version` in `appinfo.json`.

```bash
ares-launch --device tv dev.homeboard.launcher
```

It shows up as **Home** in your app bar. Move it to the front so it's one click away.

### 5. Keep it alive

Developer Mode apps stop working when the Dev Mode session runs out. The **Remain Session** timer is shown in
the Developer Mode app; press **Extend** before it reaches zero.

## Customize

Everything lives in [`config.js`](config.js):

| Setting | What it does |
| --- | --- |
| `weather.city`, `latitude`, `longitude` | Your city for weather. Leave `null` to hide it. Right click a spot on Google Maps to copy coordinates. |
| `weather.units` | `"fahrenheit"` or `"celsius"` |
| `clock24h` | `true` for a 24 hour clock |
| `motion` | `false` turns off all animation |
| `theme` | Starting theme: `"dark"`, `"light"`, `"auto"` (light from 7:00 to 19:00), `"midnight"`, `"ocean"`, `"forest"`, `"sunset"`, `"grape"`, `"rose"`, `"sand"`, `"sky"` or `"mint"`. A theme picked on the TV wins. |
| `layout` | Starting layout: `"classic"`, `"centered"`, `"dashboard"` or `"minimal"`. A layout picked on the TV wins. |
| `ambientMinutes` | Idle minutes before ambient mode. `0` turns it off. |
| `wallpapers` | File names of photos you put in `wallpapers/` (1920x1080 JPG works best) |
| `wallpaperSeconds` | How often the wallpaper changes behind the home screen |
| `slideshowSeconds` | How often photos change in ambient mode |
| `apps` | Your main row: `{ id, title, icon }` |
| `inputs` | The Watch row: Live TV and HDMI |

### App ids

| App | id |
| --- | --- |
| Netflix | `netflix` |
| YouTube | `youtube.leanback.v4` |
| Prime Video | `amazon` |
| Disney+ | `com.disney.disneyplus-prod` |
| Spotify | `spotify-beehive` |
| Apple TV | `com.apple.appletv` |
| Plex | `cdp-30` |
| Web browser | `com.webos.app.browser` |
| Live TV | `com.webos.app.livetv` |
| HDMI 1 to 4 | `com.webos.app.hdmi1` ... `com.webos.app.hdmi4` |

Apps the TV doesn't have just fail to open with a short message, so it's safe to experiment.

### Icons

`icon` is the name of an SVG in [`icons/`](icons) without `.svg`. Any single color SVG works; the launcher
recolors it to match the theme. [Simple Icons](https://simpleicons.org) has most brands:

```bash
curl -o icons/plex.svg https://cdn.jsdelivr.net/npm/simple-icons@16.38.0/icons/plex.svg
```

Then add `icon: "plex"` to that app in `config.js`. No icon means the app's name is shown on the tile.

### Your photos as a slideshow

Point the photo tool at a folder of pictures (needs Python and `pip install pillow`):

```bash
python tools/make_wallpapers.py "path/to/your/photos"
```

It turns them into 1920x1080 slides that fill the whole screen. Wide photos get a slide each, and tall phone
photos are set two or three side by side so nothing is cropped to a thin strip. Location and camera metadata
are removed. The slides and `wallpapers/list.js` go into `wallpapers/`, which is gitignored, so your photos never
end up in a commit. Reinstall the app afterwards.

### App icon and splash

The app icon and splash screen are drawn as SVG in [`tools/icon/`](tools/icon). After editing them, rebuild the
PNGs (needs Edge or Chrome, plus ffmpeg):

```bash
python tools/icon/make_icons.py
```

## Updating

After changing `config.js`, icons or wallpapers, run the three commands from step 4 again.
If the TV keeps showing the old app icon, raise `version` in `appinfo.json` before packaging.

## Rooted TVs

Rooting is your call and it's at your own risk. Check whether your firmware can be rooted at
[cani.rootmy.tv](https://cani.rootmy.tv) and follow the [webOS Homebrew](https://www.webosbrew.org) guide.
Once the **Homebrew Channel** is installed, Homeboard can stop being "an app" and become the screen your TV
opens to.

Two things that catch people out while rooting:

- **Uninstall the LG Developer Mode app before you reboot.** If it's still installed, it wipes the folder
  Homebrew Channel lives in and you have to root again.
- Turn **Quick Start+** off while rooting. You can turn it back on when you're done.

### 1. Secure SSH first

Homebrew Channel turns on an SSH server for root, and until you add a key its password is `alpine`, which
everyone knows. Anyone on your Wi-Fi could log in. `passwd` doesn't work because `/etc` is read only. Use a key
instead. Once a key is in place, Homebrew stops setting the password at boot.

```bash
ssh-keygen -t ed25519 -f ~/.ssh/homeboard_tv
```

Copy the public key to the TV (this is the last time you'll type `alpine`):

```bash
ssh root@<TV_IP> "mkdir -p /home/root/.ssh && cat >> /home/root/.ssh/authorized_keys && chmod 600 /home/root/.ssh/authorized_keys" < ~/.ssh/homeboard_tv.pub
```

Check that the key works, then restart the TV:

```bash
ssh -i ~/.ssh/homeboard_tv root@<TV_IP> reboot
```

After the restart the password is gone, and only a computer with that key file can get in.

### 2. Make it the startup screen

[`tools/rooted/`](tools/rooted) builds a one shot setup script with the app inside it. Run it from the repo's
parent folder after packaging (step 4 above):

```bash
python lg-tv-launcher/tools/rooted/make_bundle.py lg-tv-launcher-dist/dev.homeboard.launcher_1.0.3_all.ipk homeboard-setup.sh
```

```bash
ssh -i ~/.ssh/homeboard_tv root@<TV_IP> sh -s < homeboard-setup.sh
```

On Windows PowerShell, wrap any command that uses `<` in `cmd /c "..."`, because PowerShell has no `<` redirect.

It should end with `INSTALLED`, `WATCHER RUNNING` and `== done`. The script:

- installs the app permanently (no Dev Mode session to extend, nothing expires);
- adds `/var/lib/webosbrew/init.d/homeboard`, which Homebrew Channel runs at every boot. It opens Homeboard about
  20 seconds after a cold start and again every time the TV wakes from standby.

To undo it, delete `/var/lib/webosbrew/init.d/homeboard` on the TV and restart.

### 3. Optional: the Home button

Install **LG Input Hook** from Homebrew Channel and point a remote button at
`luna-send -n 1 luna://com.webos.applicationManager/launch '{"id":"dev.homeboard.launcher"}'`.
Try a spare button first before remapping **Home** itself.

An official LG firmware update can remove root, so turn off automatic updates on a rooted TV. The app stays
installed either way, but the startup script may stop running.

## Clean up LG's own home screen

Menu names vary a little between webOS versions. Look under **Settings → General → System → Additional Settings**:

- **Home Settings**: turn off *Home Auto Launch*, *Home Promotion* and *Content Recommendation*.
- **User Agreements**: turn off advertising and viewing information.
- **Quick Start+**: on, so the TV wakes up fast (but off while rooting).

## Troubleshooting

**`No matched device <name> : tv`**: the device wasn't saved. Run `ares-setup-device --list`; if `tv` is missing,
run the `--add` command again in a normal terminal.

**`--getkey` fails**: Key Server must be ON in the Developer Mode app, and the TV and computer must be on the same network.

**Apps don't open**: check the id in `config.js`. On webOS 27+ the app needs the `application.launcher`
permission, which is already declared in `appinfo.json`.

**Why bundled icons instead of the TV's own?** LG blocks sideloaded apps from listing installed apps
(`listLaunchPoints` is denied), and Developer Mode apps can't read other apps' files. On a rooted TV the
launcher uses the TV's real icons automatically when it's allowed to.

**Rooted: the launcher doesn't open after power on**: SSH in and run `cat /var/run/homeboard-watch.log`. It lists
the power states the startup script saw. If it's empty, check that `/var/lib/webosbrew/init.d/homeboard` exists;
`sh /var/lib/webosbrew/init.d/homeboard` starts it by hand.

**Debugging on the TV**: `ares-inspect --device tv --app dev.homeboard.launcher --open` opens DevTools for the running launcher.

**Preview on your computer**: `python -m http.server 8130` in this folder, then open `http://localhost:8130`.
Opening apps only works on the TV.

## Credits

- Logos: [Simple Icons](https://simpleicons.org) (CC0). Trademarks belong to their owners.
- Weather: [Open-Meteo](https://open-meteo.com).
- Rooting and homebrew: the [webOS Homebrew](https://www.webosbrew.org) community.

MIT licensed. See [LICENSE](LICENSE).
