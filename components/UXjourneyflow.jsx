"use client";

import { useEffect, useRef } from "react";

const NODE_W = 130;
const NODE_H = 48;
const DECISION_R = 34;
const COL_GAP = 80;
const ROW_GAP = 52;
const PAD = 40;

const COLORS = {
  process: {
    fill: "#f5f3ff",
    stroke: "#7c3aed",
    text: "#1a1a2e",
  },
  decision: {
    fill: "#fffbeb",
    stroke: "#d97706",
    text: "#92400e",
  },
  terminal: {
    fill: "#1a1a2e",
    stroke: "#1a1a2e",
    text: "#ffffff",
  },
};

export default function UXJourneyFlow({ flow }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!flow || !svgRef.current) return;

    const svg = svgRef.current;

    const nodes = flow.nodes || [];
    const edges = flow.edges || [];

    svg.innerHTML = "";

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    // =========================
    // LAYOUT
    // =========================

   const pos = new Map();

const horizontalGap = 240;
const verticalGap = 180;

const startX = 140;
const startY = 250;

// Main linear flow order
const mainFlow = [];
const visited = new Set();

let current = nodes.find((n) => n.type === "start");

while (current) {
  mainFlow.push(current.id);
  visited.add(current.id);

  const nextEdge = edges.find(
    (e) =>
      e.from === current.id &&
      (!e.label || !e.label.toLowerCase().includes("retry"))
  );

  if (!nextEdge) break;

  current = nodes.find((n) => n.id === nextEdge.to);

  if (!current || visited.has(current.id)) break;
}

// Position main flow horizontally
mainFlow.forEach((id, index) => {
  pos.set(id, {
    cx: startX + index * horizontalGap,
    cy: startY,
  });
});

// Retry nodes or disconnected nodes
nodes.forEach((node, index) => {
  if (!pos.has(node.id)) {
    pos.set(node.id, {
      cx: startX + index * horizontalGap,
      cy: startY + verticalGap,
    });
  }
});

const svgW = Math.max(mainFlow.length, nodes.length) * horizontalGap + 400;

const svgH = 700;
    svg.setAttribute("width", svgW);
    svg.setAttribute("height", svgH);
    svg.setAttribute("viewBox", `0 0 ${svgW} ${svgH}`);

    // =========================
    // Arrow
    // =========================

    const defs = svgEl("defs");

    const marker = svgEl("marker", {
      id: "arrow",
      markerWidth: "10",
      markerHeight: "7",
      refX: "9",
      refY: "3.5",
      orient: "auto",
    });

    marker.appendChild(
      svgEl("polygon", {
        points: "0 0, 10 3.5, 0 7",
        fill: "#9ca3af",
      })
    );

    defs.appendChild(marker);
    svg.appendChild(defs);

    // =========================
    // EDGES
    // =========================

   edges.forEach((e) => {
  const fromNode = nodeMap.get(e.from);
  const toNode = nodeMap.get(e.to);

  if (!fromNode || !toNode) return;

  const from = pos.get(e.from);
  const to = pos.get(e.to);

  const fromX =
    (fromNode.type || "").toLowerCase() === "decision"
      ? from.cx + DECISION_R
      : from.cx + NODE_W / 2;

  const fromY = from.cy;

  const toX =
    (toNode.type || "").toLowerCase() === "decision"
      ? to.cx - DECISION_R
      : to.cx - NODE_W / 2;

  const toY = to.cy;

  if (isRetry) {
  path = `
    M ${fromX} ${fromY}
    C ${fromX} ${fromY - 120},
      ${toX} ${toY - 120},
      ${toX} ${toY}
  `;
}
  let path;

  // retry loop
  if (isRetry) {
    path = `
      M ${fromX} ${fromY}
      C ${fromX} ${fromY - 140},
        ${toX} ${toY - 140},
        ${toX} ${toY}
    `;
  } else {
    path = `
      M ${fromX} ${fromY}
      C ${(fromX + toX) / 2} ${fromY},
        ${(fromX + toX) / 2} ${toY},
        ${toX} ${toY}
    `;
  }

  svg.appendChild(
    svgEl("path", {
      d: path,
      fill: "none",
      stroke: "#9ca3af",
      "stroke-width": "2",
      "marker-end": "url(#arrow)",
    })
  );

  // edge labels
  if (e.label) {
    const text = svgEl("text", {
      x: (fromX + toX) / 2,
      y: isRetry ? fromY - 120 : fromY - 10,
      fill: "#6b7280",
      "font-size": "12",
      "text-anchor": "middle",
    });

    text.textContent = e.label;

    svg.appendChild(text);
  }
});

    // =========================
    // NODES
    // =========================

    nodes.forEach((n) => {
      const { cx, cy } = pos.get(n.id);

      const type = (n.type || "process").toLowerCase();

      const colors = getNodeColor(type);

      const g = svgEl("g");

      // START / END
      if (type === "start" || type === "end") {
        const rx = NODE_H / 2;

        g.appendChild(
          svgEl("rect", {
            x: cx - NODE_W / 2,
            y: cy - NODE_H / 2,
            width: NODE_W,
            height: NODE_H,
            rx,
            ry: rx,
            fill: colors.fill,
            stroke: colors.stroke,
            "stroke-width": "2",
          })
        );
      }

      // DECISION
      else if (type === "decision") {
        const r = DECISION_R;

        g.appendChild(
          svgEl("polygon", {
            points: `
              ${cx},${cy - r}
              ${cx + r},${cy}
              ${cx},${cy + r}
              ${cx - r},${cy}
            `,
            fill: colors.fill,
            stroke: colors.stroke,
            "stroke-width": "1.5",
          })
        );
      }

      // PROCESS
      else {
        g.appendChild(
          svgEl("rect", {
            x: cx - NODE_W / 2,
            y: cy - NODE_H / 2,
            width: NODE_W,
            height: NODE_H,
            rx: "8",
            ry: "8",
            fill: colors.fill,
            stroke: colors.stroke,
            "stroke-width": "1.5",
          })
        );
      }

      const text = svgEl("text", {
        x: cx,
        y: cy + 4,
        "text-anchor": "middle",
        fill: colors.text,
        "font-size": "11",
        "font-weight": "500",
      });

      text.textContent = n.label;

      g.appendChild(text);

      svg.appendChild(g);
    });
  }, [flow]);

  return (
    <div className="overflow-auto rounded-xl border bg-white p-4">
      <svg ref={svgRef}></svg>
    </div>
  );
}

// =====================================
// HELPERS
// =====================================

function getNodeColor(type) {
  if (type === "start" || type === "end") {
    return COLORS.terminal;
  }

  if (type === "decision") {
    return COLORS.decision;
  }

  return COLORS.process;
}

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(
    "http://www.w3.org/2000/svg",
    tag
  );

  Object.entries(attrs).forEach(([k, v]) => {
    el.setAttribute(k, v);
  });

  return el;
}


function anchor(pos, node, side) {
  const { cx, cy } = pos.get(node.id);

  const type = (node.type || "").toLowerCase();

  if (type === "decision") {
    if (side === "right") return { x: cx + DECISION_R, y: cy };
    if (side === "left") return { x: cx - DECISION_R, y: cy };

    return { x: cx, y: cy };
  }

  if (side === "right") {
    return { x: cx + NODE_W / 2, y: cy };
  }

  return { x: cx - NODE_W / 2, y: cy };
}