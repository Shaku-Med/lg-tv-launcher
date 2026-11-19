"""Build a one-shot setup script for a rooted TV.

    python tools/rooted/make_bundle.py <path-to-ipk> <output.sh>

Then run it on the TV over SSH with your key (see "Secure SSH first" in the README):

    cmd /c "ssh -i <key> root@<TV_IP> sh -s < output.sh"     (Windows)
    ssh -i <key> root@<TV_IP> sh -s < output.sh               (macOS / Linux)

It installs the launcher permanently and adds the startup script that opens it on
boot and on every wake from standby.
"""
import base64
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent

TEMPLATE = r"""#!/bin/sh
IPK=/var/run/homeboard.ipk
INIT_DIR=/var/lib/webosbrew/init.d

echo "== checking tools"
command -v base64 >/dev/null || { echo "base64 missing on this TV"; exit 1; }

echo "== unpacking launcher"
base64 -d > "$IPK" <<'__IPK__'
@@IPK@@
__IPK__
ls -l "$IPK"

echo "== installing launcher"
LOG=/var/run/homeboard-install.log
luna-send -w 90000 -i luna://com.webos.appInstallService/dev/install \
  "{\"id\":\"com.ares.defaultName\",\"ipkUrl\":\"$IPK\",\"subscribe\":true}" > "$LOG" 2>&1 &
pid=$!
i=0
while [ $i -lt 45 ]; do
  sleep 2
  grep -q -e '"installed"' -e 'failed' -e 'Unknown method' -e 'errorText' "$LOG" && break
  i=$((i + 1))
done
kill "$pid" 2>/dev/null
grep -o -e '"state" *: *"[^"]*"' -e '"errorText" *: *"[^"]*"' -e '"statusValue" *: *[0-9]*' "$LOG" | tail -n 6
if [ -d /media/developer/apps/usr/palm/applications/dev.homeboard.launcher ]; then
  echo "INSTALLED"
else
  echo "INSTALL NOT FOUND"
fi
rm -f "$IPK"

echo "== adding startup script"
mkdir -p "$INIT_DIR"
cat > "$INIT_DIR/homeboard" <<'__INIT__'
@@INIT@@
__INIT__
chmod 755 "$INIT_DIR/homeboard"
ls -l "$INIT_DIR"

echo "== does Homebrew Channel run init.d at boot?"
grep -n "init.d" /media/developer/apps/usr/palm/services/org.webosbrew.hbchannel.service/startup.sh 2>/dev/null \
  || echo "no init.d reference found"

echo "== starting watcher now"
sh "$INIT_DIR/homeboard"
sleep 1
if kill -0 "$(cat /var/run/homeboard-watch.pid)" 2>/dev/null; then echo "WATCHER RUNNING"; else echo "WATCHER NOT RUNNING"; fi
echo "== done"
"""


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    ipk = Path(sys.argv[1]).read_bytes()
    b64 = base64.encodebytes(ipk).decode("ascii")
    init = (HERE / "homeboard-autostart.sh").read_text(encoding="utf-8").replace("\r\n", "\n")
    script = TEMPLATE.replace("@@IPK@@", b64.rstrip("\n")).replace("@@INIT@@", init.rstrip("\n"))
    Path(sys.argv[2]).write_bytes(script.encode("utf-8"))
    print(f"wrote {sys.argv[2]} ({len(script) // 1024} KB)")


if __name__ == "__main__":
    main()
