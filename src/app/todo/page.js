// src/app/todo/page.js
import Checklist from "@/components/Checklist";

export default function TodoPage() {
  return (
    <div className="grid grid-cols-2 h-screen">
      <Checklist side="left"  bgColor="bg-pink-100"  label="NA" />
      <Checklist side="right" bgColor="bg-green-100" label="NK" />
    </div>
  );
}
