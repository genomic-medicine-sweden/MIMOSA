export function parseTSV(text) {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim()
    .split("\n");
  if (lines.length < 2) return null;
  const headers = lines[0].split("\t").map((h) => h.trim());
  const sampleAliases = [
    "file",
    "filename",
    "sample",
    "sample_id",
    "isolate",
    "id",
  ];
  const sampleIdx = headers.findIndex((h) =>
    sampleAliases.includes(h.toLowerCase()),
  );
  if (sampleIdx === -1) return null;
  const locusHeaders = headers.filter((_, i) => i !== sampleIdx);
  const locusIndices = headers.map((_, i) => i).filter((i) => i !== sampleIdx);
  const samples = lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const cols = line.split("\t");
      const sample_id = (cols[sampleIdx] ?? "").trim();
      const alleles = {};
      locusIndices.forEach((colIdx, i) => {
        alleles[locusHeaders[i]] = (cols[colIdx] ?? "").trim();
      });
      return { sample_id, alleles };
    })
    .filter((s) => s.sample_id);
  return { samples, loci_count: locusHeaders.length };
}

export function isTsvFile(f) {
  return f.name.endsWith(".tsv") || f.name.endsWith(".txt");
}

async function getFilesFromEntry(entry, collected) {
  if (entry.isFile) {
    const file = await new Promise((r) => entry.file(r));
    if (isTsvFile(file)) collected.push(file);
  } else if (entry.isDirectory) {
    const reader = entry.createReader();
    const entries = await new Promise((r) => reader.readEntries(r));
    for (const child of entries) await getFilesFromEntry(child, collected);
  }
}

export async function collectDroppedFiles(dataTransfer) {
  const collected = [];
  const pending = Array.from(dataTransfer.items || [])
    .map((item) => {
      const entry = item.webkitGetAsEntry?.();
      if (entry) return { entry };
      const f = item.getAsFile();
      return f && isTsvFile(f) ? { file: f } : null;
    })
    .filter(Boolean);
  for (const p of pending) {
    if (p.file) collected.push(p.file);
    else await getFilesFromEntry(p.entry, collected);
  }
  return collected;
}
