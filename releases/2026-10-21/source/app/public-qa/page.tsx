import PublicQaForm from './public-qa-form';

export default function PublicQaPage() {
 return <main className="mx-auto max-w-2xl space-y-4 p-8">
  <h1 className="text-2xl font-semibold">Ask about the public workforce demo</h1>
  <p>Live Q&amp;A is unavailable while its shared spending limit and evidence checks are being verified.</p>
  <p>This feature will answer questions about selected fictional workforce facts. It does not recommend workforce actions or create plans.</p>
  <PublicQaForm enabled={false}/>
 </main>;
}
