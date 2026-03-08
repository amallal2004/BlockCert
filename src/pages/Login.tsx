import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, GraduationCap, ArrowLeft, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role") || "admin";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(username, password);
    if (success) {
      toast({ title: "Login successful", description: `Welcome back!` });
      navigate(role === "admin" ? "/admin" : "/student");
    } else {
      toast({ title: "Login failed", description: "Invalid credentials. Try admin/admin or student1/student1", variant: "destructive" });
    }
  };

  const isAdmin = role === "admin";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
        <Card className="w-full max-w-md shadow-xl border-2">
          <CardHeader className="text-center pb-2">
            <div className={`mx-auto mb-4 h-16 w-16 rounded-2xl flex items-center justify-center ${isAdmin ? "gradient-primary" : "gradient-success"}`}>
              {isAdmin ? <Shield className="h-8 w-8 text-primary-foreground" /> : <GraduationCap className="h-8 w-8 text-primary-foreground" />}
            </div>
            <CardTitle className="font-display text-2xl">{isAdmin ? "Admin Login" : "Student Login"}</CardTitle>
            <CardDescription>
              {isAdmin ? "University administrator access" : "View your certificate & QR code"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" value={username} onChange={e => setUsername(e.target.value)} placeholder={isAdmin ? "admin" : "student1"} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Same as username (demo)" required />
              </div>
              <Button type="submit" className="w-full gradient-primary text-primary-foreground border-0 h-11">
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Button>
            </form>
            <div className="mt-4 p-3 rounded-lg bg-muted text-xs text-muted-foreground">
              <strong>Demo:</strong> {isAdmin ? "username: admin, password: admin" : "username: student1, password: student1"}
            </div>
            <Button variant="ghost" asChild className="w-full mt-4">
              <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;
