// Edit this file to make the launcher yours, then reinstall the app.
window.LAUNCHER_CONFIG = {
  // Weather (Open-Meteo, free, no key). Leave latitude/longitude null to hide weather.
  // Find your coordinates: right click your city on Google Maps and copy the numbers.
  weather: {
    city: "",
    latitude: null,
    longitude: null,
    units: "fahrenheit" // "fahrenheit" or "celsius"
  },

  clock24h: false,

  // Drifting background light, slow photo zoom and entrance animations. false = everything still.
  motion: true,

  // "dark", "light", "auto" (light from 7:00 to 19:00), or a color scheme: "midnight", "ocean",
  // "forest", "sunset", "grape", "rose", "sand", "sky", "mint". The Theme button on the launcher overrides this.
  theme: "dark",

  // "classic", "centered", "dashboard" or "minimal". The Layout button on the launcher overrides this.
  layout: "classic",

  // Minutes without a button press before the screen fades to clock + wallpaper. 0 turns it off.
  ambientMinutes: 3,

  // Put your photos in the wallpapers folder and list their file names here.
  // 1920x1080 JPGs work best. Empty list = clean solid background.
  // Or run tools/make_wallpapers.py on a photo folder and they're picked up automatically.
  wallpapers: [],
  wallpaperSeconds: 60,
  // How fast photos change once the screen goes into ambient (slideshow) mode.
  slideshowSeconds: 12,

  // Your main row. "id" is the webOS app id, "icon" is a file name in icons/ (without .svg).
  // No icon = the app name is shown on the tile.
  apps: [
    { id: "netflix", title: "Netflix", icon: "netflix" },
    { id: "youtube.leanback.v4", title: "YouTube", icon: "youtube" },
    { id: "amazon", title: "Prime Video" },
    { id: "com.disney.disneyplus-prod", title: "Disney+" },
    { id: "spotify-beehive", title: "Spotify", icon: "spotify" },
    { id: "com.apple.appletv", title: "Apple TV", icon: "appletv" },
    { id: "com.webos.app.browser", title: "Browser", icon: "browser" }
  ],

  inputs: [
    { id: "com.webos.app.livetv", title: "Live TV" },
    { id: "com.webos.app.hdmi1", title: "HDMI 1" },
    { id: "com.webos.app.hdmi2", title: "HDMI 2" },
    { id: "com.webos.app.hdmi3", title: "HDMI 3" }
  ]
};
