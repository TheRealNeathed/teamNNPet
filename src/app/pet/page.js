import Pet from "@/components/Pet";

export default function PetPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Pet room="default" />
    </div>
  );
}
