"use client";

export default function DeleteActivityButton({
  action,
  date,
}: {
  /** Server action already bound to the activity id */
  action: (formData: FormData) => Promise<void>;
  /** Activity date, so we return to the right day after deleting */
  date: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm("Delete this activity? This can't be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="date" value={date} />
      <button type="submit">Delete</button>
    </form>
  );
}
