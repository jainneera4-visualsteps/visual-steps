import { ProductDemoVideo } from '../components/ProductDemoVideo';

export default function DemoWatch() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-950 p-4 sm:p-8" aria-label="Visual Steps video">
      <div className="w-full max-w-5xl">
        <ProductDemoVideo autoOpen standalone />
      </div>
    </main>
  );
}
