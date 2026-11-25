/** Display confirmation separately from bank authorization; unknown never means declined. */
export function getSelfServiceCardConfirmation(status: string | undefined) {
  if (status === "APPROVED") {
    return {
      title: "Төлбөр баталгаажсан",
      message: "",
      action: "Төлөгдсөн · Баримтыг дуусгах",
      unresolved: false,
    };
  }
  if (status === "DECLINED") {
    return {
      title: "Төлбөр амжилтгүй",
      message: "",
      action: "Амжилтгүй · Дахин төлөх",
      unresolved: false,
    };
  }
  return {
    title: "Төлбөрийн баталгаажуулалт амжилтгүй",
    message:
      "Мөнгө суутгагдсан эсэх тодорхойгүй. Өмнөх гүйлгээг дахин шалгана уу. Шинээр картын төлбөр бүү эхлүүлээрэй.",
    action: "Дахин шалгах",
    unresolved: true,
  };
}
