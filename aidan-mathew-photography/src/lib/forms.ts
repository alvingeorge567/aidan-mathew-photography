export type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
  reference?: string;
  fieldErrors?: Record<string, string>;
};

export const initialFormState: FormState = { status: "idle" };
