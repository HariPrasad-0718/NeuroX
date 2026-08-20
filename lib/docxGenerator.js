import { JSDOM } from "jsdom";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  WidthType,
} from "docx";

export async function createDocxBuffer(html) {
  const dom = new JSDOM(html);

  const document = dom.window.document;

  const children = [];

  let titleAdded = false;

  const elements = document.body.querySelectorAll(
    "h1, h2, h3, p, li, table"
  );

  elements.forEach((element) => {
    const tag = element.tagName.toLowerCase();

    const text = (element.textContent || "").trim();

    if (tag === "h1") {
      titleAdded = true;

      children.push(
        new Paragraph({
          text,
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 220 },
        })
      );

      return;
    }

    if (tag === "h2") {
      children.push(
        new Paragraph({
          text,
          heading: HeadingLevel.HEADING_2,
          spacing: {
            before: 180,
            after: 120,
          },
        })
      );

      return;
    }

    if (tag === "h3") {
      children.push(
        new Paragraph({
          text,
          heading: HeadingLevel.HEADING_3,
          spacing: {
            before: 140,
            after: 100,
          },
        })
      );

      return;
    }

    if (tag === "p") {
      if (text) {
        children.push(
          new Paragraph({
            text,
            spacing: {
              after: 120,
            },
          })
        );
      }

      return;
    }

    if (tag === "li") {
      if (text) {
        children.push(
          new Paragraph({
            text,
            bullet: {
              level: 0,
            },
            spacing: {
              after: 80,
            },
          })
        );
      }

      return;
    }

    if (tag === "table") {
      const rows = Array.from(element.querySelectorAll("tr"));

      if (!rows.length) return;

      const maxCols = rows.reduce(
        (max, row) =>
          Math.max(max, row.querySelectorAll("td,th").length),
        0
      );

      const tableRows = rows.map((row) => {
        const cells = Array.from(row.querySelectorAll("td,th"));

        const tableCells = [];

        for (let i = 0; i < maxCols; i++) {
          const value = (cells[i]?.textContent || "").trim();

          tableCells.push(
            new TableCell({
              children: [
                new Paragraph({
                  text: value || " ",
                }),
              ],
            })
          );
        }

        return new TableRow({
          children: tableCells,
        });
      });

      children.push(
        new Table({
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
          rows: tableRows,
        })
      );

      children.push(new Paragraph(""));
    }
  });

  if (!titleAdded) {
    children.unshift(
      new Paragraph({
        text: "Generated Document",
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}