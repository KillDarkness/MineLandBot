const fs = require("fs");
const path = require("path");

function isTextFile(filePath) {
  return /\.(js|json|ts|txt|md|env|yml|yaml|html|css)$/i.test(filePath);
}

function cleanConflicts(content) {
  return content
    .replace(//g, "") // remove parte entre 
    .replace(/
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (file !== "node_modules") walkDir(fullPath); // ignora node_modules
    } else if (isTextFile(fullPath)) {
      let content = fs.readFileSync(fullPath, "utf8");

      if (content.includes("") && content.includes(">>>>>>>")) {
        const cleaned = cleanConflicts(content);
        fs.writeFileSync(fullPath, cleaned);
        console.log(`✅ Conflito removido de: ${fullPath}`);
      }
    }
  }
}

console.log("🧹 Limpando conflitos de merge no projeto...");
walkDir(process.cwd());
console.log("✨ Finalizado!");
