/** Only allow same-origin relative paths as post-login redirect targets. */
export function safeNext(value: FormDataEntryValue | string | string[] | null | undefined) {
  const v = Array.isArray(value) ? value[0] : value;
  if (
    typeof v === "string" &&
    v.startsWith("/") &&
    !v.startsWith("//") &&
    !v.startsWith("/\\")
  ) {
    return v;
  }
  return "/activity";
}
