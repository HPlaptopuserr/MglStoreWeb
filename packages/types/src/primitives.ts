export type ID = string;
export type ISODateString = string;
export type DecimalString = string;
export type URLString = string;
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];
