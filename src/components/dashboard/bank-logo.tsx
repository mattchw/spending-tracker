import { cn } from "@/lib/utils";

export function BankLogo({
  logo,
  bank,
  className,
}: {
  logo: string | null;
  bank: string;
  className?: string;
}) {
  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt={bank}
        className={cn(
          "size-6.5 flex-none rounded-md border bg-white object-contain",
          className
        )}
      />
    );
  }
  return (
    <span
      className={cn(
        "bg-card-2 text-muted-foreground grid size-6.5 flex-none place-items-center rounded-md border text-xs font-bold uppercase",
        className
      )}
    >
      {(bank || "?").charAt(0)}
    </span>
  );
}
