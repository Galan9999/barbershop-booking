import styles from './ShopTitle.module.css';

interface ShopTitleProps {
  /** From BUSINESS_NAME_LINES. The first of several lines becomes the kicker. */
  lines: readonly string[];
}

/**
 * The shop name as the page heading. With two or more lines the first one is
 * set small, spaced out and framed by rules ("BARBERSHOP"), and the rest carries
 * the weight ("Armando Britez"). A single line renders plain.
 */
export function ShopTitle({ lines }: ShopTitleProps) {
  const [first = '', ...rest] = lines;
  if (rest.length === 0) {
    return <h1 className={styles.title}>{first}</h1>;
  }
  return (
    <h1 className={styles.title}>
      <span className={styles.kicker}>{first}</span>
      {/* A space so the accessible name reads "Barbershop Armando Britez". */}{' '}
      <span className={styles.main}>{rest.join(' ')}</span>
    </h1>
  );
}
