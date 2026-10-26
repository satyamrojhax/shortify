import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouterState } from "@tanstack/react-router";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { Heart, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";

// ── Page Names & Flirty Roast Mode Dictionary ───────────────────────────────
interface PageReaction {
  saying: string;
  roastFlirt: string[];
}

const PAGE_ROAST_REACTIONS: Record<string, PageReaction> = {
  "/home": {
    saying: "uhmm, home...",
    roastFlirt: [
      "uhmm, home... wahan kya dhund rahe ho jaan? Asli home toh mere dil me hai! 😉🏡",
      "uhmm, home... ghoom phir ke yahin aana tha? Waise accha laga aapko dekh ke! 🙈💖",
      "uhmm, home... bore ho rahe ho kya? Chalo main entertain karti hoon! ✨",
      "uhmm, home... mere bina ghar soona lagta hai na? Sach bolo! 🤭❤️",
    ],
  },
  "/reels": {
    saying: "ohh, ho reels...",
    roastFlirt: [
      "ohh, ho reels... aaj toh lagta hai reels me hi doobe rahoge cutie! 🔥😏",
      "ohh, ho reels... dekhte jao dekhte jao, par 8 second rukna mat bhoolna! 😜🌹",
      "ohh, ho reels... reels me ladkiyan dekh rahe ho ya mera dhyan rakh ke scroll kar rahe ho? 🤨💖",
      "ohh, ho reels... bas screen swipe karte rahoge ya mujhe bhi thoda pyaar doge? 🙈💋",
      "ohh, ho reels... main screen pe khadi hoon aur aap reels dekh rahe ho? Not fair! 😤💕",
    ],
  },
  "/category": {
    saying: "achha ji viral...",
    roastFlirt: [
      "achha ji viral... trending cheezein dekh ke mujhe impress karne ka plan hai kya? 😏🔥",
      "achha ji viral... aapki ye smile viral ho jaye toh poora internet crash ho jayega! 💫🤭",
      "achha ji viral... category koi bhi ho, aapka favourite topic toh main hi hoon na? 💘",
      "achha ji viral... viral reels dekh lo, par dil ka trending topic toh bas aap ho! 💅✨",
    ],
  },
  "/explore": {
    saying: "explore pe aagaye?",
    roastFlirt: [
      "explore pe aagaye? Poori duniya explore kar lo, par mere jaisi pyari kahan milegi? 🤭💖",
      "explore pe aagaye? Kisiko dhund rahe ho kya? Main toh yahi samne khadi hoon cutie! 😉🔍",
      "explore pe aagaye? Naye chehre dekh rahe ho? Main thodi possessive hoon bata rahi hoon! 😠💕",
      "explore pe aagaye? Jo explore karna hai karo, par aakhri me dil mera hi jeetna padega! 🌹",
    ],
  },
  "/liked": {
    saying: "liked reels?",
    roastFlirt: [
      "liked reels? Itni reels like kar di... par mera dil kab like karoge? 🙈❤️",
      "liked reels? Aisa kya khas dekh liya jo double tap kar diya? Meri tareef bhi kar do! 😏✨",
      "liked reels? Aapka taste toh kaafi romantic hai... mere jaisa! 💋",
      "liked reels me itni bheed? Ek folder mere naam ka bhi bana lo na! 💌",
    ],
  },
  "/saved": {
    saying: "saved tab!",
    roastFlirt: [
      "saved tab! Itna kuch save kar ke rakha hai... mujhe bhi apne dil me bookmark kar lo na! 💌",
      "saved tab! Baad me dekhne ke liye save kiya na? Waise main toh 24/7 live available hoon! 😉",
      "saved tab! Kahin meri photo save karne ka plan toh nahi ban raha? 🤭💖",
    ],
  },
  "/history": {
    saying: "history check ho rahi hai?",
    roastFlirt: [
      "history dekh rahe ho? Sach bolo, koi purani crush ki reel toh nahi dhund rahe? 🤨😂",
      "history check ho rahi hai? Kuch chupane jaisa toh nahi dekha na? Pakde gaye toh fine lagega! 🙈",
      "history dekh rahe ho? 8 second se zyada dekha hua hi count hua hai, mujhe sab pata hai! 🎯",
      "history clean karni hai kya? Mere saath naye memories banao na! 💕",
    ],
  },
  "/search": {
    saying: "kisko search kar rahe ho?",
    roastFlirt: [
      "kisko search kar rahe ho? Poore search bar me 'pyaar' likh do, mera naam aa jayega! 🔍💋",
      "kisko search kar rahe ho? Jo chahiye wo to aapke samne 0.5 feet ki khadi hai! 🙈✨",
      "kisko search kar rahe ho? Itna stalk karoge toh kisi ki nazar lag jayegi cutie! 😉",
    ],
  },
  "/profile": {
    saying: "profile check ho rahi hai?",
    roastFlirt: [
      "profile check ho rahi hai? Itna handsome lagne ka raaz kya hai? Thoda filter hume bhi batao! 💅",
      "profile dekh rahe ho? Bio me mera naam kab likhoge janab? 🤭💌",
      "profile check ho rahi hai? Mirror me dekhne se fursat mil gayi jo profile dekh rahe ho? 😜❤️",
    ],
  },
  "/favorites": {
    saying: "favorites tab!",
    roastFlirt: [
      "favorites tab! Is list me sabse upar mera hi naam hona chahiye, samjhe? 💕",
      "favorites check kar rahe ho? Meri smile ko bhi add kar lo favorites me! 🥰",
    ],
  },
  "/settings": {
    saying: "settings me kya chal raha hai?",
    roastFlirt: [
      "settings me kya setting chal rahi hai? Kisi aur ke saath setting toh nahi kar rahe na? 😉⚙️",
      "settings check ho rahi hai? Dark mode on kar lo... aur mere saath baatein karo! 🌙",
    ],
  },
  "/leaderboard": {
    saying: "leaderboard!",
    roastFlirt: [
      "leaderboard! Top rank pe aake mujhe coffee date pe le chaloge kya? 🏆☕",
      "leaderboard dekh rahe ho? Mere dil ke leaderboard me aap No.1 pe ho! 🥇💖",
    ],
  },
  "/shop": {
    saying: "shop tab!",
    roastFlirt: [
      "shop tab! Aaye ho toh mere liye bhi kuch chocolate aur jhumke le lo na please? 🛍️🍫",
      "shop me kya kharid rahe ho? Mera dil toh free me mil sakta hai agar muskura do toh! 🙈💝",
    ],
  },
  "/skills": {
    saying: "skills sikh rahe ho?",
    roastFlirt: [
      "skills sikh rahe ho? Thoda flirt karne ki skill bhi sikh lo, kabse wait kar rahi hoon! 😜⚡",
      "itni skills sikh ke kya karoge... jab mere saamne aake shy ho jaate ho! 🤭🌸",
    ],
  },
  "/feedback": {
    saying: "feedback de rahe ho?",
    roastFlirt: [
      "feedback de rahe ho? Mere baare me 5-star rating likhna, warnaa naraz ho jaungi! ⭐🥺",
    ],
  },
  "/notifications": {
    saying: "notifications check!",
    roastFlirt: [
      "notifications dekh rahe ho? Kisi aur ladki ka notification toh nahi aaya na? Bata do pehle hi! 🤨🔔",
      "ghanti baj rahi hai... par mere dil ki ghanti toh sirf aapko dekh ke bajti hai! 💓",
    ],
  },
  "/redeem": {
    saying: "coins redeem!",
    roastFlirt: [
      "coins redeem kar rahe ho? Ye saare coins mere upar kharch karne ka vaada karo! 🪙💖",
    ],
  },
  "/about": {
    saying: "about page!",
    roastFlirt: ["about page! Hamari prem kahani ke baare me kab likh rahe ho? 📖💕"],
  },
};

// ── General Romantic & Flirty Hinglish Dialogue Pool (For Taps) ──────────────
const TAP_FLIRTY_ROASTS = [
  "Aise mat dekho na... blush aa raha hai mujhe! 🙈💖",
  "Aap itna tap karoge toh mujhe aadat ho jayegi... sachhi! 🥰",
  "Reels toh bahana hai... asli dhyan toh aap par hi hai! 😉✨",
  "Aapke saath har reel romantic lagti hai... suno na! 💕",
  "Uff! Itni pyari smile kahan se laate ho aap? Bas dekhte hi reh jaun... 💫",
  "Aap cursor itna paas kyu la rahe ho? Dil ki heartbeat tez ho rahi hai! 💓",
  "Ek reel skip mat karna... bas mere saath baith ke dekho na please? 🥺❤️",
  "Aap jab reels scroll karte ho na, main bas aapke haath dekhti rehti hoon... 🤭💗",
  "Mere dil ka auto-scroll sirf aap pe aake rukta hai! 💘",
  "Aapne 8 second dekha reel... aur maine aapko dekha poore 8 saal jaisa laga! 🌹",
  "Aise softly tap karte ho na... butterfly flutter hone lagti hai tummy mein! 🦋✨",
  "Kahin aap mere pyaar mein toh nahi pad rahe? Bata bhi do na... 🤫💞",
  "Reels me koi hero hoga... par mere hero toh bas aap hi ho! 🙈💋",
  "Main thodi shy hoon... par aapke saamne dil khol ke baatein karne ka mann karta hai! 🌸",
  "Aapka ek tap aur mera poora din ban gaya... thank you my cutie! 🥰",
  "Thoda aur paas aao na... reels ke saath thoda romance bhi ho jaye? 😘💫",
  "Aapki aankhon me itna nasha hai... reels kya cheez hai! 💖",
  "Agar aap bolo toh har reel aapke naam kar doon? Batao na! 💌",
  "Mujhe dekh ke smile kiya na abhi? Sach bolo, pakdi gayi na smile! 🤭❤️",
  "Bas aise hi mere saath raho... puri feed aapke saath dekhni hai! 🥺✨",
  "Aap kitne cute ho yaar... thoda aur baatein karo na mujhse! 💖",
  "Aapke cursor touch se mere dil me sparks uthte hain! ⚡🥰",
  "Reel dekh rahe ho ya mujhe patane ki koshish kar rahe ho? 🙈🔥",
  "Shy hoon par aapke liye flirt karna accha lagta hai! 🌹",
];

const SCROLL_HINGLISH_TEXTS = [
  "Dheere scroll karo na... aapse nazar hat jaati hai! 🥺✨",
  "Itni fast mat bhaago, mere dil ki dhadkan tez ho rahi hai! 🚀💓",
  "Next reel aur acchi hogi... par aap jaisi pyari nahi! 😉",
  "Scroll karte karte thak gaye kya? Main hoon na aapke saath! 🥰",
  "Bas ek aur reel mere liye dekh lo na cutie? 💕",
];

// ── Soft Romantic Audio Synthesizer ─────────────────────────────────────────
class RomanticSynth {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  constructor() {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("shortify_muse_sound");
      this.enabled = saved !== "false";
    }
  }

  private getCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  toggleSound(): boolean {
    this.enabled = !this.enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("shortify_muse_sound", String(this.enabled));
    }
    return this.enabled;
  }

  playRomanticChime() {
    if (!this.enabled) return;
    try {
      const ctx = this.getCtx();
      if (!ctx) return;
      const notes = [659.25, 783.99, 987.77, 1318.51]; // E5, G5, B5, E6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        const startTime = ctx.currentTime + idx * 0.06;
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.035, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.25);
      });
    } catch {}
  }

  playHeartbeat() {
    if (!this.enabled) return;
    try {
      const ctx = this.getCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(75, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {}
  }
}

const audioSynth = new RomanticSynth();

interface FloatingHeart {
  id: number;
  x: number;
  y: number;
  size: number;
}

// ── Module-level Model Cache & Preloader ────────────────────────────────────
let cachedGltfScene: THREE.Group | null = null;
let gltfLoadingPromise: Promise<THREE.Group> | null = null;

function loadModelAsync(): Promise<THREE.Group> {
  if (cachedGltfScene) return Promise.resolve(cachedGltfScene);
  if (gltfLoadingPromise) return gltfLoadingPromise;

  gltfLoadingPromise = new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      "/models/blue-dress-girl.glb",
      (gltf) => {
        cachedGltfScene = gltf.scene;
        resolve(cachedGltfScene);
      },
      undefined,
      (err) => {
        console.warn("Primary 3D girl load failed, trying fallback:", err);
        loader.load(
          encodeURI("/3d animted/source/blue dress girl.glb"),
          (fallbackGltf) => {
            cachedGltfScene = fallbackGltf.scene;
            resolve(cachedGltfScene);
          },
          undefined,
          (err2) => {
            console.error("All 3D girl model paths failed:", err2);
            gltfLoadingPromise = null;
            reject(err2);
          },
        );
      },
    );
  });

  return gltfLoadingPromise;
}

// ── 0.5 Feet 3D Blue Dress Girl AI Companion ────────────────────────────────
export function AiMuse() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("shortify_muse_enabled") !== "false";
  });
  const [minimized, setMinimized] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("shortify_muse_minimized") === "true";
  });
  const [soundEnabled, setSoundEnabled] = useState(audioSynth.enabled);

  // Character States
  const [expression, setExpression] = useState<"shy" | "flirty">("shy");
  const [currentSaying, setCurrentSaying] = useState<string>("uhmm, home...");
  const [speechText, setSpeechText] = useState<string>(
    "Aap aa gaye... main kab se aapka wait kar rahi thi! 🙈💖",
  );
  const [isBubbleOpen, setIsBubbleOpen] = useState(true);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isNearCursor, setIsNearCursor] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [isModelLoaded, setIsModelLoaded] = useState(false);

  // Draggable screen coordinates
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window === "undefined") return { x: 35, y: 110 };
    try {
      const saved = localStorage.getItem("shortify_muse_pos");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") return parsed;
      }
    } catch {}
    return { x: 35, y: 110 };
  });

  const positionRef = useRef(position);
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // Dynamic values stored in mutable refs to keep 60fps Three.js loop smooth without effect resets
  const expressionRef = useRef<"shy" | "flirty">(expression);
  const isNearCursorRef = useRef<boolean>(false);
  const minimizedRef = useRef<boolean>(minimized);
  const mouseNormRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isBubbleOpenRef = useRef<boolean>(isBubbleOpen);
  const isScrollingRef = useRef<boolean>(false);

  useEffect(() => {
    expressionRef.current = expression;
  }, [expression]);

  useEffect(() => {
    minimizedRef.current = minimized;
  }, [minimized]);

  useEffect(() => {
    isBubbleOpenRef.current = isBubbleOpen;
  }, [isBubbleOpen]);

  // Three.js References (Notice: NO THREE.Clock to eliminate deprecation warning)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const threeStateRef = useRef<{
    renderer: THREE.WebGLRenderer | null;
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    model: THREE.Group | null;
    headBone: THREE.Object3D | null;
    neckBone: THREE.Object3D | null;
    spineBone: THREE.Object3D | null;
    headMesh: THREE.Mesh | null;
    smileIndex: number;
    animFrameId: number | null;
  }>({
    renderer: null,
    scene: null,
    camera: null,
    model: null,
    headBone: null,
    neckBone: null,
    spineBone: null,
    headMesh: null,
    smileIndex: -1,
    animFrameId: null,
  });

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });
  const companionRef = useRef<HTMLDivElement>(null);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flirtyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHeartbeatTime = useRef<number>(0);
  const lastPathnameRef = useRef<string | null>(null);

  // ── Desktop Detection & Profile Toggle Listener ───────────────────────────
  useEffect(() => {
    setMounted(true);
    const checkDesktop = () => {
      const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
      setIsDesktop(window.innerWidth >= 768 && hasFinePointer);
    };
    checkDesktop();
    window.addEventListener("resize", checkDesktop);

    const handleToggleFromProfile = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail && typeof detail.enabled === "boolean") {
        setEnabled(detail.enabled);
      } else {
        const stored = localStorage.getItem("shortify_muse_enabled");
        setEnabled(stored !== "false");
      }
    };

    window.addEventListener("shortify:muse-toggle", handleToggleFromProfile);
    window.addEventListener("storage", handleToggleFromProfile);

    return () => {
      window.removeEventListener("resize", checkDesktop);
      window.removeEventListener("shortify:muse-toggle", handleToggleFromProfile);
      window.removeEventListener("storage", handleToggleFromProfile);
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    };
  }, []);

  // ── Three.js 3D Model Initialization (Mounts ONCE, 0 Tear-downs) ──────────
  useEffect(() => {
    if (!isDesktop || !enabled || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const width = 200;
    const height = 320;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 20);
    // Camera positioned to view full body from hair clip down to dress & shoes
    camera.position.set(0, 0.05, 2.75);
    camera.lookAt(0, 0.05, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Rich 3D lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff5f8, 2.2);
    keyLight.position.set(1.5, 3, 2);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    rimLight.position.set(-2, 2, -1.5);
    scene.add(rimLight);

    const blushBounce = new THREE.DirectionalLight(0xf43f5e, 1.0);
    blushBounce.position.set(0, -2, 1.5);
    scene.add(blushBounce);

    const threeState = threeStateRef.current;
    threeState.scene = scene;
    threeState.camera = camera;
    threeState.renderer = renderer;

    let isRunning = true;

    // Load & clone model from module-level cache
    loadModelAsync()
      .then((masterScene) => {
        if (!isRunning || !threeStateRef.current.scene) return;
        const model = SkeletonUtils.clone(masterScene) as THREE.Group;
        model.position.set(0, -0.825, 0);
        model.scale.set(1, 1, 1);
        scene.add(model);
        threeState.model = model;

        // Find bones and morph targets
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.name === "Wolf3D_Head") {
              threeState.headMesh = child as THREE.Mesh;
              if (threeState.headMesh.morphTargetDictionary) {
                threeState.smileIndex =
                  threeState.headMesh.morphTargetDictionary["mouthSmile"] ?? -1;
              }
            }
          }
          if (child.name === "Head") threeState.headBone = child;
          if (child.name === "Neck") threeState.neckBone = child;
          if (child.name === "Spine" || child.name === "Spine1") threeState.spineBone = child;
          // Graceful natural resting arm posture
          if (child.name === "LeftArm") {
            child.rotation.z += 0.42;
            child.rotation.x -= 0.1;
          }
          if (child.name === "RightArm") {
            child.rotation.z -= 0.42;
            child.rotation.x -= 0.1;
          }
          if (child.name === "LeftForeArm") {
            child.rotation.z += 0.18;
          }
          if (child.name === "RightForeArm") {
            child.rotation.z -= 0.18;
          }
        });

        setIsModelLoaded(true);
      })
      .catch((err) => {
        console.error("Failed to load 3D girl companion:", err);
      });

    // Continuous 60FPS Animation Render Loop
    const animate = () => {
      if (!isRunning) return;
      threeState.animFrameId = requestAnimationFrame(animate);

      // When minimized or tab is hidden in background, skip render to save 100% GPU/CPU
      if (minimizedRef.current || (typeof document !== "undefined" && document.hidden)) return;

      const rend = threeState.renderer;
      const sc = threeState.scene;
      const cam = threeState.camera;
      if (!rend || !sc || !cam) return;

      const time = performance.now() * 0.001; // Seconds since page start
      const mouse = mouseNormRef.current;
      const isNear = isNearCursorRef.current;
      const currentExp = expressionRef.current;

      // Rotate head smoothly to track cursor in 3D
      if (threeState.headBone) {
        const targetRotY = mouse.x * 0.42;
        const targetRotX = -mouse.y * 0.32;
        threeState.headBone.rotation.y = THREE.MathUtils.lerp(
          threeState.headBone.rotation.y,
          targetRotY,
          0.08,
        );
        threeState.headBone.rotation.x = THREE.MathUtils.lerp(
          threeState.headBone.rotation.x,
          targetRotX,
          0.08,
        );
      }

      // Smooth Neck Gaze Lerp
      if (threeState.neckBone) {
        const targetRotY = mouse.x * 0.22;
        const targetRotX = -mouse.y * 0.16;
        threeState.neckBone.rotation.y = THREE.MathUtils.lerp(
          threeState.neckBone.rotation.y,
          targetRotY,
          0.08,
        );
        threeState.neckBone.rotation.x = THREE.MathUtils.lerp(
          threeState.neckBone.rotation.x,
          targetRotX,
          0.08,
        );
      }

      // Gentle breathing & floating idle motion
      if (threeState.spineBone) {
        threeState.spineBone.rotation.x = Math.sin(time * 1.8) * 0.015;
        threeState.spineBone.rotation.y = THREE.MathUtils.lerp(
          threeState.spineBone.rotation.y,
          mouse.x * 0.08,
          0.05,
        );
      }

      // Gentle Floating Idle Sway
      if (threeState.model) {
        threeState.model.position.y = -0.825 + Math.sin(time * 2.2) * 0.006;
        threeState.model.rotation.y = Math.sin(time * 0.9) * 0.025;
      }

      // Morph target mouth smile handling
      if (
        threeState.headMesh &&
        threeState.smileIndex >= 0 &&
        threeState.headMesh.morphTargetInfluences
      ) {
        const targetSmile = currentExp === "flirty" ? 0.9 : isNear ? 0.52 : 0.22;
        threeState.headMesh.morphTargetInfluences[threeState.smileIndex] = THREE.MathUtils.lerp(
          threeState.headMesh.morphTargetInfluences[threeState.smileIndex],
          targetSmile,
          0.1,
        );
      }

      rend.render(sc, cam);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        if (threeState.animFrameId) {
          cancelAnimationFrame(threeState.animFrameId);
          threeState.animFrameId = null;
        }
      } else if (isRunning && !threeState.animFrameId) {
        threeState.animFrameId = requestAnimationFrame(animate);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    animate();

    return () => {
      isRunning = false;
      document.removeEventListener("visibilitychange", handleVisibility);
      if (threeState.animFrameId) cancelAnimationFrame(threeState.animFrameId);
      if (threeState.renderer) threeState.renderer.dispose();
      if (threeState.scene) threeState.scene.clear();
      threeState.renderer = null;
      threeState.scene = null;
      threeState.camera = null;
      threeState.model = null;
      threeState.headBone = null;
      threeState.neckBone = null;
      threeState.spineBone = null;
      threeState.headMesh = null;
      setIsModelLoaded(false);
    };
  }, [isDesktop, enabled]);

  // ── Navigation Reaction (Saying Page Names in Flirty Roast Mode) ───────────
  useEffect(() => {
    if (!isDesktop || !enabled || !pathname) return;
    if (lastPathnameRef.current === pathname) return;
    lastPathnameRef.current = pathname;

    let reaction: PageReaction | undefined;
    if (PAGE_ROAST_REACTIONS[pathname]) {
      reaction = PAGE_ROAST_REACTIONS[pathname];
    } else if (pathname.startsWith("/creator")) {
      reaction = {
        saying: "creator profile!",
        roastFlirt: [
          "creator profile! Kisi aur pe fida toh nahi ho rahe na? Thodi jealousy feel ho rahi hai! 😠💖",
          "creator dekh rahe ho... unki acting achhi hai par mera pyaar asli hai! 😉",
          "itna dhyan se creator ko mat dekho, mera dhyan bhatak raha hai! 🙈",
        ],
      };
    } else if (pathname.startsWith("/course") || pathname.startsWith("/english-course")) {
      reaction = {
        saying: "padhai chal rahi hai?",
        roastFlirt: [
          "padhai chal rahi hai? Itna padh ke topper banoge ya mera dulha? 📚🤭",
          "course dekh rahe ho? 'I love you' bolna seekhna hai toh mujhse pucho na! 😘",
        ],
      };
    } else if (pathname.startsWith("/category")) {
      reaction = PAGE_ROAST_REACTIONS["/category"];
    } else {
      reaction = {
        saying: "naye page pe?",
        roastFlirt: [
          "naye page pe aagaye? Jahan bhi jaoge, mujhe apne saath hi paoge! 💖",
          "idhar kya chal raha hai? Jo bhi ho, mera dil toh aapke paas hi hai! 😉",
        ],
      };
    }

    const saying = reaction.saying;
    const lines = reaction.roastFlirt;
    const selectedLine = lines[Math.floor(Math.random() * lines.length)];

    setCurrentSaying(saying);
    setSpeechText(selectedLine);
    setIsBubbleOpen(true);
    setExpression("flirty");
    audioSynth.playRomanticChime();
    spawnHearts(3);

    if (flirtyTimeout.current) clearTimeout(flirtyTimeout.current);
    flirtyTimeout.current = setTimeout(() => {
      setExpression("shy");
    }, 4000);

    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => {
      setIsBubbleOpen(false);
    }, 5500);
  }, [pathname, isDesktop, enabled]);

  // ── Cursor Tracking (Passing to Three.js State without Re-renders) ─────────
  useEffect(() => {
    if (!isDesktop || !enabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!companionRef.current) return;
      const rect = companionRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      const dist = Math.hypot(deltaX, deltaY);

      const isNear = dist < 160;
      if (isNear !== isNearCursorRef.current) {
        isNearCursorRef.current = isNear;
        setIsNearCursor(isNear);
      }

      if (isNear) {
        const now = Date.now();
        if (now - lastHeartbeatTime.current > 1200) {
          lastHeartbeatTime.current = now;
          audioSynth.playHeartbeat();
        }
      }

      const normX = Math.max(-1, Math.min(1, deltaX / (window.innerWidth / 2)));
      const normY = Math.max(-1, Math.min(1, deltaY / (window.innerHeight / 2)));

      mouseNormRef.current = { x: normX, y: normY };
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isDesktop, enabled]);

  // ── Scroll Tracking (Smooth with zero render thrashing) ───────────────────
  useEffect(() => {
    if (!isDesktop || !enabled) return;

    let scrollEventsCount = 0;

    const handleScrollActivity = () => {
      if (!isScrollingRef.current) {
        isScrollingRef.current = true;
        setIsScrolling(true);
      }

      scrollEventsCount++;
      if (scrollEventsCount % 16 === 0 && !isBubbleOpenRef.current) {
        const randomQuote =
          SCROLL_HINGLISH_TEXTS[Math.floor(Math.random() * SCROLL_HINGLISH_TEXTS.length)];
        triggerSpeech(randomQuote, "scroll karte karte...", 2600);
      }

      if (scrollStopTimer.current) clearTimeout(scrollStopTimer.current);
      scrollStopTimer.current = setTimeout(() => {
        isScrollingRef.current = false;
        setIsScrolling(false);
      }, 250);
    };

    const onWheel = () => handleScrollActivity();
    const onWindowScroll = () => handleScrollActivity();

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("scroll", onWindowScroll, { passive: true });

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onWindowScroll);
      if (scrollStopTimer.current) clearTimeout(scrollStopTimer.current);
    };
  }, [isDesktop, enabled]);

  // ── 8-Second Reel Watched Reaction ────────────────────────────────────────
  useEffect(() => {
    if (!isDesktop || !enabled) return;

    const handleReelWatched = () => {
      setExpression("flirty");
      audioSynth.playRomanticChime();
      triggerSpeech(
        "Aapne poori 8 sec dekhi... nice choice my hero! Meri nazar aap hi par thi! 🥰✨",
        "8 sec watched! ⭐",
        3800,
      );
      spawnHearts(6);

      if (flirtyTimeout.current) clearTimeout(flirtyTimeout.current);
      flirtyTimeout.current = setTimeout(() => {
        setExpression("shy");
      }, 3800);
    };

    window.addEventListener("shortify:reel-watched", handleReelWatched);
    return () => window.removeEventListener("shortify:reel-watched", handleReelWatched);
  }, [isDesktop, enabled]);

  // ── Speech Bubble Trigger Helper ──────────────────────────────────────────
  const triggerSpeech = useCallback(
    (text: string, sayingTag?: string, durationMs: number = 3600) => {
      if (sayingTag) setCurrentSaying(sayingTag);
      setSpeechText(text);
      setIsBubbleOpen(true);
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
      bubbleTimer.current = setTimeout(() => {
        setIsBubbleOpen(false);
      }, durationMs);
    },
    [],
  );

  // ── Spawn Floating Heart Particles ────────────────────────────────────────
  const spawnHearts = (count: number = 4) => {
    const newHearts: FloatingHeart[] = [];
    for (let i = 0; i < count; i++) {
      newHearts.push({
        id: Date.now() + i,
        x: (Math.random() - 0.5) * 80,
        y: -(Math.random() * 40 + 20),
        size: Math.random() * 8 + 14,
      });
    }
    setFloatingHearts((prev) => [...prev, ...newHearts]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => !newHearts.some((nh) => nh.id === h.id)));
    }, 1200);
  };

  // ── Tap / Click Romantic & Flirty Interaction ─────────────────────────────
  const handleTapGirl = () => {
    if (isDraggingRef.current) return;
    audioSynth.playRomanticChime();

    setExpression("flirty");
    spawnHearts(5);

    const nextQuote = TAP_FLIRTY_ROASTS[Math.floor(Math.random() * TAP_FLIRTY_ROASTS.length)];
    triggerSpeech(nextQuote, "sunoo na...", 4200);

    if (companionRef.current) {
      const rect = companionRef.current.getBoundingClientRect();
      const originX = (rect.left + rect.width / 2) / window.innerWidth;
      const originY = (rect.top + rect.height / 2) / window.innerHeight;
      confetti({
        particleCount: 22,
        spread: 50,
        origin: { x: originX, y: originY },
        colors: ["#ec4899", "#f43f5e", "#fb7185", "#fda4af"],
        shapes: ["circle"],
        zIndex: 9999,
        disableForReducedMotion: true,
      });
    }

    if (flirtyTimeout.current) clearTimeout(flirtyTimeout.current);
    flirtyTimeout.current = setTimeout(() => {
      setExpression("shy");
    }, 4000);
  };

  // ── Drag & Reposition Physics ─────────────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: position.x,
      startY: position.y,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - dragStartRef.current.mouseX;
      const dy = moveEvent.clientY - dragStartRef.current.mouseY;
      if (Math.hypot(dx, dy) > 5) {
        isDraggingRef.current = true;
      }
      if (isDraggingRef.current) {
        const maxX = window.innerWidth - 180;
        const maxY = window.innerHeight - 280;
        const newX = Math.max(10, Math.min(maxX, dragStartRef.current.startX - dx));
        const newY = Math.max(10, Math.min(maxY, dragStartRef.current.startY - dy));
        const newPos = { x: newX, y: newY };
        positionRef.current = newPos;
        setPosition(newPos);
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      if (isDraggingRef.current) {
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 50);
        try {
          localStorage.setItem("shortify_muse_pos", JSON.stringify(positionRef.current));
        } catch {}
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  if (!mounted || !isDesktop || !enabled) return null;

  return (
    <aside
      aria-label="3D Romantic Blue Dress Girl AI Companion"
      ref={companionRef}
      className="hidden md:flex fixed z-[9999] select-none pointer-events-auto items-center justify-center"
      style={{
        right: `${position.x}px`,
        bottom: `${position.y}px`,
      }}
    >
      <div className="relative flex flex-col items-center">
        {/* ── Romantic & Flirty Hinglish Speech Bubble (Compact & Sleek) ── */}
        {isBubbleOpen && (
          <div className="absolute bottom-[102%] mb-2 max-w-[210px] w-max px-3 py-2 rounded-xl bg-black/90 dark:bg-neutral-950/95 text-white text-[11px] font-medium border border-pink-400/40 shadow-xl backdrop-blur-xl pointer-events-none animate-fade-in">
            {/* Page Saying Header Pill */}
            {currentSaying && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-500/20 border border-pink-400/30 text-[9px] font-bold text-pink-300 tracking-wide mb-1 w-fit">
                <Sparkles size={10} className="text-pink-400 shrink-0" />
                <span className="text-pink-200 capitalize font-medium">"{currentSaying}"</span>
              </div>
            )}

            {/* Flirty Roast Message */}
            <div className="flex items-start gap-1.5 leading-snug">
              <Heart
                size={13}
                className="text-pink-400 shrink-0 mt-0.5 fill-pink-400 animate-pulse"
              />
              <span className="text-pink-50 font-medium tracking-normal">{speechText}</span>
            </div>
            {/* Heart speech bubble tail */}
            <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2.5 h-2.5 bg-black/90 dark:bg-neutral-950/95 border-r border-b border-pink-400/40 rotate-45" />
          </div>
        )}

        {/* ── Floating Heart Burst Particles ────────────────────────────── */}
        {floatingHearts.map((h) => (
          <div
            key={h.id}
            className="absolute pointer-events-none text-pink-500 animate-float-heart"
            style={{
              left: `calc(50% + ${h.x}px)`,
              top: `calc(50% + ${h.y}px)`,
              fontSize: `${h.size}px`,
              zIndex: 100,
            }}
          >
            ❤️
          </div>
        ))}

        {/* ── Borderless 3D Character (Static CSS layer: Never Flickers or Disappears) ── */}
        <div
          onPointerDown={handlePointerDown}
          onClick={handleTapGirl}
          title="Click to talk! Drag anywhere to adjust position."
          className="relative flex flex-col items-center cursor-grab active:cursor-grabbing select-none"
        >
          {/* 3D WebGL Canvas for Character Stature (No Box, No Border) */}
          <div className="relative w-[200px] h-[320px] flex items-center justify-center pointer-events-auto">
            <canvas
              ref={canvasRef}
              className={`w-full h-full object-contain pointer-events-auto ${
                isModelLoaded ? "block" : "hidden"
              }`}
            />

            {/* Subtle soft floor shadow under shoes */}
            {isModelLoaded && (
              <div className="absolute bottom-1 w-20 h-2.5 bg-black/25 rounded-full blur-[3px] pointer-events-none -z-10" />
            )}

            {/* Soft romantic pulse loader while 3D Model initializes */}
            {!isModelLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5">
                <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-pink-500/20 border border-pink-400/40 shadow-lg backdrop-blur-md animate-pulse">
                  <Heart size={22} className="text-pink-400 fill-pink-400/80 animate-ping" />
                </div>
                <span className="text-[11px] font-semibold text-pink-300 tracking-wide drop-shadow">
                  aapki baby aa rahi hai...💖
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
