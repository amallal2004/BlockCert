import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, GraduationCap, ArrowLeft, LogIn, Hexagon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import ParticleField from "@/components/ParticleField";

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
      toast({ title: "Access Granted", description: "Authenticated successfully." });
      navigate(role === "admin" ? "/admin" : "/student");
    } else {
      toast({ title: "Access Denied", description: "Invalid credentials. Contact your admin for login details.", variant: "destructive" });
    }
  };

  const isAdmin = role === "admin";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background cyber-grid relative p-4">
      <ParticleField />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-neon-cyan/5 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className={`glass-card rounded-2xl p-8 ${isAdmin ? "neon-border-cyan" : "neon-border-purple"}`}>
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className={`mx-auto mb-5 h-20 w-20 rounded-2xl flex items-center justify-center ${isAdmin ? "btn-neon-cyan" : "btn-neon-purple"} neon-pulse`}
            >
              {isAdmin ? <Shield className="h-10 w-10" /> : <GraduationCap className="h-10 w-10" />}
            </motion.div>
            <h1 className="font-display text-2xl font-bold tracking-wider mb-2">
              {isAdmin ? "ADMIN ACCESS" : "STUDENT ACCESS"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isAdmin ? "University administrator portal" : "View your certificate & QR code"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="font-display text-xs tracking-wider text-muted-foreground">USERNAME</Label>
              <Input
                id="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder={isAdmin ? "admin" : "roll number (e.g. cs2024001)"}
                required
                className="bg-muted/30 border-border/50 h-12 font-mono text-sm focus:border-primary focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-display text-xs tracking-wider text-muted-foreground">PASSWORD</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-muted/30 border-border/50 h-12 font-mono text-sm focus:border-primary focus:ring-primary/20"
              />
            </div>
            <Button type="submit" className={`w-full h-12 border-0 font-display tracking-wider text-sm rounded-xl ${isAdmin ? "btn-neon-cyan" : "btn-neon-purple"}`}>
              <LogIn className="mr-2 h-4 w-4" />
              AUTHENTICATE
            </Button>
          </form>

          <div className="mt-5 p-3 rounded-xl bg-muted/20 border border-border/30 text-xs text-muted-foreground">
            <Hexagon className="h-3 w-3 inline mr-1 text-neon-cyan" />
            {isAdmin ? (
              <span className="font-mono">Demo: admin / admin123</span>
            ) : (
              <span>Login with your <span className="text-neon-purple font-semibold">Roll Number</span> (lowercase) and password provided by admin. Default password = roll number.</span>
            )}
          </div>

          <Button variant="ghost" asChild className="w-full mt-4 text-muted-foreground hover:text-foreground">
            <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
