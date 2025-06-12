import Checklist from "@/components/Checklist";

export const metadata = {
  title: "Couples To-Do",
};

export default function TodoPage() {
  return (
    <div className="h-screen grid grid-cols-2">
      {/* Left – pink */}
      <Checklist id="left" bgColor="bg-pink-100" label="Partner A" />

      {/* Right – green */}
      <Checklist id="right" bgColor="bg-green-100" label="Partner B" />
    </div>
  );
}
