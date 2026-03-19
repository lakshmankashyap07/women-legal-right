// ======================================
// 🔄 Women Legal FAQ CSV Keyword Updater
// ======================================

const fs = require("fs");

// Load the existing CSV
const inputFile = "legal_faq.csv";
const outputFile = "legal_faq_updated.csv";

// ✅ Keyword groups (repeat pattern every 10 rows)
const keywords = [
  "protection_order_emergency",
  "steps_after_sexual_assault",
  "report_trafficking",
  "refuse_domestic_relocation",
  "marital_rape_laws",
  "name_change_after_marriage",
  "custody_safety",
  "womens_shelters",
  "workplace_discrimination",
  "police_refuse_FIR"
];

try {
  const data = fs.readFileSync(inputFile, "utf8");
  const lines = data.trim().split("\n");

  const updated = lines.map((line, index) => {
    // Skip header if present
    if (index === 0 && line.toLowerCase().includes("id")) return line;

    const parts = line.split(",");
    const keywordIndex = index % keywords.length;
    parts[0] = keywords[keywordIndex]; // replace first column with keyword
    return parts.join(",");
  });

  fs.writeFileSync(outputFile, updated.join("\n"), "utf8");
  console.log("✅ Updated CSV saved as:", outputFile);
  console.log("👉 Open 'legal_faq_updated.csv' to verify new keywords.");
} catch (err) {
  console.error("❌ Error updating CSV:", err.message);
}
