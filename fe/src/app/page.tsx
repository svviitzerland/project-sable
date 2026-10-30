import { ApiStatus } from "@/components/api-status";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-widest text-stone-500">Project starter</p>
        <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">Start building your idea.</h1>
        <p className="max-w-xl text-lg text-stone-600">Next.js, React, Tailwind CSS, shadcn/ui, FastAPI, and Pydantic are ready to go.</p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <a className={buttonVariants()} href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer">Explore API docs</a>
        <ApiStatus />
      </div>
      <p className="text-sm text-stone-500">Replace this page with your project. Start with <code>docs/PRODUCT_SPEC.md</code>.</p>
    </main>
  );
}
