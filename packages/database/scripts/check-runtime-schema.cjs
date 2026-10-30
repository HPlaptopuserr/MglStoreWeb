const { PrismaClient, Prisma } = require("@prisma/client");

/** Compare generated runtime models with database columns without reading user data. */
function missingModelColumns(models, columns) {
  const available = new Map();
  for (const column of columns) {
    const names = available.get(column.table_name) ?? new Set();
    names.add(column.column_name);
    available.set(column.table_name, names);
  }
  return models.flatMap((model) => {
    const table = model.dbName || model.name;
    const names = available.get(table);
    if (!names) return [table];
    return model.fields
      .filter(
        (field) =>
          field.kind !== "object" && !names.has(field.dbName || field.name),
      )
      .map((field) => `${table}.${field.dbName || field.name}`);
  });
}

async function main(modelNames) {
  if (!modelNames.length)
    throw new Error("Specify the Prisma models required by this release.");
  const models = modelNames.map((name) => {
    const model = Prisma.dmmf.datamodel.models.find(
      (candidate) => candidate.name === name,
    );
    if (!model) throw new Error(`Unknown runtime model: ${name}`);
    return model;
  });
  const client = new PrismaClient();
  try {
    const columns = await client.$queryRaw`SELECT table_name, column_name
      FROM information_schema.columns WHERE table_schema = current_schema()`;
    const missing = missingModelColumns(models, columns);
    if (missing.length)
      throw new Error(
        `Required database schema is missing: ${missing.join(", ")}. Apply the reviewed migrations before deploying.`,
      );
    console.log(`Runtime schema ready: ${modelNames.join(", ")}`);
  } finally {
    await client.$disconnect();
  }
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { missingModelColumns };
