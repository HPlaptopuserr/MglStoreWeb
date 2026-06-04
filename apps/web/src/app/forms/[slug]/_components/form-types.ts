export interface FieldOption {
  id: string;
  value: string;
}

export interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options?: FieldOption[];
  placeholder?: string;
}

export interface FormData {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  fields: FormField[];
}

export type FormValue = string | string[];
export type FormValues = Record<string, FormValue>;
