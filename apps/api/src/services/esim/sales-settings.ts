import { prisma } from "@mgl/database";
import {
  ESIM_SALES_SETTINGS_KEY,
  emptyEsimSalesSettings,
  parseEsimSalesSettings,
  type EsimSalesDocument,
  type EsimSalesSettings,
} from "@mgl/types";
export class EsimSettingsConflict extends Error {}
export interface EsimSalesStore {
  read(): Promise<EsimSalesDocument>;
  save(
    settings: EsimSalesSettings,
    revision: number,
    actor: string,
  ): Promise<EsimSalesDocument>;
}
export const esimSalesStore: EsimSalesStore = {
  async read() {
    const row = await prisma.siteSetting.findUnique({
      where: { key: ESIM_SALES_SETTINGS_KEY },
      select: { value: true },
    });
    if (!row) return { settings: emptyEsimSalesSettings(), revision: 0 };
    const raw: unknown = JSON.parse(row.value);
    if (
      !raw ||
      typeof raw !== "object" ||
      !("settings" in raw) ||
      !("revision" in raw) ||
      typeof raw.revision !== "number" ||
      !Number.isSafeInteger(raw.revision) ||
      raw.revision < 1
    )
      throw new Error("Invalid stored eSIM configuration");
    return {
      settings: parseEsimSalesSettings(raw.settings),
      revision: raw.revision,
    };
  },
  async save(settings, revision, actor) {
    const value = JSON.stringify({
      settings,
      revision: revision + 1,
      updatedBy: actor,
    });
    if (revision === 0) {
      try {
        await prisma.siteSetting.create({
          data: { key: ESIM_SALES_SETTINGS_KEY, value },
        });
      } catch (error: unknown) {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "P2002"
        )
          throw new EsimSettingsConflict();
        throw error;
      }
    } else {
      const row = await prisma.siteSetting.findUnique({
        where: { key: ESIM_SALES_SETTINGS_KEY },
        select: { value: true },
      });
      if (!row) throw new EsimSettingsConflict();
      const current: unknown = JSON.parse(row.value);
      if (
        !current ||
        typeof current !== "object" ||
        !("revision" in current) ||
        current.revision !== revision
      )
        throw new EsimSettingsConflict();
      const result = await prisma.siteSetting.updateMany({
        where: { key: ESIM_SALES_SETTINGS_KEY, value: row.value },
        data: { value },
      });
      if (result.count !== 1) throw new EsimSettingsConflict();
    }
    return { settings, revision: revision + 1 };
  },
};
