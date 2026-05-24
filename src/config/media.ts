// Central media configuration
// Edit these values to change the hero poster and background video without touching components.

import bangkokSingapore from "@/assets/Bangkok & Singapore.jpeg";
import newYork from "@/assets/Newyork.jpg";
import salonei from "@/assets/Salonei.jpeg";
import switzerland from "@/assets/swizerland.jpeg";
import tokyoSeoul from "@/assets/Tokyo & Seoul.jpeg";
import vietnam from "@/assets/vitenam.jpeg";

export const MEDIA = {
  heroVideo: "/videodesign.mp4",
  heroPoster: bangkokSingapore,
  destinations: {
    "bangkok-singapore": bangkokSingapore,
    newyork: newYork,
    salonei: salonei,
    switzerland: switzerland,
    "tokyo-seoul": tokyoSeoul,
    vietnam: vietnam,
  } as Record<string, string>,
};
