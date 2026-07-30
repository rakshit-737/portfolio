"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Helper for random colors
const randomColors = (count: number) => {
  return new Array(count)
    .fill(0)
    .map(
      () =>
        "#" +
        Math.floor(Math.random() * 16777215)
          .toString(16)
          .padStart(6, "0"),
    );
};

interface TubesCursorApp {
  tubes: {
    setColors: (colors: string[]) => void;
    setLightsColors: (colors: string[]) => void;
  };
}

interface TubesBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  enableClickInteraction?: boolean;
  /**
   * Listen for clicks on the whole window instead of only this element —
   * for use as a fixed site-wide background layer, where page content sits
   * above the canvas and swallows direct clicks.
   */
  globalClickInteraction?: boolean;
}

export function TubesBackground({
  children,
  className,
  enableClickInteraction = true,
  globalClickInteraction = false,
}: TubesBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [, setIsLoaded] = useState(false);
  const tubesRef = useRef<TubesCursorApp | null>(null);

  useEffect(() => {
    let mounted = true;
    let cleanup: (() => void) | undefined;

    const initTubes = async () => {
      if (!canvasRef.current) return;

      try {
        // Locally-installed, lockfile-pinned build of the tubes cursor effect
        // (npm threejs-components@0.0.19) — no remote code loading.
        const module = await import(
          // @ts-expect-error -- package ships no type declarations
          "threejs-components/build/cursors/tubes1.min.js"
        );
        const TubesCursor = module.default;

        if (!mounted) return;

        const app: TubesCursorApp = TubesCursor(canvasRef.current, {
          tubes: {
            colors: ["#f967fb", "#53bc28", "#6958d5"],
            lights: {
              intensity: 200,
              colors: ["#83f36e", "#fe8a2e", "#ff008a", "#60aed5"],
            },
          },
        });

        tubesRef.current = app;
        setIsLoaded(true);

        const handleResize = () => {
          // The library resizes with the window on its own; hook kept for parity.
        };

        window.addEventListener("resize", handleResize);

        cleanup = () => {
          window.removeEventListener("resize", handleResize);
          tubesRef.current = null;
        };
      } catch (error) {
        console.error("Failed to load TubesCursor:", error);
      }
    };

    initTubes();

    return () => {
      mounted = false;
      if (cleanup) cleanup();
    };
  }, []);

  const randomize = () => {
    if (!tubesRef.current) return;

    const colors = randomColors(3);
    const lightsColors = randomColors(4);

    tubesRef.current.tubes.setColors(colors);
    tubesRef.current.tubes.setLightsColors(lightsColors);
  };

  const handleClick = () => {
    if (!enableClickInteraction) return;
    randomize();
  };

  useEffect(() => {
    if (!globalClickInteraction) return;

    const onWindowClick = () => {
      if (!tubesRef.current) return;
      tubesRef.current.tubes.setColors(randomColors(3));
      tubesRef.current.tubes.setLightsColors(randomColors(4));
    };

    window.addEventListener("click", onWindowClick);
    return () => window.removeEventListener("click", onWindowClick);
  }, [globalClickInteraction]);

  return (
    <div
      className={cn(
        "relative w-full h-full min-h-[400px] overflow-hidden bg-background",
        className,
      )}
      onClick={handleClick}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
        style={{ touchAction: "none" }}
      />

      {/* Content Overlay */}
      <div className="relative z-10 w-full h-full pointer-events-none">
        {children}
      </div>
    </div>
  );
}

// Default export
export default TubesBackground;
