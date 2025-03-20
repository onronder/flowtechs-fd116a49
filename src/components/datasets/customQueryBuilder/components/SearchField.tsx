
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchFieldProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  placeholder?: string;
}

export default function SearchField({ 
  searchTerm, 
  setSearchTerm, 
  placeholder = "Search..." 
}: SearchFieldProps) {
  return (
    <div className="relative">
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="pl-8"
      />
    </div>
  );
}
