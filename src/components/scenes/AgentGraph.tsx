import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { COLORS, FONTS } from "./design";

interface NodeData {
  id: string;
  label: string;
  icon: string;
  x: number;
  y: number;
  type?: "input" | "agent" | "tool" | "output" | "system";
}

interface EdgeData {
  from: string;
  to: string;
  label?: string;
}

/**
 * AgentGraph — Animated node graph showing architecture/orchestration.
 * Nodes appear, edges draw in, pulses flow along connections.
 *
 * Props (via scene.props):
 *   headline: string — title above the graph
 *   nodes: Array<{id, label, icon, x, y, type?}>
 *   edges: Array<{from, to, label?}>
 *   nodeDelay?: number — frames between node appearances (default 8)
 */
export const AgentGraph: React.FC<{
  headline: string;
  nodes?: NodeData[];
  edges?: EdgeData[];
  nodeDelay?: number;
}> = ({ headline, nodes = [], edges = [], nodeDelay = 8 }) => {
  const frame = useCurrentFrame();

  const containerOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  const nodeTypeColors: Record<string, string> = {
    input: COLORS.accentGreen,
    agent: COLORS.accentOrange,
    tool: COLORS.accentPurple,
    output: COLORS.accentCyan,
    system: COLORS.accentAmber,
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: containerOpacity,
      }}
    >
      {headline && (
        <div
          style={{
            position: "absolute",
            top: 60,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: FONTS.heading,
            fontSize: 36,
            fontWeight: 800,
            background: `linear-gradient(135deg, ${COLORS.textPrimary}, ${COLORS.accentPurple})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            letterSpacing: "-0.02em",
            opacity: interpolate(frame, [0, 20], [0, 1], {
              extrapolateRight: "clamp",
            }),
          }}
        >
          {headline}
        </div>
      )}

      {/* SVG edges */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        {edges.map((edge, i) => {
          const fromNode = nodes.find((n) => n.id === edge.from);
          const toNode = nodes.find((n) => n.id === edge.to);
          if (!fromNode || !toNode) return null;

          const edgeF =
            frame -
            Math.max(nodes.indexOf(fromNode), nodes.indexOf(toNode)) *
              nodeDelay -
            10;

          const drawProgress = interpolate(edgeF, [0, 20], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          const midX = (fromNode.x + toNode.x) / 2;
          const midY = (fromNode.y + toNode.y) / 2 - 30;
          const d = `M ${fromNode.x} ${fromNode.y} Q ${midX} ${midY} ${toNode.x} ${toNode.y}`;

          return (
            <g key={i}>
              <path
                d={d}
                fill="none"
                stroke={COLORS.accentPurple}
                strokeWidth={2}
                strokeDasharray={`${drawProgress * 1000} 1000`}
                opacity={0.5}
              />
              {drawProgress >= 1 && (
                <circle r={4} fill={COLORS.accentOrange} opacity={0.9}>
                  <animateMotion dur="2s" repeatCount="indefinite" path={d} />
                </circle>
              )}
            </g>
          );
        })}
      </svg>

      {/* Nodes */}
      {nodes.map((node, i) => {
        const nodeF = frame - i * nodeDelay;
        if (nodeF < 0) return null;

        const opacity = interpolate(nodeF, [0, 15], [0, 1], {
          extrapolateRight: "clamp",
        });

        const scale = interpolate(nodeF, [0, 15], [0.5, 1], {
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        });

        const color =
          nodeTypeColors[node.type || "agent"] || COLORS.accentBlue;

        return (
          <div
            key={node.id}
            style={{
              position: "absolute",
              left: node.x - 50,
              top: node.y - 50,
              width: 100,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              opacity,
              transform: `scale(${scale})`,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: `${color}20`,
                border: `1.5px solid ${color}60`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                boxShadow: `0 0 20px ${color}30`,
              }}
            >
              {node.icon}
            </div>
            <div
              style={{
                fontFamily: FONTS.body,
                fontSize: 12,
                fontWeight: 500,
                color: COLORS.textSecondary,
                textAlign: "center",
                whiteSpace: "nowrap",
              }}
            >
              {node.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};
