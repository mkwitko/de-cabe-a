/**
 * The locker room behind a page (the home's art and lamp, `.scene-art` in index.css), fixed under
 * everything. The home adds its own dust and entry; the Career Path level sits in the same room.
 */
export function LockerBackdrop({
  className = '',
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div aria-hidden="true" className={`scene-art ${className}`}>
      <div className="scene-cone" />
      {children}
    </div>
  );
}
