"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import { cleanResearchSummary } from "@/lib/cleanResearchSummary";

function StatCard({ title, value }) {
  return (
    <div className="rounded-xl border border-indigo-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-3xl font-bold text-indigo-700">
        {value}
      </p>
    </div>
  );
}

function Section({
  section,
  open,
  onToggle,
}) {
  return (
    <div className="border-b border-slate-200">

      <button
        onClick={onToggle}
        className="flex w-full items-center gap-4 px-10 py-5 text-left hover:bg-slate-50 transition"
      >

        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-indigo-100 text-indigo-700 font-bold">
          {section.number}
        </div>

        <div className="flex-1">

          <h3 className="text-lg font-semibold text-slate-800">
            {section.title}
          </h3>

        </div>

        {open ? (
          <ChevronDown className="h-5 w-5 text-slate-500" />
        ) : (
          <ChevronRight className="h-5 w-5 text-slate-500" />
        )}
      </button>

      {open && (
        <div className="research-html border-t border-slate-100 bg-white px-10 py-8">

          <div
            dangerouslySetInnerHTML={{
              __html: section.html,
            }}
          />

        </div>
      )}

    </div>
  );
}

export default function ResearchSummaryViewer({
  report,
}) {
  const document = useMemo(
    () => cleanResearchSummary(report),
    [report]
  );

  const [collapsed, setCollapsed] = useState({});

  if (!document || !document.sections.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
        No Research Summary available.
      </div>
    );
  }

  const toggle = (id) => {
    setCollapsed((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };
  console.log(document.sections);
  return (
    <>
      <article className="research-document mx-auto max-w-[920px] overflow-hidden rounded-xl border border-slate-300 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.18)]">

        {/* COVER PAGE */}

        <header className="border-b border-slate-200 bg-gradient-to-b from-white to-slate-50 px-12 py-14">

          <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-indigo-100">

            <FileText className="h-8 w-8 text-indigo-700" />

          </div>

          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-indigo-600">
            AI Generated Document
          </p>

          <h1 className="mt-3 text-4xl font-bold text-slate-900">
            User Research Summary Report
          </h1>

          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            Comprehensive research findings generated using AI from stakeholder
            interviews, surveys, observations and product discovery.
          </p>

        </header>

        {/* METRICS */}

        <section className="border-b border-slate-200 bg-slate-50 px-12 py-8">

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

            <StatCard
              title="Sections"
              value={document.sections.length}
            />

            <StatCard
              title="Generated"
              value={new Date().toLocaleDateString()}
            />

            <StatCard
              title="Status"
              value="Complete"
            />

          </div>

        </section>

        {/* DOCUMENT SECTIONS */}

        <div className="divide-y divide-slate-100">

          {document.sections.map((section) => (

            <Section
              key={section.id}
              section={section}
              open={!collapsed[section.id]}
              onToggle={() => toggle(section.id)}
            />

          ))}

        </div>

        {/* FOOTER */}

        <div className="border-t border-slate-200 bg-slate-50 px-12 py-2 text-[10px] text-slate-500">

          Generated using the NeuroX AI Research Summary Agent.

        </div>

      </article>
      <style jsx global>{`
  .research-document {
    font-family: Georgia, "Times New Roman", serif;
    color: #1f2937;
  }

  /* -----------------------------
      Typography
  ------------------------------*/

  .research-html {
    font-family: Georgia, "Times New Roman", serif;
    line-height: 1.9;
    color: #334155;
    font-size: 16px;
  }

  .research-html > :first-child {
    margin-top: 0;
  }

  .research-html p {
    margin-bottom: 18px;
    color: #334155;
    line-height: 1.9;
  }

  /* -----------------------------
      Headings
  ------------------------------*/

  .research-html h1 {
    margin: 0 0 28px;
    padding-bottom: 12px;
    border-bottom: 2px solid #0f172a;
    font-size: 34px;
    font-weight: 700;
    color: #0f172a;
  }

  .research-html h2 {
    margin: 36px 0 18px;
    padding-left: 16px;
    border-left: 5px solid #4f46e5;
    font-size: 25px;
    font-weight: 700;
    color: #111827;
  }

  .research-html h3 {
    margin: 28px 0 14px;
    font-size: 20px;
    font-weight: 700;
    color: #1e293b;
  }

  .research-html h4 {
    margin: 22px 0 10px;
    font-size: 17px;
    font-weight: 700;
    color: #334155;
  }

  /* -----------------------------
      Lists
  ------------------------------*/

  .research-html ul {
    margin: 18px 0;
    padding-left: 26px;
  }

  .research-html ol {
    margin: 18px 0;
    padding-left: 26px;
  }

  .research-html li {
    margin-bottom: 10px;
    color: #374151;
  }

  .research-html li::marker {
    color: #4f46e5;
    font-weight: bold;
  }

  /* -----------------------------
      Tables
  ------------------------------*/

  .research-html table {
    width: 100%;
    margin: 30px 0;
    border-collapse: collapse;
    border-radius: 10px;
    overflow: hidden;
  }

  .research-html thead {
    background: #eef2ff;
  }

  .research-html th {
    border: 1px solid #d1d5db;
    padding: 12px;
    text-align: left;
    font-weight: 700;
    color: #312e81;
  }

  .research-html td {
    border: 1px solid #d1d5db;
    padding: 12px;
    vertical-align: top;
  }

  .research-html tbody tr:nth-child(even) {
    background: #fafafa;
  }

  /* -----------------------------
      Blockquotes
  ------------------------------*/

  .research-html blockquote {
    margin: 24px 0;
    padding: 18px 22px;
    background: #f8fafc;
    border-left: 5px solid #6366f1;
    font-style: italic;
    color: #475569;
  }

  /* -----------------------------
      Horizontal Rule
  ------------------------------*/

  .research-html hr {
    margin: 30px 0;
    border: none;
    border-top: 1px solid #d1d5db;
  }

  /* -----------------------------
      Code
  ------------------------------*/

  .research-html code {
    background: #f3f4f6;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 14px;
    color: #be123c;
  }

  .research-html pre {
    background: #0f172a;
    color: white;
    padding: 18px;
    border-radius: 10px;
    overflow-x: auto;
    margin: 22px 0;
  }

  /* -----------------------------
      Images
  ------------------------------*/

  .research-html img {
    max-width: 100%;
    border-radius: 10px;
    margin: 24px auto;
    display: block;
  }

  /* -----------------------------
      Links
  ------------------------------*/

  .research-html a {
    color: #4338ca;
    text-decoration: underline;
  }

  /* -----------------------------
      Strong
  ------------------------------*/

  .research-html strong {
    color: #111827;
    font-weight: 700;
  }

  /* -----------------------------
      Responsive
  ------------------------------*/

  @media (max-width: 768px) {

    .research-document {
      margin: 0;
      border-radius: 0;
    }

    .research-html {
      font-size: 15px;
    }

    .research-html h1 {
      font-size: 28px;
    }

    .research-html h2 {
      font-size: 22px;
    }

    .research-html h3 {
      font-size: 18px;
    }
  }
`}
</style>

            </>
            
            
  );


}


