import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Trash2, Building, Lock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDepartments, addDepartment, removeDepartment, isDepartmentInUse } from "@/lib/database";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onBack: () => void;
}

const DepartmentManager = ({ onBack }: Props) => {
  const { toast } = useToast();
  const [departments, setDepartments] = useState<string[]>([]);
  const [deptUsage, setDeptUsage] = useState<Record<string, boolean>>({});
  const [newDept, setNewDept] = useState("");

  const refresh = async () => {
    const depts = await getDepartments();
    setDepartments(depts);
    const usage: Record<string, boolean> = {};
    await Promise.all(depts.map(async d => { usage[d] = await isDepartmentInUse(d); }));
    setDeptUsage(usage);
  };

  useEffect(() => { refresh(); }, []);

  const handleAdd = async () => {
    try {
      await addDepartment(newDept);
      setNewDept("");
      await refresh();
      toast({ title: "✅ Department Added", description: `${newDept.trim()} added successfully.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleRemove = async (name: string) => {
    try {
      await removeDepartment(name);
      await refresh();
      toast({ title: "🗑️ Department Removed", description: `${name} removed.` });
    } catch (err: any) {
      toast({ title: "Cannot Remove", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background cyber-grid p-4">
      <div className="container mx-auto max-w-2xl">
        <Button variant="ghost" onClick={onBack} className="mb-4 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <div className="glass-card rounded-2xl p-8 neon-border-purple">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl btn-neon-purple flex items-center justify-center">
              <Building className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold tracking-wider">DEPARTMENTS</h2>
              <p className="text-muted-foreground text-sm">Manage academic departments</p>
            </div>
          </div>

          <div className="flex gap-3 mb-6">
            <Input
              value={newDept}
              onChange={e => setNewDept(e.target.value)}
              placeholder="New department name..."
              className="bg-muted/30 border-border/50 h-12 text-sm focus:border-neon-purple focus:ring-neon-purple/20"
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
            />
            <Button onClick={handleAdd} disabled={!newDept.trim()} className="btn-neon-purple border-0 shrink-0 font-display tracking-wider text-xs rounded-xl h-12 px-6">
              <Plus className="mr-2 h-4 w-4" /> ADD
            </Button>
          </div>

          <div className="space-y-2">
            {departments.map((dept, i) => {
              const inUse = deptUsage[dept] || false;
              return (
                <motion.div
                  key={dept}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/20 hover:border-neon-purple/20 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Building className="h-4 w-4 text-neon-purple" />
                    <span className="font-semibold text-sm">{dept}</span>
                    {inUse && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-display tracking-wider bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20">
                        <Lock className="h-2.5 w-2.5" /> ON-CHAIN
                      </span>
                    )}
                  </div>
                  {inUse ? (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Protected
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(dept)}
                      className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </div>

          {departments.length === 0 && (
            <div className="text-center py-12">
              <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground/20" />
              <p className="text-muted-foreground text-sm">No departments. Add one to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DepartmentManager;
