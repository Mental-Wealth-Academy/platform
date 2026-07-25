const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const brainDir = '/Users/james/.gemini/antigravity/brain/b0565246-dc42-4e71-857f-1d48f3d33f6e';
const publicDir = path.join(__dirname, '../public/images/shop');

async function processImage(inputPath, outputPath) {
  try {
    const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const width = info.width;
    const height = info.height;
    const pixels = Buffer.from(data);

    // Breadth-first search flood fill from border pixels
    const visited = new Uint8Array(width * height);
    const queue = new Int32Array(width * height * 2);
    let qHead = 0;
    let qTail = 0;

    // Push border pixels
    for (let x = 0; x < width; x++) {
      queue[qTail++] = x; queue[qTail++] = 0;
      queue[qTail++] = x; queue[qTail++] = height - 1;
    }
    for (let y = 0; y < height; y++) {
      queue[qTail++] = 0; queue[qTail++] = y;
      queue[qTail++] = width - 1; queue[qTail++] = y;
    }

    function isBackground(r, g, b) {
      // White/near-white
      if (r > 225 && g > 225 && b > 225) return true;
      // Light grey / checkerboard pattern pixels
      if (Math.abs(r - g) < 12 && Math.abs(g - b) < 12 && r > 180 && r < 245) return true;
      return false;
    }

    while (qHead < qTail) {
      const x = queue[qHead++];
      const y = queue[qHead++];
      const idx = y * width + x;

      if (visited[idx]) continue;
      visited[idx] = 1;

      const p = idx * 4;
      const r = pixels[p];
      const g = pixels[p + 1];
      const b = pixels[p + 2];

      if (isBackground(r, g, b)) {
        pixels[p + 3] = 0; // Alpha = 0

        // Neighbors
        if (x > 0 && !visited[y * width + (x - 1)]) { queue[qTail++] = x - 1; queue[qTail++] = y; }
        if (x < width - 1 && !visited[y * width + (x + 1)]) { queue[qTail++] = x + 1; queue[qTail++] = y; }
        if (y > 0 && !visited[(y - 1) * width + x]) { queue[qTail++] = x; queue[qTail++] = y - 1; }
        if (y < height - 1 && !visited[(y + 1) * width + x]) { queue[qTail++] = x; queue[qTail++] = y + 1; }
      }
    }

    await sharp(pixels, { raw: { width, height, channels: 4 } })
      .png()
      .toFile(outputPath);

    console.log(`Successfully processed: ${path.basename(outputPath)}`);
  } catch (err) {
    console.error(`Error processing ${inputPath}:`, err.message);
  }
}

async function main() {
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const files = fs.readdirSync(brainDir);
  for (const file of files) {
    if (file.endsWith('.jpg') || file.endsWith('.png')) {
      const baseName = file.replace(/_\d+\.(jpg|png)$/, '').replace(/_/g, '-');
      const inputPath = path.join(brainDir, file);
      const outputPath = path.join(publicDir, `${baseName}.png`);
      await processImage(inputPath, outputPath);
    }
  }

  // Also process any jpg/webp files already in publicDir
  const pubFiles = fs.readdirSync(publicDir);
  for (const file of pubFiles) {
    if (file.endsWith('.jpg') || file.endsWith('.webp')) {
      const baseName = path.basename(file, path.extname(file));
      const inputPath = path.join(publicDir, file);
      const outputPath = path.join(publicDir, `${baseName}.png`);
      await processImage(inputPath, outputPath);
    }
  }
}

main();
