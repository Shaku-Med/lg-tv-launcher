#!/bin/sh
# Rooted TVs only (Homebrew Channel). Installed as /var/lib/webosbrew/init.d/homeboard.
# Opens the launcher at boot and every time the TV wakes from standby, so it acts as the
# TV's startup screen.

APP=dev.homeboard.launcher
PIDFILE=/var/run/homeboard-watch.pid
LOG=/var/run/homeboard-watch.log

launch() {
  luna-send -n 1 luna://com.webos.applicationManager/launch "{\"id\":\"$APP\"}" >/dev/null 2>&1
}

watch() {
  sleep 20 # let LG's own startup finish first
  launch
  while true; do
    luna-send -i luna://com.webos.service.tvpower/power/getPowerState '{"subscribe":true}' 2>/dev/null |
    while read -r line; do
      state=$(echo "$line" | sed -n 's/.*"state" *: *"\([^"]*\)".*/\1/p')
      [ -z "$state" ] && continue
      echo "$(date +%T) $state" >> "$LOG"
      case "$state" in
        Active)
          if [ "$asleep" = 1 ]; then sleep 4; launch; fi
          asleep=0
          ;;
        Suspend | "Active Standby") asleep=1 ;;
      esac
    done
    sleep 5
  done
}

if [ -f "$PIDFILE" ]; then kill "$(cat "$PIDFILE")" 2>/dev/null; fi
: > "$LOG"
watch </dev/null >/dev/null 2>&1 &
echo $! > "$PIDFILE"
