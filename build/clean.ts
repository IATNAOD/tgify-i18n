import { rmSync } from 'fs'

// tsc never removes outputs of deleted sources, so every build starts from scratch
for (const dir of ['lib', 'typings']) rmSync(dir, { recursive: true, force: true })
