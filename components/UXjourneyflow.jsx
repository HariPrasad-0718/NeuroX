"use client";

const TYPE_REMAP = { entry:"start", exit_success:"end", exit_fail:"end", action:"process", loop:"process", stage_label:"process" };

const STYLE = {
  start:    { bg:"#0f172a", border:"#0f172a", text:"#f8fafc", chipBg:"#1e293b", chipText:"#93c5fd", chip:"START",    radius:999 },
  end:      { bg:"#111827", border:"#111827", text:"#f8fafc", chipBg:"#1f2937", chipText:"#93c5fd", chip:"END",      radius:999 },
  decision: { bg:"#fef7ec", border:"#f8d7a6", text:"#7c2d12", chipBg:"#ffedd5", chipText:"#9a3412", chip:"DECISION", radius:12  },
  process:  { bg:"#ffffff", border:"#d7e1f2", text:"#0f172a", chipBg:"#eef4ff", chipText:"#1d4ed8", chip:"PROCESS",  radius:16  },
};

export default function UXJourneyFlow({ flow }) {
  const nodes = (flow?.nodes || []).map(n => ({
    ...n,
    type: TYPE_REMAP[n.type] || (["start","end","decision","process"].includes(n.type) ? n.type : "process"),
  }));

  const edges = (flow?.edges || []).map(e => ({
    from: String(e.from || e.source || ""),
    to:   String(e.to   || e.target || ""),
    label: e.label || "",
  })).filter(e => e.from && e.to);

  // Build connector label map: nodeId → label of outgoing edge
  const edgeLabelMap = {};
  edges.forEach(e => { if (!edgeLabelMap[e.from]) edgeLabelMap[e.from] = e.label; });

  if (!nodes.length) return <p style={{textAlign:"center",color:"#94a3b8",padding:40}}>No flow data</p>;

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"32px 24px",gap:0,background:"linear-gradient(180deg,#f8faff,#f1f5ff)",borderRadius:20,border:"1px solid #e2e8f0",overflowX:"auto"}}>
      {flow?.title && <h2 style={{fontSize:18,fontWeight:700,color:"#0f172a",marginBottom:4,textAlign:"center"}}>{flow.title}</h2>}
      {flow?.persona && <p style={{fontSize:13,color:"#64748b",marginBottom:28,textAlign:"center"}}>{flow.persona}</p>}

      {nodes.map((node, i) => {
        const s = STYLE[node.type] || STYLE.process;
        const connLabel = edgeLabelMap[node.id] || "";
        const isLast = i === nodes.length - 1;

        return (
          <div key={node.id} style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
            {/* Node */}
            <div style={{
              background: s.bg,
              border: `2px solid ${s.border}`,
              borderRadius: s.radius,
              padding: node.type === "start" || node.type === "end" ? "12px 40px" : "14px 32px",
              minWidth: node.type === "start" || node.type === "end" ? 160 : 280,
              maxWidth: 380,
              boxShadow: "0 4px 16px rgba(15,23,42,0.09)",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
            }}>
              <span style={{fontSize:9,fontWeight:800,letterSpacing:"0.08em",color:s.chipText,background:s.chipBg,borderRadius:999,padding:"2px 10px"}}>{s.chip}</span>
              <span style={{fontSize:14,fontWeight:700,color:s.text,textAlign:"center",lineHeight:1.4}}>{node.label}</span>
            </div>

            {/* Connector */}
            {!isLast && (
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,margin:"2px 0"}}>
                <div style={{width:2,height:18,background:"#c9d5e7"}}/>
                <svg width="12" height="10"><polygon points="6,10 0,0 12,0" fill="#94a3b8"/></svg>
                {connLabel && (
                  <span style={{fontSize:11,fontWeight:700,color:"#475569",background:"#fff",border:"1px solid #dbe6f2",borderRadius:999,padding:"2px 12px",margin:"2px 0"}}>
                    {connLabel}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
