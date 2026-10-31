import * as React from "react";
import { cn } from "@/lib/utils";

const baseFieldClass =
  "w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-body-md text-ink shadow-none transition-colors placeholder:text-fog/80 focus:border-bronze focus:outline-none focus:ring-2 focus:ring-bronze/30 disabled:cursor-not-allowed disabled:bg-ivory disabled:opacity-70";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return <input ref={ref} type={type} className={cn(baseFieldClass, "h-11", className)} {...props} />;
});
Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return <textarea ref={ref} className={cn(baseFieldClass, "min-h-24 resize-y py-3", className)} {...props} />;
});
Textarea.displayName = "Textarea";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => {
  return (
    <select ref={ref} className={cn(baseFieldClass, "h-11 cursor-pointer appearance-none pr-9", className)} {...props}>
      {children}
    </select>
  );
});
Select.displayName = "Select";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        "h-4.5 w-4.5 shrink-0 cursor-pointer appearance-none rounded border border-charcoal/25 bg-paper",
        "transition-colors checked:border-charcoal checked:bg-charcoal checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23f6f3ed%22 stroke-width=%223%22><path d=%22M5 13l4 4L19 7%22/></svg>')] checked:bg-center checked:bg-no-repeat",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
});
Checkbox.displayName = "Checkbox";

export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
  name?: string;
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value, onValueChange, name, children, ...props }, ref) => {
    return (
      <div ref={ref} role="radiogroup" className={cn("grid gap-2", className)} {...props}>
        {React.Children.map(children, (child) => {
          if (!React.isValidElement<{ value?: string; name?: string; checked?: boolean; onCheckedChange?: (v: boolean) => void }>(child)) {
            return child;
          }
          return React.cloneElement(child, {
            name,
            checked: child.props.value !== undefined && child.props.value === value,
            onCheckedChange: child.props.onCheckedChange ?? ((checked: boolean) => {
              if (checked && child.props.value !== undefined) onValueChange?.(child.props.value!);
            }),
          });
        })}
      </div>
    );
  },
);
RadioGroup.displayName = "RadioGroup";

export interface RadioItemProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value"> {
  value: string;
  onCheckedChange?: (checked: boolean) => void;
}

const RadioItem = React.forwardRef<HTMLInputElement, RadioItemProps>(
  ({ className, checked, onCheckedChange, children, ...props }, ref) => {
    return (
      <label className={cn("flex cursor-pointer items-center gap-3 text-body-md", className)}>
        <span className="relative flex h-4.5 w-4.5 shrink-0 items-center justify-center">
          <input
            ref={ref}
            type="radio"
            checked={checked}
            onChange={(e) => onCheckedChange?.(e.target.checked)}
            className="peer h-4.5 w-4.5 cursor-pointer appearance-none rounded-full border border-charcoal/25 bg-paper transition-colors checked:border-charcoal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze"
            {...props}
          />
          <span className="pointer-events-none absolute h-2 w-2 rounded-full bg-charcoal opacity-0 transition-opacity peer-checked:opacity-100" />
        </span>
        {children}
      </label>
    );
  },
);
RadioItem.displayName = "RadioItem";

export interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked = false, onCheckedChange, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze",
          checked ? "bg-charcoal" : "bg-stone",
          className,
        )}
        {...props}
      >
        <span
          className={cn(
            "inline-block h-4.5 w-4.5 transform rounded-full bg-paper shadow-sm transition-transform",
            checked ? "translate-x-5.5" : "translate-x-1",
          )}
        />
      </button>
    );
  },
);
Switch.displayName = "Switch";

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => {
    return <label ref={ref} className={cn("text-body-sm font-medium text-ink", className)} {...props} />;
  },
);
Label.displayName = "Label";

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
}

function Field({ className, label, htmlFor, hint, error, children, ...props }: FieldProps) {
  return (
    <div className={cn("grid gap-1.5", className)} {...props}>
      {label ? <Label htmlFor={htmlFor}>{label}</Label> : null}
      {children}
      {hint && !error ? <p className="text-caption text-fog">{hint}</p> : null}
      {error ? <p className="text-caption text-danger" role="alert">{error}</p> : null}
    </div>
  );
}

export { Input, Textarea, Select, Checkbox, RadioGroup, RadioItem, Switch, Label, Field };
