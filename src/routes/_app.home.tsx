import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import {
  Play,
  Compass,
  Heart,
  Settings,
  Sparkles,
  Mic,
  WandSparkles,
  PlaySquare,
  Flame,
  Wrench,
  AudioLines,
} from "lucide-react";

export const Route = createFileRoute("/_app/home")({
  component: HomePage,
});

function HomePage() {
  const { username } = useAuth();

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-10 md:py-16">
      {/* Hero */}
      <section className="relative">
        <p className="font-display text-marker text-xl lowercase italic">welcome back,</p>
        <h1 className="mt-2 font-display text-[48px] leading-[1.02] lowercase text-cocoa md:text-[80px] dark:text-cream break-words">
          hey <span className="break-all">@{username}</span>,<br />
          start <span className="marker-underline">exploring.</span>
        </h1>
        <p className="mt-6 max-w-xl text-[18px] leading-relaxed text-charcoal/80 dark:text-cream/70">
          scroll till your thumb goes numb, or actually level up your life with our skills & speaking courses. tap play, hold to 2x speed, double-tap to like. it's that easy.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link to="/reels" className="btn-pill">
            <PlaySquare className="h-4 w-4" strokeWidth={2.25} />
            watch reels
          </Link>
          <Link to="/category" className="btn-pill">
            <Flame className="h-4 w-4" strokeWidth={2.25} />
            instant reels
          </Link>
          <Link to="/skills" className="btn-pill">
            <Wrench className="h-4 w-4" strokeWidth={2.25} />
            learn skills
          </Link>
          <Link to="/english-course" className="btn-pill">
            <AudioLines className="h-4 w-4" strokeWidth={2.25} />
            speaking
          </Link>
        </div>
      </section>

      {/* Feature cards */}
      <section className="mt-16 grid gap-4 md:grid-cols-3">
        <FeatureCard
          icon={<Sparkles className="h-5 w-5" />}
          title="doomscroll responsibly"
          body="fresh reels curated just to distract you from your responsibilities."
          rotate={-0.6}
        />
        <FeatureCard
          icon={<Wrench className="h-5 w-5" />}
          title="big brain time"
          body="learn english or pick up a new skill. because scrolling for 5 hours straight is a bad look."
          rotate={0.4}
        />
        <FeatureCard
          icon={<Heart className="h-5 w-5" />}
          title="stash the good stuff"
          body="double-tap to like, save it for later. all safe and sound on your device."
          rotate={-0.3}
        />
      </section>

      {/* Footer band */}
      <footer className="mt-20 -mx-6 rounded-t-[56px] bg-marker px-8 py-10 text-cream md:px-16">
        <p className="font-display text-3xl lowercase md:text-4xl">
          that's all for now — go tap something.
        </p>
        <p className="mt-2 text-sm opacity-80">
          Shortify · A Product By{" "}
          <a
            href="https://lfrdcatechnologies.cc.cd"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition"
          >
            LFRDCA Technologies
          </a>
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
  rotate,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  rotate: number;
}) {
  return (
    <div
      className="rounded-2xl border-[1.5px] border-charcoal bg-cream p-6 shadow-subtle dark:border-cream dark:bg-cocoa"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] border-charcoal bg-dew text-charcoal dark:border-cream dark:bg-cocoa dark:text-cream">
        {icon}
      </div>
      <h3 className="mt-4 font-display text-2xl lowercase text-cocoa dark:text-cream">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-charcoal/75 dark:text-cream/70">{body}</p>
    </div>
  );
}
