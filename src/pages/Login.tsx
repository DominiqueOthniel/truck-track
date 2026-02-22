import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, Loader2 } from 'lucide-react';
import { useAuth, LOGIN_USER_OPTIONS } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function Login() {
  const [selectedUser, setSelectedUser] = useState<string>(LOGIN_USER_OPTIONS[0].login);
  const [password, setPassword] = useState('');
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-950/20 via-background to-indigo-950/20 p-4">
      <div className="fixed inset-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none bg-[linear-gradient(to_right,#6366f1_1px,transparent_1px),linear-gradient(to_bottom,#6366f1_1px,transparent_1px)] bg-[size:24px_24px]" />
      <Card className="w-full max-w-md shadow-2xl border-2 border-violet-500/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-fuchsia-500/5 pointer-events-none" />
        <CardHeader className="text-center pb-2 relative">
          <div className="flex justify-center mb-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-500 rounded-2xl blur-xl opacity-60" />
              <div className="relative p-4 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-600 shadow-lg">
                <Truck className="h-12 w-12 text-white" />
              </div>
            </div>
          </div>
          <CardTitle className="text-2xl bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">Truck Track</CardTitle>
          <p className="text-sm text-muted-foreground">Cameroun — Connexion</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="user">Utilisateur</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser} disabled={loading}>
                <SelectTrigger id="user" className="mt-1">
                  <SelectValue placeholder="Choisir un utilisateur" />
                </SelectTrigger>
                <SelectContent>
                  {LOGIN_USER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.login} value={opt.login}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
                className="mt-1"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connexion...
                </>
              ) : (
                'Se connecter'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
