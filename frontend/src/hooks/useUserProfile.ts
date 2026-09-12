
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useUserProfile = () => {
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchProfile = async (userId: string) => {
    try {
      setLoading(true);
      console.log('Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Erro ao buscar perfil:', error);
      } else {
        console.log('Profile fetched:', data);
        setProfile(data);
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  return { 
    profile, 
    setProfile,
    fetchProfile,
    profileLoading: loading 
  };
};
