import { BuildingInputError } from "./project-input";
export function parseBuildingRegistration(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new BuildingInputError("Бүртгэлийн мэдээлэл буруу байна");
  const body = value as Record<string, unknown>;
  function field(key: string, max: number) {
    const v = body[key];
    if (typeof v !== "string" || !v.trim() || v.length > max)
      throw new BuildingInputError("Бүртгэлийн бүх талбарыг зөв бөглөнө үү");
    return v.trim();
  }
  const mode = body.mode;
  if (mode !== "new" && mode !== "existing")
    throw new BuildingInputError("Бүртгэлийн төрлөө сонгоно уу");
  const email = field("email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new BuildingInputError("И-мэйл хаягаа шалгана уу");
  const password = body.password;
  if (
    typeof password !== "string" ||
    !password ||
    password.length > 1024 ||
    (mode === "new" &&
      (password.length < 10 || Buffer.byteLength(password, "utf8") > 72))
  )
    throw new BuildingInputError(
      "Шинэ нууц үг 10-аас доошгүй тэмдэгт, 72 байтаас ихгүй байна",
    );
  const fullName = mode === "new" ? field("fullName", 120) : "";
  const organizationName = field("organizationName", 180);
  const taxId = field("taxId", 20);
  if (!/^[a-zA-Z0-9А-Яа-яӨөҮү-]{6,20}$/.test(taxId))
    throw new BuildingInputError("Байгууллагын регистрийг шалгана уу");
  const phone = field("phone", 20).replace(/[\s()-]/g, "");
  if (!/^\+?\d{8,15}$/.test(phone))
    throw new BuildingInputError("Холбоо барих утсаа шалгана уу");
  return { mode, email, password, fullName, organizationName, taxId, phone };
}
