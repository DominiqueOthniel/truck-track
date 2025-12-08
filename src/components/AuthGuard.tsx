import { useState, useEffect, ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Eye, EyeOff, Shield } from 'lucide-react';
import { validatePasswordStrength } from '@/lib/security';
import { initializeStorage, hasPassword, checkPassword } from '@/lib/storage';
import { toast } from 'sonner';

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{ valid: boolean; score: number; feedback: string[] } | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    const hasStoredPassword = hasPassword();
    setIsFirstTime(!hasStoredPassword);
    setIsInitializing(false);
    
    // Si pas de mot de passe, on demande la création
    // Sinon, on vérifie la session
    const sessionAuth = sessionStorage.getItem('truck_track_authenticated');
    if (sessionAuth === 'true' && hasStoredPassword) {
      setIsAuthenticated(true);
    }
  };

  const handleFirstTimeSetup = async () => {
    if (!password) {
      toast.error('Veuillez saisir un mot de passe');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      toast.error('Le mot de passe n\'est pas assez fort');
      return;
    }

    const success = await initializeStorage(password);
    if (success) {
      sessionStorage.setItem('truck_track_authenticated', 'true');
      setIsAuthenticated(true);
      toast.success('Mot de passe configuré avec succès');
    } else {
      toast.error('Erreur lors de la configuration');
    }
  };

  const handleLogin = async () => {
    if (!password) {
      toast.error('Veuillez saisir votre mot de passe');
      return;
    }

    const isValid = await checkPassword(password);
    if (isValid) {
      sessionStorage.setItem('truck_track_authenticated', 'true');
      setIsAuthenticated(true);
      toast.success('Connexion réussie');
    } else {
      toast.error('Mot de passe incorrect');
      setPassword('');
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (isFirstTime && value.length > 0) {
      setPasswordStrength(validatePasswordStrength(value));
    }
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 animate-pulse text-primary" />
          <p className="text-muted-foreground">Chargement de la sécurité...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <Dialog open={true}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-2xl">
                {isFirstTime ? 'Configuration de la Sécurité' : 'Connexion Sécurisée'}
              </DialogTitle>
              <DialogDescription className="text-center">
                {isFirstTime
                  ? 'Configurez un mot de passe fort pour protéger vos données'
                  : 'Entrez votre mot de passe pour accéder à l\'application'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="password">Mot de passe {isFirstTime && '*'}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        isFirstTime ? handleFirstTimeSetup() : handleLogin();
                      }
                    }}
                    placeholder={isFirstTime ? 'Créez un mot de passe fort' : 'Entrez votre mot de passe'}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {isFirstTime && passwordStrength && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            passwordStrength.score >= 4
                              ? 'bg-green-500'
                              : passwordStrength.score >= 2
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {passwordStrength.score}/5
                      </span>
                    </div>
                    {passwordStrength.feedback.length > 0 && (
                      <Alert className="mt-2">
                        <AlertDescription className="text-xs">
                          <ul className="list-disc list-inside space-y-1">
                            {passwordStrength.feedback.map((msg, idx) => (
                              <li key={idx}>{msg}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </div>

              {isFirstTime && (
                <div>
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleFirstTimeSetup();
                      }
                    }}
                    placeholder="Confirmez votre mot de passe"
                  />
                </div>
              )}

              <Button
                onClick={isFirstTime ? handleFirstTimeSetup : handleLogin}
                className="w-full"
                disabled={!password || (isFirstTime && (!confirmPassword || password !== confirmPassword))}
              >
                <Lock className="mr-2 h-4 w-4" />
                {isFirstTime ? 'Configurer la Sécurité' : 'Se Connecter'}
              </Button>

              {isFirstTime && (
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>Important :</strong> Ce mot de passe sera utilisé pour chiffrer toutes vos données.
                    Assurez-vous de le mémoriser ou de le stocker en lieu sûr. Sans ce mot de passe, vos données seront inaccessibles.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return <>{children}</>;
}





