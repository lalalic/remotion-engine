/**
 * Browser player entry point.
 * Bundled with esbuild and served by the player server.
 * Renders stream tree JSON using @remotion/player with RemotionEngine.
 */
import React from "react";
import { createRoot } from "react-dom/client";
import { Player } from "@remotion/player";
import { RemotionEngine, builtinComponents, resolveTheme, getDurationInSeconds } from "../full.entry";

function PlayerApp() {
  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<any>(null);

  React.useEffect(() => {
    fetch("/api/video-data")
      .then((r) => r.json())
      .then((json) => {
        const root = json.root || json;
        setData(root);
        setReady(true);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return React.createElement("div", {
      style: { color: "red", padding: 40, fontFamily: "sans-serif" },
    }, "Error: " + error);
  }

  if (!ready) {
    return React.createElement("div", {
      style: { color: "#888", padding: 40, fontFamily: "sans-serif" },
    }, "Loading...");
  }

  const fps = data.fps || 30;
  const width = data.width || 1080;
  const height = data.height || 1920;
  const durationInSeconds = getDurationInSeconds(data, true) || 5;
  const durationInFrames = Math.max(1, Math.ceil(durationInSeconds * fps));
  const theme = resolveTheme(data.theme);

  return React.createElement("div", {
    style: { width: "100%", height: "100%", background: "#000" },
  },
    React.createElement(Player, {
      component: RemotionEngine,
      inputProps: {
        root: data,
        compose: { components: builtinComponents },
        theme,
      },
      durationInFrames,
      fps,
      compositionWidth: width,
      compositionHeight: height,
      style: { width: "100%", height: "100%" },
      controls: true,
      showPlaybackRateControl: true,
      allowFullscreen: true,
      clickToPlay: false,
      doubleClickToFullscreen: true,
    })
  );
}

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(React.createElement(PlayerApp));
}
