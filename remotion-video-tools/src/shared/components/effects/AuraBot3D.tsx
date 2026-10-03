import { random, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { withDefaults } from "./media";

/**
 * AuraBot3D — объёмный робот-маскот Aura Robotics, перенос 3D-маскота сайта
 * (aura-robotics.ru, /js/aura-mascot.js, three.js) в Remotion без новых
 * зависимостей: та же скелетная модель из боксов, цилиндров и сфер с теми же
 * координатами, та же камера (fov 30, точка (0.9, 2.1, 9.6), взгляд на
 * (0, 1.62, 0)), тот же свет и те же жесты. Рендер — свой маленький
 * 3D-движок в SVG: вершины проходят через иерархию матриц, грани красятся
 * плоским ламбертом с бликом, сортируются по глубине и рисуются полигонами.
 * Всё считается от номера кадра, случайность — random(seed): рендер
 * воспроизводим, зависимостей нет.
 *
 * Жесты как у сайта: wave, nod, scan, point, shrug, jump (длины — DUR), плюс
 * push — толкает обеими руками (для карточек, которые робот выдвигает).
 * Дополнительно: `walk` (0…1) — шаг ногами и руками, когда робот идёт по
 * кадру; `facing` — поворот корпуса вокруг вертикали, градусы; `look`/`lookY`
 * — куда смотрит голова.
 */
export const auraBot3DGestureSchema = z.enum(["wave", "nod", "scan", "point", "shrug", "jump", "push"]);
export type AuraBot3DGesture = z.infer<typeof auraBot3DGestureSchema>;

export const auraBot3DSchema = z.object({
  gestures: z.array(z.object({ at: z.number().int().min(0), kind: auraBot3DGestureSchema })),
  look: z.number().min(-1.6).max(1.6).describe("Поворот головы: −1 влево, 1 вправо"),
  lookY: z.number().min(-1.2).max(1.2).describe("Наклон головы: −1 вверх, 1 вниз"),
  facing: z.number().describe("Поворот корпуса вокруг вертикали, градусы"),
  walk: z.number().min(0).max(1).describe("Шаг: 0 стоит, 1 идёт"),
  light: z.string(),
  dark: z.string(),
  accent: z.string(),
  seed: z.number(),
  shadow: z.boolean(),
  jumpHeight: z.number().min(0).max(2).describe("Высота прыжка в единицах модели (рост ≈ 3)"),
  segments: z.number().int().min(6).max(16).describe("Сегментов на цилиндр и сферу"),
  camOrbit: z.number().describe("Орбита камеры вокруг робота, градусы (+ вправо)"),
  camElevation: z.number().describe("Высота камеры, градусы (− снизу, + сверху)"),
  camDistance: z.number().min(0.3).max(3).describe("Расстояние камеры, 1 — как на сайте"),
});
export type AuraBot3DParams = z.infer<typeof auraBot3DSchema>;
type Ramp = { from: number; to: number; frames: number };
export type AuraBot3DProps = Partial<AuraBot3DParams> & {
  style?: React.CSSProperties;
  /** Движение камеры от номера кадра: линейно от from к to за frames кадров (сглаженно). */
  camOrbitFrames?: Ramp;
  camElevationFrames?: Ramp;
  camDistanceFrames?: Ramp;
};

export const auraBot3DDefaults: AuraBot3DParams = {
  gestures: [],
  look: 0,
  lookY: 0,
  facing: 0,
  walk: 0,
  light: "#f8f6f3",
  dark: "#262626",
  accent: "#fff65d",
  seed: 7,
  shadow: true,
  jumpHeight: 1.15,
  segments: 10,
  camOrbit: 0,
  camElevation: 0,
  camDistance: 1,
};

export const AURA_BOT3D_DUR: Record<AuraBot3DGesture, number> = { wave: 2.8, jump: 1.75, nod: 1.4, scan: 3.0, point: 2.2, shrug: 1.8, push: 1.2 };

/* ---------- маленькая линейная алгебра ---------- */
type V3 = [number, number, number];
type M4 = number[]; // 16, row-major

const I4: M4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const mul = (a: M4, b: M4): M4 => {
  const r = new Array(16).fill(0);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) r[i * 4 + j] = a[i * 4] * b[j] + a[i * 4 + 1] * b[4 + j] + a[i * 4 + 2] * b[8 + j] + a[i * 4 + 3] * b[12 + j];
  return r;
};
const T = (x: number, y: number, z: number): M4 => [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1];
const S = (x: number, y: number, z: number): M4 => [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1];
const RX = (a: number): M4 => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1]; };
const RY = (a: number): M4 => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1]; };
const RZ = (a: number): M4 => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; };
const apply = (m: M4, v: V3): V3 => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2] + m[3], m[4] * v[0] + m[5] * v[1] + m[6] * v[2] + m[7], m[8] * v[0] + m[9] * v[1] + m[10] * v[2] + m[11]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp = (a: number, b: number, w: number) => a + (b - a) * w;
const envp = (p: number) => Math.sin(Math.min(Math.max(p, 0), 1) * Math.PI);

/* ---------- геометрия ---------- */
type Mesh = { verts: V3[]; faces: number[][]; mat: string; emissive?: boolean };
type Node = { pos: V3; rot: V3; scale: V3; children: Node[]; meshes: Mesh[] };

const node = (x: number, y: number, z: number, parent?: Node): Node => {
  const n: Node = { pos: [x, y, z], rot: [0, 0, 0], scale: [1, 1, 1], children: [], meshes: [] };
  if (parent) parent.children.push(n);
  return n;
};
const boxGeo = (w: number, h: number, d: number, x: number, y: number, z: number): { verts: V3[]; faces: number[][] } => {
  const hx = w / 2, hy = h / 2, hz = d / 2;
  const verts: V3[] = [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, hy, -hz], [-hx, hy, -hz], [-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]].map((v) => [v[0] + x, v[1] + y, v[2] + z] as V3);
  const faces = [[4, 5, 6, 7], [1, 0, 3, 2], [0, 4, 7, 3], [5, 1, 2, 6], [3, 7, 6, 2], [0, 1, 5, 4]];
  return { verts, faces };
};
const cylGeo = (rt: number, rb: number, h: number, seg: number, x: number, y: number, z: number, rotZ = 0) => {
  const verts: V3[] = [];
  const faces: number[][] = [];
  const c = Math.cos(rotZ), s = Math.sin(rotZ);
  const put = (vx: number, vy: number, vz: number): number => {
    // поворот вокруг Z до переноса (как rotation.z у меша)
    verts.push([x + vx * c - vy * s, y + vx * s + vy * c, z + vz]);
    return verts.length - 1;
  };
  const top: number[] = [], bot: number[] = [];
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    top.push(put(Math.cos(a) * rt, h / 2, Math.sin(a) * rt));
    bot.push(put(Math.cos(a) * rb, -h / 2, Math.sin(a) * rb));
  }
  for (let i = 0; i < seg; i++) {
    const j = (i + 1) % seg;
    faces.push([bot[i], bot[j], top[j], top[i]]);
  }
  faces.push([...top].reverse());
  faces.push(bot);
  return { verts, faces };
};
const sphGeo = (r: number, seg: number, x: number, y: number, z: number) => {
  const rings = Math.max(4, Math.round(seg * 0.6));
  const verts: V3[] = [];
  const faces: number[][] = [];
  for (let i = 0; i <= rings; i++) {
    const phi = (i / rings) * Math.PI;
    for (let j = 0; j < seg; j++) {
      const th = (j / seg) * Math.PI * 2;
      verts.push([x + r * Math.sin(phi) * Math.cos(th), y + r * Math.cos(phi), z + r * Math.sin(phi) * Math.sin(th)]);
    }
  }
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < seg; j++) {
      const a = i * seg + j, b = i * seg + ((j + 1) % seg), c2 = (i + 1) * seg + ((j + 1) % seg), d = (i + 1) * seg + j;
      if (i === 0) faces.push([a, c2, d]);
      else if (i === rings - 1) faces.push([a, b, d]);
      else faces.push([a, b, c2, d]);
    }
  }
  return { verts, faces };
};

type Rig = {
  robot: Node; root: Node; hips: Node; spine: Node; neck: Node; head: Node;
  armL: { sh: Node; el: Node; wr: Node }; armR: { sh: Node; el: Node; wr: Node };
  legL: { hip: Node; kn: Node; an: Node }; legR: { hip: Node; kn: Node; an: Node };
  eye: Node; coreLed: Node; pelvLed: Node;
};

/** Скелет — один в один по aura-mascot.js (координаты в единицах модели). */
const buildRig = (seg: number): Rig => {
  const box = (w: number, h: number, d: number, m: string, x: number, y: number, z: number, p: Node) => { p.meshes.push({ ...boxGeo(w, h, d, x, y, z), mat: m }); };
  const cyl = (a: number, b: number, h: number, m: string, x: number, y: number, z: number, p: Node, rz = 0) => { p.meshes.push({ ...cylGeo(a, b, h, seg, x, y, z, rz), mat: m }); };
  const sph = (r: number, m: string, x: number, y: number, z: number, p: Node, emissive = false): Node => {
    const n = node(x, y, z, p);
    n.meshes.push({ ...sphGeo(r, seg, 0, 0, 0), mat: m, emissive });
    return n;
  };
  const plate = (w: number, h: number, d: number, m: string, x: number, y: number, z: number, p: Node) => { box(w + 0.035, h + 0.035, d * 0.9, "seam", x, y, z - 0.006, p); box(w, h, d, m, x, y, z, p); };
  const vents = (n: number, w: number, h: number, d: number, m: string, x: number, y: number, z: number, st: number, p: Node) => { for (let i = 0; i < n; i++) box(w, h, d, m, x, y + (i - (n - 1) / 2) * st, z, p); };

  const robot = node(0, 0, 0);
  const root = node(0, 0, 0, robot);
  const hips = node(0, 1.72, 0, root);
  plate(0.6, 0.28, 0.42, "navy", 0, 0.05, 0, hips);
  plate(0.5, 0.1, 0.44, "white", 0, 0.2, 0, hips);
  const pelvLed = sph(0.045, "led", 0, 0.05, 0.23, hips, true);
  cyl(0.05, 0.05, 0.3, "metal", 0.34, 0.06, -0.1, hips, 0.25);
  cyl(0.05, 0.05, 0.3, "metal", -0.34, 0.06, -0.1, hips, -0.25);
  const spine = node(0, 0.24, 0, hips);
  plate(0.72, 0.6, 0.42, "navy", 0, 0.34, 0, spine);
  plate(0.54, 0.44, 0.05, "white", 0, 0.4, 0.23, spine);
  plate(0.3, 0.13, 0.04, "red", 0, 0.6, 0.26, spine);
  vents(5, 0.2, 0.022, 0.02, "seam", 0, 0.24, 0.262, 0.038, spine);
  plate(0.74, 0.2, 0.4, "white", 0, 0.7, 0, spine);
  box(0.18, 0.07, 0.42, "red", 0, 0.79, 0, spine);
  const coreLed = sph(0.05, "eye", 0, 0.5, 0.27, spine, true);
  const neck = node(0, 0.88, 0, spine);
  cyl(0.1, 0.115, 0.16, "joint", 0, 0, 0, neck);
  const head = node(0, 0.1, 0, neck);
  sph(0.265, "white", 0, 0.14, 0, head);
  box(0.3, 0.05, 0.28, "seam", 0, 0.14, 0.02, head);
  plate(0.26, 0.09, 0.05, "red", 0, 0.33, 0.13, head);
  const visor = node(0, 0.1, 0.2, head);
  visor.rot = [-0.13, 0, 0];
  box(0.36, 0.21, 0.11, "visor", 0, 0, 0, visor);
  const eye = sph(0.05, "eye", 0.085, 0.11, 0.265, head, true);
  box(0.055, 0.15, 0.06, "navy", -0.255, 0.12, 0.05, head);
  box(0.055, 0.15, 0.06, "navy", 0.255, 0.12, 0.05, head);
  const makeArm = (s: number) => {
    const sh = node(s * 0.54, 0.64, 0, spine);
    sph(0.145, "joint", 0, 0, 0, sh);
    plate(0.24, 0.22, 0.26, "white", s * 0.055, 0.02, 0, sh);
    plate(0.18, 0.44, 0.2, "white", 0, -0.3, 0, sh);
    box(0.09, 0.18, 0.09, "red", s * 0.095, -0.24, 0, sh);
    const el = node(0, -0.55, 0, sh);
    sph(0.1, "joint", 0, 0, 0, el);
    plate(0.155, 0.4, 0.16, "navy", 0, -0.25, 0, el);
    const wr = node(0, -0.49, 0, el);
    box(0.13, 0.17, 0.12, "rubber", 0, -0.1, 0, wr);
    box(0.045, 0.12, 0.1, "rubber", s * 0.075, -0.12, 0.02, wr);
    return { sh, el, wr };
  };
  const armL = makeArm(-1), armR = makeArm(1);
  const makeLeg = (s: number) => {
    const hip = node(s * 0.19, 0, 0, hips);
    sph(0.15, "joint", 0, 0, 0, hip);
    plate(0.25, 0.54, 0.27, "white", 0, -0.34, 0, hip);
    box(0.09, 0.28, 0.04, "red", s * 0.135, -0.34, 0.02, hip);
    cyl(0.035, 0.035, 0.4, "metal", 0, -0.3, -0.155, hip);
    const kn = node(0, -0.64, 0, hip);
    sph(0.12, "joint", 0, 0, 0, kn);
    plate(0.15, 0.17, 0.09, "navy", 0, 0, 0.135, kn);
    plate(0.21, 0.54, 0.23, "navy", 0, -0.34, 0, kn);
    const an = node(0, -0.64, 0, kn);
    sph(0.085, "joint", 0, 0, 0, an);
    plate(0.23, 0.11, 0.44, "white", 0, -0.09, 0.07, an);
    box(0.24, 0.05, 0.46, "rubber", 0, -0.15, 0.07, an);
    return { hip, kn, an };
  };
  const legL = makeLeg(-1), legR = makeLeg(1);
  return { robot, root, hips, spine, neck, head, armL, armR, legL, legR, eye, coreLed, pelvLed };
};

/* ---------- цвет ---------- */
const hex = (c: string): V3 => {
  const n = parseInt(c.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const toHex = (v: V3) => "#" + v.map((x) => Math.round(Math.min(1, Math.max(0, x)) * 255).toString(16).padStart(2, "0")).join("");

type Poly = { pts: [number, number][]; fill: string; depth: number; glow?: { x: number; y: number; r: number; a: number } };

const ramp = (r: Ramp | undefined, frame: number, fallback: number) => {
  if (!r) return fallback;
  const t = Math.min(1, Math.max(0, frame / Math.max(1, r.frames)));
  const e = t * t * (3 - 2 * t);
  return r.from + (r.to - r.from) * e;
};

export const AuraBot3D: React.FC<AuraBot3DProps> = ({ style, camOrbitFrames, camElevationFrames, camDistanceFrames, ...params }) => {
  const p = withDefaults(auraBot3DDefaults, params);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const rig = buildRig(p.segments);

  // ——— активный жест ———
  let act: AuraBot3DGesture | null = null;
  let prog = 0;
  for (const g of p.gestures) {
    const el = (frame - g.at) / fps;
    if (el >= 0 && el < AURA_BOT3D_DUR[g.kind]) { act = g.kind; prog = el / AURA_BOT3D_DUR[g.kind]; }
  }
  const e = act ? envp(prog) : 0;

  // ——— покой: как tick() у сайта ———
  const { head, spine, hips, root, armL, armR, legL, legR, eye } = rig;
  const REST = { shZ: 0.13, elX: -0.18 };
  const yaw = p.look * 0.62;
  const pit = p.lookY * 0.3;
  const servo = Math.sin(t * 23.7) * 0.0035 + Math.sin(t * 17.1) * 0.0028;
  head.rot = [pit, yaw + servo, 0];
  spine.rot = [0, yaw * 0.3, 0];
  hips.rot = [0, yaw * 0.1, 0];
  const sway = Math.sin(t * 0.58);
  armR.sh.rot = [-sway * 0.085, 0, REST.shZ];
  armL.sh.rot = [sway * 0.085, 0, -REST.shZ];
  armR.el.rot = [REST.elX - sway * 0.05, 0, 0];
  armL.el.rot = [REST.elX + sway * 0.05, 0, 0];
  hips.pos = [sway * 0.032, 1.72 + Math.sin(t * 1.5) * 0.02, 0];
  spine.rot[2] = Math.sin(t * 0.58 + 0.5) * 0.024;
  spine.scale = [1, 1 + Math.sin(t * 1.5) * 0.009, 1];
  const coreGlow = 0.6 + Math.sin(t * 2.1) * 0.25;
  const pelvGlow = 0.5 + Math.sin(t * 1.3 + 1) * 0.2;
  // моргание и саккады по расписанию от seed
  let blink = false;
  for (let k = 0, tb = 0; tb < t + 1 && k < 400; k++) {
    tb += 1.9 + random(`${p.seed}-blink-${k}`) * 3.8;
    if (t >= tb && t < tb + 0.12) blink = true;
  }
  let sacc = 0;
  for (let k = 0, ts = 0; ts < t + 1 && k < 400; k++) {
    const next = ts + 1.2 + random(`${p.seed}-sacc-${k}`) * 2.4;
    if (t >= ts && t < next) sacc = (random(`${p.seed}-saccv-${k}`) - 0.5) * 0.1;
    ts = next;
  }
  eye.pos = [0.085 + sacc, 0.11, 0.265];
  eye.scale = blink ? [1, 0.1, 1] : [1, 1, 1];
  let eyeGlow = 1;

  // ——— ходьба ———
  if (p.walk > 0) {
    const w = p.walk;
    const ph = t * 7.5;
    const sw = Math.sin(ph);
    legR.hip.rot = [sw * 0.5 * w, 0, 0];
    legL.hip.rot = [-sw * 0.5 * w, 0, 0];
    legR.kn.rot = [Math.max(0, -Math.sin(ph - 0.6)) * 0.9 * w, 0, 0];
    legL.kn.rot = [Math.max(0, Math.sin(ph - 0.6)) * 0.9 * w, 0, 0];
    armR.sh.rot = [-sw * 0.45 * w, 0, REST.shZ];
    armL.sh.rot = [sw * 0.45 * w, 0, -REST.shZ];
    hips.pos[1] += Math.abs(Math.cos(ph)) * 0.04 * w;
    spine.rot[0] = 0.06 * w;
  }

  // ——— жесты ———
  const poseWave = (w: number) => {
    const s = Math.sin(t * 8.5);
    armR.sh.rot[2] = lerp(armR.sh.rot[2], 1.98 + s * 0.05, w);
    armR.sh.rot[0] = lerp(armR.sh.rot[0], -0.22, w);
    armR.el.rot[2] = lerp(armR.el.rot[2], 1.05 + s * 0.32, w);
    armR.wr.rot[2] = lerp(armR.wr.rot[2], s * 0.42, w);
    armL.sh.rot[2] = lerp(armL.sh.rot[2], -0.24, w);
    head.rot[2] = lerp(head.rot[2], 0.13, w);
  };
  if (act === "wave") poseWave(e);
  else if (act === "nod") head.rot[0] += Math.sin(prog * Math.PI * 2) * 0.3;
  else if (act === "scan") { head.rot[1] += Math.sin(prog * Math.PI * 2) * 0.95; eyeGlow = 1 + e * 0.8; }
  else if (act === "point") {
    armR.sh.rot[0] = lerp(armR.sh.rot[0], -1.42, e);
    armR.sh.rot[2] = lerp(armR.sh.rot[2], 0.34, e);
    spine.rot[1] += e * 0.18;
    head.rot[1] += e * 0.22;
  } else if (act === "push") {
    // Обе руки вперёд, корпус чуть вперёд: толкает карточку.
    armR.sh.rot[0] = lerp(armR.sh.rot[0], -1.5, e);
    armL.sh.rot[0] = lerp(armL.sh.rot[0], -1.5, e);
    armR.sh.rot[2] = lerp(armR.sh.rot[2], 0.1, e);
    armL.sh.rot[2] = lerp(armL.sh.rot[2], -0.1, e);
    armR.el.rot[0] = lerp(armR.el.rot[0], -0.05, e);
    armL.el.rot[0] = lerp(armL.el.rot[0], -0.05, e);
    spine.rot[0] += e * 0.16;
    head.rot[0] += e * 0.1;
  } else if (act === "shrug") {
    armR.sh.rot[2] = lerp(armR.sh.rot[2], 0.62, e);
    armL.sh.rot[2] = lerp(armL.sh.rot[2], -0.62, e);
    armR.el.rot[0] = lerp(armR.el.rot[0], -0.95, e);
    armL.el.rot[0] = lerp(armL.el.rot[0], -0.95, e);
    head.rot[0] += e * 0.12;
  } else if (act === "jump") {
    let crouch = 0, air = 0, tuck = 0, armX = 0, spread = 0, k = 0;
    const pr = prog;
    if (pr < 0.2) { k = pr / 0.2; k *= k; crouch = k; armX = k * 0.95; }
    else if (pr < 0.32) { k = (pr - 0.2) / 0.12; crouch = 1 - k * 1.35; armX = 0.95 - k * 3.1; }
    else if (pr < 0.76) { k = (pr - 0.32) / 0.44; air = Math.sin(k * Math.PI); tuck = air * 1.05; armX = -2.15 + k * 0.3; spread = air * 0.3; }
    else if (pr < 0.9) { k = (pr - 0.76) / 0.14; crouch = Math.sin(k * Math.PI) * 1.25; armX = -0.85 * (1 - k) + k * 0.3; spread = 0.35 * Math.sin(k * Math.PI); }
    else { k = (pr - 0.9) / 0.1; crouch = 0.22 * (1 - k) * Math.cos(k * Math.PI * 2); armX = 0.3 * (1 - k); }
    const a = Math.max(0, crouch) * 0.62, drop = 1.28 * (1 - Math.cos(a));
    legR.hip.rot = [-a - tuck * 0.85, 0, 0]; legL.hip.rot = [-a - tuck * 0.85, 0, 0];
    legR.kn.rot = [2 * a + tuck * 1.3, 0, 0]; legL.kn.rot = [2 * a + tuck * 1.3, 0, 0];
    legR.an.rot = [-a - tuck * 0.35, 0, 0]; legL.an.rot = [-a - tuck * 0.35, 0, 0];
    root.pos = [0, air * p.jumpHeight - drop + Math.max(0, -crouch) * 0.12, 0];
    const eb = REST.elX * (1 - Math.min(Math.abs(armX) / 2.2, 1));
    armR.sh.rot[0] = armX; armL.sh.rot[0] = armX;
    armR.sh.rot[2] = REST.shZ + spread; armL.sh.rot[2] = -REST.shZ - spread;
    armR.el.rot[0] = eb; armL.el.rot[0] = eb;
    spine.rot[0] = Math.max(0, crouch) * 0.3 - air * 0.1;
    spine.scale[1] = 1 - Math.max(0, crouch) * 0.05 + air * 0.04;
    head.rot[0] += -Math.max(0, crouch) * 0.18 + air * 0.12;
  }
  rig.robot.rot = [0, (p.facing * Math.PI) / 180, 0];

  // ——— камера и свет (как у сайта); орбита, высота и дистанция — поверх базовой точки ———
  const target: V3 = [0, 1.62, 0];
  const base: V3 = [0.9, 2.1 - 1.62, 9.6];
  const baseR = Math.hypot(...base);
  const az0 = Math.atan2(base[0], base[2]);
  const el0 = Math.asin(base[1] / baseR);
  const orbit = ramp(camOrbitFrames, frame, p.camOrbit);
  const elev = ramp(camElevationFrames, frame, p.camElevation);
  const dist = ramp(camDistanceFrames, frame, p.camDistance);
  const az = az0 + (orbit * Math.PI) / 180;
  const el = Math.max(-1.4, Math.min(1.4, el0 + (elev * Math.PI) / 180));
  const rr = baseR * dist;
  const camPos: V3 = [target[0] + rr * Math.sin(az) * Math.cos(el), target[1] + rr * Math.sin(el), target[2] + rr * Math.cos(az) * Math.cos(el)];
  const f = norm(sub(target, camPos));
  const r = norm(cross(f, [0, 1, 0]));
  const u = cross(r, f);
  const fovScale = 1 / Math.tan((30 / 2) * (Math.PI / 180));
  const SIZE = 1000;
  const project = (w: V3): { x: number; y: number; z: number } => {
    const d = sub(w, camPos);
    const vx = dot(d, r), vy = dot(d, u), vz = dot(d, f);
    return { x: SIZE / 2 + ((vx / vz) * fovScale * SIZE) / 2, y: SIZE / 2 - ((vy / vz) * fovScale * SIZE) / 2, z: vz };
  };
  const keyDir = norm([4, 7, 5]);
  const rimDir = norm([-3, 3.5, -4.5]);
  const mats: Record<string, V3> = {
    white: hex(p.light), navy: hex(p.dark), red: hex(p.accent), rubber: hex("#14171b"), metal: hex("#9aa4ae"),
    joint: hex("#2c333b"), seam: hex("#0d1014"), visor: hex("#05070a"), eye: hex(p.accent), led: hex(p.accent),
  };
  const accentV = hex(p.accent);
  const shade = (mat: string, n: V3, center: V3): string => {
    const base = mats[mat];
    const diff = Math.max(0, dot(n, keyDir));
    const sky = 0.5 + 0.5 * n[1];
    const amb = 0.22 + 0.16 * sky;
    const viewDir = norm(sub(camPos, center));
    const half = norm([keyDir[0] + viewDir[0], keyDir[1] + viewDir[1], keyDir[2] + viewDir[2]]);
    const gloss = mat === "white" || mat === "navy" || mat === "red" || mat === "visor" ? 0.55 : mat === "metal" || mat === "joint" ? 0.45 : 0.1;
    const spec = Math.pow(Math.max(0, dot(n, half)), mat === "visor" ? 60 : 24) * gloss;
    const rim = Math.max(0, dot(n, rimDir)) * 0.18;
    const out: V3 = [0, 0, 0];
    for (let i = 0; i < 3; i++) out[i] = base[i] * (amb + 0.85 * diff) + spec + rim * accentV[i];
    return toHex(out);
  };

  // ——— обход иерархии, сбор полигонов ———
  const polys: Poly[] = [];
  const localMatrix = (n: Node): M4 => mul(mul(T(n.pos[0], n.pos[1], n.pos[2]), mul(RX(n.rot[0]), mul(RY(n.rot[1]), RZ(n.rot[2])))), S(n.scale[0], n.scale[1], n.scale[2]));
  const walkNode = (n: Node, parent: M4) => {
    const m = mul(parent, localMatrix(n));
    for (const mesh of n.meshes) {
      const world = mesh.verts.map((v) => apply(m, v));
      if (mesh.emissive) {
        const c = apply(m, [0, 0, 0]);
        const pr = project(c);
        const rad = Math.hypot(...(sub(world[0], c) as V3));
        const rr = ((rad / pr.z) * fovScale * SIZE) / 2;
        const glow = mesh.mat === "eye" ? (n === eye ? eyeGlow : coreGlow) : pelvGlow;
        polys.push({ pts: [], fill: p.accent, depth: pr.z, glow: { x: pr.x, y: pr.y, r: rr * (n === eye ? eye.scale[1] : 1), a: glow } });
        continue;
      }
      for (const face of mesh.faces) {
        const a = world[face[0]], b = world[face[1]], c = world[face[2]];
        const nrm = norm(cross(sub(b, a), sub(c, a)));
        const center: V3 = [0, 0, 0];
        for (const i of face) { center[0] += world[i][0] / face.length; center[1] += world[i][1] / face.length; center[2] += world[i][2] / face.length; }
        if (dot(nrm, sub(center, camPos)) > 0) continue; // обратная грань
        const prs = face.map((i) => project(world[i]));
        polys.push({ pts: prs.map((q) => [q.x, q.y]), fill: shade(mesh.mat, nrm, center), depth: project(center).z });
      }
    }
    for (const ch of n.children) walkNode(ch, m);
  };
  walkNode(rig.robot, I4);
  polys.sort((a, b) => b.depth - a.depth);

  // тень: эллипс на полу под корпусом
  const feet = project(apply(mul(localMatrix(rig.robot), T(0, 0, 0)), [0, 0, 0]));
  const lift = root.pos[1];
  const shadowR = ((0.75 / feet.z) * fovScale * SIZE) / 2 * Math.max(0.55, 1 - lift * 0.35);

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ display: "block", width: "100%", height: "100%", overflow: "visible", ...style }}>
      <defs>
        <radialGradient id="aurabot3d-shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000" stopOpacity={0.36} />
          <stop offset="100%" stopColor="#000" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="aurabot3d-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={p.accent} stopOpacity={0.95} />
          <stop offset="100%" stopColor={p.accent} stopOpacity={0} />
        </radialGradient>
      </defs>
      {p.shadow ? <ellipse cx={feet.x} cy={feet.y} rx={shadowR} ry={shadowR * 0.32} fill="url(#aurabot3d-shadow)" /> : null}
      {polys.map((q, i) =>
        q.glow ? (
          <g key={i}>
            <circle cx={q.glow.x} cy={q.glow.y} r={q.glow.r * 3.2} fill="url(#aurabot3d-glow)" opacity={Math.min(1, q.glow.a * 0.8)} />
            <circle cx={q.glow.x} cy={q.glow.y} r={q.glow.r} fill="#ffffff" />
            <circle cx={q.glow.x} cy={q.glow.y} r={q.glow.r * 0.65} fill={p.accent} />
          </g>
        ) : (
          <polygon key={i} points={q.pts.map((pt) => `${pt[0].toFixed(1)},${pt[1].toFixed(1)}`).join(" ")} fill={q.fill} stroke={q.fill} strokeWidth={0.6} strokeLinejoin="round" />
        ),
      )}
    </svg>
  );
};
