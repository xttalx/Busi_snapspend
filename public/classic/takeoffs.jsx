/* Pro calculator — one project bid. Materials, labor, overhead and profit.
   Prices are published list or contractor midpoints. A line with no published
   price stays blank and the screen asks for it. Saved per project address. */
const { useState: useStateTk, useMemo: useMemoTk, useEffect: useEffectTk } = React;

const TK_PROJECT_TYPES = [
  { id: "new", label: "New build" },
  { id: "renovation", label: "Renovation" },
  { id: "addition", label: "Addition" },
];

const TK_OVERHEAD_PCT = 10;
const TK_PROFIT_PCT = 15;

const TK_SCOPES = [
  { id: "framing", label: "Framing", rate: 75, blurb: "Studs, plates, headers and fasteners." },
  { id: "drywall", label: "Drywall installation", rate: 65, blurb: "Hang the board. Tape and finish are mudding." },
  { id: "mud", label: "Mudding", rate: 70, blurb: "Tape, compound and sand to a finish level." },
  { id: "paint", label: "Paint", rate: 55, blurb: "Primer, finish coats and trim." },
  { id: "flooring", label: "Flooring", rate: 60, blurb: "Floor material, underlayment and baseboard." },
  { id: "ceiling", label: "Grid ceiling", rate: 58, blurb: "Suspended grid and 2×4 or 2×2 acoustic tile. US 2026 list prices — confirm in Canadian dollars." },
  { id: "tiling", label: "Tiling", rate: 70, blurb: "Ceramic tile, thinset and grout. Ontario labor band, 2026." },
  { id: "cabinetry", label: "Cabinetry", rate: 80, blurb: "Cabinet run by the linear foot, plus installation. Canadian 2026 bands." },
  { id: "electrical", label: "Electrical", rate: 100, blurb: "Device counts and cable. Blank lines had no published unit price." },
  { id: "plumbing", label: "Plumbing", rate: 120, blurb: "Rough-in per fixture. Toronto journeyman rate. Materials had no published unit price." },
  { id: "concrete", label: "Concrete", rate: 45, blurb: "GTA ready-mix list, January 2026, plus crew time. Gravel, mesh and forms had no Canadian unit price." },
  { id: "masonry", label: "Masonry", rate: 18.5, blurb: "Thin brick veneer, Ontario 2026. Concrete block had no Canadian unit price." },
];

const TK_FLOORS = {
  lvp: { label: "Luxury vinyl plank", rate: 3.4, under: 0.5, underLabel: "Underlayment", pace: 90, waste: 10 },
  laminate: { label: "Laminate", rate: 2.8, under: 0.45, underLabel: "Foam underlayment", pace: 75, waste: 10 },
  hardwood: { label: "Engineered hardwood", rate: 7.75, under: 0, pace: 40, waste: 10 },
  tile: { label: "Tile", rate: 5.25, under: 0, pace: 28, waste: 15 },
  carpet: { label: "Carpet", rate: 3.1, under: 0.75, underLabel: "Carpet pad", pace: 110, waste: 8 },
};

const TK_LEGACY = {
  ceiling: "Ceilings",
  drywall: "Drywall",
  framing: "Framing",
  insulation: "Insulation",
  paint: "Paint",
  electrical: "Electrical",
  plumbing: "Plumbing",
};

const TK_DEFAULTS = {
  length: 20,
  width: 15,
  height: 8,
  doors: 1,
  windows: 2,
  wallLength: "",
  framingSpacing: "16",
  framingSize: "2x4",
  corners: 4,
  sheathing: false,
  boardArea: "",
  sheet: "4x8",
  thickness: "1/2",
  includeCeiling: true,
  finish: "4",
  coats: "2",
  primer: "auto",
  paintCeiling: false,
  trim: true,
  floorType: "lvp",
  floorArea: "",
  baseboard: true,
  area: "",
  gridSize: "2x4",
  ceilingArea: "",
  tileWhere: "wall",
  tileArea: "",
  waterproof: false,
  cabinetLf: "",
  cabinetGrade: "rta",
  outlets: "",
  switches: "",
  lights: "",
  fixtures: "",
  slabArea: "",
  slabThick: "4",
  masonryType: "brick",
  masonryArea: "",
};

function tkNum(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function tkUp(x) {
  return Math.max(0, Math.ceil(x - 1e-9));
}

function tkFmt(n, digits = 0) {
  return Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: digits });
}

function tkMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function tkHours(n) {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.ceil(n * 2 - 1e-9) / 2;
}

function tkLaborFactor(type) {
  if (type === "renovation") return 1.2;
  if (type === "addition") return 1.1;
  return 1;
}

function tkDefaultWaste(type) {
  return 10 + ({ new: 0, renovation: 5, addition: 3 }[type] || 0);
}

function tkRoom(i) {
  const L = tkNum(i.length);
  const W = tkNum(i.width);
  const H = tkNum(i.height) || 8;
  const given = tkNum(i.area);
  if (L > 0 && W > 0) return { L, W, H, floor: L * W, perimeter: 2 * (L + W), fromArea: false };
  if (given > 0) {
    const side = Math.sqrt(given);
    return { L: side, W: side, H, floor: given, perimeter: 4 * side, fromArea: true };
  }
  return { L: 0, W: 0, H, floor: 0, perimeter: 0, fromArea: false };
}

function tkOr(v, fallback) {
  if (v === "" || v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function tkOpeningsArea(i) {
  return tkNum(i.doors) * 21 + tkNum(i.windows) * 15;
}

function tkNewSpace(kind, n) {
  const wall = kind === "wall";
  return {
    id: "sp" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    kind: wall ? "wall" : "room",
    name: wall ? `Wall ${n}` : `Room ${n}`,
    length: wall ? 12 : 20,
    width: wall ? "" : 15,
    height: 8,
    doors: wall ? 0 : 1,
    windows: wall ? 0 : 2,
    area: "",
  };
}

function tkMeasureSpace(space) {
  const kind = space?.kind === "wall" ? "wall" : "room";
  const doors = tkNum(space?.doors);
  const windows = tkNum(space?.windows);
  const openings = doors * 21 + windows * 15;
  if (kind === "wall") {
    const length = tkNum(space?.length);
    const H = tkNum(space?.height) || 8;
    return {
      id: space?.id,
      name: space?.name || "Wall",
      kind,
      H,
      L: length,
      W: 0,
      floor: 0,
      perimeter: length,
      wall: Math.max(0, length * H - openings),
      doors,
      windows,
      fromArea: false,
    };
  }
  const room = tkRoom(space || {});
  return {
    id: space?.id,
    name: space?.name || "Room",
    kind,
    ...room,
    wall: Math.max(0, room.perimeter * room.H - openings),
    doors,
    windows,
  };
}

function tkEditableSpaces(inputs) {
  if (Array.isArray(inputs?.spaces) && inputs.spaces.length) return inputs.spaces;
  return [{
    id: "sp-legacy",
    kind: "room",
    name: "Room 1",
    length: inputs?.length ?? "",
    width: inputs?.width ?? "",
    height: inputs?.height ?? 8,
    doors: inputs?.doors ?? 0,
    windows: inputs?.windows ?? 0,
    area: inputs?.area ?? "",
  }];
}

function tkMeasureList(inputs) {
  const list = Array.isArray(inputs?.spaces) && inputs.spaces.length
    ? inputs.spaces
    : [{
      kind: "room",
      name: "Room 1",
      length: inputs?.length,
      width: inputs?.width,
      height: inputs?.height,
      doors: inputs?.doors,
      windows: inputs?.windows,
      area: inputs?.area,
    }];
  return list.map(tkMeasureSpace);
}

function tkScopeById(id) {
  return TK_SCOPES.find((s) => s.id === id);
}

function tkProjectBid({ inputs, scopes, projectType, waste, laborRates, laborHours, rates, overheadPct, profitPct }) {
  const i = { ...TK_DEFAULTS, ...(inputs || {}) };
  const type = projectType || "new";
  const on = new Set(scopes || []);
  const projectWaste = Number(waste);
  const w = 1 + ((Number.isFinite(projectWaste) ? projectWaste : tkDefaultWaste(type)) / 100);
  const measured = tkMeasureList(i);
  const floorSum = measured.reduce((sum, sp) => sum + sp.floor, 0);
  const wallSum = measured.reduce((sum, sp) => sum + sp.wall, 0);
  const perimeter = measured.reduce((sum, sp) => sum + sp.perimeter, 0);
  const slabEdge = measured.filter((sp) => sp.kind !== "wall").reduce((sum, sp) => sum + sp.perimeter, 0);
  const doorCount = measured.reduce((sum, sp) => sum + sp.doors, 0);
  const windowCount = measured.reduce((sum, sp) => sum + sp.windows, 0);
  const fromArea = measured.some((sp) => sp.fromArea);
  const H = measured.reduce((tall, sp) => Math.max(tall, sp.H || 0), 0) || 8;
  const wall = wallSum;
  const board = tkNum(i.boardArea) || wall + (i.includeCeiling ? floorSum : 0);
  const floorA = tkNum(i.floorArea) || floorSum;
  const wallLen = tkNum(i.wallLength) || perimeter;
  const factor = tkLaborFactor(type);
  const rows = [];
  const sections = [];
  const missing = [];

  const price = (scope, row) => {
    if (!row || !(row.qty > 0)) return;
    const key = scope + ":" + row.key;
    const override = rates && rates[key];
    const hasOverride = override !== "" && override != null;
    const sourced = row.rate != null && row.rate !== "" && Number.isFinite(Number(row.rate));
    const rate = hasOverride ? tkMoney(Number(override) || 0) : (sourced ? tkMoney(row.rate) : null);
    if (rate == null) missing.push({ id: key, label: row.item, kind: "material" });
    rows.push({ ...row, key, scope, rate, missing: rate == null });
  };

  const laborRateFor = (id) => {
    const raw = laborRates && laborRates[id];
    if (raw === "" || raw == null) {
      const fallback = tkScopeById(id)?.rate;
      return fallback == null ? null : fallback;
    }
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const hoursFor = (id, computed) => {
    const raw = laborHours && laborHours[id];
    if (raw !== "" && raw != null) return tkHours(Number(raw) || 0);
    if (computed == null) return null;
    return tkHours(computed);
  };

  const addSection = (section) => {
    if (section.rate == null) missing.push({ id: section.id + ":labor-rate", label: section.label + " labor rate", kind: "labor" });
    if (section.hours == null) missing.push({ id: section.id + ":labor-hours", label: section.label + " labor hours", kind: "labor" });
    sections.push(section);
  };

  if (on.has("framing") && wallLen > 0) {
    const spacing = Number(i.framingSpacing) || 16;
    const corners = tkNum(i.corners);
    const is26 = i.framingSize === "2x6";
    const override = tkNum(i.wallLength);
    const runs = override
      ? [{ perimeter: override, H, doors: doorCount, windows: windowCount }]
      : measured.filter((sp) => sp.perimeter > 0);
    const studsByLabel = new Map();
    let rawStuds = corners * 2;
    let plateLf = 0;
    let headerLf = 0;
    let sheathSf = 0;
    let hours = 0;
    let openings = 0;
    runs.forEach((run) => {
      const runH = run.H || 8;
      const len = run.perimeter;
      const openN = (run.doors || 0) + (run.windows || 0);
      openings += openN;
      const studs = tkUp((len * 12) / spacing) + 1 + openN * 3;
      rawStuds += studs;
      const label = runH <= 8 ? `${i.framingSize} precut stud 92-5/8"` : `${i.framingSize} stud ${Math.ceil(runH)}'`;
      const prev = studsByLabel.get(label) || { qty: 0, H: runH };
      prev.qty += studs;
      studsByLabel.set(label, prev);
      plateLf += len * 3;
      headerLf += openN * 8;
      if (i.sheathing) sheathSf += len * runH;
      const lfPerHour = runH > 10 ? 6 : runH > 8 ? 8 : 10;
      hours += len / lfPerHour + openN * 0.75;
      if (i.sheathing) hours += (len * runH) / 100;
    });
    const studTotal = tkUp(rawStuds * w);
    const cornerStuds = tkUp(corners * 2 * w);
    const tallest = [...studsByLabel.entries()].sort((a, b) => b[1].H - a[1].H)[0];
    if (tallest) tallest[1].qty += corners * 2;
    let placed = 0;
    [...studsByLabel.entries()].forEach(([label, info], index, all) => {
      const share = index === all.length - 1 ? studTotal - placed : tkUp((info.qty / rawStuds) * studTotal);
      placed += share;
      price("framing", { key: "studs-" + Math.ceil(info.H), item: label, qty: share, unit: "pcs", rate: (is26 ? 1.15 : 0.7) * Math.max(8, Math.ceil(info.H)) });
    });
    if (!studsByLabel.size && cornerStuds > 0) price("framing", { key: "studs", item: `${i.framingSize} studs`, qty: studTotal, unit: "pcs", rate: (is26 ? 1.15 : 0.7) * Math.max(8, Math.ceil(H)) });
    price("framing", { key: "plates", item: `${i.framingSize} plate stock 16' (bottom + double top)`, qty: tkUp((plateLf / 16) * w), unit: "pcs", rate: is26 ? 18 : 11 });
    if (openings > 0) price("framing", { key: "headers", item: "2×10 header stock", qty: tkUp(headerLf * w), unit: "lin ft", rate: 3.2 });
    if (i.sheathing && sheathSf > 0) price("framing", { key: "osb", item: "OSB sheathing 7/16\" 4' × 8'", qty: tkUp((sheathSf / 32) * w), unit: "sheets", rate: 24 });
    price("framing", { key: "nails", item: "Framing nails 3-1/4\"", qty: Math.max(1, tkUp(studTotal / 7.5)), unit: "lb", rate: 4 });
    if (type !== "renovation") price("framing", { key: "anchors", item: "Bottom-plate anchors", qty: tkUp(wallLen / 4), unit: "pcs", rate: 1.2 });
    if (type === "renovation") price("framing", { key: "demo", item: "Demo & dispose existing framing", qty: tkUp(wallLen), unit: "lin ft", rate: 6 });
    if (type === "addition") price("framing", { key: "ledger", item: "Ledger / tie-in to existing structure", qty: 1, unit: "allowance", rate: 250 });
    addSection({ id: "framing", label: "Framing", hours: tkHours(hours * factor), rate: laborRateFor("framing"), qty: wallLen, unit: "lin ft" });
  }

  if (on.has("drywall") && board > 0) {
    const sheetArea = { "4x8": 32, "4x10": 40, "4x12": 48 }[i.sheet] || 32;
    const sheetPrice = { 32: 16, 40: 21, 48: 25 }[sheetArea] + ({ "5/8": 4, "1/2mr": 6 }[i.thickness] || 0);
    const boardLabel = { "5/8": "5/8\" Type X", "1/2mr": "1/2\" moisture-resistant" }[i.thickness] || "1/2\" regular";
    const sheets = tkUp((board / sheetArea) * w);
    price("drywall", { key: "sheets", item: `Drywall ${boardLabel} ${String(i.sheet).replace("x", "' × ")}'`, qty: sheets, unit: "sheets", rate: sheetPrice });
    price("drywall", { key: "screws", item: "Drywall screws 1-1/4\" (box of 1,000)", qty: Math.max(1, tkUp((sheets * 32) / 1000)), unit: "boxes", rate: 15 });
    if (type === "renovation") price("drywall", { key: "demo", item: "Demo & dispose existing drywall", qty: tkUp(wall), unit: "sq ft", rate: 1.1 });
    addSection({ id: "drywall", label: "Drywall installation", hours: tkHours((board / 55) * factor), rate: laborRateFor("drywall"), qty: board, unit: "sq ft" });
  }

  if (on.has("mud") && board > 0) {
    const level = String(i.finish || "4");
    const pace = level === "5" ? 28 : level === "3" ? 50 : 38;
    const coverage = level === "5" ? 220 : 450;
    const beadCorners = i.outsideCorners === "" || i.outsideCorners == null ? tkNum(i.corners) : Math.max(0, Number(i.outsideCorners) || 0);
    price("mud", { key: "mud", item: `Joint compound, level ${level} finish`, qty: tkUp(board / coverage), unit: "boxes", rate: 24 });
    price("mud", { key: "tape", item: "Paper joint tape 500'", qty: Math.max(1, tkUp((board * 0.38) / 500)), unit: "rolls", rate: 9 });
    if (beadCorners > 0) price("mud", { key: "bead", item: "Corner bead 8'", qty: tkUp(((beadCorners * H) / 8) * w), unit: "pcs", rate: 4.5 });
    price("mud", { key: "sand", item: "Sanding screens & pole", qty: Math.max(1, tkUp(board / 800)), unit: "kits", rate: 18 });
    if (type === "addition") price("mud", { key: "tiein", item: "Tie-in & feather at existing walls", qty: 1, unit: "allowance", rate: 150 });
    addSection({ id: "mud", label: "Mudding", hours: tkHours((board / pace) * factor), rate: laborRateFor("mud"), qty: board, unit: "sq ft" });
  }

  if (on.has("paint") && (wall > 0 || (i.paintCeiling && floorSum > 0))) {
    const coats = Number(i.coats) || 2;
    const coverage = 350;
    const ceiling = i.paintCeiling ? floorSum : 0;
    const primerMode = i.primer === "auto" ? (type === "renovation" ? "spot" : "full") : i.primer;
    const trimLf = perimeter + doorCount * 17 + windowCount * 14;
    const surface = wall + ceiling;
    price("paint", { key: "wall", item: "Wall paint", qty: tkUp(((wall * coats) / coverage) * w), unit: "gal", rate: 58 });
    if (ceiling > 0) price("paint", { key: "ceiling", item: "Ceiling paint, flat", qty: tkUp(((ceiling * coats) / coverage) * w), unit: "gal", rate: 45 });
    if (primerMode === "full") price("paint", { key: "primer", item: "Primer-sealer", qty: tkUp((surface / 300) * w), unit: "gal", rate: 40 });
    if (primerMode === "spot") price("paint", { key: "primer", item: "Primer (spot prime)", qty: Math.max(1, tkUp(((surface * 0.15) / 300) * w)), unit: "gal", rate: 40 });
    if (i.trim) price("paint", { key: "trim", item: "Trim & door enamel", qty: tkUp(trimLf / 75), unit: "qt", rate: 26 });
    if (i.trim) price("paint", { key: "caulk", item: "Paintable caulk", qty: tkUp(trimLf / 50), unit: "tubes", rate: 7 });
    price("paint", { key: "tape", item: "Painter's tape 60 yd", qty: tkUp(trimLf / 150), unit: "rolls", rate: 9 });
    price("paint", { key: "kit", item: "Roller covers, trays & drop cloth kit", qty: Math.max(1, tkUp(surface / 800)), unit: "kits", rate: 35 });
    if (type === "renovation") price("paint", { key: "patch", item: "Patch & sand allowance", qty: 1, unit: "allowance", rate: 40 });
    let hours = (wall * coats) / 90 + (ceiling * coats) / 110;
    if (primerMode === "full") hours += surface / 160;
    if (primerMode === "spot") hours += (surface * 0.15) / 160;
    if (i.trim) hours += trimLf / 40;
    addSection({ id: "paint", label: "Paint", hours: tkHours(hours * factor), rate: laborRateFor("paint"), qty: surface, unit: "sq ft" });
  }

  if (on.has("flooring") && floorA > 0) {
    const spec = TK_FLOORS[i.floorType] || TK_FLOORS.lvp;
    const fw = 1 + (Math.max(Number.isFinite(projectWaste) ? projectWaste : tkDefaultWaste(type), spec.waste) / 100);
    price("flooring", { key: "floor", item: spec.label, qty: tkUp(floorA * fw), unit: "sq ft", rate: spec.rate });
    if (spec.under > 0) price("flooring", { key: "under", item: spec.underLabel, qty: tkUp(floorA * fw), unit: "sq ft", rate: spec.under });
    if (i.floorType === "tile") {
      price("flooring", { key: "thinset", item: "Thinset mortar", qty: tkUp(floorA / 50), unit: "bags", rate: 18 });
      price("flooring", { key: "grout", item: "Grout", qty: tkUp(floorA / 40), unit: "bags", rate: 16 });
      price("flooring", { key: "spacers", item: "Tile spacers & wedges", qty: 1, unit: "kit", rate: 12 });
    }
    if (i.baseboard && perimeter > 0) {
      price("flooring", { key: "base", item: "Primed baseboard", qty: tkUp(perimeter * w), unit: "lin ft", rate: 2.25 });
      price("flooring", { key: "basefast", item: "Baseboard nails & caulk", qty: 1, unit: "kit", rate: 16 });
    }
    if (doorCount > 0) price("flooring", { key: "trans", item: "Transitions", qty: doorCount, unit: "pcs", rate: 22 });
    if (type === "renovation") price("flooring", { key: "demo", item: "Remove & dispose existing floor", qty: tkUp(floorA), unit: "sq ft", rate: 1.75 });
    let hours = floorA / spec.pace;
    if (i.baseboard && perimeter > 0) hours += perimeter / 45;
    addSection({ id: "flooring", label: "Flooring", hours: tkHours(hours * factor), rate: laborRateFor("flooring"), qty: floorA, unit: "sq ft" });
  }

  if (on.has("ceiling") && (tkNum(i.ceilingArea) || floorSum) > 0) {
    const area = tkNum(i.ceilingArea) || floorSum;
    const twoByTwo = i.gridSize === "2x2";
    const tileEach = twoByTwo ? 16.4 : 16.8;
    const tileSf = twoByTwo ? 4 : 8;
    let mainLf = 0;
    let cross4 = 0;
    if (tkNum(i.ceilingArea)) {
      mainLf = area / 4;
      cross4 = Math.ceil(area / 16);
    } else {
      measured.forEach((sp) => {
        if (!(sp.floor > 0)) return;
        mainLf += sp.L > 0 ? (Math.ceil(sp.W / 4) + 1) * sp.L : sp.floor / 4;
        cross4 += sp.L > 0 ? Math.ceil(sp.L / 4) * Math.max(1, Math.ceil(sp.W / 4)) : Math.ceil(sp.floor / 16);
      });
    }
    price("ceiling", { key: "tile", item: twoByTwo ? "Acoustic tile 2' × 2'" : "Acoustic tile 2' × 4'", qty: tkUp((area / tileSf) * w), unit: "pcs", rate: tileEach });
    price("ceiling", { key: "main", item: "Main tee 12'", qty: tkUp((mainLf / 12) * w), unit: "pcs", rate: 6.5 });
    price("ceiling", { key: "cross4", item: "Cross tee 4'", qty: tkUp(cross4 * w), unit: "pcs", rate: 2.75 });
    if (twoByTwo) price("ceiling", { key: "cross2", item: "Cross tee 2'", qty: tkUp(cross4 * 2 * w), unit: "pcs", rate: 1.9 });
    if (perimeter > 0) price("ceiling", { key: "angle", item: "Wall angle 12'", qty: tkUp((slabEdge / 12) * w), unit: "pcs", rate: 4.75 });
    price("ceiling", { key: "wire", item: "Hanger wire", qty: tkUp(mainLf / 4), unit: "pcs", rate: 0.3 });
    const pace = twoByTwo ? 12 : 15;
    addSection({ id: "ceiling", label: "Grid ceiling", hours: hoursFor("ceiling", (area / pace) * factor), rate: laborRateFor("ceiling"), qty: area, unit: "sq ft" });
  }

  if (on.has("tiling")) {
    const where = i.tileWhere || "wall";
    const tileA = tkNum(i.tileArea) || (where === "floor" ? floorA : where === "both" ? wall + floorA : wall);
    if (tileA > 0) {
      price("tiling", { key: "tile", item: "Ceramic tile", qty: tkUp(tileA * w), unit: "sq ft", rate: 6 });
      price("tiling", { key: "set", item: "Thinset, grout and trim", qty: tkUp(tileA * w), unit: "sq ft", rate: 3.5 });
      if (i.waterproof) price("tiling", { key: "membrane", item: "Waterproof membrane", qty: tkUp(tileA), unit: "sq ft", rate: null });
      addSection({ id: "tiling", label: "Tiling", hours: hoursFor("tiling", (tileA / 7) * factor), rate: laborRateFor("tiling"), qty: tileA, unit: "sq ft" });
    }
  }

  if (on.has("cabinetry") && tkNum(i.cabinetLf) > 0) {
    const lf = tkNum(i.cabinetLf);
    const custom = i.cabinetGrade === "custom";
    const cabinetRate = { rta: 200, stock: 375, semi: 500, custom: 850 }[i.cabinetGrade] || 200;
    const cabinetLabel = { rta: "RTA / flat-pack cabinets", stock: "Stock cabinets", semi: "Semi-custom cabinets", custom: "Custom cabinets" }[i.cabinetGrade] || "Cabinets";
    price("cabinetry", { key: "cabs", item: cabinetLabel, qty: tkUp(lf), unit: "lin ft", rate: cabinetRate });
    addSection({ id: "cabinetry", label: "Cabinetry", hours: hoursFor("cabinetry", lf * (custom ? 2.5 : 1.875) * factor), rate: laborRateFor("cabinetry"), qty: lf, unit: "lin ft" });
  }

  if (on.has("electrical")) {
    const outlets = tkOr(i.outlets, Math.max(1, tkUp(wallLen / 12) || 1));
    const switches = tkOr(i.switches, Math.max(1, doorCount || 1));
    const lights = tkOr(i.lights, Math.max(1, tkUp((floorSum || 0) / 80) || 1));
    const devices = outlets + switches + lights;
    if (devices > 0) {
      price("electrical", { key: "cable", item: "14/2 NM cable", qty: tkUp(devices * 25), unit: "ft", rate: null });
      price("electrical", { key: "boxes", item: "Device boxes", qty: tkUp(devices), unit: "pcs", rate: null });
      price("electrical", { key: "devices", item: "Receptacles, switches and lampholders", qty: tkUp(devices), unit: "pcs", rate: null });
      addSection({ id: "electrical", label: "Electrical", hours: hoursFor("electrical", null), rate: laborRateFor("electrical"), qty: devices, unit: "devices" });
    }
  }

  if (on.has("plumbing")) {
    const fixtures = tkOr(i.fixtures, 1);
    if (fixtures > 0) {
      price("plumbing", { key: "rough", item: "Supply and drain materials", qty: tkUp(fixtures), unit: "fixtures", rate: null });
      addSection({ id: "plumbing", label: "Plumbing", hours: hoursFor("plumbing", null), rate: laborRateFor("plumbing"), qty: fixtures, unit: "fixtures" });
    }
  }

  if (on.has("concrete") && (tkNum(i.slabArea) || floorA) > 0) {
    const slab = tkNum(i.slabArea) || floorA;
    const thickIn = Number(i.slabThick) || 4;
    const m3 = Math.ceil(((slab * (thickIn / 12) / 35.3147) * w) * 10) / 10;
    const smallLoad = m3 <= 1 ? 400 : m3 < 3.2 ? 300 : m3 <= 4 ? 175 : 0;
    price("concrete", { key: "mix", item: "Ready-mix 25 MPa", qty: m3, unit: "m³", rate: 245, digits: 1 });
    price("concrete", { key: "env", item: "Environmental charge", qty: m3, unit: "m³", rate: 7, digits: 1 });
    price("concrete", { key: "fuel", item: "Fuel surcharge", qty: m3, unit: "m³", rate: 2, digits: 1 });
    if (smallLoad > 0) price("concrete", { key: "short", item: "Small-load delivery", qty: 1, unit: "load", rate: smallLoad });
    const baseM3 = Math.ceil(((slab * (4 / 12) / 35.3147) * w) * 10) / 10;
    price("concrete", { key: "gravel", item: "Gravel base, 4 in", qty: baseM3, unit: "m³", rate: null, digits: 1 });
    price("concrete", { key: "mesh", item: "Wire mesh", qty: tkUp(slab * w), unit: "sq ft", rate: null });
    if (slabEdge > 0) price("concrete", { key: "forms", item: "Form boards", qty: tkUp(slabEdge * w), unit: "lin ft", rate: null });
    addSection({ id: "concrete", label: "Concrete", hours: hoursFor("concrete", (m3 * 5) * factor), rate: laborRateFor("concrete"), qty: slab, unit: "sq ft" });
  }

  if (on.has("masonry") && (tkNum(i.masonryArea) || wall) > 0) {
    const masonA = tkNum(i.masonryArea) || wall;
    const brick = i.masonryType !== "block";
    if (brick) {
      price("masonry", { key: "brick", item: "Thin brick veneer", qty: tkUp(masonA * w), unit: "sq ft", rate: 13 });
      addSection({ id: "masonry", label: "Masonry", hours: masonA, rate: laborRateFor("masonry"), laborUnit: "sq ft", qty: masonA, unit: "sq ft" });
    } else {
      const blockRateRaw = laborRates && laborRates.masonryBlock;
      const blockRate = blockRateRaw === "" || blockRateRaw == null ? null : (Number(blockRateRaw) || 0);
      price("masonry", { key: "block", item: "Concrete block 8×8×16 and mortar", qty: tkUp((masonA / 0.89) * w), unit: "blocks", rate: null });
      addSection({ id: "masonry", label: "Masonry", hours: hoursFor("masonry", null), rate: blockRate, qty: masonA, unit: "sq ft" });
    }
  }

  const lineMoney = (r) => (r.rate == null ? 0 : r.qty * r.rate);
  const pricedSections = sections.map((s) => {
    const material = tkMoney(rows.filter((r) => r.scope === s.id).reduce((sum, r) => sum + lineMoney(r), 0));
    const labor = s.hours == null || s.rate == null ? 0 : tkMoney(s.hours * s.rate);
    return { ...s, material, labor, direct: tkMoney(material + labor) };
  });
  const materialTotal = tkMoney(pricedSections.reduce((sum, s) => sum + s.material, 0));
  const laborTotal = tkMoney(pricedSections.reduce((sum, s) => sum + s.labor, 0));
  const direct = tkMoney(materialTotal + laborTotal);
  const ohPct = overheadPct === "" || overheadPct == null ? TK_OVERHEAD_PCT : Math.max(0, Number(overheadPct) || 0);
  const pPct = profitPct === "" || profitPct == null ? TK_PROFIT_PCT : Math.max(0, Number(profitPct) || 0);
  const overhead = tkMoney(direct * (ohPct / 100));
  const profit = tkMoney((direct + overhead) * (pPct / 100));
  const bid = tkMoney(direct + overhead + profit);
  return {
    rows,
    sections: pricedSections,
    summary: [
      ["Spaces", `${measured.length}`],
      ["Floor", `${tkFmt(floorSum)} sq ft${fromArea ? " · from sq ft" : ""}`],
      ["Walls", `${tkFmt(wall)} sq ft`],
      ["Length", `${tkFmt(perimeter, fromArea ? 1 : 0)} ft`],
    ],
    spaces: measured,
    missing,
    materialTotal,
    laborTotal,
    direct,
    overheadPct: ohPct,
    profitPct: pPct,
    overhead,
    profit,
    bid,
    total: bid,
  };
}

function tkAddressKey(address) {
  return String(address || "").trim().toLowerCase().replace(/[\s,]+/g, " ");
}

function tkOneLine(address) {
  return String(address || "").split(/\n+/).map((s) => s.trim()).filter(Boolean).join(", ");
}

function tkBlankForm(projectType = "new", projectAddress = "") {
  return {
    id: null,
    kind: "project",
    projectType,
    projectAddress,
    name: "",
    inputs: { ...TK_DEFAULTS, spaces: [tkNewSpace("room", 1)] },
    scopes: [],
    waste: tkDefaultWaste(projectType),
    wasteTouched: false,
    laborRates: Object.fromEntries(TK_SCOPES.map((s) => [s.id, s.rate == null ? "" : s.rate])),
    laborHours: {},
    overheadPct: TK_OVERHEAD_PCT,
    profitPct: TK_PROFIT_PCT,
    rates: {},
  };
}

function tkRecordTitle(t) {
  if (t?.name) return t.name;
  if (t?.scopes?.length) return t.scopes.map((id) => tkScopeById(id)?.label || id).join(", ");
  return TK_LEGACY[t?.trade] || "Saved calculation";
}

function tkEnsureBid(record) {
  if (!record) return record;
  if (record.scopes) return { ...record, ...tkProjectBid(record) };
  if (record.bidTotal != null) return { ...record, total: record.bidTotal };
  return {
    ...record,
    materialTotal: record.total || 0,
    sections: [],
    overhead: record.overhead || 0,
    profit: record.profit || 0,
    total: record.total || 0,
  };
}

function tkEstimateItems(calcs) {
  const priced = calcs.map((c) => {
    const bid = c.scopes ? tkProjectBid(c) : null;
    return bid ? { ...c, ...bid } : tkEnsureBid(c);
  }).filter(Boolean);
  const lines = priced.flatMap((c) => {
    const materials = (c.rows || []).filter((r) => r.qty > 0 && r.rate != null).map((r) => ({
      desc: r.item,
      sub: [tkScopeById(r.scope)?.label || TK_LEGACY[c.trade], c.name, r.unit].filter(Boolean).join(" · "),
      qty: r.qty,
      rate: r.rate,
    }));
    const labor = (c.sections || []).filter((s) => s.hours > 0 && s.rate != null).map((s) => ({
      desc: `Labor — ${s.label}`,
      sub: [c.name, s.laborUnit === "sq ft"
        ? `${tkFmt(s.hours)} sq ft @ ${fmtMoney(s.rate)}/sq ft`
        : `${tkFmt(s.hours, 1)} hrs @ ${fmtMoney(s.rate)}/hr`].filter(Boolean).join(" · "),
      qty: s.hours,
      rate: s.rate,
    }));
    if (!labor.length && c.laborHours > 0) {
      labor.push({
        desc: `Labor — ${TK_LEGACY[c.trade] || "Project"}`,
        sub: `${tkFmt(c.laborHours, 1)} hrs @ ${fmtMoney(c.laborRate)}/hr`,
        qty: c.laborHours,
        rate: c.laborRate,
      });
    }
    return [...materials, ...labor];
  });
  const overhead = tkMoney(priced.reduce((s, c) => s + (c.overhead || 0), 0));
  const profit = tkMoney(priced.reduce((s, c) => s + (c.profit || 0), 0));
  const samePct = (key) => {
    const values = [...new Set(priced.map((c) => c[key]).filter((n) => n != null))];
    return values.length === 1 ? values[0] : null;
  };
  const ohPct = samePct("overheadPct");
  const pPct = samePct("profitPct");
  if (overhead > 0) lines.push({ desc: ohPct == null ? "Overhead" : `Overhead (${ohPct}%)`, sub: "On materials and labor", qty: 1, rate: overhead });
  if (profit > 0) lines.push({ desc: pPct == null ? "Profit" : `Profit (${pPct}%)`, sub: "On direct cost and overhead", qty: 1, rate: profit });
  return lines;
}

function TkField({ field, value, onChange, scope }) {
  const id = "tk-f-" + (scope || "room") + "-" + field.key;
  if (field.type === "toggle") {
    return (
      <label className="tk-toggle">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        <span>{field.label}</span>
      </label>
    );
  }
  if (field.type === "select") {
    return (
      <div className="field">
        <label htmlFor={id}>{field.label}</label>
        <select id={id} className="select" value={value} onChange={(e) => onChange(e.target.value)}>
          {field.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {field.help && <p className="tk-help">{field.help}</p>}
      </div>
    );
  }
  return (
    <div className="field">
      <label htmlFor={id}>{field.label}</label>
      <div className="tk-input-unit">
        <input
          id={id}
          className="input"
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={value}
          placeholder={field.placeholder || ""}
          onChange={(e) => onChange(e.target.value)} />
        {field.unit && <span className="tk-unit">{field.unit}</span>}
      </div>
      {field.help && <p className="tk-help">{field.help}</p>}
    </div>
  );
}

function TakeoffsScreen({ state, dispatch, business, toast, go }) {
  const takeoffs = state.takeoffs || [];
  const [form, setForm] = useStateTk(() => tkBlankForm());
  const result = useMemoTk(
    () => tkProjectBid(form),
    [form]
  );
  const missingKey = (result.missing || []).map((m) => m.id).join("|");
  const [priceAlert, setPriceAlert] = useStateTk(null);
  const [shownMissing, setShownMissing] = useStateTk("");
  useEffectTk(() => {
    if (!missingKey) {
      setPriceAlert(null);
      if (shownMissing) setShownMissing("");
      return;
    }
    const prev = shownMissing ? shownMissing.split("|") : [];
    const added = missingKey.split("|").filter((id) => !prev.includes(id));
    setShownMissing(missingKey);
    if (added.length) setPriceAlert(result.missing);
  }, [missingKey]);

  const knownAddresses = useMemoTk(() => {
    const seen = new Map();
    [...takeoffs.map((t) => t.projectAddress), ...(state.estimates || []).map((e) => e.projectAddress), ...(state.invoices || []).map((i) => i.projectAddress)].
    forEach((a) => {
      const line = tkOneLine(a);
      if (line && !seen.has(tkAddressKey(line))) seen.set(tkAddressKey(line), line);
    });
    return [...seen.values()];
  }, [takeoffs, state.estimates, state.invoices]);

  const groups = useMemoTk(() => {
    const map = new Map();
    takeoffs.forEach((t) => {
      const key = tkAddressKey(t.projectAddress);
      if (!map.has(key)) map.set(key, { key, address: tkOneLine(t.projectAddress), items: [] });
      map.get(key).items.push(t);
    });
    return [...map.values()].map((g) => ({
      ...g,
      items: g.items.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "")),
      total: g.items.reduce((s, t) => s + ((t.scopes ? tkProjectBid(t).bid : (t.bidTotal ?? t.total)) || 0), 0),
    })).sort((a, b) => (b.items[0]?.updatedAt || "").localeCompare(a.items[0]?.updatedAt || ""));
  }, [takeoffs]);

  const patch = (p) => setForm((f) => ({ ...f, ...p }));
  const setInput = (key, value) => setForm((f) => ({ ...f, inputs: { ...f.inputs, [key]: value } }));
  const setSpace = (id, patch) => setForm((f) => ({
    ...f,
    inputs: { ...f.inputs, spaces: (f.inputs.spaces || []).map((sp) => sp.id === id ? { ...sp, ...patch } : sp) },
  }));
  const addSpace = (kind) => setForm((f) => {
    const spaces = f.inputs.spaces || [];
    const n = spaces.filter((sp) => (kind === "wall" ? sp.kind === "wall" : sp.kind !== "wall")).length + 1;
    return { ...f, inputs: { ...f.inputs, spaces: [...spaces, tkNewSpace(kind, n)] } };
  });
  const removeSpace = (id) => setForm((f) => ({
    ...f,
    inputs: { ...f.inputs, spaces: (f.inputs.spaces || []).filter((sp) => sp.id !== id) },
  }));
  const setLabor = (id, value) => setForm((f) => ({ ...f, laborRates: { ...f.laborRates, [id]: value } }));
  const setHours = (id, value) => setForm((f) => ({ ...f, laborHours: { ...(f.laborHours || {}), [id]: value } }));
  const setRate = (key, value) => setForm((f) => ({ ...f, rates: { ...f.rates, [key]: value } }));

  const switchType = (projectType) => setForm((f) => ({
    ...f,
    projectType,
    waste: f.wasteTouched ? f.waste : tkDefaultWaste(projectType),
  }));

  const toggleScope = (id) => setForm((f) => ({
    ...f,
    scopes: f.scopes.includes(id) ? f.scopes.filter((s) => s !== id) : [...TK_SCOPES.map((s) => s.id).filter((s) => f.scopes.includes(s) || s === id)],
  }));

  const startNew = () => setForm((f) => tkBlankForm(f.projectType, f.projectAddress));

  const buildRecord = () => {
    const now = new Date().toISOString();
    const existing = form.id ? takeoffs.find((t) => t.id === form.id) : null;
    return {
      id: existing ? existing.id : "tk" + Date.now(),
      kind: "project",
      projectAddress: form.projectAddress.trim(),
      projectType: form.projectType,
      name: form.name.trim(),
      inputs: form.inputs,
      scopes: form.scopes,
      waste: Number(form.waste) || 0,
      laborRates: form.laborRates,
      laborHours: form.laborHours || {},
      overheadPct: result.overheadPct,
      profitPct: result.profitPct,
      rates: form.rates,
      rows: result.rows,
      sections: result.sections,
      materialTotal: result.materialTotal,
      laborTotal: result.laborTotal,
      overhead: result.overhead,
      profit: result.profit,
      bidTotal: result.bid,
      total: result.bid,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
  };

  const save = () => {
    if (!form.scopes.length) {
      toast("Add at least one trade.");
      return null;
    }
    if (result.missing?.length) {
      setPriceAlert(result.missing);
      return null;
    }
    if (!form.projectAddress.trim()) {
      toast("Add a project address to save this bid.");
      return null;
    }
    const record = buildRecord();
    const isUpdate = !!form.id && takeoffs.some((t) => t.id === form.id);
    dispatch({ type: isUpdate ? "UPDATE_TAKEOFF" : "ADD_TAKEOFF", takeoff: record });
    patch({ id: record.id });
    toast(isUpdate ? "Project bid updated." : `Saved to ${tkOneLine(record.projectAddress)}.`);
    return record;
  };

  const open = (t) => {
    if (!t.scopes) {
      toast("This is an older single-trade calculation. Create an estimate from it, or start a new project bid.");
      return;
    }
    setForm({
      id: t.id,
      kind: "project",
      projectType: t.projectType || "new",
      projectAddress: tkOneLine(t.projectAddress),
      name: t.name || "",
      inputs: { ...TK_DEFAULTS, ...(t.inputs || {}), spaces: tkEditableSpaces(t.inputs) },
      scopes: t.scopes || [],
      waste: t.waste ?? tkDefaultWaste(t.projectType),
      wasteTouched: true,
      laborRates: { ...Object.fromEntries(TK_SCOPES.map((s) => [s.id, s.rate == null ? "" : s.rate])), ...(t.laborRates || {}) },
      laborHours: t.laborHours || {},
      overheadPct: t.overheadPct ?? TK_OVERHEAD_PCT,
      profitPct: t.profitPct ?? TK_PROFIT_PCT,
      rates: t.rates || Object.fromEntries((t.rows || []).map((r) => [r.key, r.rate])),
    });
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  const removeIds = (ids, message) => {
    dispatch({ type: "REMOVE_TAKEOFFS", ids });
    if (form.id && ids.includes(form.id)) patch({ id: null });
    toast(message);
  };

  const removeOne = (t) => {
    if (!window.confirm(`Delete “${tkRecordTitle(t)}”?`)) return;
    removeIds([t.id], "Calculation deleted.");
  };

  const removeGroup = (g) => {
    if (!window.confirm(`Delete all ${g.items.length} calculation${g.items.length === 1 ? "" : "s"} for “${g.address}”? This can’t be undone.`)) return;
    removeIds(g.items.map((t) => t.id), `Deleted calculations for ${g.address}.`);
  };

  const createEstimate = (calcs, address) => {
    const items = tkEstimateItems(calcs);
    if (!items.length) {
      toast("Nothing to add — turn on a scope and check the quantities.");
      return;
    }
    const estimates = state.estimates || [];
    const today = new Date();
    const est = {
      id: "est" + Date.now(),
      number: nextDocNumber(state, "EST-"),
      clientId: "",
      clientName: "",
      clientCompany: "",
      clientAddress: "",
      clientEmail: "",
      clientPhone: "",
      projectAddress: address,
      date: today.toISOString().slice(0, 10),
      validUntil: new Date(today.getTime() + 30 * 86400000).toISOString().slice(0, 10),
      status: "draft",
      items,
      taxRate: Number(business?.taxRate) >= 0 ? Number(business.taxRate) : 0.05,
      notes: "Bid includes the trades turned on for this project, plus labor, overhead and profit. Confirm every price and hourly rate before sending. Lines without a published price are omitted until a price is entered.",
      drawing: null,
      createdAt: today.toISOString(),
    };
    dispatch({ type: "ADD_ESTIMATE", estimate: est });
    toast(`Created ${est.number} — add the client details to finish.`);
    go("estimates", { focusId: est.id });
  };

  const estimateFromCurrent = () => {
    if (!form.scopes.length) {
      toast("Add at least one trade.");
      return;
    }
    if (result.missing?.length) {
      setPriceAlert(result.missing);
      return;
    }
    const record = form.projectAddress.trim() ? save() : buildRecord();
    if (!record) return;
    createEstimate([record], form.projectAddress.trim());
  };

  const scopeFields = {
    framing: [
      { key: "wallLength", label: "Wall length", unit: "ft", placeholder: "Uses room perimeter" },
      { key: "framingSpacing", label: "Stud spacing", type: "select", options: [["16", "16\" on centre"], ["24", "24\" on centre"]] },
      { key: "framingSize", label: "Lumber", type: "select", options: [["2x4", "2×4"], ["2x6", "2×6"]] },
      { key: "corners", label: "Corners & T-walls", unit: "qty" },
      { key: "sheathing", label: "Exterior sheathing (OSB)", type: "toggle" },
    ],
    drywall: [
      { key: "boardArea", label: "Board area", unit: "sq ft", placeholder: "Uses walls" },
      { key: "sheet", label: "Sheet size", type: "select", options: [["4x8", "4' × 8'"], ["4x10", "4' × 10'"], ["4x12", "4' × 12'"]] },
      { key: "thickness", label: "Board", type: "select", options: [["1/2", "1/2\" regular"], ["5/8", "5/8\" Type X"], ["1/2mr", "1/2\" moisture-resistant"]] },
      { key: "includeCeiling", label: "Include the ceiling", type: "toggle" },
    ],
    mud: [
      { key: "boardArea", label: "Board area", unit: "sq ft", placeholder: "Uses walls" },
      { key: "finish", label: "Finish level", type: "select", options: [["3", "Level 3"], ["4", "Level 4"], ["5", "Level 5 skim"]] },
      { key: "outsideCorners", label: "Outside corners", unit: "qty", placeholder: "Uses corners for every room and wall" },
      { key: "includeCeiling", label: "Include the ceiling", type: "toggle" },
    ],
    paint: [
      { key: "coats", label: "Finish coats", type: "select", options: [["1", "1 coat"], ["2", "2 coats"], ["3", "3 coats"]] },
      { key: "primer", label: "Primer", type: "select", options: [["auto", "Based on project type"], ["full", "Full prime"], ["spot", "Spot prime"], ["none", "No primer"]] },
      { key: "paintCeiling", label: "Paint the ceiling", type: "toggle" },
      { key: "trim", label: "Paint trim and doors", type: "toggle" },
    ],
    flooring: [
      { key: "floorType", label: "Floor", type: "select", options: Object.entries(TK_FLOORS).map(([id, spec]) => [id, spec.label]) },
      { key: "floorArea", label: "Floor area", unit: "sq ft", placeholder: "Uses room size" },
      { key: "baseboard", label: "Include baseboard", type: "toggle" },
    ],
    ceiling: [
      { key: "gridSize", label: "Tile", type: "select", options: [["2x4", "2' × 4'"], ["2x2", "2' × 2'"]] },
      { key: "ceilingArea", label: "Ceiling area", unit: "sq ft", placeholder: "Uses the floor area" },
    ],
    tiling: [
      { key: "tileWhere", label: "Surface", type: "select", options: [["wall", "Walls"], ["floor", "Floor"], ["both", "Walls and floor"]] },
      { key: "tileArea", label: "Tile area", unit: "sq ft", placeholder: "Uses the surface above" },
      { key: "waterproof", label: "Waterproof membrane", type: "toggle" },
    ],
    cabinetry: [
      { key: "cabinetLf", label: "Cabinet run", unit: "lin ft", placeholder: "Base and uppers, added together" },
      { key: "cabinetGrade", label: "Grade", type: "select", options: [["rta", "RTA / flat-pack"], ["stock", "Stock"], ["semi", "Semi-custom"], ["custom", "Custom"]] },
    ],
    electrical: [
      { key: "outlets", label: "Outlets", unit: "qty", placeholder: "One per 12 ft of wall" },
      { key: "switches", label: "Switches", unit: "qty", placeholder: "One per door" },
      { key: "lights", label: "Lights", unit: "qty", placeholder: "One per 80 sq ft" },
    ],
    plumbing: [
      { key: "fixtures", label: "Fixtures", unit: "qty", placeholder: "Sinks, toilets, tubs" },
    ],
    concrete: [
      { key: "slabArea", label: "Slab area", unit: "sq ft", placeholder: "Uses the floor area" },
      { key: "slabThick", label: "Thickness", type: "select", options: [["4", "4 inch"], ["5", "5 inch"], ["6", "6 inch"]] },
    ],
    masonry: [
      { key: "masonryType", label: "Wall", type: "select", options: [["brick", "Thin brick veneer"], ["block", "Concrete block"]] },
      { key: "masonryArea", label: "Wall area", unit: "sq ft", placeholder: "Uses the room walls" },
    ],
  };

  return (
    <div className="tk">
      <div className="tk-layout">
        <section className="tk-card tk-form" aria-label="Project bid">
          <div className="field">
            <label htmlFor="tk-address">Project address</label>
            <input
              id="tk-address"
              className="input"
              list="tk-address-list"
              placeholder="Job site address — the bid is saved here"
              value={form.projectAddress}
              onChange={(e) => patch({ projectAddress: e.target.value })} />
            <datalist id="tk-address-list">
              {knownAddresses.map((a) => <option key={a} value={a} />)}
            </datalist>
          </div>

          <div className="field">
            <label>Project type</label>
            <div className="segmented tk-segmented" role="radiogroup" aria-label="Project type">
              {TK_PROJECT_TYPES.map((p) =>
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={form.projectType === p.id}
                className={"btn sm " + (form.projectType === p.id ? "" : "ghost")}
                onClick={() => switchType(p.id)}>
                  {p.label}
                </button>
              )}
            </div>
          </div>

          <div className="tk-spaces">
            {(form.inputs.spaces || []).map((sp) => {
              const measured = (result.spaces || []).find((item) => item.id === sp.id);
              const isWall = sp.kind === "wall";
              return (
                <div key={sp.id} className="tk-block">
                  <div className="tk-block-head">
                    <input
                      className="input tk-space-name"
                      aria-label="Name"
                      value={sp.name}
                      onChange={(e) => setSpace(sp.id, { name: e.target.value })} />
                    <div className="segmented" role="radiogroup" aria-label="Space type">
                      <button type="button" role="radio" aria-checked={!isWall} className={"btn sm " + (isWall ? "ghost" : "")} onClick={() => setSpace(sp.id, { kind: "room" })}>Room</button>
                      <button type="button" role="radio" aria-checked={isWall} className={"btn sm " + (isWall ? "" : "ghost")} onClick={() => setSpace(sp.id, { kind: "wall" })}>Wall</button>
                    </div>
                    <button type="button" className="btn sm ghost" onClick={() => removeSpace(sp.id)} disabled={(form.inputs.spaces || []).length < 2}>Remove</button>
                  </div>
                  <div className="tk-block-grid">
                    <TkField scope={sp.id} field={{ key: "length", label: isWall ? "Wall length" : "Length", unit: "ft" }} value={sp.length} onChange={(v) => setSpace(sp.id, { length: v })} />
                    {!isWall && <TkField scope={sp.id} field={{ key: "width", label: "Width", unit: "ft" }} value={sp.width} onChange={(v) => setSpace(sp.id, { width: v })} />}
                    <TkField scope={sp.id} field={{ key: "height", label: "Height", unit: "ft" }} value={sp.height} onChange={(v) => setSpace(sp.id, { height: v })} />
                    <TkField scope={sp.id} field={{ key: "doors", label: "Doors", unit: "qty" }} value={sp.doors} onChange={(v) => setSpace(sp.id, { doors: v })} />
                    <TkField scope={sp.id} field={{ key: "windows", label: "Windows", unit: "qty" }} value={sp.windows} onChange={(v) => setSpace(sp.id, { windows: v })} />
                    {!isWall && <TkField scope={sp.id} field={{ key: "area", label: "Floor area", unit: "sq ft", placeholder: "If length or width is unknown", help: "Used when length or width is blank. Walls are estimated as a square room." }} value={sp.area} onChange={(v) => setSpace(sp.id, { area: v })} />}
                  </div>
                  {measured && <p className="tk-help">{isWall ? `${tkFmt(measured.wall)} sq ft of wall` : `${tkFmt(measured.floor)} sq ft floor · ${tkFmt(measured.wall)} sq ft of wall`}</p>}
                </div>
              );
            })}
            <div className="tk-space-actions">
              <button type="button" className="btn sm" onClick={() => addSpace("room")}>Add room</button>
              <button type="button" className="btn sm" onClick={() => addSpace("wall")}>Add wall</button>
            </div>
          </div>

          <div className="field">
            <label>Add to this project</label>
            <div className="tk-scopes" role="group" aria-label="Scopes">
              {TK_SCOPES.map((s) =>
              <button
                key={s.id}
                type="button"
                aria-pressed={form.scopes.includes(s.id)}
                className={"tk-scope" + (form.scopes.includes(s.id) ? " is-on" : "")}
                onClick={() => toggleScope(s.id)}>
                  {s.label}
                </button>
              )}
            </div>
            <p className="tk-help">Turn on every trade this bid should include. Every room and wall above is included.</p>
          </div>

          {form.scopes.map((id) => {
            const scope = tkScopeById(id);
            const section = result.sections.find((s) => s.id === id);
            return (
              <div key={id} className="tk-block">
                <div className="tk-block-head">
                  <h3>{scope.label}</h3>
                  <button type="button" className="btn sm ghost" onClick={() => toggleScope(id)}>Remove</button>
                </div>
                <p className="tk-help" style={{ marginTop: 0 }}>{scope.blurb}{section ? ` · ${fmtMoney(section.direct)} with labor` : ""}</p>
                <div className="tk-block-grid">
                  {scopeFields[id].map((field) =>
                  <TkField key={field.key} scope={id} field={field} value={form.inputs[field.key] ?? ""} onChange={(v) => setInput(field.key, v)} />
                  )}
                  <div className="field">
                    <label htmlFor={"tk-rate-" + id}>{id === "masonry" && form.inputs.masonryType !== "block" ? "Labor rate ($/sq ft)" : "Labor rate ($/hr)"}</label>
                    <input
                      id={"tk-rate-" + id}
                      className={"input" + ((id === "masonry" && form.inputs.masonryType === "block" ? (form.laborRates.masonryBlock ?? "") : (form.laborRates[id] ?? "")) === "" ? " is-missing" : "")}
                      type="number"
                      min="0"
                      step="1"
                      value={id === "masonry" && form.inputs.masonryType === "block" ? (form.laborRates.masonryBlock ?? "") : form.laborRates[id]}
                      onChange={(e) => setLabor(id === "masonry" && form.inputs.masonryType === "block" ? "masonryBlock" : id, e.target.value)} />
                  </div>
                  {section?.hours == null &&
                  <div className="field">
                    <label htmlFor={"tk-hrs-" + id}>Labor hours</label>
                    <input
                      id={"tk-hrs-" + id}
                      className="input is-missing"
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="Not published"
                      value={(form.laborHours || {})[id] ?? ""}
                      onChange={(e) => setHours(id, e.target.value)} />
                    <p className="tk-help">No published hour count was found for this trade.</p>
                  </div>
                  }
                </div>
              </div>
            );
          })}

          <div className="tk-fields">
            <div className="field">
              <label htmlFor="tk-waste">Waste factor</label>
              <div className="tk-input-unit">
                <input
                  id="tk-waste"
                  className="input"
                  type="number"
                  min="0"
                  step="1"
                  value={form.waste}
                  onChange={(e) => patch({ waste: e.target.value, wasteTouched: true })} />
                <span className="tk-unit">%</span>
              </div>
              <p className="tk-help">Tile uses at least 15%, even when this is lower.</p>
            </div>
            <div className="field">
              <label htmlFor="tk-oh">Overhead</label>
              <div className="tk-input-unit">
                <input id="tk-oh" className="input" type="number" min="0" step="1" value={form.overheadPct} onChange={(e) => patch({ overheadPct: e.target.value })} />
                <span className="tk-unit">%</span>
              </div>
            </div>
            <div className="field">
              <label htmlFor="tk-profit">Profit</label>
              <div className="tk-input-unit">
                <input id="tk-profit" className="input" type="number" min="0" step="1" value={form.profitPct} onChange={(e) => patch({ profitPct: e.target.value })} />
                <span className="tk-unit">%</span>
              </div>
            </div>
          </div>

          <div className="field">
            <label htmlFor="tk-name">Label <span className="field-optional">Optional</span></label>
            <input id="tk-name" className="input" placeholder="e.g. Main floor, Basement suite" value={form.name} onChange={(e) => patch({ name: e.target.value })} />
          </div>
        </section>

        <section className="tk-card tk-results" aria-label="Bid">
          <div className="tk-results-head">
            <div>
              <h2 className="tk-title">Project bid</h2>
              <p className="tk-help">
                {TK_PROJECT_TYPES.find((p) => p.id === form.projectType)?.label}
                {form.scopes.length ? ` · ${form.scopes.length} scope${form.scopes.length === 1 ? "" : "s"}` : " · add a scope to price the job"}
              </p>
            </div>
            <div className="tk-total">
              <span className="tk-total-label">Bid total</span>
              <span className="tk-total-value">{fmtMoney(result.bid)}</span>
            </div>
          </div>

          <div className="tk-summary">
            {result.summary.map(([label, value]) =>
            <div key={label} className="tk-summary-cell">
                <span>{label}</span>
                <b>{value}</b>
              </div>
            )}
          </div>

          {result.rows.length > 0 &&
          <div className="tk-table-wrap">
            <table className="tk-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="num">Qty</th>
                  <th className="num">Unit price</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {result.sections.map((sec) =>
                <React.Fragment key={sec.id}>
                  <tr className="tk-section"><td colSpan={4}>{sec.label}</td></tr>
                  {result.rows.filter((r) => r.scope === sec.id).map((r) =>
                  <tr key={r.key}>
                    <td>{r.item}</td>
                    <td className="num"><b>{tkFmt(r.qty, r.digits || 0)}</b> <span className="tk-unit-inline">{r.unit}</span></td>
                    <td className="num">
                      <input
                        className={"input tk-rate" + (r.missing ? " is-missing" : "")}
                        type="number"
                        min="0"
                        step="0.01"
                        aria-label={`Unit price for ${r.item}`}
                        placeholder={r.missing ? "Needed" : ""}
                        value={form.rates[r.key] ?? (r.rate == null ? "" : r.rate)}
                        onChange={(e) => setRate(r.key, e.target.value)} />
                    </td>
                    <td className="num">{r.rate == null ? <span className="tk-missing">Enter price</span> : fmtMoney(r.qty * r.rate)}</td>
                  </tr>
                  )}
                </React.Fragment>
                )}
              </tbody>
            </table>
          </div>
          }

          <div className="tk-bid">
            {result.sections.map((s) =>
            <React.Fragment key={s.id}>
              <div className="tk-bid-row"><span>{s.label} materials</span><span>{fmtMoney(s.material)}</span></div>
              <div className="tk-bid-row">
                <span>{s.hours == null || s.rate == null ? `${s.label} labor` : s.laborUnit === "sq ft" ? `${s.label} labor · ${tkFmt(s.hours)} sq ft` : `${s.label} labor · ${tkFmt(s.hours, 1)} hrs`}</span>
                <span>{s.hours == null || s.rate == null ? <span className="tk-missing">Price needed</span> : fmtMoney(s.labor)}</span>
              </div>
            </React.Fragment>
            )}
            <div className="tk-bid-row"><span>Direct cost</span><span>{fmtMoney(result.direct)}</span></div>
            <div className="tk-bid-row"><span>Overhead ({result.overheadPct}%)</span><span>{fmtMoney(result.overhead)}</span></div>
            <div className="tk-bid-row"><span>Profit ({result.profitPct}%)</span><span>{fmtMoney(result.profit)}</span></div>
            <div className="tk-bid-row is-grand"><span>Bid total</span><span>{fmtMoney(result.bid)}</span></div>
          </div>
          <p className="tk-help">Quantities are rounded up. Labor hours are rounded up to the next half hour. Prices and hourly rates are editable defaults — confirm them before you send the estimate.</p>

          <div className="tk-actions">
            <button type="button" className="btn" onClick={startNew}>New bid</button>
            <button type="button" className="btn" onClick={estimateFromCurrent}>
              <Icon name="estimate" size={16} /> Create estimate
            </button>
            <button type="button" className="btn primary" onClick={save}>
              <Icon name="check" size={16} /> {form.id && takeoffs.some((t) => t.id === form.id) ? "Update bid" : "Save bid"}
            </button>
          </div>
        </section>
      </div>

      <section className="tk-saved" aria-labelledby="tk-saved-label">
        <div className="section-head">
          <h2 id="tk-saved-label">Saved by project address</h2>
          <span className="meta">{takeoffs.length} bid{takeoffs.length === 1 ? "" : "s"}</span>
        </div>
        {groups.length === 0 ?
        <div className="tk-card tk-empty">No saved bids yet. Add scopes, enter an address, and save.</div> :
        <div className="tk-groups">
          {groups.map((g) =>
          <div key={g.key} className="tk-card tk-group">
            <div className="tk-group-head">
              <div className="tk-group-title">
                <h3>{g.address}</h3>
                <span className="tk-help">{g.items.length} bid{g.items.length === 1 ? "" : "s"} · {fmtMoney(g.total)}</span>
              </div>
              <div className="tk-group-actions">
                <button type="button" className="btn sm" onClick={() => createEstimate(g.items, g.address)}>
                  <Icon name="estimate" size={14} /> Estimate from all
                </button>
                <button type="button" className="btn sm ghost tk-danger" onClick={() => removeGroup(g)}>
                  <Icon name="trash" size={14} /> Delete all
                </button>
              </div>
            </div>
            <ul className="tk-list">
              {g.items.map((t) =>
              <li key={t.id} className={"tk-item" + (t.id === form.id ? " is-active" : "")}>
                <button type="button" className="tk-item-main" onClick={() => open(t)}>
                  <span className="tk-item-title">{tkRecordTitle(t)}</span>
                  <span className="tk-help">
                    {TK_PROJECT_TYPES.find((p) => p.id === t.projectType)?.label || "New build"} · {fmtDate((t.updatedAt || "").slice(0, 10))}
                  </span>
                </button>
                <span className="tk-item-total">{fmtMoney((t.scopes ? tkProjectBid(t).bid : (t.bidTotal ?? t.total)) || 0)}</span>
                <button type="button" className="iconbtn tk-danger" title="Delete bid" aria-label="Delete bid" onClick={() => removeOne(t)}>
                  <Icon name="trash" size={14} />
                </button>
              </li>
              )}
            </ul>
          </div>
          )}
        </div>
        }
      </section>
      {priceAlert &&
      <div className="tk-price-alert" role="alertdialog" aria-labelledby="tk-price-alert-title" aria-modal="true">
        <div className="modal-scrim" onClick={() => setPriceAlert(null)}></div>
        <div className="modal">
          <div className="modal-head">
            <div>
              <div className="kicker">Price check</div>
              <h3 id="tk-price-alert-title">Some prices were not found</h3>
              <p className="modal-sub">No published material or labor figure was found for the lines below. Enter a price on the bid. Those lines stay out of the total until you do.</p>
            </div>
            <button type="button" className="iconbtn" onClick={() => setPriceAlert(null)} aria-label="Close"><Icon name="close" /></button>
          </div>
          <div className="modal-body">
            <ul className="tk-missing-list">
              {priceAlert.map((m) => <li key={m.id}><b>{m.label}</b> · {m.kind}</li>)}
            </ul>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn primary" onClick={() => setPriceAlert(null)}>Enter prices</button>
          </div>
        </div>
      </div>
      }
    </div>
  );
}

window.TakeoffsScreen = TakeoffsScreen;
window.MartenTakeoffs = { calculate: tkProjectBid, scopes: TK_SCOPES };
