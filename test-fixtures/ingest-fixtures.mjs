import path from 'node:path';
import { ingestFile } from '../packages/ingestion-core/index.js';

const files = [
  'test-fixtures/karpathy-test.md',
  'test-fixtures/payroll-test.xlsx',
];

for (const f of files) {
  const result = await ingestFile({
    path: path.resolve(f),
    originalName: path.basename(f),
    mimeType: 'application/octet-stream',
    size: 0,
  });
  console.log(JSON.stringify({
    kind: result.parsed.kind,
    title: result.parsed.title,
    notePath: result.notePath,
    manifestPath: result.manifestPath,
    parser: result.parsed.parser,
  }, null, 2));
}
