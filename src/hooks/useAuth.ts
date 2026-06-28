import { useContext } from 'react';
import { AuthContext, AuthContextType } from '../context/AuthContext';

/**
 * Custom hook to access authentication context
 * Must be used within AuthProvider
 * 
 * @returns Auth context with user, tokens, and auth methods
 * @throws Error if used outside of AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}
