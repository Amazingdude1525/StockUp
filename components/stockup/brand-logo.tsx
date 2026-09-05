export default function BrandLogo({
  compact = false,
  inverse = false,
}: {
  compact?: boolean;
  inverse?: boolean;
}) {
  return (
    <>
      <div
        className={`stockup-logo ${compact ? 'compact' : ''} ${inverse ? 'inverse' : ''}`}
        aria-hidden="true"
      />
      <span className="sr-only">StockUp — Inventory in Motion</span>
    </>
  );
}
