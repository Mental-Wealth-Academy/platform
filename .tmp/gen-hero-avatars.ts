import fs from 'node:fs';
import { getAssignedAvatars } from '../lib/avatars.ts';
const xs = getAssignedAvatars('community-hero-strip');
fs.writeFileSync('.tmp/community-hero-avatars.json', JSON.stringify(xs.slice(0,4).map(x => x.image_url)));
console.log('written');
