import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, User, Lock, Mail, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const AuthModal = () => {
  const { isAuthModalOpen, closeAuthModal, login, register } = useAuth();
  const [activeTab, setActiveTab] = useState("login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await login(loginEmail, loginPassword);

    if (result.success) {
      toast.success("Welcome back!");
      setLoginEmail("");
      setLoginPassword("");
    } else {
      setError(result.error);
      toast.error(result.error);
    }

    setIsLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (registerPassword !== registerConfirmPassword) {
      setError("Passwords do not match");
      toast.error("Passwords do not match");
      return;
    }

    if (registerPassword.length < 8) {
      setError("Password must be at least 8 characters");
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    const result = await register(registerUsername, registerEmail, registerPassword);

    if (result.success) {
      toast.success("Account created successfully!");
      setRegisterUsername("");
      setRegisterEmail("");
      setRegisterPassword("");
      setRegisterConfirmPassword("");
    } else {
      setError(result.error);
      toast.error(result.error);
    }

    setIsLoading(false);
  };

  return (
    <Dialog open={isAuthModalOpen} onOpenChange={closeAuthModal}>
      <DialogContent className="sm:max-w-[425px] bg-[#0B0B14] border-white/10 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            <span className="bg-gradient-to-r from-yellow-400 via-pink-500 to-orange-500 bg-clip-text text-transparent">
              SYNTHESUS IDE
            </span>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/5">
            <TabsTrigger
              value="login"
              className="data-[state=active]:bg-pink-500/20 data-[state=active]:text-pink-400"
            >
              Login
            </TabsTrigger>
            <TabsTrigger
              value="register"
              className="data-[state=active]:bg-pink-500/20 data-[state=active]:text-pink-400"
            >
              Register
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
              >
                <AlertCircle className="w-4 h-4" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <TabsContent value="login" className="mt-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-zinc-400 text-xs uppercase tracking-wider">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    id="login-email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="pl-10 bg-white/5 border-white/10 focus:border-pink-500 focus:ring-pink-500/50 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-zinc-400 text-xs uppercase tracking-wider">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    id="login-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="pl-10 bg-white/5 border-white/10 focus:border-pink-500 focus:ring-pink-500/50 text-white"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-yellow-400 via-pink-500 to-orange-500 text-black font-semibold hover:opacity-90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register" className="mt-4">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-username" className="text-zinc-400 text-xs uppercase tracking-wider">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    id="register-username"
                    type="text"
                    value={registerUsername}
                    onChange={(e) => setRegisterUsername(e.target.value)}
                    placeholder="Choose a username"
                    required
                    minLength={3}
                    className="pl-10 bg-white/5 border-white/10 focus:border-pink-500 focus:ring-pink-500/50 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-email" className="text-zinc-400 text-xs uppercase tracking-wider">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    id="register-email"
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="pl-10 bg-white/5 border-white/10 focus:border-pink-500 focus:ring-pink-500/50 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-password" className="text-zinc-400 text-xs uppercase tracking-wider">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    id="register-password"
                    type="password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="Create a password (min 8 chars)"
                    required
                    minLength={8}
                    className="pl-10 bg-white/5 border-white/10 focus:border-pink-500 focus:ring-pink-500/50 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-confirm" className="text-zinc-400 text-xs uppercase tracking-wider">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    id="register-confirm"
                    type="password"
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                    className="pl-10 bg-white/5 border-white/10 focus:border-pink-500 focus:ring-pink-500/50 text-white"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-yellow-400 via-pink-500 to-orange-500 text-black font-semibold hover:opacity-90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
