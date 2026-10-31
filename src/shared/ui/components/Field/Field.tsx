import type { InputHTMLAttributes } from 'react';
import { useId } from 'react';
import styles from './Field.module.css';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

/** Labelled text input. The label is always rendered, never a bare placeholder. */
export function Field({ label, hint, error, id, ...rest }: FieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className={`${styles.input} ${error ? styles.inputError : ''}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
      {hint && !error && (
        <p className={styles.hint} id={`${inputId}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className={styles.error} id={`${inputId}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
