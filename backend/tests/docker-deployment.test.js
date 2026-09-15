import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const dockerfilePath = path.resolve(currentDir, '../Dockerfile');

test('production container applies Prisma migrations before starting the SaaS API', () => {
  const dockerfile = fs.readFileSync(dockerfilePath, 'utf8');

  assert.match(dockerfile, /COPY --from=builder \/app\/node_modules \/app\/node_modules/);
  assert.match(
    dockerfile,
    /npm --prefix \/app\/packages\/database run migrate:deploy && node \/app\/backend\/saas\/server\.js/
  );
});
