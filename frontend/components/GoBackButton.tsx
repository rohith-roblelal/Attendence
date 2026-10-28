'use client';

export default function GoBackButton() {
  return (
    <button
      onClick={() => history.back()}
      className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background text-foreground px-5 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      Go Back
    </button>
  );
}
