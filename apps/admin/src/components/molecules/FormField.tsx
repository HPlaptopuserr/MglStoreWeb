import { Label } from "../atoms/Label";
import { Input, InputProps } from "../atoms/Input";
import { useId } from "react";

export interface FormFieldProps extends InputProps {
    label: string;
    error?: string;
}

export function FormField({ label, error, required, ...inputProps }: FormFieldProps) {
    const id = useId();
    const inputId = inputProps.id || id;

    return (
        <div>
            <Label htmlFor={inputId} required={required}>
                {label}
            </Label>
            <Input
                id={inputId}
                hasError={!!error}
                required={required}
                aria-invalid={!!error}
                aria-describedby={error ? `${inputId}-error` : undefined}
                {...inputProps}
            />
            {error && (
                <p id={`${inputId}-error`} className="mt-1 text-sm text-red-500" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
