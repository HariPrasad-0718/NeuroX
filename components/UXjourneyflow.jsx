"use client";
 
import { useEffect, useMemo, useRef, useState } from "react";
 
const NODE_WIDTH = 286;
const NODE_HEIGHT = 114;
const TERMINAL_WIDTH = 210;
const TERMINAL_HEIGHT = 74;
const DECISION_SIZE = 82;
 
const MIN_ROW_GAP = 290;
const MAX_ROW_GAP = 520;
const MIN_COL_SEPARATION = 44;
const VIEW_PADDING_X = 260;
const VIEW_PADDING_Y = 220;
const GRID_SIZE = 30;
const MIN_ZOOM = 0.55;
const MAX_ZOOM = 2.1;
const ZOOM_STEP = 0.14;
const EDGE_CURVE_SMOOTHNESS = 0.2;
 
const NODE_THEME = {
  process: {
    fill: "#ffffff",
    stroke: "#d7e1f2",
    title: "#0f172a",
    subtitle: "#64748b",
    chipFill: "#eef4ff",
    chipText: "#1d4ed8",
  },
  decision: {
    fill: "#fef7ec",
    stroke: "#f8d7a6",
    title: "#7c2d12",
    subtitle: "#b45309",
    chipFill: "#ffedd5",
    chipText: "#9a3412",
  },
  start: {
    fill: "#0f172a",
    stroke: "#0f172a",
    title: "#f8fafc",
    subtitle: "#cbd5e1",
    chipFill: "#1e293b",
    chipText: "#dbeafe",
  },
  end: {
    fill: "#111827",
    stroke: "#111827",
    title: "#f8fafc",
    subtitle: "#d1d5db",
    chipFill: "#1f2937",
    chipText: "#dbeafe",
  },
};
 
export default function UXJourneyFlow({ flow }) {
  const svgRef = useRef(null);
  const viewportRef = useRef(null);
  const containerRef = useRef(null);
  const panStateRef = useRef(null);
  const [viewportWidth, setViewportWidth] = useState(1260);
  const [viewState, setViewState] = useState({ scale: 1, tx: 0, ty: 0 });
 
  useEffect(() => {
    if (!containerRef.current) return;
 
    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect?.width || 1260;
      setViewportWidth(Math.max(1120, Math.floor(measured)));
    });
 
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);
 
  const renderModel = useMemo(() => {
    const normalized = normalizeFlow(flow);
    if (!normalized.nodes.length) return null;
 
    const graph = buildGraph(normalized.nodes, normalized.edges);
    const layout = computeLayout(graph, viewportWidth);
    const routes = computeEdgeRoutes(graph, layout.positions);
 
    return { graph, layout, routes };
  }, [flow, viewportWidth]);
 
  useEffect(() => {
    setViewState({ scale: 1, tx: 0, ty: 0 });
  }, [renderModel?.layout?.svgWidth, renderModel?.layout?.svgHeight]);
 
  useEffect(() => {
    if (!svgRef.current) return;
 
    const svg = svgRef.current;
    svg.innerHTML = "";
 
    if (!renderModel) {
      svg.setAttribute("width", String(Math.max(1120, viewportWidth - 12)));
      svg.setAttribute("height", "420");
      svg.setAttribute("viewBox", `0 0 ${Math.max(1120, viewportWidth - 12)} 420`);
      return;
    }
 
    const { graph, layout, routes } = renderModel;
    svg.setAttribute("width", String(layout.svgWidth));
    svg.setAttribute("height", String(layout.svgHeight));
    svg.setAttribute("viewBox", `0 0 ${layout.svgWidth} ${layout.svgHeight}`);
 
    svg.appendChild(createDefs());
 
    const viewport = svgEl("g", { class: "viewport-layer" });
    viewportRef.current = viewport;
    viewport.appendChild(createGrid(layout.svgWidth, layout.svgHeight));
 
    const edgeLayer = svgEl("g", { class: "edge-layer" });
    const nodeLayer = svgEl("g", { class: "node-layer" });
 
    drawEdges(edgeLayer, graph, routes);
    drawNodes(nodeLayer, graph, layout.positions);
 
    viewport.appendChild(edgeLayer);
    viewport.appendChild(nodeLayer);
    svg.appendChild(viewport);
    applyViewportTransform(viewport, viewState);
  }, [renderModel, viewportWidth]);
 
  useEffect(() => {
    if (!viewportRef.current) return;
    applyViewportTransform(viewportRef.current, viewState);
  }, [viewState]);
 
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  });
 
  function handleWheel(event) {
    if (!event.ctrlKey) return;
 
    event.preventDefault();
    const svgPoint = clientToSvgPoint(svgRef.current, event.clientX, event.clientY);
    if (!svgPoint) return;
 
    const zoomDelta = event.deltaY < 0 ? 0.1 : -0.1;
    setViewState((current) => zoomAtPoint(current, current.scale + zoomDelta, svgPoint));
  }
 
  function handlePointerDown(event) {
    if (event.button !== 0) return;
 
    const svgPoint = clientToSvgPoint(svgRef.current, event.clientX, event.clientY);
    if (!svgPoint) return;
 
    panStateRef.current = {
      pointerId: event.pointerId,
      startX: svgPoint.x,
      startY: svgPoint.y,
      startTx: viewState.tx,
      startTy: viewState.ty,
    };
 
    event.currentTarget.setPointerCapture(event.pointerId);
  }
 
  function handlePointerMove(event) {
    const pan = panStateRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
 
    const svgPoint = clientToSvgPoint(svgRef.current, event.clientX, event.clientY);
    if (!svgPoint) return;
 
    setViewState((current) => ({
      ...current,
      tx: pan.startTx + (svgPoint.x - pan.startX),
      ty: pan.startTy + (svgPoint.y - pan.startY),
    }));
  }
 
  function handlePointerUp(event) {
    if (panStateRef.current?.pointerId === event.pointerId) {
      panStateRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }
 
  function zoomIn() {
    setViewState((current) => zoomAtPoint(current, current.scale + ZOOM_STEP));
  }
 
  function zoomOut() {
    setViewState((current) => zoomAtPoint(current, current.scale - ZOOM_STEP));
  }
 
  function resetView() {
    setViewState({ scale: 1, tx: 0, ty: 0 });
  }
 
  return (
    <div
      ref={containerRef}
      className="relative w-full max-h-[80vh] overflow-auto rounded-3xl border border-[#e2e8f0] bg-gradient-to-br from-[#fbfdff] via-white to-[#f4f8ff] p-6 shadow-[0_20px_50px_rgba(15,23,42,0.10)]"
    >
      <div className="absolute right-5 top-5 z-10 flex items-center gap-2 rounded-xl border border-[#dbe6f2] bg-white/90 px-2 py-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.12)] backdrop-blur">
        <button
          type="button"
          onClick={zoomOut}
          className="h-8 w-8 rounded-md border border-[#d7e1f2] text-lg font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
          aria-label="Zoom out"
        >
          -
        </button>
        <span className="min-w-12 text-center text-xs font-semibold tracking-wide text-slate-600">
          {Math.round(viewState.scale * 100)}%
        </span>
        <button
          type="button"
          onClick={zoomIn}
          className="h-8 w-8 rounded-md border border-[#d7e1f2] text-lg font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={resetView}
          className="h-8 rounded-md border border-[#d7e1f2] px-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
          aria-label="Reset view"
        >
          Reset
        </button>
      </div>
 
      <svg
        ref={svgRef}
        className="min-w-max cursor-grab active:cursor-grabbing"
        role="img"
        aria-label="Process workflow diagram"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
    </div>
  );
}
 
function applyViewportTransform(viewport, viewState) {
  if (!viewport) return;
  viewport.setAttribute(
    "transform",
    `translate(${viewState.tx} ${viewState.ty}) scale(${viewState.scale})`
  );
}
 
function zoomAtPoint(current, targetScale, focusPoint) {
  const nextScale = clamp(targetScale, MIN_ZOOM, MAX_ZOOM);
  if (nextScale === current.scale) return current;
 
  if (!focusPoint) {
    return {
      ...current,
      scale: nextScale,
    };
  }
 
  const worldX = (focusPoint.x - current.tx) / current.scale;
  const worldY = (focusPoint.y - current.ty) / current.scale;
 
  return {
    scale: nextScale,
    tx: focusPoint.x - worldX * nextScale,
    ty: focusPoint.y - worldY * nextScale,
  };
}
 
function clientToSvgPoint(svg, clientX, clientY) {
  if (!svg) return null;
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
 
  const matrix = svg.getScreenCTM();
  if (!matrix) return null;
 
  return pt.matrixTransform(matrix.inverse());
}
 
function normalizeFlow(flow) {
  const rawNodes = Array.isArray(flow?.nodes) ? flow.nodes : [];
  const rawEdges = Array.isArray(flow?.edges) ? flow.edges : [];
 
  const nodes = rawNodes
    .filter((node) => node?.id)
    .map((node) => ({
      id: String(node.id),
      label: String(node.label || node.id),
      type: normalizeType(node.type),
    }));
 
  const ids = new Set(nodes.map((node) => node.id));
 
  const edges = rawEdges
    .filter((edge) => edge?.from && edge?.to)
    .map((edge) => ({
      from: String(edge.from),
      to: String(edge.to),
      label: edge.label ? String(edge.label) : "",
    }))
    .filter((edge) => ids.has(edge.from) && ids.has(edge.to));
 
  return { nodes, edges };
}
 
function normalizeType(type) {
  const value = String(type || "process").toLowerCase();
  if (value === "start" || value === "end" || value === "decision") return value;
  return "process";
}
 
function buildGraph(nodes, edges) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const incoming = new Map(nodes.map((node) => [node.id, []]));
  const outgoing = new Map(nodes.map((node) => [node.id, []]));
 
  const normalizedEdges = edges.map((edge, index) => {
    const id = `${edge.from}->${edge.to}::${index}`;
    const isRetry = /retry|loop|fallback|back/i.test(edge.label || "");
    const meta = { ...edge, id, index, isRetry };
    outgoing.get(edge.from)?.push(meta);
    incoming.get(edge.to)?.push(meta);
    return meta;
  });
 
  const levels = assignLevels(nodes, incoming, outgoing);
 
  normalizedEdges.forEach((edge) => {
    edge.isBackward = (levels.get(edge.to) || 0) <= (levels.get(edge.from) || 0);
    edge.isLoop = edge.from === edge.to || edge.isRetry || edge.isBackward;
  });
 
  return { nodes, edges: normalizedEdges, nodeMap, incoming, outgoing, levels };
}
 
function assignLevels(nodes, incoming, outgoing) {
  const levels = new Map(nodes.map((node) => [node.id, 0]));
  const indegree = new Map(nodes.map((node) => [node.id, 0]));
 
  nodes.forEach((node) => {
    (incoming.get(node.id) || []).forEach((edge) => {
      if (edge.from !== edge.to && !edge.isRetry) {
        indegree.set(node.id, (indegree.get(node.id) || 0) + 1);
      }
    });
  });
 
  const queue = nodes
    .map((node) => node.id)
    .filter((id) => (indegree.get(id) || 0) === 0)
    .sort((a, b) => a.localeCompare(b));
 
  const topo = [];
 
  while (queue.length) {
    const current = queue.shift();
    topo.push(current);
 
    (outgoing.get(current) || []).forEach((edge) => {
      if (edge.from === edge.to || edge.isRetry) return;
      const next = edge.to;
      indegree.set(next, (indegree.get(next) || 0) - 1);
      if ((indegree.get(next) || 0) === 0) {
        queue.push(next);
        queue.sort((a, b) => a.localeCompare(b));
      }
    });
  }
 
  nodes.forEach((node) => {
    if (!topo.includes(node.id)) topo.push(node.id);
  });
 
  topo.forEach((id) => {
    const currentLevel = levels.get(id) || 0;
    (outgoing.get(id) || []).forEach((edge) => {
      if (edge.from === edge.to || edge.isRetry) return;
      const nextLevel = Math.max(levels.get(edge.to) || 0, currentLevel + 1);
      levels.set(edge.to, nextLevel);
    });
  });
 
  return levels;
}
 
function computeLayout(graph, viewportWidth) {
  const layers = buildAndOrderLayers(graph);
  const columnPositions = initializeLayerColumns(layers, graph);
 
  const nodeCount = graph.nodes.length;
  const maxLayerSize = Math.max(...layers.map((layer) => layer.length), 1);
  const rowGap = clamp(
    NODE_HEIGHT + 126 + Math.log2(nodeCount + 1) * 22 + maxLayerSize * 1.4,
    MIN_ROW_GAP,
    MAX_ROW_GAP
  );
 
  const baseColGap = clamp(140 + Math.log2(nodeCount + 1) * 14 + maxLayerSize * 3.1, 140, 260);
 
  const positions = new Map();
 
  layers.forEach((layer, level) => {
    const y = VIEW_PADDING_Y + level * rowGap;
    layer.forEach((id) => {
      const x = columnPositions.get(id) || 0;
      positions.set(id, { x, y, level });
    });
  });
 
  relaxColumns(layers, graph, positions, baseColGap);
 
  const nodeBounds = getNodeBounds(graph, positions);
  const loopBounds = estimateLoopBounds(graph, positions);
  const combined = {
    minX: Math.min(nodeBounds.minX, loopBounds.minX),
    minY: Math.min(nodeBounds.minY, loopBounds.minY),
    maxX: Math.max(nodeBounds.maxX, loopBounds.maxX),
    maxY: Math.max(nodeBounds.maxY, loopBounds.maxY),
  };
 
  const graphWidth = combined.maxX - combined.minX + VIEW_PADDING_X * 2;
  const graphHeight = combined.maxY - combined.minY + VIEW_PADDING_Y * 2;
 
  const svgWidth = Math.max(Math.floor(viewportWidth - 12), Math.ceil(graphWidth));
  const svgHeight = Math.max(680, Math.ceil(graphHeight));
 
  const offsetX = (svgWidth - (combined.maxX - combined.minX)) / 2 - combined.minX;
  const offsetY = (svgHeight - (combined.maxY - combined.minY)) / 2 - combined.minY;
 
  positions.forEach((pos) => {
    pos.x += offsetX;
    pos.y += offsetY;
  });
 
  return { positions, svgWidth, svgHeight };
}
 
function buildAndOrderLayers(graph) {
  const grouped = new Map();
 
  graph.nodes.forEach((node) => {
    const level = graph.levels.get(node.id) || 0;
    if (!grouped.has(level)) grouped.set(level, []);
    grouped.get(level).push(node.id);
  });
 
  const orderedLevels = [...grouped.keys()].sort((a, b) => a - b);
  const layers = orderedLevels.map((level) => grouped.get(level).sort((a, b) => a.localeCompare(b)));
 
  for (let pass = 0; pass < 8; pass += 1) {
    barycenterSweep(layers, graph, "forward");
    barycenterSweep(layers, graph, "backward");
  }
 
  return layers;
}
 
function barycenterSweep(layers, graph, direction) {
  const indices = layers.map((_, index) => index);
  const passOrder = direction === "forward" ? indices : [...indices].reverse();
 
  passOrder.forEach((layerIndex) => {
    const ids = layers[layerIndex];
    if (!ids?.length) return;
 
    const reference = new Map();
    layers.forEach((layer, levelIndex) => {
      layer.forEach((id, rowIndex) => {
        reference.set(id, { level: levelIndex, row: rowIndex });
      });
    });
 
    ids.sort((a, b) => {
      const scoreA = getBarycenterScore(a, layerIndex, direction, graph, reference);
      const scoreB = getBarycenterScore(b, layerIndex, direction, graph, reference);
      if (scoreA === scoreB) return a.localeCompare(b);
      return scoreA - scoreB;
    });
  });
}
 
function getBarycenterScore(nodeId, level, direction, graph, reference) {
  const neighbors = [];
 
  if (direction === "forward") {
    (graph.incoming.get(nodeId) || []).forEach((edge) => {
      if (edge.isLoop) return;
      const ref = reference.get(edge.from);
      if (ref && ref.level < level) neighbors.push(ref.row);
    });
  } else {
    (graph.outgoing.get(nodeId) || []).forEach((edge) => {
      if (edge.isLoop) return;
      const ref = reference.get(edge.to);
      if (ref && ref.level > level) neighbors.push(ref.row);
    });
  }
 
  if (!neighbors.length) return level * 12;
  return neighbors.reduce((sum, value) => sum + value, 0) / neighbors.length;
}
 
function initializeLayerColumns(layers, graph) {
  const columns = new Map();
 
  layers.forEach((layer) => {
    let cursor = 0;
    layer.forEach((id, index) => {
      const node = graph.nodeMap.get(id);
      const size = getNodeSize(node);
      if (index === 0) {
        columns.set(id, 0);
        cursor = size.width / 2;
        return;
      }
 
      const prevId = layer[index - 1];
      const prevNode = graph.nodeMap.get(prevId);
      const prevSize = getNodeSize(prevNode);
      const sep = prevSize.width / 2 + size.width / 2 + MIN_COL_SEPARATION;
      cursor += sep;
      columns.set(id, cursor - size.width / 2);
    });
 
    centerLayerColumns(layer, columns, graph);
  });
 
  return columns;
}
 
function relaxColumns(layers, graph, positions, baseColGap) {
  for (let pass = 0; pass < 6; pass += 1) {
    sweepColumns(layers, graph, positions, "forward", baseColGap);
    sweepColumns(layers, graph, positions, "backward", baseColGap);
  }
}
 
function sweepColumns(layers, graph, positions, direction, baseColGap) {
  const order = direction === "forward" ? [...layers.keys()] : [...layers.keys()].reverse();
 
  order.forEach((layerIndex) => {
    const layer = layers[layerIndex];
    if (!layer?.length) return;
 
    const weighted = layer.map((id, index) => ({
      id,
      weight:
        getNeighborMedianX(id, layerIndex, direction, graph, positions) ??
        positions.get(id)?.x ??
        index * baseColGap,
      originalIndex: index,
    }));
 
    weighted.sort((a, b) => {
      if (a.weight === b.weight) return a.originalIndex - b.originalIndex;
      return a.weight - b.weight;
    });
 
    enforceHorizontalSeparation(weighted, graph, positions, baseColGap);
 
    weighted.forEach((entry) => {
      const pos = positions.get(entry.id);
      if (pos) pos.x = entry.weight;
    });
 
    const orderedIds = weighted.map((entry) => entry.id);
    const layerCenter = orderedIds.reduce((acc, id) => acc + (positions.get(id)?.x || 0), 0) / orderedIds.length;
 
    orderedIds.forEach((id) => {
      const pos = positions.get(id);
      if (pos) pos.x -= layerCenter;
    });
  });
}
 
function getNeighborMedianX(nodeId, levelIndex, direction, graph, positions) {
  const values = [];
 
  if (direction === "forward") {
    (graph.incoming.get(nodeId) || []).forEach((edge) => {
      if (edge.isLoop) return;
      const pos = positions.get(edge.from);
      if (pos && pos.level < levelIndex) values.push(pos.x);
    });
  } else {
    (graph.outgoing.get(nodeId) || []).forEach((edge) => {
      if (edge.isLoop) return;
      const pos = positions.get(edge.to);
      if (pos && pos.level > levelIndex) values.push(pos.x);
    });
  }
 
  if (!values.length) return null;
  values.sort((a, b) => a - b);
 
  const middle = Math.floor(values.length / 2);
  if (values.length % 2 === 1) return values[middle];
  return (values[middle - 1] + values[middle]) / 2;
}
 
function enforceHorizontalSeparation(weighted, graph, positions, baseColGap) {
  if (!weighted.length) return;
 
  for (let i = 1; i < weighted.length; i += 1) {
    const prev = weighted[i - 1];
    const current = weighted[i];
    const prevNode = graph.nodeMap.get(prev.id);
    const currentNode = graph.nodeMap.get(current.id);
    const prevSize = getNodeSize(prevNode);
    const currentSize = getNodeSize(currentNode);
 
    const required =
      prev.weight +
      prevSize.width / 2 +
      currentSize.width / 2 +
      Math.max(MIN_COL_SEPARATION, baseColGap * 0.14);
    if (current.weight < required) current.weight = required;
  }
 
  for (let i = weighted.length - 2; i >= 0; i -= 1) {
    const next = weighted[i + 1];
    const current = weighted[i];
    const nextNode = graph.nodeMap.get(next.id);
    const currentNode = graph.nodeMap.get(current.id);
    const nextSize = getNodeSize(nextNode);
    const currentSize = getNodeSize(currentNode);
 
    const required =
      next.weight -
      nextSize.width / 2 -
      currentSize.width / 2 -
      Math.max(MIN_COL_SEPARATION, baseColGap * 0.14);
    if (current.weight > required) current.weight = required;
  }
}
 
function centerLayerColumns(layer, columns, graph) {
  if (!layer.length) return;
 
  const center = layer.reduce((acc, id) => acc + (columns.get(id) || 0), 0) / layer.length;
 
  layer.forEach((id) => {
    const node = graph.nodeMap.get(id);
    const size = getNodeSize(node);
    const base = columns.get(id) || 0;
    columns.set(id, base - center + size.width / 2);
  });
}
 
function computeEdgeRoutes(graph, positions) {
  const parallelCounts = new Map();
  const parallelCursor = new Map();
  const loopLaneByBand = new Map();
 
  graph.edges.forEach((edge) => {
    const key = `${edge.from}|${edge.to}`;
    parallelCounts.set(key, (parallelCounts.get(key) || 0) + 1);
  });
 
  return graph.edges.map((edge) => {
    const fromNode = graph.nodeMap.get(edge.from);
    const toNode = graph.nodeMap.get(edge.to);
    const fromPos = positions.get(edge.from);
    const toPos = positions.get(edge.to);
 
    if (!fromNode || !toNode || !fromPos || !toPos) {
      return { edge, d: "", labelX: 0, labelY: 0, isLoop: false };
    }
 
    const isDecisionNo = fromNode.type === "decision" && isNoBranchLabel(edge.label);
    const fromAnchor = getAnchor(fromPos, fromNode, isDecisionNo ? "right" : "bottom");
    const toAnchor = getAnchor(toPos, toNode, "top");
 
    const pairKey = `${edge.from}|${edge.to}`;
    const pairIndex = parallelCursor.get(pairKey) || 0;
    parallelCursor.set(pairKey, pairIndex + 1);
 
    const parallelCount = parallelCounts.get(pairKey) || 1;
    const spread = (pairIndex - (parallelCount - 1) / 2) * 16;
 
    if (!edge.isLoop) {
      if (isDecisionNo) {
        const sideX = Math.max(fromAnchor.x, toAnchor.x) + 120 + Math.abs(spread);
        const turnY = Math.min(toAnchor.y - 28, fromAnchor.y + 64 + Math.abs(spread));
        const sweepY = fromAnchor.y + clamp((turnY - fromAnchor.y) * 0.58, 26, 92);
 
        const d = buildSmoothBezierPath([
          { x: fromAnchor.x, y: fromAnchor.y },
          { x: sideX - 20, y: sweepY - 18 },
          { x: sideX, y: turnY },
          { x: toAnchor.x + 14, y: turnY + 10 },
          { x: toAnchor.x, y: toAnchor.y },
        ]);
 
        return {
          edge,
          d,
          labelX: sideX + 10,
          labelY: (fromAnchor.y + turnY) / 2 - 8,
          isLoop: false,
        };
      }
 
      const verticalGap = Math.abs(toAnchor.y - fromAnchor.y);
      const curvature = clamp(verticalGap * 0.36, 90, 240);
      const midY = (fromAnchor.y + toAnchor.y) / 2 + spread;
 
      const d = buildSmoothBezierPath([
        { x: fromAnchor.x, y: fromAnchor.y },
        { x: fromAnchor.x + spread * 0.45, y: fromAnchor.y + curvature * 0.58 },
        { x: toAnchor.x + spread * 0.45, y: toAnchor.y - curvature * 0.58 },
        { x: toAnchor.x, y: toAnchor.y },
      ]);
 
      return {
        edge,
        d,
        labelX: (fromAnchor.x + toAnchor.x) / 2,
        labelY: midY - 10,
        isLoop: false,
      };
    }
 
    const fromLevel = fromPos.level;
    const toLevel = toPos.level;
    const bandKey = getLoopBandKey(fromLevel, toLevel);
    const lane = loopLaneByBand.get(bandKey) || 0;
    loopLaneByBand.set(bandKey, lane + 1);
 
    const span = Math.max(1, Math.abs(fromLevel - toLevel));
    const fromSize = getNodeSize(fromNode);
    const toSize = getNodeSize(toNode);
    const loopStart = getAnchor(fromPos, fromNode, "right");
    const loopTargetTop = getAnchor(toPos, toNode, "top");
    const loopTargetRight = getAnchor(toPos, toNode, "right");
    const side = getLoopSideOffset(span, lane);
    const rightX = Math.max(
      fromPos.x + fromSize.width / 2,
      toPos.x + toSize.width / 2
    ) + side;
 
    const startY = loopStart.y;
    const approachY = Math.min(loopTargetTop.y - 34, startY - 26);
    const targetX = loopTargetRight.x + 22;
    const d = buildSmoothBezierPath([
      { x: loopStart.x, y: loopStart.y },
      { x: rightX - 20, y: startY },
      { x: rightX, y: startY + 14 },
      { x: rightX, y: approachY - 14 },
      { x: rightX - 22, y: approachY },
      { x: targetX + 22, y: approachY },
      { x: targetX, y: loopTargetTop.y - 20 },
      { x: loopTargetTop.x, y: loopTargetTop.y },
    ]);
 
    return {
      edge,
      d,
      labelX: rightX + 8,
      labelY: (startY + approachY) / 2 - 8,
      isLoop: true,
    };
  });
}
 
function getLoopBandKey(fromLevel, toLevel) {
  return `${Math.min(fromLevel, toLevel)}|${Math.max(fromLevel, toLevel)}`;
}
 
function getLoopSideOffset(span, lane) {
  return 206 + span * 42 + lane * 58;
}
 
function isNoBranchLabel(label) {
  const text = String(label || "").trim().toLowerCase();
  if (!text) return false;
  return /\b(no|false|fail|failed|reject|rejected)\b/.test(text);
}
 
function buildSmoothBezierPath(points, smoothness = EDGE_CURVE_SMOOTHNESS) {
  const pts = points.filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y));
  if (pts.length < 2) return "";
 
  const d = [`M ${pts[0].x} ${pts[0].y}`];
 
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
 
    const cp1x = p1.x + (p2.x - p0.x) * smoothness;
    const cp1y = p1.y + (p2.y - p0.y) * smoothness;
    const cp2x = p2.x - (p3.x - p1.x) * smoothness;
    const cp2y = p2.y - (p3.y - p1.y) * smoothness;
 
    d.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
  }
 
  return d.join(" ");
}
 
function drawEdges(layer, graph, routes) {
  routes.forEach((route) => {
    if (!route.d) return;
 
    const path = svgEl("path", {
      d: route.d,
      fill: "none",
      stroke: route.isLoop ? "#94a3b8" : "#c9d5e7",
      "stroke-width": route.isLoop ? "2.5" : "2.3",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "marker-end": route.isLoop ? "url(#flowArrowLoop)" : "url(#flowArrow)",
      class: "edge-path",
    });
 
    layer.appendChild(path);
 
    if (route.edge.label) {
      layer.appendChild(drawEdgeLabel(route.edge.label, route.labelX, route.labelY, route.isLoop));
    }
  });
}
 
function drawEdgeLabel(text, x, y, isLoop) {
  const value = String(text);
  const width = clamp(value.length * 7.1 + 22, 52, 240);
 
  const group = svgEl("g", { class: "edge-label" });
  group.appendChild(
    svgEl("rect", {
      x: String(x - width / 2),
      y: String(y - 13),
      width: String(width),
      height: "26",
      rx: "13",
      fill: isLoop ? "#f8fafc" : "#ffffff",
      stroke: isLoop ? "#cbd5e1" : "#dbe6f2",
      "stroke-width": "1",
      filter: "url(#labelShadow)",
    })
  );
 
  const label = svgEl("text", {
    x: String(x),
    y: String(y + 4),
    "text-anchor": "middle",
    fill: "#475569",
    "font-size": "11.5",
    "font-weight": "700",
    "font-family": "Manrope, ui-sans-serif, system-ui",
    "letter-spacing": "0.01em",
  });
 
  label.textContent = value;
  group.appendChild(label);
  return group;
}
 
function drawNodes(layer, graph, positions) {
  graph.nodes.forEach((node) => {
    const pos = positions.get(node.id);
    if (!pos) return;
 
    const theme = getNodeTheme(node.type);
    const size = getNodeSize(node);
 
    const group = svgEl("g", { class: "flow-node" });
 
    if (node.type === "decision") {
      group.appendChild(
        svgEl("polygon", {
          points: `${pos.x},${pos.y - DECISION_SIZE} ${pos.x + DECISION_SIZE},${pos.y} ${pos.x},${pos.y + DECISION_SIZE} ${pos.x - DECISION_SIZE},${pos.y}`,
          fill: theme.fill,
          stroke: theme.stroke,
          "stroke-width": "1.8",
          filter: "url(#nodeShadow)",
          class: "node-surface",
        })
      );
    } else {
      const radius = node.type === "start" || node.type === "end" ? 999 : 20;
      group.appendChild(
        svgEl("rect", {
          x: String(pos.x - size.width / 2),
          y: String(pos.y - size.height / 2),
          width: String(size.width),
          height: String(size.height),
          rx: String(radius),
          fill: theme.fill,
          stroke: theme.stroke,
          "stroke-width": "1.8",
          filter: "url(#nodeShadow)",
          class: "node-surface",
        })
      );
    }
 
    const tagText = node.type.toUpperCase();
    const tagWidth = tagText.length * 8 + 24;
    const tagY = node.type === "decision" ? pos.y - 16 : pos.y - 31;
 
    group.appendChild(
      svgEl("rect", {
        x: String(pos.x - tagWidth / 2),
        y: String(tagY),
        width: String(tagWidth),
        height: "20",
        rx: "10",
        fill: theme.chipFill,
        opacity: node.type === "start" || node.type === "end" ? "0.55" : "1",
      })
    );
 
    const tagLabel = svgEl("text", {
      x: String(pos.x),
      y: String(tagY + 13.5),
      "text-anchor": "middle",
      fill: theme.chipText,
      "font-size": "10.5",
      "font-weight": "800",
      "font-family": "Manrope, ui-sans-serif, system-ui",
      "letter-spacing": "0.08em",
      opacity: node.type === "start" || node.type === "end" ? "0.95" : "0.9",
    });
    tagLabel.textContent = tagText;
    group.appendChild(tagLabel);
 
    const lines = splitLabel(node.label, node.type === "decision" ? 17 : 28, 2);
 
    lines.forEach((line, index) => {
      const label = svgEl("text", {
        x: String(pos.x),
        y: String(pos.y + (node.type === "decision" ? 20 : 6) + index * 19),
        "text-anchor": "middle",
        fill: theme.title,
        "font-size": "14",
        "font-weight": "700",
        "font-family": "Manrope, ui-sans-serif, system-ui",
        class: "node-title",
      });
 
      label.textContent = line;
      group.appendChild(label);
    });
 
    layer.appendChild(group);
  });
}
 
function createDefs() {
  const defs = svgEl("defs");
 
  const arrow = svgEl("marker", {
    id: "flowArrow",
    markerWidth: "11",
    markerHeight: "11",
    refX: "9.8",
    refY: "5.5",
    orient: "auto",
    markerUnits: "strokeWidth",
  });
  arrow.appendChild(svgEl("path", { d: "M1,1 L10,5.5 L1,10 Z", fill: "#94a3b8" }));
  defs.appendChild(arrow);
 
  const loopArrow = svgEl("marker", {
    id: "flowArrowLoop",
    markerWidth: "11",
    markerHeight: "11",
    refX: "9.8",
    refY: "5.5",
    orient: "auto",
    markerUnits: "strokeWidth",
  });
  loopArrow.appendChild(svgEl("path", { d: "M1,1 L10,5.5 L1,10 Z", fill: "#64748b" }));
  defs.appendChild(loopArrow);
 
  const nodeShadow = svgEl("filter", {
    id: "nodeShadow",
    x: "-40%",
    y: "-40%",
    width: "180%",
    height: "180%",
  });
  nodeShadow.appendChild(svgEl("feDropShadow", { dx: "0", dy: "10", stdDeviation: "11", "flood-opacity": "0.16" }));
  defs.appendChild(nodeShadow);
 
  const labelShadow = svgEl("filter", {
    id: "labelShadow",
    x: "-35%",
    y: "-35%",
    width: "170%",
    height: "170%",
  });
  labelShadow.appendChild(svgEl("feDropShadow", { dx: "0", dy: "3", stdDeviation: "2.8", "flood-opacity": "0.17" }));
  defs.appendChild(labelShadow);
 
  const pattern = svgEl("pattern", {
    id: "flowGrid",
    width: String(GRID_SIZE),
    height: String(GRID_SIZE),
    patternUnits: "userSpaceOnUse",
  });
  pattern.appendChild(
    svgEl("path", {
      d: `M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`,
      fill: "none",
      stroke: "#edf2f9",
      "stroke-width": "1",
    })
  );
  defs.appendChild(pattern);
 
  const style = svgEl("style");
  style.textContent = `
    .edge-path { transition: stroke 200ms ease, stroke-width 200ms ease; }
    .flow-node { cursor: default; }
    .flow-node .node-surface {
      transition: transform 220ms ease, stroke-width 220ms ease, filter 220ms ease;
      transform-box: fill-box;
      transform-origin: center;
    }
    .flow-node:hover .node-surface { transform: translateY(-2px); stroke-width: 2.1; }
    .flow-node:hover .node-title { letter-spacing: 0.01em; }
  `;
  defs.appendChild(style);
 
  return defs;
}
 
function createGrid(width, height) {
  return svgEl("rect", {
    x: "0",
    y: "0",
    width: String(width),
    height: String(height),
    fill: "url(#flowGrid)",
  });
}
 
function estimateLoopBounds(graph, positions) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  const loopLaneByBand = new Map();
 
  graph.edges.forEach((edge) => {
    if (!edge.isLoop) return;
 
    const fromNode = graph.nodeMap.get(edge.from);
    const toNode = graph.nodeMap.get(edge.to);
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (!fromNode || !toNode || !from || !to) return;
 
    const bandKey = getLoopBandKey(from.level, to.level);
    const lane = loopLaneByBand.get(bandKey) || 0;
    loopLaneByBand.set(bandKey, lane + 1);
 
    const span = Math.max(1, Math.abs(from.level - to.level));
    const side = getLoopSideOffset(span, lane);
    const fromSize = getNodeSize(fromNode);
    const toSize = getNodeSize(toNode);
    const rightX = Math.max(from.x + fromSize.width / 2, to.x + toSize.width / 2) + side;
    const toTop = getAnchor(to, toNode, "top");
    const startY = getAnchor(from, fromNode, "right").y;
    const approachY = Math.min(toTop.y - 34, startY - 26);
 
    minX = Math.min(minX, from.x, to.x, toTop.x);
    maxX = Math.max(maxX, rightX);
    minY = Math.min(minY, from.y, to.y, approachY, toTop.y);
    maxY = Math.max(maxY, from.y, to.y, toTop.y);
  });
 
  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
 
  return { minX, minY, maxX, maxY };
}
 
function getNodeBounds(graph, positions) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
 
  graph.nodes.forEach((node) => {
    const pos = positions.get(node.id);
    if (!pos) return;
 
    const size = getNodeSize(node);
 
    minX = Math.min(minX, pos.x - size.width / 2);
    maxX = Math.max(maxX, pos.x + size.width / 2);
    minY = Math.min(minY, pos.y - size.height / 2);
    maxY = Math.max(maxY, pos.y + size.height / 2);
  });
 
  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 920, maxY: 560 };
  }
 
  return { minX, minY, maxX, maxY };
}
 
function getNodeSize(node) {
  const type = node?.type || "process";
 
  if (type === "decision") {
    return { width: DECISION_SIZE * 2, height: DECISION_SIZE * 2 };
  }
 
  if (type === "start" || type === "end") {
    return { width: TERMINAL_WIDTH, height: TERMINAL_HEIGHT };
  }
 
  return { width: NODE_WIDTH, height: NODE_HEIGHT };
}
 
function getNodeTheme(type) {
  return NODE_THEME[type] || NODE_THEME.process;
}
 
function getAnchor(position, node, side) {
  const size = getNodeSize(node);
 
  if (node.type === "decision") {
    if (side === "right") return { x: position.x + DECISION_SIZE, y: position.y };
    if (side === "left") return { x: position.x - DECISION_SIZE, y: position.y };
    if (side === "bottom") return { x: position.x, y: position.y + DECISION_SIZE };
    return { x: position.x, y: position.y - DECISION_SIZE };
  }
 
  if (side === "right") return { x: position.x + size.width / 2, y: position.y };
  if (side === "left") return { x: position.x - size.width / 2, y: position.y };
  if (side === "bottom") return { x: position.x, y: position.y + size.height / 2 };
  return { x: position.x, y: position.y - size.height / 2 };
}
 
function splitLabel(text, maxChars = 26, maxLines = 2) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
 
  const lines = [];
  let current = "";
 
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
 
    if (next.length <= maxChars) {
      current = next;
      return;
    }
 
    if (current) lines.push(current);
    current = word;
  });
 
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;
 
  const trimmed = lines.slice(0, maxLines);
  const last = trimmed[maxLines - 1];
  trimmed[maxLines - 1] = `${last.slice(0, Math.max(0, maxChars - 1))}...`;
  return trimmed;
}
 
function svgEl(tag, attrs = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
 
  Object.entries(attrs).forEach(([key, value]) => {
    element.setAttribute(key, String(value));
  });
 
  return element;
}
 
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
 