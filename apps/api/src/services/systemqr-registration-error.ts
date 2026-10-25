export const SYSTEMQR_REGISTRATION_001_MESSAGE =
  "Minu бүртгэл 001 (Системийн алдаа) хариу буцаалаа. Энэ хариунаас яг аль талбар эсвэл системд алдаа гарсныг тогтоох боломжгүй. Данс холбогдсон нь баталгаажаагүй. Хот, дүүрэг, хороо / багаа Minu-ийн жагсаалтаас дахин сонгож, данс эзэмшигчийн нэр, регистр, дансны дугаар болон мерчант төрлийг банкны бүртгэлтэй тулган шалгана уу. Мэдээлэл зөв бол Minu дэмжлэгээр хүсэлтийн шалтгааныг шалгуулна уу.";

export function isSystemQrRegistration001(error: unknown): boolean {
  return error instanceof Error &&
    /subMerchant register failed \(001\)/i.test(error.message);
}
