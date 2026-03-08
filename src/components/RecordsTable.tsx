import { ArrowLeft, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StudentRecord } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface Props {
  records: StudentRecord[];
  onBack: () => void;
}

const RecordsTable = ({ records, onBack }: Props) => {
  const { toast } = useToast();

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast({ title: "Copied", description: "Hash copied to clipboard" });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        <Card className="shadow-xl border-2">
          <CardHeader>
            <CardTitle className="font-display text-2xl">All Registered Certificates ({records.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No records found.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Roll No</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Marks</TableHead>
                      <TableHead>Hash</TableHead>
                      <TableHead>Tx Hash</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.studentName}</TableCell>
                        <TableCell>{r.rollNumber}</TableCell>
                        <TableCell>{r.department}</TableCell>
                        <TableCell>{r.academicYear}</TableCell>
                        <TableCell>{r.totalMarks}%</TableCell>
                        <TableCell>
                          <button onClick={() => copyHash(r.certificateHash)} className="flex items-center gap-1 text-xs font-mono text-primary hover:underline max-w-[120px] truncate">
                            {r.certificateHash.slice(0, 16)}... <Copy className="h-3 w-3 shrink-0" />
                          </button>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono text-muted-foreground max-w-[120px] truncate block">{r.blockchainTxHash.slice(0, 16)}...</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-success/10 text-success border-success/20">Registered</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RecordsTable;
