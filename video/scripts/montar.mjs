// Junta os quadros e a trilha no MP4 final (H.264 + AAC, 1920x1080, 30 fps).
import { execFileSync } from "node:child_process";
import { RAIZ } from "./lib.mjs";
import { join } from "node:path";
const saida = join(RAIZ, "apresentacao-site-cartorio-jaboticaba.mp4");
execFileSync("ffmpeg", ["-v", "error", "-y", "-framerate", "60", "-i", join(RAIZ, ".work/quadros/%05d.jpg"), "-i", join(RAIZ, ".work/trilha.wav"),
  "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-profile:v", "high", "-movflags", "+faststart",
  "-c:a", "aac", "-b:a", "192k", "-af", "afade=t=in:st=0:d=1.5,afade=t=out:st=180.5:d=3", "-shortest", saida], { stdio: "inherit" });
console.log("pronto:", saida);
