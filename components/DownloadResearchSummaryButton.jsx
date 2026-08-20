"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  WidthType,
} from "docx";
import { saveAs } from "file-saver";
import { cleanResearchSummary } from "@/lib/cleanResearchSummary";

function appendHtmlToWordChildren(children, html) {
  const parser = new DOMParser();
  const dom = parser.parseFromString(String(html || ""), "text/html");
  const elements = dom.body.querySelectorAll("h1, h2, h3, h4, p, li, table");

  elements.forEach((element) => {
    const tag = element.tagName.toLowerCase();
    const text = (element.textContent || "").trim();

    if (tag === "h1") {
      if (text) {
        children.push(new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 180, after: 120 } }));
      }
      return;
    }

    if (tag === "h2") {
      if (text) {
        children.push(new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 160, after: 100 } }));
      }
      return;
    }

    if (tag === "h3") {
      if (text) {
        children.push(new Paragraph({ text, heading: HeadingLevel.HEADING_3, spacing: { before: 140, after: 90 } }));
      }
      return;
    }

    if (tag === "h4") {
      if (text) {
        children.push(new Paragraph({ text, heading: HeadingLevel.HEADING_4, spacing: { before: 120, after: 80 } }));
      }
      return;
    }

    if (tag === "p") {
      if (text) {
        children.push(new Paragraph({ text, spacing: { after: 100 } }));
      }
      return;
    }

    if (tag === "li") {
      if (text) {
        children.push(new Paragraph({ text, bullet: { level: 0 }, spacing: { after: 70 } }));
      }
      return;
    }

    if (tag === "table") {
      const rows = Array.from(element.querySelectorAll("tr"));
      if (!rows.length) return;

      const maxCols = rows.reduce((max, row) => Math.max(max, row.querySelectorAll("td,th").length), 0);
      if (!maxCols) return;

      const tableRows = rows.map((row) => {
        const cells = Array.from(row.querySelectorAll("td,th"));
        const tableCells = [];

        for (let i = 0; i < maxCols; i += 1) {
          const cellText = (cells[i]?.textContent || "").trim();
          tableCells.push(
            new TableCell({
              children: [new Paragraph({ text: cellText || " " })],
            })
          );
        }

        return new TableRow({ children: tableCells });
      });

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows,
        })
      );
      children.push(new Paragraph({ text: "", spacing: { after: 100 } }));
    }
  });
}

export default function DownloadResearchSummaryButton({
  report = "",
}) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);

      const html = String(report || "").trim();
      if (!html) {
        alert("Research Summary document not found.");
        return;
      }

      const documentModel = cleanResearchSummary(report);
      const sections = Array.isArray(documentModel?.sections) ? documentModel.sections : [];
      const generatedDate = new Date().toLocaleDateString();

      const children = [
        new Paragraph({
          text: "User Research Summary Report",
          heading: HeadingLevel.TITLE,
          spacing: { after: 260 },
        }),
        new Paragraph({
          text: "Comprehensive research findings generated using AI from stakeholder interviews, surveys, observations and product discovery.",
          spacing: { after: 220 },
        }),
        new Paragraph({ text: `Sections: ${sections.length}`, spacing: { after: 80 } }),
        new Paragraph({ text: `Generated: ${generatedDate}`, spacing: { after: 80 } }),
        new Paragraph({ text: "Status: Complete", spacing: { after: 180 } }),
      ];

      if (sections.length > 0) {
        sections.forEach((section) => {
          children.push(
            new Paragraph({
              text: section?.title || "Section",
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 180, after: 120 },
            })
          );
          appendHtmlToWordChildren(children, section?.html || "");
        });
      } else {
        appendHtmlToWordChildren(children, html);
      }

      children.push(new Paragraph({ text: "", spacing: { after: 120 } }));
      children.push(
        new Paragraph({
          text: "Generated using the NeuroX AI Research Summary Agent.",
          spacing: { after: 0 },
        })
      );

      const doc = new Document({ sections: [{ children }] });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, "Research_Summary.docx");
    } catch (err) {
      console.error(err);
      alert("Unable to generate Word document.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={downloading}
      className="inline-flex h-8 items-center gap-2 rounded-md border border-indigo-600 bg-indigo-600 px-3 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Download className="h-4 w-4" />

      {downloading ? "Preparing..." : "Download Word"}
    </button>
  );
}