import { WorkforceError } from "./access";
export function quoteSeats(
  seats: number,
  monthlyPrice: number | null,
  expiresAt: Date | null,
  now = new Date(),
): number {
  if (!Number.isSafeInteger(seats) || seats < 1 || seats > 1000)
    throw new WorkforceError(400, "Нэмэх ажилтны тоо 1–1000 байна");
  if (!monthlyPrice || !Number.isSafeInteger(monthlyPrice) || !expiresAt)
    throw new WorkforceError(
      409,
      "Ажилтны үнэ болон гэрээний хугацааг App Control дээр тохируулна уу",
    );
  const days = Math.ceil((+expiresAt - +now) / 86400000);
  if (days <= 0)
    throw new WorkforceError(
      409,
      "Гэрээний хугацаа дууссан. Эхлээд сунгана уу",
    );
  const amount = Math.ceil((seats * monthlyPrice * days) / 30);
  if (!Number.isSafeInteger(amount) || amount > 100000000)
    throw new WorkforceError(400, "Төлбөрийн хэмжээ хэтэрсэн");
  return amount;
}
