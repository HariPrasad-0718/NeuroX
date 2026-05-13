"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import ReactFlow, {
  Background,
  Controls,
  MiniMap,
} from "reactflow";

import "reactflow/dist/style.css";

export default function InformationArchitecturePage() {

  const [iaData, setIaData] = useState(null);

  const router = useRouter();

  useEffect(() => {

    const stored = sessionStorage.getItem(
      "informationArchitectureData"
    );

    if (stored) {

      setIaData(JSON.parse(stored));
    }

  }, []);

  if (!iaData) {

    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>No Information Architecture Found</p>
      </div>
    );
  }

  // -----------------------------------------
  // CREATE FLOW NODES + EDGES
  // -----------------------------------------

  const nodes = [];
const edges = [];

function buildTree(
  node,
  x,
  y,
  parentId = null
) {

  if (!node) return;

  const id =
    Math.random().toString(36).substring(7);

  let bg = "#ffffff";
  let border = "#6d28d9";

  if (node.type === "page") {
    bg = "#eef2ff";
  }

  if (node.type === "section") {
    bg = "#ecfeff";
    border = "#0891b2";
  }

  if (node.type === "action") {
    bg = "#ecfdf5";
    border = "#059669";
  }

  if (node.type === "component") {
    bg = "#fff7ed";
    border = "#ea580c";
  }

  // CREATE NODE
  nodes.push({
    id,

    position: { x, y },

    data: {
      label: (
        <div className="text-center">
          <div className="font-semibold">
            {node.name}
          </div>

          <div className="text-[10px] text-gray-500 mt-1">
            {node.type}
          </div>
        </div>
      ),
    },

    style: {
      padding: 12,
      borderRadius: 12,
      border: `2px solid ${border}`,
      background: bg,
      width: 160,
      fontSize: 12,
    },
  });

  // CREATE EDGE
  if (parentId) {
    edges.push({
      id: `${parentId}-${id}`,
      source: parentId,
      target: id,
      animated: false,
    });
  }

  // CHILDREN
  if (
    node.children &&
    node.children.length > 0
  ) {

    const spacing = 250;

    const startX =
      x -
      ((node.children.length - 1) *
        spacing) /
        2;

    node.children.forEach(
      (child, index) => {

        buildTree(
          child,
          startX + index * spacing,
          y + 180,
          id
        );

      }
    );
  }
}
 if (iaData?.IA_JSON) {
  buildTree(iaData.IA_JSON, 900, 50);
}

  return (

    <div className="min-h-screen bg-[#f5f7fb] p-6">

      {/* HEADER */}

      <div className="flex items-center gap-4 mb-6">

        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full border bg-white"
        >
          <ArrowLeft className="w-5 h-5 mx-auto" />
        </button>

        <div>
          <h1 className="text-4xl font-bold">
            Information Architecture
          </h1>

          <p className="text-gray-500 mt-1">
            AI Generated IA Structure
          </p>
        </div>
      </div>

      {/* SUMMARY */}

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden mb-8">

        <div className="bg-[#16162f] text-white px-6 py-4 font-bold text-lg">
          IA SUMMARY
        </div>

        <div className="p-6 text-gray-700 leading-8">
          {iaData.IA_SUMMARY}
        </div>
      </div>

      {/* TREE */}

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">

        <div className="bg-[#16162f] text-white px-6 py-4 font-bold text-lg">
          INFORMATION ARCHITECTURE TREE
        </div>

        <div
          style={{
            width: "100%",
            height: "900px",
          }}
        >

          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
          >
            <MiniMap />
            <Controls />
            <Background />
          </ReactFlow>

        </div>

        {/* LEGEND */}

        <div className="border-t px-6 py-4 flex flex-wrap gap-6 text-sm">

          <div className="flex items-center gap-2">
            <div className="w-6 h-4 rounded border-2 border-purple-700 bg-indigo-100"></div>
            Page
          </div>

          <div className="flex items-center gap-2">
            <div className="w-6 h-4 rounded border-2 border-green-500 bg-green-100"></div>
            Section
          </div>

          <div className="flex items-center gap-2">
            <div className="w-6 h-4 rounded border-2 border-cyan-500 bg-cyan-100"></div>
            Action / Task
          </div>

          <div className="flex items-center gap-2">
            <div className="w-6 h-4 rounded border-2 border-orange-500 bg-orange-100"></div>
            Component
          </div>

        </div>

      </div>

    </div>
  );
}