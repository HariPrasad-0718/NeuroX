/**
 * Cleans and structures the User Research Summary.
 *
 * Returns:
 *
 * {
 *   title,
 *   sections: [
 *     {
 *       id,
 *       number,
 *       title,
 *       html
 *     }
 *   ]
 * }
 */

export function cleanResearchSummary(raw) {
  const html = removeDuplicateTitle(extractText(raw));

  return {
    title: "User Research Summary Report",
    sections: splitIntoSections(html),
  };
}

/* -------------------------------------------------------------------------- */
/*                               TEXT CLEANING                                */
/* -------------------------------------------------------------------------- */

function extractText(raw) {
  if (!raw) {
    return "";
  }

  // Already parsed into our desired structure
  if (
    typeof raw === "object" &&
    raw !== null &&
    raw.sections &&
    Array.isArray(raw.sections)
  ) {
    return raw.sections
      .map((section) => section.html || "")
      .join("");
  }

  // Raw object returned by API
  if (typeof raw === "object" && raw !== null) {
    raw =
      raw.user_research_summary_report ||
      raw.final_response ||
      raw.report ||
      JSON.stringify(raw);
  }

  let text = String(raw).trim();

  // Remove markdown code fences
  text = text
    .replace(/^```html\s*/i, "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "");

  // JSON string
  if (text.startsWith("{")) {
    try {
      const parsed = JSON.parse(text);

      text =
        parsed.user_research_summary_report ||
        parsed.final_response ||
        parsed.report ||
        parsed.message ||
        text;
    } catch {
      // Ignore
    }
  }

  // Quoted JSON string
  if (text.startsWith('"') && text.endsWith('"')) {
    try {
      text = JSON.parse(text);
    } catch {
      // Ignore
    }
  }

  text = text
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, " ")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'");

  // Remove wrapper:
  // user_research_summary_report='...'
  text = text.replace(
    /^user_research_summary_report\s*=\s*['"]/i,
    ""
  );

  text = text.replace(/['"]$/, "");

  return text.trim();
}

/* -------------------------------------------------------------------------- */
/*                          REMOVE DUPLICATE TITLE                            */
/* -------------------------------------------------------------------------- */

function removeDuplicateTitle(html) {
  return html.replace(
    /<h1[^>]*>\s*User Research Summary Report\s*<\/h1>/i,
    ""
  );
}

/* -------------------------------------------------------------------------- */
/*                             SPLIT SECTIONS                                 */
/* -------------------------------------------------------------------------- */

function splitIntoSections(html) {
  const regex = /<h2[^>]*>(.*?)<\/h2>/gi;

  const matches = [...html.matchAll(regex)];

  if (!matches.length) {
    return [
      {
        id: "report",
        number: "",
        title: "Report",
        html,
      },
    ];
  }

  const sections = [];

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];

    const start = current.index + current[0].length;

    const end =
      i + 1 < matches.length
        ? matches[i + 1].index
        : html.length;

    const heading = current[1]
      .replace(/<[^>]+>/g, "")
      .trim();

    const number =
      heading.match(/^(\d+)/)?.[1] || "";

    sections.push({
      id: slugify(heading),
      number,
      title: heading,
      html: html.substring(start, end).trim(),
    });
  }

  return sections;
}

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, "-");
}