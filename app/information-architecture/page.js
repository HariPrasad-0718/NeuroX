"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Minus, Plus, RotateCcw, X } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Download } from "lucide-react";

const TYPE_STYLES = {
  page: {
    background: "#eeedfe",
    border: "#1d4ed8",
    chip: "#dbeafe",
    chipText: "#1e3a8a",
    accent: "#60a5fa",
    text: "#1e1b4b",
    label: "Page",
  },
  section: {
    background: "#e1f5ee",
    border: "#059669",
    chip: "#d1fae5",
    chipText: "#065f46",
    accent: "#34d399",
    text: "#064e3b",
    label: "Section",
  },
  action: {
    background: "#e0faf8",
    border: "#009e83",
    chip: "#ccfbf1",
    chipText: "#115e59",
    accent: "#2dd4bf",
    text: "#085041",
    label: "Action / Task",
  },
  component: {
    background: "#fff3e0",
    border: "#c97000",
    chip: "#ffedd5",
    chipText: "#9a3412",
    accent: "#fb923c",
    text: "#633806",
    label: "Component / Widget",
  },
  default: {
    background: "#f8fafc",
    border: "#475569",
    chip: "#e2e8f0",
    chipText: "#334155",
    accent: "#94a3b8",
    text: "#1f2937",
    label: "Node",
  },
};

const BOX_WIDTH = 180;
const BOX_HEIGHT = 64;
const HORIZONTAL_GAP = 34;
const VERTICAL_GAP = 96;
const DIAGRAM_PADDING = 28;
const FIT_PADDING = 48;
const DEFAULT_ZOOM_LEVEL = 1;
const MIN_ZOOM_LEVEL = 0.8;
const MAX_ZOOM_LEVEL = 2.2;
const ZOOM_STEP = 0.15;

function normalizeType(type) {
  const normalized = String(type || "").toLowerCase();

  if (normalized === "page") return "page";
  if (normalized === "section") return "section";
  if (normalized === "action" || normalized === "task") return "action";
  if (normalized === "component") return "component";

  return "default";
}

function collectStats(
  node,
  acc = {
    total: 0,
    pages: 0,
    sections: 0,
    actions: 0,
    components: 0,
  }
) {
  if (!node) return acc;

  acc.total += 1;

  const type = normalizeType(node.type);

  if (type === "page") acc.pages += 1;
  if (type === "section") acc.sections += 1;
  if (type === "action") acc.actions += 1;
  if (type === "component") acc.components += 1;

  const children = Array.isArray(node.children) ? node.children : [];
  children.forEach((child) => collectStats(child, acc));

  return acc;
}

function wrapLabel(label, maxChars = 22, maxLines = 2) {
  const words = String(label || "Untitled").trim().split(/\s+/);
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length > maxChars && currentLine) {
      if (lines.length < maxLines - 1) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = `${currentLine.slice(0, Math.max(0, maxChars - 3))}...`;
      }
    } else {
      currentLine = nextLine;
    }
  });

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines.slice(0, maxLines) : ["Untitled"];
}

function buildDiagramModel(root) {
  if (!root) {
    return {
      nodes: [],
      connectors: [],
      width: 0,
      height: 0,
    };
  }

  function measure(node) {
    const children = Array.isArray(node.children) ? node.children : [];

    if (children.length === 0) {
      node._width = BOX_WIDTH;
      return node._width;
    }

    const totalChildrenWidth =
      children.reduce((sum, child) => sum + measure(child), 0) +
      HORIZONTAL_GAP * (children.length - 1);

    node._width = Math.max(BOX_WIDTH, totalChildrenWidth);
    return node._width;
  }

  function position(node, startX, startY) {
    node._x = startX + (node._width - BOX_WIDTH) / 2;
    node._y = startY;

    const children = Array.isArray(node.children) ? node.children : [];

    if (children.length === 0) {
      return;
    }

    const totalChildrenWidth =
      children.reduce((sum, child) => sum + child._width, 0) +
      HORIZONTAL_GAP * (children.length - 1);

    let childStartX = startX + (node._width - totalChildrenWidth) / 2;

    children.forEach((child) => {
      position(child, childStartX, startY + BOX_HEIGHT + VERTICAL_GAP);
      childStartX += child._width + HORIZONTAL_GAP;
    });
  }

  const nodes = [];
  const connectors = [];
  let maxX = 0;
  let maxY = 0;

  function collect(node) {
    const type = normalizeType(node.type);
    const styleSet = TYPE_STYLES[type] || TYPE_STYLES.default;
    const lines = wrapLabel(node.name || "Untitled");
    const centerX = node._x + BOX_WIDTH / 2;
    const bottomY = node._y + BOX_HEIGHT;
    const children = Array.isArray(node.children) ? node.children : [];

    nodes.push({
      id: `${node._x}-${node._y}`,
      x: node._x,
      y: node._y,
      lines,
      styleSet,
    });

    maxX = Math.max(maxX, node._x + BOX_WIDTH);
    maxY = Math.max(maxY, node._y + BOX_HEIGHT);

    children.forEach((child) => {
      const childCenterX = child._x + BOX_WIDTH / 2;
      const childTopY = child._y;
      const middleY = bottomY + VERTICAL_GAP / 2;

      connectors.push({
        id: `${node._x}-${node._y}-${child._x}-${child._y}`,
        path:
          Math.abs(centerX - childCenterX) < 2
            ? `M ${centerX} ${bottomY} L ${childCenterX} ${childTopY}`
            : `M ${centerX} ${bottomY} L ${centerX} ${middleY} L ${childCenterX} ${middleY} L ${childCenterX} ${childTopY}`,
      });

      collect(child);
    });
  }

  measure(root);
  position(root, DIAGRAM_PADDING, DIAGRAM_PADDING);
  collect(root);

  return {
    nodes,
    connectors,
    width: maxX + DIAGRAM_PADDING,
    height: maxY + DIAGRAM_PADDING,
  };
}

function ArchitectureDiagram({ diagram, zoom }) {
  if (!diagram.nodes.length) {
    return (
      <div className="px-6 py-10 text-sm text-slate-500">
        No IA tree available.
      </div>
    );
  }

  return (
    <div
      className="relative"
      style={{
        width: `${diagram.width * zoom}px`,
        height: `${diagram.height * zoom}px`,
      }}
    >
      <svg
        viewBox={`0 0 ${diagram.width} ${diagram.height}`}
        width={diagram.width}
        height={diagram.height}
        className="absolute left-0 top-0 block"
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: "top left",
        }}
        aria-label="Information architecture diagram"
      >
        <defs>
          <filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#0f172a" floodOpacity="0.08" />
          </filter>
        </defs>

        {diagram.connectors.map((connector) => (
          <path
            key={connector.id}
            d={connector.path}
            fill="none"
            stroke="#c8c4e8"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {diagram.nodes.map((node) => {
          const lineStartY = node.lines.length === 1 ? node.y + 34 : node.y + 27;

          return (
            <g key={node.id}>
              <rect
                x={node.x}
                y={node.y}
                width={BOX_WIDTH}
                height={BOX_HEIGHT}
                rx="14"
                fill={node.styleSet.background}
                stroke={node.styleSet.border}
                strokeWidth="1.6"
                filter="url(#nodeShadow)"
              />
              <rect
                x={node.x + 10}
                y={node.y + 10}
                width="5"
                height={BOX_HEIGHT - 20}
                rx="999"
                fill={node.styleSet.accent}
              />
              {node.lines.map((line, index) => (
                <text
                  key={`${node.id}-${index}`}
                  x={node.x + BOX_WIDTH / 2 + 6}
                  y={lineStartY + index * 16}
                  textAnchor="middle"
                  fontFamily="Arial, sans-serif"
                  fontSize={index === 0 ? "12.5" : "11.5"}
                  fontWeight={index === 0 ? "700" : "500"}
                  fill={node.styleSet.text}
                >
                  {line}
                </text>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function formatPromptText(prompt) {
  return String(prompt || "")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\'/g, "'")
    .trim();
}

export default function InformationArchitecturePage() {
  const [iaData, setIaData] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM_LEVEL);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [iaError, setIaError] = useState("");
  const viewportRef = useRef(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    const loadIA = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/generate-information-architecture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        });
        const data = await res.json();
        if (data.success) {
          setIaData(data.information_architecture);
          fetch(`/api/projects/${projectId}/progress`, {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stage: "ideate", progress: 100 }),
          }).then(() => window.dispatchEvent(new Event("neurox:progress-updated"))).catch(() => {});
        } else {
          setIaError(data.error || "Failed to load IA");
        }
      } catch (err) {
        setIaError(err.message || "Failed to load IA");
      } finally {
        setLoading(false);
      }
    };
    loadIA();
  }, [projectId]);


  const stats = useMemo(() => {
    if (!iaData?.IA_JSON) {
      return null;
    }

    return collectStats(iaData.IA_JSON);
  }, [iaData]);

  const diagram = useMemo(() => {
    if (!iaData?.IA_JSON) {
      return { nodes: [], connectors: [], width: 0, height: 0 };
    }

    return buildDiagramModel(iaData.IA_JSON);
  }, [iaData]);

  useEffect(() => {
    const viewportNode = viewportRef.current;

    if (!viewportNode) {
      return undefined;
    }

    const updateWidth = () => {
      setViewportWidth(viewportNode.clientWidth);
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(viewportNode);

    return () => {
      observer.disconnect();
    };
  }, []);

  const baseZoom = useMemo(() => {
    if (!diagram.width || !viewportWidth) {
      return 0.82;
    }

      return Math.min(0.82, (viewportWidth - FIT_PADDING) / diagram.width);
  }, [diagram.width, viewportWidth]);

  const effectiveZoom = Number((baseZoom * zoomLevel).toFixed(3));
  const promptText = formatPromptText(
    iaData?.RAW_RESPONSE ||
      (typeof window !== "undefined"
        ? sessionStorage.getItem("informationArchitectureRawResponse")
        : "") ||
      iaData?.PROMPT ||
      (typeof window !== "undefined"
        ? sessionStorage.getItem("informationArchitecturePrompt")
        : "")
  );

  const zoomIn = () =>
    setZoomLevel((current) =>
      Math.min(MAX_ZOOM_LEVEL, Number((current + ZOOM_STEP).toFixed(2)))
    );
  const zoomOut = () =>
    setZoomLevel((current) =>
      Math.max(MIN_ZOOM_LEVEL, Number((current - ZOOM_STEP).toFixed(2)))
    );
  const resetZoom = () => setZoomLevel(DEFAULT_ZOOM_LEVEL);

  useEffect(() => {
    if (!isPromptModalOpen) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsPromptModalOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isPromptModalOpen]);

  const handleRegenerate = async () => {
    if (!projectId) return;
    setRegenerating(true);
    setIaError("");
    try {
      const res = await fetch("/api/generate-information-architecture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, regenerate: true }),
      });
      const data = await res.json();
      if (data.success) setIaData(data.information_architecture);
      else setIaError(data.error || "Regeneration failed");
    } catch (err) {
      setIaError(err.message || "Regeneration failed");
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Loading Information Architecture...</p>
      </div>
    );
  }

  if (!iaData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-slate-500">{iaError || "No Information Architecture found."}</p>
      </div>
    );
  }

  const handleDownloadIA = async () => {
    if (!diagram.nodes.length) return;
    try {
      // Build a hidden full-size container at zoom=1 for capture
      const wrapper = document.createElement("div");
      wrapper.style.cssText = `position:fixed;left:-99999px;top:0;width:${diagram.width}px;height:${diagram.height}px;background:#fff;overflow:visible;`;

      const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svgEl.setAttribute("viewBox", `0 0 ${diagram.width} ${diagram.height}`);
      svgEl.setAttribute("width", String(diagram.width));
      svgEl.setAttribute("height", String(diagram.height));

      // Copy the rendered SVG content from the page
      const sourceSvg = document.querySelector("#ia-diagram svg");
      if (sourceSvg) {
        svgEl.innerHTML = sourceSvg.innerHTML;
      }
      wrapper.appendChild(svgEl);
      document.body.appendChild(wrapper);

      const canvas = await html2canvas(wrapper, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: diagram.width,
        height: diagram.height,
        onclone: (doc) => {
          doc.querySelectorAll("*").forEach((el) => {
            const cs = window.getComputedStyle(el);
            if (cs.backgroundColor.includes("oklch")) el.style.backgroundColor = "#ffffff";
            if (cs.color.includes("oklch")) el.style.color = "#000000";
            if (cs.borderColor.includes("oklch")) el.style.borderColor = "#cbd5e1";
          });
        },
      });

      document.body.removeChild(wrapper);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "landscape" : "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save("information-architecture.pdf");
    } catch (err) {
      console.error("PDF download failed:", err);
    }
  };

  return (
<div className="min-h-screen bg-slate-100 p-4 md:p-6">      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="h-10 w-10 rounded-full border border-slate-300 bg-white shadow-sm"
        >
          <ArrowLeft className="mx-auto h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-4xl">Information Architecture</h1>
          <p className="mt-1 text-slate-600">Structured view of pages, sections, actions, and components</p>
        </div>
      </div>

      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 bg-slate-900 px-6 py-4">
          <div className="text-lg font-bold text-white">IA Summary</div>
          <button
            type="button"
            onClick={() => setIsPromptModalOpen(true)}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-white/30 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            Prompt
          </button>
        </div>
        <div className="p-6 leading-8 text-slate-700">{iaData.IA_SUMMARY || "No summary available."}</div>
      </div>

      {isPromptModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          onClick={() => setIsPromptModalOpen(false)}
        >
          <div
            className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-5 py-4">
              <h3 className="text-base font-semibold text-white">Agent Response</h3>
              <button
                type="button"
                onClick={() => setIsPromptModalOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
                aria-label="Close prompt modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto bg-slate-50 p-5">
              {promptText ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                    {promptText}
                  </pre>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                  Prompt not available in IA response.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

<div
  id="ia-download"
  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm backdrop-blur"
>        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-gradient-to-r from-slate-900 to-slate-700 px-6 py-4">
  
  <div>
    <h2 className="text-lg font-bold text-white">
      Information Architecture Diagram
    </h2>

    
  </div>

  <div className="flex flex-wrap items-center gap-2">
    
    <button
      type="button"
      onClick={handleRegenerate}
      disabled={regenerating}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-60"
    >
      <RotateCcw className="h-4 w-4" />
      {regenerating ? "Regenerating..." : "Regenerate"}
    </button>

    <button
      type="button"
      onClick={handleDownloadIA}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
      style={{
        background: "linear-gradient(135deg, #4a00e0, #702dff)",
        boxShadow: "0 4px 14px rgba(74,0,224,0.25)",
      }}
    >
      <Download className="h-4 w-4" />
      Download PDF
    </button>

    <button
      type="button"
      onClick={zoomOut}
      disabled={zoomLevel <= MIN_ZOOM_LEVEL}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-500 bg-white/10 text-white shadow-sm transition hover:bg-white/20"
    >
      <Minus className="h-4 w-4" />
    </button>

    <div className="min-w-16 rounded-xl border border-slate-500 bg-white/10 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm">
      {Math.round(effectiveZoom * 100)}%
    </div>

    <button
      type="button"
      onClick={zoomIn}
      disabled={zoomLevel >= MAX_ZOOM_LEVEL}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-500 bg-white/10 text-white shadow-sm transition hover:bg-white/20"
    >
      <Plus className="h-4 w-4" />
    </button>

    <button
      type="button"
      onClick={resetZoom}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-500 bg-white/10 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-white/20"
    >
      <RotateCcw className="h-4 w-4" />
      Reset
    </button>

  </div>
</div>

        

        <div className="bg-slate-50 p-4 md:p-6">
          <div
            id="ia-diagram"
            ref={viewportRef}
className="rounded-2xl border border-slate-200 bg-white p-4 shadow-inner" style={{ height: "70vh", overflow: "scroll" }}          >
            <ArchitectureDiagram diagram={diagram} zoom={effectiveZoom} />
          </div>
        </div>

        <div className="flex flex-wrap gap-6 border-t bg-slate-50 px-6 py-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-4 w-6 rounded border-2 border-blue-700 bg-blue-100" />
            Page
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-6 rounded border-2 border-emerald-600 bg-emerald-100" />
            Section
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-6 rounded border-2 border-teal-600 bg-teal-100" />
            Action / Task
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-6 rounded border-2 border-orange-600 bg-orange-100" />
            Component / Widget
          </div>
        </div>
      </div>
    </div>
  );
}
