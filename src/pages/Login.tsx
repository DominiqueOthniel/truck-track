import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, Loader2, Shield, Eye, EyeOff, Lock } from 'lucide-react';
import { useAuth, LOGIN_USER_OPTIONS } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function Login() {
  const [selectedUser, setSelectedUser] = useState<string>(LOGIN_USER_OPTIONS[0].login);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, login: doLogin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !password) {
      toast.error('Veuillez sélectionner un utilisateur et entrer le mot de passe');
      return;
    }
    setLoading(true);
    try {
      const ok = await doLogin(selectedUser, password);
      if (ok) {
        toast.success('Connexion réussie');
        navigate('/', { replace: true });
      } else {
        toast.error('Identifiants incorrects');
      }
    } catch {
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const selectedOption = LOGIN_USER_OPTIONS.find(o => o.login === selectedUser);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0f1117]">

      {/* Fond animé — orbes de couleur */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-violet-600/20 blur-[120px] animate-float" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-[100px] login-orb-2" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-purple-600/10 blur-[80px]" />
        {/* Grille subtile */}
        <div className="absolute inset-0 opacity-[0.04] bg-dot-pattern" />
      </div>

      {/* Carte de connexion */}
      <div className="relative w-full max-w-md mx-4 animate-fade-in-scale">

        {/* Halo derrière la carte */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/30 to-indigo-500/30 rounded-3xl blur-2xl scale-105 opacity-70" />

        <div className="relative bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">

          {/* Header */}
          <div className="flex flex-col items-center mb-8 text-center">
            {/* Logo */}
            <div className="relative mb-5">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-2xl blur-xl opacity-70 scale-110 animate-pulse-glow" />
              <div className="relative bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-4 rounded-2xl shadow-2xl">
                <Truck className="h-10 w-10 text-white" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-white mb-1">
              Truck<span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">Track</span>
            </h1>
            <p className="text-white/50 text-sm">Gestion de flotte · Cameroun</p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Sélecteur utilisateur */}
            <div className="space-y-2">
              <Label className="text-white/70 text-sm font-medium">Utilisateur</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser} disabled={loading}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white h-12 rounded-xl hover:bg-white/8 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all">
                  <SelectValue placeholder="Choisir un utilisateur" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1d2e] border-white/10">
                  {LOGIN_USER_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.login}
                      value={opt.login}
                      className="text-white/80 focus:bg-violet-500/20 focus:text-white"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Badge rôle */}
            {selectedOption && (
              <div className="flex items-center gap-2 px-3 py-2 bg-violet-500/10 border border-violet-500/20 rounded-xl">
                <Shield className="h-3.5 w-3.5 text-violet-400 flex-shrink-0" />
                <span className="text-violet-300 text-xs">{selectedOption.label}</span>
              </div>
            )}

            {/* Mot de passe */}
            <div className="space-y-2">
              <Label className="text-white/70 text-sm font-medium">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/25 h-12 pl-10 pr-10 rounded-xl focus:border-violet-500/60 focus:ring-violet-500/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Bouton connexion */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 mt-2"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Connexion...</>
              ) : (
                'Se connecter'
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-center text-white/25 text-xs mt-6">
            Truck Track Cameroun © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
