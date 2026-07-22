import type { StudyProgramRow, StudyTeacherRow } from "./project-editor.types";
export const MAX_PROJECT_IMAGES = 12;
export const PROJECT_PDF_UPLOAD_LIMIT_BYTES = 200 * 1024 * 1024;
export const STUDY_DELIVERY_TYPE_OPTIONS = [
  "Бүртгэл авч байна",
  "Танхимын сургалт",
  "Online сургалт удахгүй",
  "Online сургалт",
  "Hybrid сургалт",
  "Хаалттай сургалт",
];
export const STUDY_DURATION_OPTIONS = [
  "2 цаг",
  "3 цаг",
  "4.5 цаг",
  "1 өдөр",
  "2 өдөр",
  "7 хоног",
  "Хугацаа тохиролцоно",
];
export const STUDY_LOCATION_OPTIONS = [
  "Танхим",
  "Online",
  "Hybrid",
  "Байгууллага дээр",
  "Online сургалт удахгүй",
  "Байршил тохиролцоно",
];
export const STUDY_CAPACITY_OPTIONS = [
  "1 хүн",
  "1-10 хүн",
  "10-20 хүн",
  "20-30 хүн",
  "30+ хүн",
  "Багийн сургалт",
  "Хүний тоо тохиролцоно",
];
export const STUDY_PRICE_NOTE_OPTIONS = [
  "1 хүний эрх",
  "Багийн үнэ",
  "Байгууллагын багц",
  "Нээлттэй бүртгэл",
  "Төлбөртэй бүртгэл",
  "Үнэгүй бүртгэл",
];
export const STUDY_REGISTRATION_LABEL_OPTIONS = [
  "Бүртгэл нээлттэй",
  "Нээлттэй",
  "Бүртгэл авч байна",
  "Удахгүй эхэлнэ",
  "Дүүрсэн",
  "Хаалттай",
];
export const EMPTY_STUDY_PROGRAM_ROW: StudyProgramRow = {
  title: "",
  description: "",
};
export const EMPTY_STUDY_TEACHER_ROW: StudyTeacherRow = {
  name: "",
  description: "",
  imageUrl: "",
};
export const EMPTY_STUDY_PROGRAM_MARKER = "__EMPTY_STUDY_PROGRAM_ROW__";
export const EMPTY_STUDY_TEACHER_MARKER = "__EMPTY_STUDY_TEACHER_ROW__";
