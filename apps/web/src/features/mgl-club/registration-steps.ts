import { normalizeRegistrationWebsite } from "./registration-website";
import { mglClubFields, type MglClubField } from "@mgl/types";

interface RegistrationStep {
  title: string;
  shortTitle: string;
  description: string;
  fields: readonly MglClubField[];
}
export const registrationSteps = [
  {
    title: "Бизнесийн үндсэн мэдээлэл",
    shortTitle: "Бизнес",
    description: "Бизнесээ ямар нэрээр, хаана, ямар чиглэлээр танилцуулах вэ?",
    fields: ["businessName", "sector", "city", "foundedYear", "teamSize"],
  },
  {
    title: "Үйлчилгээ ба хамтын ажиллагаа",
    shortTitle: "Үйлчилгээ",
    description: "Юу санал болгодог, ямар хамтрагч хайж байгаагаа бичээрэй.",
    fields: ["description", "offers", "needs", "serviceArea"],
  },
  {
    title: "Холбоо барих мэдээлэл",
    shortTitle: "Холбоо",
    description: "Клубийн гишүүд тантай хэрхэн холбогдох вэ?",
    fields: ["name", "phone", "role", "address", "workingHours", "website"],
  },
  {
    title: "Мэдээллээ хянаад нийтлэх",
    shortTitle: "Шалгах",
    description:
      "Гишүүдэд харагдах мэдээллээ шалгаарай. Засах бол тухайн хэсэг рүү буцаж болно.",
    fields: [],
  },
] as const satisfies readonly RegistrationStep[];
export type RegistrationValues = Record<MglClubField, string> & {
  logoUrl?: string;
};
export function readRegistrationValues(
  form: HTMLFormElement,
): RegistrationValues {
  const data = new FormData(form);
  return {
    logoUrl: String(data.get("logoUrl") ?? ""),
    ...Object.fromEntries(
      mglClubFields.map((field) => [
        field.id,
        String(data.get(field.id) ?? "").trim(),
      ]),
    ),
  } as RegistrationValues;
}
export type RegistrationControl =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;
export function firstInvalidControl(
  fieldset: HTMLFieldSetElement,
): RegistrationControl | undefined {
  return Array.from(
    fieldset.querySelectorAll<RegistrationControl>("input,select,textarea"),
  ).find((control) => {
    control.setCustomValidity("");
    if (control.required && !control.value.trim())
      control.setCustomValidity("Энэ мэдээллийг бөглөнө үү.");
    if (
      control instanceof HTMLInputElement &&
      control.type === "number" &&
      control.value &&
      (!/^[1-9]\d*$/.test(control.value) ||
        (control.maxLength > 0 && control.value.length > control.maxLength))
    )
      control.setCustomValidity(
        "Тоог зөвхөн цифрээр, эхэнд нь 0 оруулахгүй бичнэ үү.",
      );
    if (control.name === "website" && control.value.trim()) {
      const normalized = normalizeRegistrationWebsite(control.value);
      if (normalized === null)
        control.setCustomValidity(
          "Зөв домэйн эсвэл вэб хуудасны холбоос оруулна уу. Жишээ: mglbusiness.mn",
        );
      else control.value = normalized;
    }
    return !control.checkValidity();
  });
}
