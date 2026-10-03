import "../config/env";
import sharp from "sharp";
import { prisma } from "@mgl/database";
import {
  readIndex,
  rankVisualMatches,
} from "../services/visual-search/visual-search-index";
import { encodeSearchImage } from "../services/visual-search/visual-search-encoder";
import { loadVisualCatalogImage } from "../services/visual-search/visual-search-image-source";
import { publicVisualCatalogWhere } from "../services/visual-search/visual-search-catalog";

async function verify() {
  const index = await readIndex();
  const products = await prisma.product.findMany({
    where: await publicVisualCatalogWhere(),
    select: { id: true, images: { select: { url: true, id: true } } },
  });
  let exactTop1 = 0;
  let exactTop5 = 0;
  let transformedTop5 = 0;
  let evaluated = 0;
  const durations: number[] = [];
  for (const product of products) {
    const image = product.images.find((image) =>
      index.entries.some((entry) => entry.imageId === image.id),
    );
    if (!image) continue;
    const { body } = await loadVisualCatalogImage(image.url);
    const started = performance.now();
    const vector = await encodeSearchImage(body);
    durations.push(performance.now() - started);
    const matches = rankVisualMatches(vector, index.entries);
    if (matches[0]?.productId === product.id) exactTop1++;
    if (matches.slice(0, 5).some((m) => m.productId === product.id))
      exactTop5++;
    const transformed = await sharp(body)
      .rotate(6, { background: "white" })
      .resize({ width: 640 })
      .jpeg({ quality: 70 })
      .toBuffer();
    const variants = rankVisualMatches(
      await encodeSearchImage(transformed),
      index.entries,
    );
    if (variants.slice(0, 5).some((m) => m.productId === product.id))
      transformedTop5++;
    evaluated++;
  }
  const blank = await sharp({
    create: { width: 300, height: 300, channels: 3, background: "#888888" },
  })
    .png()
    .toBuffer();
  const blankMatches = rankVisualMatches(
    await encodeSearchImage(blank),
    index.entries,
  ).length;
  durations.sort((a, b) => a - b);
  console.log(
    JSON.stringify(
      {
        evaluated,
        exactTop1,
        exactTop5,
        transformedTop5,
        blankMatches,
        medianEncodeMs: Math.round(
          durations[Math.floor(durations.length / 2)] ?? 0,
        ),
        maxEncodeMs: Math.round(durations.at(-1) ?? 0),
        rssMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      null,
      2,
    ),
  );
}
verify()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
