/* Project calculators — material takeoffs for ceilings, drywall, framing, insulation,
   paint, electrical and plumbing. Saved per project address; convertible to estimates. */
const { useState: useStateTk, useMemo: useMemoTk } = React;

const TK_PROJECT_TYPES = [
  { id: "new", label: "New build" },
  { id: "renovation", label: "Renovation" },
  { id: "addition", label: "Addition" },
];

const TK_BASE_WASTE = { ceiling: 10, drywall: 12, framing: 10, insulation: 10, paint: 10, electrical: 10, plumbing: 10 };
const TK_TYPE_WASTE = { new: 0, renovation: 5, addition: 3 };

function tkDefaultWaste(trade, type) {
  return (TK_BASE_WASTE[trade] || 10) + (TK_TYPE_WASTE[type] || 0);
}

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

function tkRow(key, item, qty, unit, rate) {
  return { key, item, qty, unit, rate };
}

function tkRoom(i) {
  const L = tkNum(i.length);
  const W = tkNum(i.width);
  const H = tkNum(i.height);
  return { L, W, H, floor: L * W, perimeter: 2 * (L + W) };
}

function tkOpeningsArea(i) {
  return tkNum(i.doors) * 21 + tkNum(i.windows) * 15;
}

const TK_YES_NO = "toggle";

const TK_TRADES = {
  ceiling: {
    label: "Ceilings",
    blurb: "Suspended (ACT) grid — tiles, tees, wall angle and hangers.",
    defaults: { length: 20, width: 15, area: "", system: "2x4", plenum: 2 },
    fields: [
      { key: "length", label: "Room length", unit: "ft" },
      { key: "width", label: "Room width", unit: "ft" },
      { key: "area", label: "Or total ceiling area", unit: "sq ft", placeholder: "Optional" },
      { key: "system", label: "Ceiling system", type: "select", options: [["2x4", "2' × 4' lay-in"], ["2x2", "2' × 2' lay-in"]] },
      { key: "plenum", label: "Hanger drop", unit: "ft", help: "Structure to new ceiling height." },
    ],
    calc(i, type, w) {
      const room = tkRoom(i);
      const A = tkNum(i.area) || room.floor;
      const P = room.L && room.W ? room.perimeter : 4 * Math.sqrt(A);
      const is22 = i.system === "2x2";
      const drop = tkNum(i.plenum);
      const hangers = tkUp((A / 16) * w);
      const rows = [
        tkRow("tiles", `Ceiling tiles ${is22 ? "2' × 2'" : "2' × 4'"}`, tkUp((A / (is22 ? 4 : 8)) * w), "pcs", is22 ? 3.5 : 6),
        tkRow("mains", "Main tees 12'", tkUp((A / 48) * w), "pcs", 9),
        tkRow("cross4", "Cross tees 4'", tkUp((A / 8) * w), "pcs", 2.25),
        is22 && tkRow("cross2", "Cross tees 2'", tkUp((A / 8) * w), "pcs", 1.25),
        tkRow("angle", "Wall angle 10'", tkUp((P / 10) * w), "pcs", 5),
        tkRow("wire", "Hanger wire 12 ga", hangers, "pcs", 0.6),
        tkRow("anchors", "Hanger anchors / screw eyes", hangers, "pcs", 0.45),
        type === "renovation" && tkRow("demo", "Remove & dispose existing ceiling", tkUp(A), "sq ft", 1.25),
      ];
      return {
        rows,
        summary: [
          ["Ceiling area", `${tkFmt(A)} sq ft`],
          ["Perimeter", `${tkFmt(P, 1)} ft`],
          ["Hanger wire length", `${tkFmt(hangers * (drop + 1.5))} ft`],
        ],
      };
    },
  },

  drywall: {
    label: "Drywall",
    blurb: "Board, screws, compound, tape and corner bead.",
    defaults: { length: 14, width: 12, height: 8, area: "", includeCeiling: true, doors: 1, windows: 1, sheet: "4x8", thickness: "1/2", corners: 0 },
    fields: [
      { key: "length", label: "Room length", unit: "ft" },
      { key: "width", label: "Room width", unit: "ft" },
      { key: "height", label: "Wall height", unit: "ft" },
      { key: "area", label: "Or total board area", unit: "sq ft", placeholder: "Optional" },
      { key: "doors", label: "Doors", unit: "qty" },
      { key: "windows", label: "Windows", unit: "qty" },
      { key: "sheet", label: "Sheet size", type: "select", options: [["4x8", "4' × 8'"], ["4x10", "4' × 10'"], ["4x12", "4' × 12'"]] },
      { key: "thickness", label: "Board type", type: "select", options: [["1/2", "1/2\" regular"], ["5/8", "5/8\" fire-rated (Type X)"], ["1/2mr", "1/2\" moisture-resistant"]] },
      { key: "corners", label: "Outside corners", unit: "qty" },
      { key: "includeCeiling", label: "Include ceiling", type: TK_YES_NO },
    ],
    calc(i, type, w) {
      const room = tkRoom(i);
      const wall = Math.max(0, room.perimeter * room.H - tkOpeningsArea(i));
      const ceiling = i.includeCeiling ? room.floor : 0;
      const total = tkNum(i.area) || wall + ceiling;
      const sheetArea = { "4x8": 32, "4x10": 40, "4x12": 48 }[i.sheet] || 32;
      const sheetPrice = { 32: 16, 40: 21, 48: 25 }[sheetArea] + ({ "5/8": 4, "1/2mr": 6 }[i.thickness] || 0);
      const boardLabel = { "5/8": "5/8\" Type X", "1/2mr": "1/2\" moisture-resistant" }[i.thickness] || "1/2\" regular";
      const sheets = tkUp((total / sheetArea) * w);
      const corners = tkNum(i.corners);
      const rows = [
        tkRow("sheets", `Drywall ${boardLabel} ${i.sheet.replace("x", "' × ")}'`, sheets, "sheets", sheetPrice),
        tkRow("screws", "Drywall screws 1-1/4\" (box of 1,000)", sheets ? Math.max(1, tkUp((sheets * 32) / 1000)) : 0, "boxes", 15),
        tkRow("mud", "Joint compound (≈450 sq ft per box)", tkUp(total / 450), "boxes", 24),
        tkRow("tape", "Paper joint tape 500'", total ? Math.max(1, tkUp((total * 0.38) / 500)) : 0, "rolls", 9),
        corners > 0 && tkRow("bead", "Corner bead 8'", tkUp(((corners * (room.H || 8)) / 8) * w), "pcs", 4.5),
        type === "renovation" && tkRow("demo", "Demo & dispose existing drywall", tkUp(wall), "sq ft", 1.1),
        type === "addition" && tkRow("tiein", "Tie-in & feather at existing walls", 1, "allowance", 150),
      ];
      return {
        rows,
        summary: [
          ["Wall area", `${tkFmt(wall)} sq ft`],
          ["Ceiling area", `${tkFmt(ceiling)} sq ft`],
          ["Board area", `${tkFmt(total)} sq ft`],
        ],
      };
    },
  },

  framing: {
    label: "Framing",
    blurb: "Wall studs, plates, headers, sheathing and fasteners.",
    defaults: { wallLength: 40, height: 8, spacing: "16", size: "2x4", openings: 2, corners: 4, sheathing: false },
    fields: [
      { key: "wallLength", label: "Total wall length", unit: "ft" },
      { key: "height", label: "Wall height", unit: "ft" },
      { key: "spacing", label: "Stud spacing", type: "select", options: [["16", "16\" on centre"], ["24", "24\" on centre"]] },
      { key: "size", label: "Lumber size", type: "select", options: [["2x4", "2×4"], ["2x6", "2×6"]] },
      { key: "openings", label: "Doors & windows", unit: "qty" },
      { key: "corners", label: "Corners & T-walls", unit: "qty" },
      { key: "sheathing", label: "Exterior sheathing (OSB)", type: TK_YES_NO },
    ],
    calc(i, type, w) {
      const L = tkNum(i.wallLength);
      const H = tkNum(i.height) || 8;
      const spacing = Number(i.spacing) || 16;
      const openings = tkNum(i.openings);
      const corners = tkNum(i.corners);
      const is26 = i.size === "2x6";
      const studs = L ? tkUp((tkUp((L * 12) / spacing) + 1 + corners * 2 + openings * 3) * w) : 0;
      const studLabel = H <= 8 ? `${i.size} precut stud 92-5/8"` : `${i.size} stud ${Math.ceil(H)}'`;
      const rows = [
        tkRow("studs", studLabel, studs, "pcs", (is26 ? 1.15 : 0.7) * Math.max(8, Math.ceil(H))),
        tkRow("plates", `${i.size} plate stock 16' (bottom + double top)`, tkUp(((L * 3) / 16) * w), "pcs", is26 ? 18 : 11),
        openings > 0 && tkRow("headers", "2×10 header stock", tkUp(openings * 8 * w), "lin ft", 3.2),
        i.sheathing && tkRow("osb", "OSB sheathing 7/16\" 4' × 8'", tkUp(((L * H) / 32) * w), "sheets", 24),
        tkRow("nails", "Framing nails 3-1/4\"", studs ? Math.max(1, tkUp(studs / 7.5)) : 0, "lb", 4),
        type !== "renovation" && tkRow("anchors", "Bottom-plate anchors (on slab)", tkUp(L / 4), "pcs", 1.2),
        type === "renovation" && tkRow("demo", "Demo & dispose existing framing", tkUp(L), "lin ft", 6),
        type === "addition" && tkRow("ledger", "Ledger / tie-in hardware to existing structure", 1, "allowance", 250),
      ];
      return {
        rows,
        summary: [
          ["Wall area", `${tkFmt(L * H)} sq ft`],
          ["Stud spacing", `${spacing}" o.c.`],
          ["Studs incl. waste", tkFmt(studs)],
        ],
      };
    },
  },

  insulation: {
    label: "Insulation",
    blurb: "Batts or blown-in, vapour barrier, sealant and baffles.",
    defaults: { application: "walls", length: 40, height: 8, area: "", method: "batts", rvalue: "20", vapour: true },
    fields: [
      { key: "application", label: "Where", type: "select", options: [["walls", "Exterior walls"], ["attic", "Attic / ceiling"], ["basement", "Basement walls"], ["floor", "Floor / crawlspace"]] },
      { key: "length", label: "Length", unit: "ft" },
      { key: "height", label: "Height or width", unit: "ft", help: "Wall height, or width for attic and floor." },
      { key: "area", label: "Or total area", unit: "sq ft", placeholder: "Optional" },
      { key: "method", label: "Type", type: "select", options: [["batts", "Batts"], ["blown", "Blown-in (attic only)"]] },
      { key: "rvalue", label: "R-value", type: "select", options: ["12", "14", "20", "22", "24", "28", "31", "40", "50", "60"].map((r) => [r, "R-" + r]) },
      { key: "vapour", label: "6-mil vapour barrier", type: TK_YES_NO },
    ],
    calc(i, type, w) {
      const L = tkNum(i.length);
      const H = tkNum(i.height);
      const A = tkNum(i.area) || L * H;
      const r = Number(i.rvalue) || 20;
      const blown = i.method === "blown" && i.application === "attic";
      const coverage = { 12: 80, 14: 78, 20: 79, 22: 49, 24: 39, 28: 40, 31: 32, 40: 32, 50: 24, 60: 20 }[r] || 60;
      const rows = [
        blown ?
        tkRow("blown", `Blown-in cellulose R-${r} (25 lb bag)`, tkUp((A / 1000) * r * w), "bags", 18) :
        tkRow("batts", `Insulation batts R-${r}`, tkUp((A / coverage) * w), "bags", 50 + r * 0.75),
        i.vapour && tkRow("poly", "6-mil poly vapour barrier 10' × 100'", A ? Math.max(1, tkUp((A * 1.1) / 1000)) : 0, "rolls", 95),
        i.vapour && tkRow("tape", "Sheathing / tuck tape", A ? Math.max(1, tkUp(A / 500)) : 0, "rolls", 12),
        i.vapour && tkRow("sealant", "Acoustic sealant", tkUp((2 * (L + H)) / 25), "tubes", 12),
        i.application === "attic" && tkRow("baffles", "Rafter vent baffles", tkUp((L * 12) / 24) * 2, "pcs", 2.5),
        type === "renovation" && tkRow("demo", "Remove & dispose existing insulation", tkUp(A), "sq ft", 1.5),
      ];
      return {
        rows,
        summary: [
          ["Area", `${tkFmt(A)} sq ft`],
          ["Target", `R-${r}`],
          [blown ? "Bags per 1,000 sq ft" : "Coverage per bag", blown ? tkFmt(r) : `≈${coverage} sq ft`],
        ],
      };
    },
  },

  paint: {
    label: "Paint",
    blurb: "Wall, ceiling and trim paint, primer and supplies.",
    defaults: { length: 14, width: 12, height: 8, includeCeiling: false, coats: "2", doors: 1, windows: 2, coverage: 350, primer: "auto", trim: true },
    fields: [
      { key: "length", label: "Room length", unit: "ft" },
      { key: "width", label: "Room width", unit: "ft" },
      { key: "height", label: "Wall height", unit: "ft" },
      { key: "coats", label: "Finish coats", type: "select", options: [["1", "1 coat"], ["2", "2 coats"], ["3", "3 coats"]] },
      { key: "doors", label: "Doors", unit: "qty" },
      { key: "windows", label: "Windows", unit: "qty" },
      { key: "coverage", label: "Coverage per gallon", unit: "sq ft" },
      { key: "primer", label: "Primer", type: "select", options: [["auto", "Based on project type"], ["full", "Full prime coat"], ["spot", "Spot prime only"], ["none", "No primer"]] },
      { key: "includeCeiling", label: "Paint ceiling", type: TK_YES_NO },
      { key: "trim", label: "Paint trim & doors", type: TK_YES_NO },
    ],
    calc(i, type, w) {
      const room = tkRoom(i);
      const coats = Number(i.coats) || 2;
      const coverage = tkNum(i.coverage) || 350;
      const wall = Math.max(0, room.perimeter * room.H - tkOpeningsArea(i));
      const ceiling = i.includeCeiling ? room.floor : 0;
      const primerMode = i.primer === "auto" ? (type === "renovation" ? "spot" : "full") : i.primer;
      const trimLf = room.perimeter + tkNum(i.doors) * 17 + tkNum(i.windows) * 14;
      const surface = wall + ceiling;
      const rows = [
        tkRow("wall", "Wall paint", tkUp(((wall * coats) / coverage) * w), "gal", 58),
        ceiling > 0 && tkRow("ceiling", "Ceiling paint, flat", tkUp(((ceiling * coats) / coverage) * w), "gal", 45),
        primerMode === "full" && tkRow("primer", "Primer-sealer", tkUp((surface / 300) * w), "gal", 40),
        primerMode === "spot" && tkRow("primer", "Primer (spot prime)", surface ? Math.max(1, tkUp(((surface * 0.15) / 300) * w)) : 0, "gal", 40),
        i.trim && tkRow("trim", "Trim & door enamel", tkUp(trimLf / 75), "qt", 26),
        i.trim && tkRow("caulk", "Paintable caulk", tkUp(trimLf / 50), "tubes", 7),
        tkRow("tape", "Painter's tape 60 yd", tkUp(trimLf / 150), "rolls", 9),
        tkRow("kit", "Roller covers, trays & drop cloth kit", surface ? Math.max(1, tkUp(surface / 800)) : 0, "kits", 35),
        type === "renovation" && tkRow("patch", "Patch & sand allowance", 1, "allowance", 40),
      ];
      return {
        rows,
        summary: [
          ["Wall area", `${tkFmt(wall)} sq ft`],
          ["Ceiling area", `${tkFmt(ceiling)} sq ft`],
          ["Trim", `${tkFmt(trimLf)} lin ft`],
        ],
      };
    },
  },

  electrical: {
    label: "Electrical",
    blurb: "Rough-in devices, boxes, breakers and cable (rule-of-thumb counts).",
    defaults: { floorArea: 1200, rooms: 6, bedrooms: 3, bathrooms: 2, kitchen: true, laundry: true, exterior: 2, avgRun: 25 },
    fields: [
      { key: "floorArea", label: "Floor area", unit: "sq ft" },
      { key: "rooms", label: "Rooms (incl. bedrooms)", unit: "qty" },
      { key: "bedrooms", label: "Bedrooms", unit: "qty" },
      { key: "bathrooms", label: "Bathrooms", unit: "qty" },
      { key: "exterior", label: "Exterior receptacles", unit: "qty" },
      { key: "avgRun", label: "Average cable run per device", unit: "ft" },
      { key: "kitchen", label: "Kitchen", type: TK_YES_NO },
      { key: "laundry", label: "Laundry", type: TK_YES_NO },
    ],
    calc(i, type, w) {
      const area = tkNum(i.floorArea);
      const rooms = tkNum(i.rooms);
      const baths = tkNum(i.bathrooms);
      const ext = tkNum(i.exterior);
      const run = tkNum(i.avgRun) || 25;
      const wallLf = rooms ? rooms * 4 * Math.sqrt(area / rooms) : 0;
      const general = Math.max(rooms * 2, tkUp(wallLf / 12));
      const kitchenRecept = i.kitchen ? 5 : 0;
      const dedicated = i.kitchen ? 3 : 0;
      const range = i.kitchen ? 1 : 0;
      const lights = Math.max(rooms, tkUp(area / 100)) + baths;
      const switches = rooms + baths * 2 + tkUp(rooms / 3) * 2;
      const alarms = tkNum(i.bedrooms) + 1;
      const gfci = kitchenRecept + baths + ext;
      const devices = general + gfci + lights + switches + baths + alarms;
      const c15 = Math.max(1, tkUp(area / 500));
      const c20 = (i.kitchen ? 2 : 0) + baths + (i.laundry ? 1 : 0) + dedicated;
      const cable14 = tkUp((general + lights + switches + baths + alarms) * run * w);
      const cable12 = tkUp((gfci + (i.laundry ? 1 : 0) + dedicated) * run * w);
      const rows = [
        tkRow("boxes", type === "renovation" ? "Old-work device boxes" : "New-work device boxes", tkUp(devices * w), "pcs", type === "renovation" ? 3.5 : 1.6),
        tkRow("recept", "Tamper-resistant receptacles 15A", tkUp(general * w), "pcs", 3.5),
        gfci > 0 && tkRow("gfci", "GFCI receptacles (kitchen, bath, exterior)", gfci, "pcs", 28),
        ext > 0 && tkRow("wp", "Weatherproof in-use covers", ext, "pcs", 15),
        tkRow("switches", "Switches (single-pole & 3-way)", tkUp(switches * w), "pcs", 3.5),
        tkRow("plates", "Cover plates", tkUp((general + switches + gfci) * w), "pcs", 1.5),
        tkRow("lights", "Light fixtures / pot lights (allowance)", lights, "pcs", 35),
        baths > 0 && tkRow("fans", "Bathroom exhaust fans", baths, "pcs", 90),
        tkRow("alarms", "Hardwired smoke / CO alarms", alarms, "pcs", 55),
        tkRow("b15", "15A AFCI breakers (general circuits)", c15, "pcs", 55),
        c20 > 0 && tkRow("b20", "20A breakers (kitchen, bath, laundry)", c20, "pcs", 18),
        range > 0 && tkRow("b40", "40A double-pole breaker (range)", range, "pcs", 25),
        tkRow("nm14", "14/2 NMD90 cable", cable14, "ft", 0.45),
        cable12 > 0 && tkRow("nm12", "12/2 NMD90 cable", cable12, "ft", 0.7),
        range > 0 && tkRow("nm8", "8/3 NMD90 cable (range)", tkUp(run * 1.5 * w), "ft", 3.2),
        tkRow("staples", "Cable staples (box of 250)", cable14 + cable12 ? Math.max(1, tkUp((cable14 + cable12) / 4.5 / 250)) : 0, "boxes", 8),
        type === "renovation" && tkRow("fish", "Fishing, access & patch allowance", 1, "allowance", 150),
        type === "addition" && tkRow("panel", "Panel capacity check / subpanel allowance", 1, "allowance", 450),
      ];
      return {
        rows,
        summary: [
          ["Devices", tkFmt(devices)],
          ["Circuits", tkFmt(c15 + c20 + range)],
          ["Cable", `${tkFmt(cable14 + cable12)} ft`],
        ],
      };
    },
  },

  plumbing: {
    label: "Plumbing",
    blurb: "Supply and DWV piping, fittings, valves and hookups.",
    defaults: { bathrooms: 1, halfBaths: 0, kitchenSinks: 1, hoseBibs: 1, mainRun: 30, avgRun: 20, material: "pex", dishwasher: true, laundry: true, waterHeater: true },
    fields: [
      { key: "bathrooms", label: "Full bathrooms", unit: "qty" },
      { key: "halfBaths", label: "Half baths", unit: "qty" },
      { key: "kitchenSinks", label: "Kitchen sinks", unit: "qty" },
      { key: "hoseBibs", label: "Exterior hose bibs", unit: "qty" },
      { key: "mainRun", label: "Main trunk run", unit: "ft" },
      { key: "avgRun", label: "Average branch run", unit: "ft" },
      { key: "material", label: "Supply pipe", type: "select", options: [["pex", "PEX-A"], ["copper", "Type L copper"]] },
      { key: "dishwasher", label: "Dishwasher", type: TK_YES_NO },
      { key: "laundry", label: "Laundry (washer box)", type: TK_YES_NO },
      { key: "waterHeater", label: "Water heater hookup", type: TK_YES_NO },
    ],
    calc(i, type, w) {
      const b = tkNum(i.bathrooms);
      const hb = tkNum(i.halfBaths);
      const sinks = tkNum(i.kitchenSinks);
      const bibs = tkNum(i.hoseBibs);
      const main = tkNum(i.mainRun);
      const run = tkNum(i.avgRun) || 20;
      const toilets = b + hb;
      const lavs = b + hb;
      const tubs = b;
      const dw = i.dishwasher ? 1 : 0;
      const washer = i.laundry ? 1 : 0;
      const copper = i.material === "copper";
      const connections = lavs * 2 + tubs * 2 + sinks * 2 + washer * 2 + toilets + dw + bibs;
      const drains = toilets + lavs + tubs + sinks + washer;
      const rows = [
        tkRow("half", copper ? "Type L copper 1/2\"" : "PEX-A 1/2\"", tkUp(connections * run * w), "ft", copper ? 4.5 : 0.75),
        tkRow("trunk", copper ? "Type L copper 3/4\"" : "PEX-A 3/4\"", tkUp(main * 2 * w) + (i.waterHeater ? 10 : 0), "ft", copper ? 7 : 1.25),
        tkRow("fittings", copper ? "Copper fittings (elbows, tees)" : "PEX fittings & crimp rings", tkUp(connections * 4 * w), "pcs", copper ? 3 : 2.5),
        copper && tkRow("solder", "Solder, flux & emery kit", 1, "kit", 35),
        tkRow("stops", "Shut-off valves (stops)", Math.max(0, connections - bibs), "pcs", 12),
        i.waterHeater && tkRow("wh", "Water heater connection kit", 1, "kit", 85),
        i.waterHeater && tkRow("expansion", "Thermal expansion tank", 1, "pcs", 70),
        bibs > 0 && tkRow("bibs", "Frost-free hose bibs", bibs, "pcs", 45),
        tkRow("abs3", "3\" ABS drain pipe", tkUp((toilets * 8 + main) * w), "ft", 4.2),
        tubs + sinks + washer > 0 && tkRow("abs2", "2\" ABS drain pipe", tkUp((tubs + sinks + washer) * 10 * w), "ft", 2.6),
        lavs > 0 && tkRow("abs15", "1-1/2\" ABS drain pipe", tkUp(lavs * 8 * w), "ft", 2.1),
        tkRow("vent", "1-1/2\" ABS vent pipe", tkUp(drains * 6 * w), "ft", 2.1),
        tkRow("dwvfit", "ABS fittings (wyes, elbows, cleanouts)", tkUp(drains * 5 * w), "pcs", 6),
        lavs + tubs + sinks + washer > 0 && tkRow("traps", "P-traps", lavs + tubs + sinks + washer, "pcs", 10),
        toilets > 0 && tkRow("flange", "Toilet flanges & wax rings", toilets, "pcs", 18),
        washer > 0 && tkRow("washer", "Washer outlet box", washer, "pcs", 45),
        tkRow("cement", "ABS cement", drains ? 1 : 0, "can", 15),
        type === "renovation" && tkRow("tiein", "Tie-in fittings to existing lines", 2, "pcs", 30),
        type === "renovation" && tkRow("cap", "Demo & cap existing fixtures", 1, "allowance", 200),
        type === "addition" && tkRow("tiein", "Tie-in to existing supply & drain", 1, "allowance", 300),
      ];
      return {
        rows,
        summary: [
          ["Fixtures", tkFmt(drains + dw)],
          ["Supply connections", tkFmt(connections)],
          ["Material", copper ? "Copper" : "PEX"],
        ],
      };
    },
  },
};

const TK_TRADE_ORDER = ["ceiling", "drywall", "framing", "insulation", "paint", "electrical", "plumbing"];

function tkCalculate(trade, inputs, projectType, waste, rates) {
  const def = TK_TRADES[trade];
  const w = 1 + (Number(waste) || 0) / 100;
  const { rows, summary } = def.calc({ ...def.defaults, ...inputs }, projectType, w);
  const priced = rows.filter(Boolean).map((r) => {
    const override = rates && rates[r.key];
    const rate = override === "" || override === undefined || override === null ? r.rate : Number(override) || 0;
    return { ...r, rate: Math.round(rate * 100) / 100 };
  });
  const total = priced.reduce((s, r) => s + r.qty * r.rate, 0);
  return { rows: priced, summary, total };
}

function tkAddressKey(address) {
  return String(address || "").trim().toLowerCase().replace(/[\s,]+/g, " ");
}

function tkOneLine(address) {
  return String(address || "").split(/\n+/).map((s) => s.trim()).filter(Boolean).join(", ");
}

function tkBlankForm(trade = "ceiling", projectType = "new", projectAddress = "") {
  return {
    id: null,
    trade,
    projectType,
    projectAddress,
    name: "",
    inputsByTrade: { [trade]: { ...TK_TRADES[trade].defaults } },
    waste: tkDefaultWaste(trade, projectType),
    wasteTouched: false,
    rates: {},
  };
}

function tkEstimateItems(calcs) {
  return calcs.flatMap((c) =>
    (c.rows || []).filter((r) => r.qty > 0).map((r) => ({
      desc: r.item,
      sub: [TK_TRADES[c.trade]?.label, c.name, r.unit].filter(Boolean).join(" · "),
      qty: r.qty,
      rate: r.rate,
    }))
  );
}

function TkField({ field, value, onChange }) {
  const id = "tk-f-" + field.key;
  if (field.type === TK_YES_NO) {
    return (
      <label className="tk-toggle">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        <span>{field.label}</span>
      </label>);
  }
  if (field.type === "select") {
    return (
      <div className="field">
        <label htmlFor={id}>{field.label}</label>
        <select id={id} className="select" value={value} onChange={(e) => onChange(e.target.value)}>
          {field.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>);
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
    </div>);
}

function TakeoffsScreen({ state, dispatch, business, toast, go }) {
  const takeoffs = state.takeoffs || [];
  const [form, setForm] = useStateTk(() => tkBlankForm());
  const def = TK_TRADES[form.trade];
  const inputs = form.inputsByTrade[form.trade] || def.defaults;
  const result = useMemoTk(
    () => tkCalculate(form.trade, inputs, form.projectType, form.waste, form.rates),
    [form.trade, inputs, form.projectType, form.waste, form.rates]
  );

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
    return [...map.values()].
    map((g) => ({
      ...g,
      items: g.items.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "")),
      total: g.items.reduce((s, t) => s + (t.total || 0), 0),
    })).
    sort((a, b) => (b.items[0]?.updatedAt || "").localeCompare(a.items[0]?.updatedAt || ""));
  }, [takeoffs]);

  const patch = (p) => setForm((f) => ({ ...f, ...p }));
  const setInput = (key, value) =>
  setForm((f) => ({
    ...f,
    inputsByTrade: { ...f.inputsByTrade, [f.trade]: { ...(f.inputsByTrade[f.trade] || TK_TRADES[f.trade].defaults), [key]: value } },
  }));

  const switchTrade = (trade) =>
  setForm((f) => ({
    ...f,
    trade,
    id: f.trade === trade ? f.id : null,
    inputsByTrade: f.inputsByTrade[trade] ? f.inputsByTrade : { ...f.inputsByTrade, [trade]: { ...TK_TRADES[trade].defaults } },
    waste: f.wasteTouched ? f.waste : tkDefaultWaste(trade, f.projectType),
    rates: f.trade === trade ? f.rates : {},
  }));

  const switchType = (projectType) =>
  setForm((f) => ({ ...f, projectType, waste: f.wasteTouched ? f.waste : tkDefaultWaste(f.trade, projectType) }));

  const setRate = (key, value) => setForm((f) => ({ ...f, rates: { ...f.rates, [key]: value } }));

  const startNew = () => setForm((f) => tkBlankForm(f.trade, f.projectType, f.projectAddress));

  const buildRecord = () => {
    const now = new Date().toISOString();
    const existing = form.id ? takeoffs.find((t) => t.id === form.id) : null;
    return {
      id: existing ? existing.id : "tk" + Date.now(),
      projectAddress: form.projectAddress.trim(),
      projectType: form.projectType,
      trade: form.trade,
      name: form.name.trim(),
      inputs,
      waste: Number(form.waste) || 0,
      rows: result.rows,
      total: Math.round(result.total * 100) / 100,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
  };

  const save = () => {
    if (!form.projectAddress.trim()) {
      toast("Add a project address to save this calculation.");
      return null;
    }
    const record = buildRecord();
    const isUpdate = !!form.id && takeoffs.some((t) => t.id === form.id);
    dispatch({ type: isUpdate ? "UPDATE_TAKEOFF" : "ADD_TAKEOFF", takeoff: record });
    patch({ id: record.id });
    toast(isUpdate ? "Calculation updated." : `Saved to ${tkOneLine(record.projectAddress)}.`);
    return record;
  };

  const open = (t) => {
    setForm({
      id: t.id,
      trade: t.trade,
      projectType: t.projectType || "new",
      projectAddress: tkOneLine(t.projectAddress),
      name: t.name || "",
      inputsByTrade: { [t.trade]: { ...TK_TRADES[t.trade].defaults, ...(t.inputs || {}) } },
      waste: t.waste ?? tkDefaultWaste(t.trade, t.projectType),
      wasteTouched: true,
      rates: Object.fromEntries((t.rows || []).map((r) => [r.key, r.rate])),
    });
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  const removeIds = (ids, message) => {
    dispatch({ type: "REMOVE_TAKEOFFS", ids });
    if (form.id && ids.includes(form.id)) patch({ id: null });
    toast(message);
  };

  const removeOne = (t) => {
    if (!window.confirm(`Delete this ${TK_TRADES[t.trade]?.label.toLowerCase()} calculation?`)) return;
    removeIds([t.id], "Calculation deleted.");
  };

  const removeGroup = (g) => {
    if (!window.confirm(`Delete all ${g.items.length} calculation${g.items.length === 1 ? "" : "s"} for "${g.address}"? This can't be undone.`)) return;
    removeIds(g.items.map((t) => t.id), `Deleted calculations for ${g.address}.`);
  };

  const createEstimate = (calcs, address) => {
    const items = tkEstimateItems(calcs);
    if (!items.length) {
      toast("Nothing to add — all quantities are zero.");
      return;
    }
    const estimates = state.estimates || [];
    const today = new Date();
    const est = {
      id: "est" + Date.now(),
      number: "EST-" + String(1 + estimates.filter((e) => (e.number || "").startsWith("EST-")).length).padStart(4, "0"),
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
      notes: "Material quantities from project calculators. Labour not included.",
      drawing: null,
      createdAt: today.toISOString(),
    };
    dispatch({ type: "ADD_ESTIMATE", estimate: est });
    toast(`Created ${est.number} — add the client details to finish.`);
    go("estimates", { focusId: est.id });
  };

  const estimateFromCurrent = () => {
    const record = form.projectAddress.trim() ? save() : buildRecord();
    createEstimate([record], form.projectAddress.trim());
  };

  return (
    <div className="tk">
      <div className="tk-layout">
        <section className="tk-card tk-form" aria-label="Calculator inputs">
          <div className="field">
            <label htmlFor="tk-address">Project address</label>
            <input
              id="tk-address"
              className="input"
              list="tk-address-list"
              placeholder="Job site address — calculations are saved here"
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

          <div className="field">
            <label>Trade</label>
            <div className="chips tk-trades" role="tablist" aria-label="Trade">
              {TK_TRADE_ORDER.map((t) =>
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={form.trade === t}
                className={"chip " + (form.trade === t ? "active" : "")}
                onClick={() => switchTrade(t)}>
                  {TK_TRADES[t].label}
                </button>
              )}
            </div>
            <p className="tk-help">{def.blurb}</p>
          </div>

          <div className="tk-fields">
            {def.fields.map((f) =>
            <TkField key={form.trade + f.key} field={f} value={inputs[f.key] ?? ""} onChange={(v) => setInput(f.key, v)} />
            )}
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
              <p className="tk-help">Default for {TK_PROJECT_TYPES.find((p) => p.id === form.projectType)?.label.toLowerCase()}: {tkDefaultWaste(form.trade, form.projectType)}%</p>
            </div>
          </div>

          <div className="field">
            <label htmlFor="tk-name">Label <span className="field-optional">Optional</span></label>
            <input id="tk-name" className="input" placeholder="e.g. Main floor, Basement suite" value={form.name} onChange={(e) => patch({ name: e.target.value })} />
          </div>
        </section>

        <section className="tk-card tk-results" aria-label="Material estimate">
          <div className="tk-results-head">
            <div>
              <h2 className="tk-title">{def.label} materials</h2>
              <p className="tk-help">{TK_PROJECT_TYPES.find((p) => p.id === form.projectType)?.label} · {form.waste || 0}% waste included</p>
            </div>
            <div className="tk-total">
              <span className="tk-total-label">Material total</span>
              <span className="tk-total-value">{fmtMoney(result.total)}</span>
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

          <div className="tk-table-wrap">
            <table className="tk-table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th className="num">Qty</th>
                  <th className="num">Unit price</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r) =>
                <tr key={r.key}>
                    <td>{r.item}</td>
                    <td className="num"><b>{tkFmt(r.qty)}</b> <span className="tk-unit-inline">{r.unit}</span></td>
                    <td className="num">
                      <input
                      className="input tk-rate"
                      type="number"
                      min="0"
                      step="0.01"
                      aria-label={`Unit price for ${r.item}`}
                      value={form.rates[r.key] ?? r.rate}
                      onChange={(e) => setRate(r.key, e.target.value)} />
                    </td>
                    <td className="num">{fmtMoney(r.qty * r.rate)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="tk-help">Quantities are rounded up and use common rules of thumb. Prices are editable defaults — confirm with your supplier and local code.</p>

          <div className="tk-actions">
            <button type="button" className="btn" onClick={startNew}>New calculation</button>
            <button type="button" className="btn" onClick={estimateFromCurrent}>
              <Icon name="estimate" size={16} /> Create estimate
            </button>
            <button type="button" className="btn primary" onClick={save}>
              <Icon name="check" size={16} /> {form.id && takeoffs.some((t) => t.id === form.id) ? "Update calculation" : "Save calculation"}
            </button>
          </div>
        </section>
      </div>

      <section className="tk-saved" aria-labelledby="tk-saved-label">
        <div className="section-head">
          <h2 id="tk-saved-label">Saved by project address</h2>
          <span className="meta">{takeoffs.length} calculation{takeoffs.length === 1 ? "" : "s"}</span>
        </div>
        {groups.length === 0 ?
        <div className="tk-card tk-empty">No saved calculations yet. Enter a project address and save a calculation to keep it here.</div> :

        <div className="tk-groups">
            {groups.map((g) =>
          <div key={g.key} className="tk-card tk-group">
                <div className="tk-group-head">
                  <div className="tk-group-title">
                    <h3>{g.address}</h3>
                    <span className="tk-help">{g.items.length} calculation{g.items.length === 1 ? "" : "s"} · {fmtMoney(g.total)} materials</span>
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
                        <span className="tk-item-title">
                          {TK_TRADES[t.trade]?.label || t.trade}
                          {t.name && <span className="tk-item-name"> · {t.name}</span>}
                        </span>
                        <span className="tk-help">
                          {TK_PROJECT_TYPES.find((p) => p.id === t.projectType)?.label || "New build"} · {fmtDate((t.updatedAt || "").slice(0, 10))}
                        </span>
                      </button>
                      <span className="tk-item-total">{fmtMoney(t.total || 0)}</span>
                      <button type="button" className="iconbtn tk-danger" title="Delete calculation" aria-label="Delete calculation" onClick={() => removeOne(t)}>
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
    </div>);
}

window.TakeoffsScreen = TakeoffsScreen;
window.MartenTakeoffs = { calculate: tkCalculate, trades: TK_TRADES };
