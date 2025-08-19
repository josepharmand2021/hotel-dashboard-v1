'use client';

export default function DeleteAuthButton({ formId }: { formId: string }) {
  const handleClick = () => {
    if (confirm('Delete this auth user?')) {
      const form = document.getElementById(formId) as HTMLFormElement | null;
      form?.requestSubmit(); // submit form server action
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-red-600 underline text-sm"
    >
      Delete auth
    </button>
  );
}
