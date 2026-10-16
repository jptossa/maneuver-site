/** Thrown when a row doesn't exist or isn't visible to the user (RLS). */
export class ActivityNotFoundError extends Error {
  constructor() {
    super("Activity not found.");
    this.name = "ActivityNotFoundError";
  }
}
