import { useState } from "react";
import { ArrowLeft, Copy, Hexagon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StudentRecord } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface Props {
  records: StudentRecord[];
  onBack: () => void;
}

const RecordsTable = ({ records, onBack }: Props) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  
  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast({ title: "Copied", description: "Hash copied to clipboard" });
  };

  return (
    <div className="min-h-screen bg-background cyber-grid p-4">
      <div className="container mx-auto">
        <Button variant="ghost" onClick={onBack} className="mb-4 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="glass-card rounded-2xl overflow-hidden neon-border-purple">
          <div className="p-6 border-b border-border/30 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl btn-neon-purple flex items-center justify-center">
              <Hexagon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-sm font-bold tracking-wider">ALL CERTIFICATES</h2>
              <p className="text-xs text-muted-foreground">{records.length} records on-chain</p>
            </div>
          </div>
           <div className="p-4">
             {(() => {
               const filteredRecords = records.filter(r =>
                 r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 r.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 r.department.toLowerCase().includes(searchTerm.toLowerCase())
               );
 
             if (filteredRecords.length === 0 && records.length === 0) {
               return (
                 <p className="text-center text-muted-foreground py-12 text-sm">No records found.</p>
               );
             }

             if (filteredRecords.length === 0) {
               return (
                 <p className="text-center text-muted-foreground py-12 text-sm">No records match your search.</p>
               );
             }

            return (
              <>
                <div className="mb-4 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by name, roll number, or department..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-muted/20 border border-border/30 focus:border-neon-cyan/50 focus:outline-none focus:ring-1 focus:ring-neon-cyan/30 text-sm transition-colors"
                  />
                </div>
               <div className="overflow-x-auto">
                 <Table>
                   <TableHeader>
                     <TableRow className="border-border/20 hover:bg-transparent">
                       <TableHead className="font-display text-xs tracking-wider text-muted-foreground">STUDENT</TableHead>
                       <TableHead className="font-display text-xs tracking-wider text-muted-foreground">ROLL NO</TableHead>
                       <TableHead className="font-display text-xs tracking-wider text-muted-foreground">DEPT</TableHead>
                       <TableHead className="font-display text-xs tracking-wider text-muted-foreground">YEAR</TableHead>
                       <TableHead className="font-display text-xs tracking-wider text-muted-foreground">MARKS</TableHead>
                       <TableHead className="font-display text-xs tracking-wider text-muted-foreground">HASH</TableHead>
                       <TableHead className="font-display text-xs tracking-wider text-muted-foreground">TX HASH</TableHead>
                       <TableHead className="font-display text-xs tracking-wider text-muted-foreground">STATUS</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {filteredRecords.map(r => (
                      <TableRow key={r.id} className="border-border/10 hover:bg-muted/10">
                        <TableCell className="font-semibold">{r.studentName}</TableCell>
                        <TableCell className="font-mono text-xs">{r.rollNumber}</TableCell>
                        <TableCell className="text-sm">{r.department}</TableCell>
                        <TableCell className="text-sm">{r.academicYear}</TableCell>
                        <TableCell className="text-sm">{r.totalMarks}%</TableCell>
                        <TableCell>
                          <button onClick={() => copyHash(r.certificateHash)} className="flex items-center gap-1 text-xs font-mono text-neon-cyan hover:text-neon-cyan/80 max-w-[120px] truncate">
                            {r.certificateHash.slice(0, 16)}... <Copy className="h-3 w-3 shrink-0" />
                          </button>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono text-muted-foreground max-w-[120px] truncate block">{r.blockchainTxHash.slice(0, 16)}...</span>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-display tracking-wider bg-neon-green/10 text-neon-green border border-neon-green/20">
                            ON-CHAIN
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordsTable;
