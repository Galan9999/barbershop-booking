import type { ReactNode } from 'react';
import styles from './Callout.module.css';

interface CalloutProps {
  tone: 'warning' | 'danger';
  children: ReactNode;
}

/** Inline message. Tone is carried by an icon and text, never by colour alone. */
export function Callout({ tone, children }: CalloutProps) {
  return (
    <p className={`${styles.callout} ${styles[tone]}`} role="alert">
      <span aria-hidden="true" className={styles.icon}>
        {tone === 'danger' ? '✕' : '!'}
      </span>
      <span>{children}</span>
    </p>
  );
}
