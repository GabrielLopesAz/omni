
import { useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useUserLogs } from "./useUserLogs";
import { useUserProfile } from "./useUserProfile";

export const useAuthentication = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { registerUserAction } = useUserLogs();
  const { profile, fetchProfile, setProfile } = useUserProfile();
  const navigate = useNavigate();

  // Login
  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting sign in for:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (!error) {
        navigate('/');
        toast({
          title: "Login realizado com sucesso!",
          description: "Bem-vindo ao sistema.",
        });
        console.log('Sign in successful:', data.user?.email);
      } else {
        console.error('Sign in error:', error);
      }

      return { error };
    } catch (error) {
      console.error('Erro no login:', error);
      return { error };
    }
  };

  // Cadastro
  const signUp = async (email: string, password: string, nome: string) => {
    try {
      console.log('Attempting sign up for:', email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome
          }
        }
      });

      if (!error && data.user) {
        // Definir role padrão
        const { error: roleError } = await supabase.from('user_roles').insert({
          user_id: data.user.id,
          role: 'operador'
        });

        if (roleError) {
          console.error('Erro ao criar role:', roleError);
        } else {
          toast({
            title: "Cadastro realizado com sucesso!",
            description: "Faça login para acessar o sistema."
          });
          console.log('Sign up and role assignment successful');
          navigate('/login');
        }
      } else {
        console.error('Sign up error:', error);
      }

      return { error };
    } catch (error) {
      console.error('Erro no cadastro:', error);
      return { error };
    }
  };

  // Logout
  const signOut = async () => {
    await registerUserAction('logout', user?.id);
    await supabase.auth.signOut();
    setProfile(null);
    navigate('/login');
  };

  // Reset de senha
  const resetPassword = async (email: string) => {
    try {
      console.log('Requesting password reset for:', email);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`
      });
      
      if (!error) {
        toast({
          title: "E-mail enviado com sucesso!",
          description: "Verifique sua caixa de entrada para redefinir sua senha."
        });
        console.log('Password reset email sent');
      } else {
        console.error('Password reset error:', error);
      }

      return { error };
    } catch (error) {
      console.error('Erro ao solicitar redefinição de senha:', error);
      return { error };
    }
  };

  return {
    user,
    setUser,
    session,
    setSession,
    profile,
    loading,
    setLoading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    fetchProfile
  };
};
