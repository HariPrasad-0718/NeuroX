import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";

export const generateProjectDocument = async (project, questions, templateName) => {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: templateName + " Document",
                bold: true,
                size: 32,
              }),
            ],
          }),

          new Paragraph(" "),

          new Paragraph({
            children: [
              new TextRun({
                text: "Project Name: " + project.projectName,
                bold: true,
              }),
            ],
          }),

          new Paragraph({
            text: "Description: " + project.projectDescription,
          }),

          new Paragraph(" "),
          new Paragraph("Questions:"),

          ...questions.map(
            (q, i) =>
              new Paragraph({
                text: `${i + 1}. ${q}`,
              })
          ),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${project.projectName}.docx`);
};