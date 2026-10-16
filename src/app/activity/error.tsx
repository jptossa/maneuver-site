"use client";

export default function ActivityError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <h1>Activity</h1>
      <p role="alert">
        Something went wrong loading your activity. The page stumbled, not you.
      </p>
      <p>
        <small>{error.message}</small>
      </p>
      <button type="button" onClick={reset}>
        Try again
      </button>
    </>
  );
}
