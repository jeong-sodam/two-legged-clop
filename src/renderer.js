import { difficultyForDistance } from "./obstacles.js";

const GROUND_Y = 390;
const LIMBS = ["leftArm", "rightArm", "leftLeg", "rightLeg"];
const SKIN = "#efbd91";
const HAIR = "#30263a";
const INK = "#262137";
const THEMES = {
  "moss-forest": { sky: ["#263d4a", "#42615a", "#78916a"], far: "#344b4b", near: "#27383b", soil: "#493642", top: "#9bad55", accent: "#d4e184" },
  subway: { sky: ["#30384a", "#465264", "#78818a"], far: "#394351", near: "#26313d", soil: "#44434b", top: "#d4bc84", accent: "#f3d974" },
  factory: { sky: ["#30313c", "#41444a", "#727168"], far: "#42464a", near: "#303438", soil: "#443d3b", top: "#a27752", accent: "#e0a750" },
  "windy-rooftop": { sky: ["#405b83", "#7185a2", "#d0a27e"], far: "#505571", near: "#3c4055", soil: "#38394c", top: "#8e6683", accent: "#e2bd86" },
  "night-market": { sky: ["#22273c", "#41445b", "#68627c"], far: "#36364f", near: "#292b42", soil: "#343040", top: "#706078", accent: "#f0b85a" },
};

const HAZARD_COLORS = {
  "slippery-log": ["#875437", "#c38b51"], "monkey-banana": ["#e7a936", "#fff078"],
  "ground-spear": ["#a9b5b5", "#edf0d6"], "knockback-snake": ["#477947", "#9cc362"],
  commuter: ["#5276a2", "#e5b77e"], "train-edge": ["#b94749", "#e6c776"], turnstile: ["#68777d", "#d9c9a3"],
  conveyor: ["#575b61", "#d6a450"], piston: ["#a74743", "#c9c7bc"], "rolling-gear": ["#646a70", "#c1a86f"],
  gust: ["#6ba9c2", "#d6eff0"], "swinging-sign": ["#ad584a", "#ecc26d"], "low-wire": ["#565466", "#f3e7ad"],
  puddle: ["#447c9b", "#8ac8da"], cart: ["#a45146", "#efbb66"], "steam-vent": ["#747783", "#e5e0d9"],
};

export class Renderer {
  constructor(canvas, context) {
    this.canvas = canvas;
    this.context = context;
    this.context.imageSmoothingEnabled = false;
  }

  render(snapshot) {
    const { context: ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const map = snapshot.map ?? { id: "moss-forest" };
    this.drawBackground(map, snapshot.distance ?? 0, snapshot.elapsedSeconds ?? 0);
    this.drawHazards(map, snapshot.hazards ?? [], snapshot.elapsedSeconds ?? 0);
    this.drawPlayer(snapshot.player, snapshot.elapsedSeconds ?? 0, snapshot.state);
    this.drawHud(snapshot);
  }

  palette(map) { return THEMES[map?.id] ?? THEMES["moss-forest"]; }

  drawBackground(map, cameraOffset, elapsedSeconds) {
    const ctx = this.context;
    const palette = this.palette(map);
    const bands = palette.sky;
    const bandHeight = 390 / bands.length;
    bands.forEach((color, index) => { ctx.fillStyle = color; ctx.fillRect(0, Math.floor(index * bandHeight), this.canvas.width, Math.ceil(bandHeight)); });
    this.drawParallax(map, cameraOffset);
    if (map?.id === "moss-forest") this.drawForest(cameraOffset, elapsedSeconds);
    else if (map?.id === "subway") this.drawSubway(cameraOffset);
    else if (map?.id === "factory") this.drawFactory(cameraOffset);
    else if (map?.id === "windy-rooftop") this.drawRooftop(cameraOffset, elapsedSeconds);
    else this.drawMarket(cameraOffset, elapsedSeconds);
    this.drawGround(map, cameraOffset, palette);
  }

  drawParallax(map, cameraOffset) {
    const ctx = this.context;
    const id = map?.id;
    ctx.fillStyle = this.palette(map).far;
    const farOffset = Math.floor(cameraOffset * 0.12) % 210;
    for (let x = -210 - farOffset; x < this.canvas.width + 210; x += 210) {
      if (id === "subway") { ctx.fillRect(x, 118, 164, 174); ctx.fillRect(x + 20, 94, 120, 24); }
      else if (id === "factory") { ctx.fillRect(x + 20, 100, 20, 220); ctx.fillRect(x + 20, 100, 160, 12); ctx.fillRect(x + 165, 125, 18, 194); }
      else if (id === "windy-rooftop") { ctx.fillRect(x, 228, 172, 96); ctx.fillRect(x + 24, 188, 124, 40); }
      else if (id === "night-market") { ctx.fillRect(x + 5, 204, 184, 118); ctx.fillRect(x + 27, 170, 142, 34); }
      else { ctx.fillRect(x + 8, 270, 160, 50); ctx.fillRect(x + 30, 244, 110, 26); }
    }
    ctx.fillStyle = this.palette(map).near;
    const nearOffset = Math.floor(cameraOffset * 0.34) % 136;
    for (let x = -136 - nearOffset; x < this.canvas.width + 136; x += 136) {
      if (id === "moss-forest") { ctx.fillRect(x + 46, 124, 24, 268); ctx.fillRect(x + 10, 164, 44, 18); ctx.fillRect(x + 68, 144, 40, 20); }
      else if (id === "subway") { ctx.fillRect(x + 12, 154, 16, 238); ctx.fillRect(x + 100, 154, 16, 238); ctx.fillRect(x, 152, 128, 10); }
      else if (id === "factory") { ctx.fillRect(x + 15, 184, 14, 208); ctx.fillRect(x + 108, 184, 14, 208); ctx.fillRect(x + 15, 184, 107, 9); ctx.fillRect(x + 34, 214, 66, 8); }
      else if (id === "windy-rooftop") { ctx.fillRect(x, 314, 136, 78); ctx.fillRect(x + 30, 274, 76, 40); }
      else { ctx.fillRect(x + 5, 254, 126, 138); ctx.fillRect(x + 18, 226, 100, 28); }
    }
  }

  drawForest(cameraOffset, time) {
    const ctx = this.context;
    const offset = Math.floor(cameraOffset * 0.52) % 300;
    for (let x = -300 - offset; x < 1200; x += 300) {
      ctx.fillStyle = "#253641"; ctx.fillRect(x + 202, 92, 18, 298); ctx.fillRect(x + 182, 130, 58, 18);
      ctx.fillStyle = "#59664a"; ctx.fillRect(x + 147, 61, 98, 58); ctx.fillRect(x + 184, 30, 112, 55); ctx.fillRect(x + 126, 98, 74, 43);
      ctx.fillStyle = "#75804c"; ctx.fillRect(x + 174, 70, 34, 22); ctx.fillRect(x + 232, 49, 38, 25); ctx.fillRect(x + 140, 105, 30, 18);
      ctx.fillStyle = "#9aaf65"; ctx.fillRect(x + 174, 82 + Math.round(Math.sin(time + x) * 2), 4, 4); ctx.fillRect(x + 250, 67, 4, 4);
    }
  }

  drawSubway(cameraOffset) {
    const ctx = this.context;
    ctx.fillStyle = "#202b39"; ctx.fillRect(0, 136, this.canvas.width, 10);
    ctx.fillStyle = "#d0a64c"; ctx.fillRect(0, 152, this.canvas.width, 4);
    const offset = Math.floor(cameraOffset * 0.28) % 260;
    for (let x = -260 - offset; x < this.canvas.width + 260; x += 260) {
      ctx.fillStyle = "#263344"; ctx.fillRect(x + 30, 174, 172, 88);
      ctx.fillStyle = "#82a5ab"; ctx.fillRect(x + 42, 184, 60, 62); ctx.fillRect(x + 116, 184, 72, 62);
      ctx.fillStyle = "#334b59"; ctx.fillRect(x + 48, 190, 47, 48); ctx.fillRect(x + 122, 190, 59, 48);
      ctx.fillStyle = "#d5b94f"; ctx.fillRect(x + 88, 188, 4, 54); ctx.fillRect(x + 158, 184, 4, 62);
      ctx.fillStyle = "#bf554c"; ctx.fillRect(x + 34, 267, 168, 8);
    }
  }

  drawFactory(cameraOffset) {
    const ctx = this.context;
    const offset = Math.floor(cameraOffset * 0.2) % 240;
    for (let x = -240 - offset; x < 1200; x += 240) {
      ctx.fillStyle = "#c58d45"; ctx.fillRect(x + 48, 128, 48, 40); ctx.fillRect(x + 150, 190, 40, 34);
      ctx.fillStyle = "#f1bd57"; ctx.fillRect(x + 54, 134, 36, 28); ctx.fillRect(x + 156, 196, 28, 22);
      ctx.fillStyle = "#30343c"; ctx.fillRect(x + 64, 142, 4, 12); ctx.fillRect(x + 77, 142, 4, 12);
      ctx.fillStyle = "#a06b43"; ctx.fillRect(x + 118, 38, 12, 152); ctx.fillRect(x + 112, 38, 54, 12);
      ctx.fillStyle = "#6f7376"; ctx.fillRect(x + 124, 12, 7, 24); ctx.fillRect(x + 158, 58, 7, 30);
    }
  }

  drawRooftop(cameraOffset, time) {
    const ctx = this.context;
    ctx.fillStyle = "#eee1bd";
    for (let i = 0; i < 5; i++) {
      const x = ((i * 233 - Math.floor(cameraOffset * 0.08)) % 1100 + 1100) % 1100;
      const y = 54 + i * 25 + Math.round(Math.sin(time * 1.5 + i) * 3);
      ctx.fillRect(x, y, 3, 3); ctx.fillRect(x + 12, y + 7, 2, 2);
    }
    const offset = Math.floor(cameraOffset * 0.24) % 280;
    for (let x = -280 - offset; x < 1200; x += 280) {
      ctx.fillStyle = "#43475e"; ctx.fillRect(x + 36, 250, 150, 74); ctx.fillRect(x + 63, 215, 98, 35);
      ctx.fillStyle = "#d19f70"; ctx.fillRect(x + 106, 236, 13, 14); ctx.fillRect(x + 48, 266, 20, 18);
      ctx.fillStyle = "#ab6475"; ctx.fillRect(x + 93, 199, 9, 24); ctx.fillRect(x + 93, 194, 29, 8);
    }
  }

  drawMarket(cameraOffset, time) {
    const ctx = this.context;
    const offset = Math.floor(cameraOffset * 0.24) % 240;
    for (let x = -240 - offset; x < 1200; x += 240) {
      ctx.fillStyle = "#ad6558"; ctx.fillRect(x + 16, 122, 186, 12); ctx.fillRect(x + 28, 134, 10, 134); ctx.fillRect(x + 181, 134, 10, 134);
      ctx.fillStyle = "#e3a55b"; ctx.fillRect(x + 34, 144, 150, 62);
      ctx.fillStyle = "#674354"; ctx.fillRect(x + 43, 153, 54, 43); ctx.fillRect(x + 111, 153, 64, 43);
      ctx.fillStyle = "#f1c36a"; ctx.fillRect(x + 61, 160, 8, 8); ctx.fillRect(x + 147, 160, 8, 8);
      ctx.fillStyle = "#efbd66"; ctx.fillRect(x + 109, 102 + Math.round(Math.sin(time * 3 + x) * 2), 18, 22);
      ctx.fillStyle = "#fff2a0"; ctx.fillRect(x + 114, 108, 8, 12);
    }
    ctx.fillStyle = "rgba(166,204,220,0.38)";
    for (let i = 0; i < 26; i++) { const x = (i * 83 + Math.floor(time * 46)) % this.canvas.width; const y = 85 + (i * 47) % 285; ctx.fillRect(x, y, 2, 11); }
  }

  drawGround(map, cameraOffset, palette) {
    const ctx = this.context;
    const id = map?.id;
    ctx.fillStyle = palette.soil; ctx.fillRect(0, GROUND_Y, this.canvas.width, 150);
    ctx.fillStyle = palette.top; ctx.fillRect(0, GROUND_Y - 5, this.canvas.width, 8);
    ctx.fillStyle = palette.accent;
    const offset = Math.floor(cameraOffset) % 32;
    for (let x = -32 - offset; x < 1000; x += 32) {
      if (id === "moss-forest") { ctx.fillRect(x + 5, 396, 18, 3); ctx.fillRect(x + 19, 413, 5, 3); ctx.fillStyle = "#675044"; ctx.fillRect(x + 2, 439, 26, 5); ctx.fillStyle = palette.accent; }
      else if (id === "subway") { ctx.fillRect(x, 398, 30, 3); ctx.fillStyle = "#323440"; ctx.fillRect(x + 1, 422, 30, 26); ctx.fillStyle = palette.accent; }
      else if (id === "factory") { ctx.fillRect(x, 398, 18, 4); ctx.fillStyle = "#5c4d45"; ctx.fillRect(x + 7, 426, 19, 5); ctx.fillStyle = palette.accent; }
      else if (id === "windy-rooftop") { ctx.fillRect(x, 398, 26, 3); ctx.fillStyle = "#4b4654"; ctx.fillRect(x + 12, 422, 7, 3); ctx.fillStyle = palette.accent; }
      else { ctx.fillRect(x, 398, 27, 3); ctx.fillStyle = "#5590a3"; ctx.fillRect(x + 6, 428, 21, 3); ctx.fillStyle = palette.accent; }
    }
    ctx.fillStyle = "#292536"; ctx.fillRect(0, 522, this.canvas.width, 18);
  }

  drawHazards(map, hazards, elapsedSeconds) {
    const ctx = this.context;
    for (const hazard of hazards) {
      const [base, highlight] = HAZARD_COLORS[hazard.type] ?? ["#c07848", "#f2ca76"];
      const { x, y, width: w, height: h } = hazard.bounds;
      const pulse = Math.round(Math.sin(elapsedSeconds * 9 + hazard.phase) * 2);
      if (!hazard.armed) {
        ctx.fillStyle = Math.floor(elapsedSeconds * 8) % 2 ? "#e94e59" : "#fff0a8";
        ctx.fillRect(Math.round(x - 4), Math.round(y - 5), Math.round(w + 8), 3);
      }
      ctx.fillStyle = "rgba(20,18,30,.28)"; ctx.fillRect(Math.round(x + 3), Math.round(GROUND_Y - 2), Math.round(w), 5);
      ctx.fillStyle = base; ctx.fillRect(Math.round(x), Math.round(y), w, h);
      ctx.fillStyle = highlight;
      if (hazard.type === "ground-spear" || hazard.type === "piston" || hazard.type === "steam-vent") {
        const tip = hazard.type === "ground-spear" ? 14 : 6;
        ctx.fillRect(Math.round(x + tip), Math.round(y + 5), Math.max(3, w - tip * 2), Math.max(5, h - 8));
        if (hazard.type === "ground-spear") { ctx.beginPath(); ctx.moveTo(Math.round(x), Math.round(y + 15)); ctx.lineTo(Math.round(x + w / 2), Math.round(y)); ctx.lineTo(Math.round(x + w), Math.round(y + 15)); ctx.fill(); }
        if (hazard.type === "steam-vent") for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(x + 8 + i * 14), Math.round(y - 10 - ((elapsedSeconds * 28 + i * 12) % 25)), 7, 12);
      } else if (hazard.type === "puddle") {
        ctx.fillRect(Math.round(x + 10), Math.round(y + 4), w - 20, Math.max(3, h - 8)); ctx.fillStyle = "#d8f1ea"; ctx.fillRect(Math.round(x + 25), Math.round(y + 4), 18, 2);
      } else if (hazard.type === "monkey-banana") {
        ctx.fillRect(Math.round(x + 5), Math.round(y + 3), 13, 5); ctx.fillRect(Math.round(x + 3), Math.round(y + 7), 6, 7); ctx.fillStyle = "#fff3bc"; ctx.fillRect(Math.round(x + 16), Math.round(y + 4), 3, 3);
      } else if (hazard.type === "knockback-snake") {
        for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(x + i * 15), Math.round(y + 7 + (i % 2) * 5), 14, 13);
        ctx.fillStyle = "#f0d77a"; ctx.fillRect(Math.round(x + w - 12), Math.round(y + 10), 3, 3);
      } else if (hazard.type === "commuter") {
        ctx.fillRect(Math.round(x + 8), Math.round(y + 4), 25, 20); ctx.fillStyle = "#dca779"; ctx.fillRect(Math.round(x + 12), Math.round(y - 7), 17, 18); ctx.fillStyle = "#33344a"; ctx.fillRect(Math.round(x + 11), Math.round(y - 10), 20, 7); ctx.fillStyle = "#eee1c4"; ctx.fillRect(Math.round(x + 13), Math.round(y + 31), 7, 23); ctx.fillRect(Math.round(x + 25), Math.round(y + 31), 7, 23);
      } else if (hazard.type === "rolling-gear") {
        ctx.fillRect(Math.round(x + 5), Math.round(y + 5), w - 10, h - 10); ctx.fillStyle = base; ctx.fillRect(Math.round(x + 15), Math.round(y + 15), w - 30, h - 30); ctx.fillStyle = highlight; ctx.fillRect(Math.round(x + 21), Math.round(y + 21), 7, 7);
      } else if (hazard.type === "slippery-log") {
        for (let i = 8; i < w; i += 16) ctx.fillRect(Math.round(x + i), Math.round(y + 4), 3, h - 8); ctx.fillRect(Math.round(x + 6), Math.round(y + 4), w - 12, 3);
      } else if (hazard.type === "train-edge") {
        ctx.fillRect(Math.round(x), Math.round(y + 3), w, 8); ctx.fillStyle = "#3d4653"; ctx.fillRect(Math.round(x + 8), Math.round(y + 12), w - 16, h - 12); ctx.fillStyle = "#fff0a8"; ctx.fillRect(Math.round(x + 14), Math.round(y + 17), 18, 8); ctx.fillRect(Math.round(x + w - 32), Math.round(y + 17), 18, 8);
      } else if (hazard.type === "cart") {
        ctx.fillRect(Math.round(x + 7), Math.round(y + 4), w - 14, h - 14); ctx.fillStyle = "#292536"; ctx.fillRect(Math.round(x + 14), Math.round(y + h - 8), 12, 8); ctx.fillRect(Math.round(x + w - 27), Math.round(y + h - 8), 12, 8); ctx.fillStyle = highlight; ctx.fillRect(Math.round(x + 14), Math.round(y + 9), w - 28, 5);
      } else if (hazard.type === "gust") {
        ctx.clearRect(Math.round(x), Math.round(y), w, h); ctx.strokeStyle = highlight; ctx.lineWidth = 4; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(Math.round(x + pulse), Math.round(y + 15 + i * 17)); ctx.lineTo(Math.round(x + w - 10), Math.round(y + 15 + i * 17)); ctx.stroke(); }
      } else if (hazard.type === "swinging-sign") {
        ctx.fillRect(Math.round(x + w / 2 - 3), Math.round(y - 23), 6, 23); ctx.fillStyle = "#332a37"; ctx.fillRect(Math.round(x + 8), Math.round(y + 8), w - 16, 5);
      } else if (hazard.type === "low-wire") {
        ctx.fillStyle = "#2b2737"; ctx.fillRect(Math.round(x), Math.round(y), w, 4); ctx.fillStyle = highlight; for (let i = 8; i < w; i += 16) ctx.fillRect(Math.round(x + i), Math.round(y + 5), 4, 6);
      } else {
        ctx.fillRect(Math.round(x + 5), Math.round(y + 5 + pulse), Math.max(4, w - 10), Math.max(4, Math.floor(h / 3)));
        if (hazard.type === "turnstile") { ctx.fillStyle = "#d0c19a"; ctx.fillRect(Math.round(x + w / 2 - 3), Math.round(y + h / 2), 6, 7); ctx.save(); ctx.translate(Math.round(x + w / 2), Math.round(y + h / 2)); ctx.rotate(elapsedSeconds * 5); ctx.fillRect(-18, -2, 36, 4); ctx.restore(); }
        if (hazard.type === "conveyor") { ctx.fillStyle = "#d4a954"; for (let i = 8; i < w; i += 18) ctx.fillRect(Math.round(x + ((i + elapsedSeconds * 25) % w)), Math.round(y + h - 4), 7, 4); }
      }
      if (hazard.type === "trap" && !hazard.armed) { ctx.fillStyle = "#e94e59"; ctx.fillRect(Math.round(x - 5), GROUND_Y - 7, w + 10, 3); }
    }
  }

  drawPlayer(player, elapsedSeconds, state) {
    if (!player) return;
    const ctx = this.context;
    const fall = player.fallProgress ?? 0;
    const limbs = player.limbs;
    const stride = player.forwardSpeed > 8 ? Math.sin(elapsedSeconds * (7 + player.forwardSpeed / 55)) : 0;
    ctx.save(); ctx.translate(Math.round(player.x), Math.round(player.y));
    ctx.translate(10, -65); ctx.rotate((player.bodyWobble ?? 0) + fall * 1.2); ctx.translate(-10, 65);
    ctx.globalAlpha = 1 - fall * 0.32;
    const segment = (x1, y1, x2, y2, color, width) => { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "square"; ctx.beginPath(); ctx.moveTo(Math.round(x1), Math.round(y1)); ctx.lineTo(Math.round(x2), Math.round(y2)); ctx.stroke(); };
    const arm = (name, shoulder, dir, rear = false) => {
      const lift = limbs[name].lift; const swing = Math.sin(limbs[name].swing) * 3; const fold = fall * 16;
      const elbowX = shoulder + dir * (10 - fold) + swing; const elbowY = -36 - lift * 15 + fold;
      const handX = shoulder + dir * (17 - fold * .6) + swing; const handY = -5 - lift * 28 + fall * 23;
      const sleeve = rear ? "#65536b" : "#41354f";
      segment(shoulder, -65, elbowX, elbowY, INK, 16); segment(shoulder, -65, elbowX, elbowY, sleeve, 11);
      segment(elbowX, elbowY, handX, handY, INK, 12); segment(elbowX, elbowY, handX, handY, SKIN, 7);
      ctx.fillStyle = "#f5d0a7"; ctx.fillRect(Math.round(handX - 5), Math.round(handY - 4), 10, 7);
    };
    const leg = (name, hip, dir, rear = false) => {
      const lift = limbs[name].lift; const gait = stride * (rear ? -1 : 1); const limbSwing = Math.sin(limbs[name].swing) * 3;
      const kneeX = hip + dir * (10 + gait * 5 + limbSwing); const kneeY = -29 - lift * 13;
      const footX = hip + dir * (18 + gait * 11 + limbSwing); const footY = -2 - lift * 24 + fall * 17;
      const pants = rear ? "#55455d" : "#383248";
      segment(hip, -53, kneeX, kneeY, INK, 18); segment(hip, -53, kneeX, kneeY, pants, 12);
      segment(kneeX, kneeY, footX, footY, INK, 15); segment(kneeX, kneeY, footX, footY, rear ? "#6c5b68" : "#51455d", 9);
      ctx.fillStyle = "#292637"; ctx.fillRect(Math.round(footX - 10), Math.round(footY - 2), 19, 8); ctx.fillStyle = "#908071"; ctx.fillRect(Math.round(footX - 5), Math.round(footY), 9, 2);
    };
    leg("rightLeg", -22, -1, true); arm("rightArm", -7, -1, true);
    ctx.fillStyle = "#202033"; ctx.fillRect(-19, -84, 66, 38);
    ctx.fillStyle = "#394259"; ctx.fillRect(-14, -79, 55, 29); ctx.fillRect(-5, -86, 41, 8);
    ctx.fillStyle = "#678298"; ctx.fillRect(-8, -76, 29, 5); ctx.fillRect(28, -75, 6, 18);
    ctx.fillStyle = "#cfaa70"; ctx.fillRect(-14, -52, 53, 5);
    ctx.fillStyle = "#b88462"; ctx.fillRect(30, -94, 16, 22);
    const head = -115 + ((limbs.leftArm.lift + limbs.rightArm.lift) * 10 + (limbs.leftLeg.lift + limbs.rightLeg.lift) * 3) + fall * 12;
    ctx.fillStyle = "#bd896b"; ctx.fillRect(34, Math.round(head + 21), 28, 13);
    ctx.fillStyle = SKIN; ctx.fillRect(36, Math.round(head + 2), 35, 27); ctx.fillRect(31, Math.round(head + 11), 9, 15);
    ctx.fillStyle = HAIR; ctx.fillRect(32, Math.round(head - 5), 38, 12); ctx.fillRect(39, Math.round(head - 11), 26, 8); ctx.fillRect(65, Math.round(head + 2), 8, 14);
    ctx.fillStyle = "#1f1e2c"; ctx.fillRect(61, Math.round(head + 10), 4, 4);
    ctx.fillStyle = state === "falling" ? "#a8474e" : "#fff0a8"; ctx.fillRect(67, Math.round(head + 17), 5, 3);
    if (fall < .2) { ctx.fillStyle = "#f8d4a4"; ctx.fillRect(50, Math.round(head + 7), 3, 3); }
    arm("leftArm", 13, 1); leg("leftLeg", -8, 1);
    ctx.restore();
  }

  drawHud(snapshot) {
    const { context: ctx, canvas } = this;
    const { player, distance = 0, score = 0, bestScore = 0, mode, map } = snapshot;
    if (!player) return;
    const level = difficultyForDistance(distance, mode ?? "normal").level;
    ctx.fillStyle = "rgba(27,24,39,.84)"; ctx.fillRect(14, 13, 246, 69); ctx.fillRect(canvas.width - 246, 13, 232, 69);
    ctx.fillStyle = "#f8e6b2"; ctx.font = "bold 15px monospace"; ctx.textAlign = "left"; ctx.fillText("속도", 27, 33);
    ctx.fillStyle = "#252335"; ctx.fillRect(27, 43, 210, 12); ctx.fillStyle = "#8ec56b"; ctx.fillRect(27, 43, Math.round(Math.min(1, player.forwardSpeed / 260) * 210), 12);
    ctx.fillStyle = "#fff0bf"; ctx.textAlign = "right"; ctx.fillText("거리  " + score, canvas.width - 27, 32); ctx.fillText("최고  " + bestScore + "   레벨 " + level, canvas.width - 27, 53); ctx.fillText(map?.name ?? "", canvas.width - 27, 74);
    const labels = { leftArm: "왼팔", rightArm: "오른팔", leftLeg: "왼다리", rightLeg: "오른다리" };
    LIMBS.forEach((limb, index) => {
      const x = 14 + index * 236; const raised = player.limbs[limb].raised;
      ctx.fillStyle = "rgba(27,24,39,.93)"; ctx.fillRect(x, 482, 224, 42); ctx.fillStyle = raised ? "#f1ba56" : "#79778a"; ctx.fillRect(x + 10, 494, 14, 14);
      ctx.fillStyle = "#fff0bf"; ctx.font = "bold 14px monospace"; ctx.textAlign = "left"; ctx.fillText(labels[limb] + " · " + (raised ? "들림" : "내려감"), x + 34, 506);
    });
    ctx.textAlign = "start";
  }
}
