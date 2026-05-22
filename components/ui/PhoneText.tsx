type PhoneTextProps = {
  value: string | null | undefined;
};

export function PhoneText({ value }: PhoneTextProps) {
  const displayValue = value?.trim();

  if (!displayValue) {
    return "-";
  }

  return (
    <span dir="ltr" style={{ unicodeBidi: "isolate", whiteSpace: "nowrap" }}>
      {value}
    </span>
  );
}
