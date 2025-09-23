"use client";

import { getAuthToken, removeAuthToken } from "@/lib/auth";

/**
 * Simple auth interceptor that automatically clears invalid tokens
 */
export function setupAuthInterceptor() {
  // Override fetch to intercept API calls
  const originalFetch = window.fetch;
  
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await originalFetch(input, init);
    
    // Check if this is an API call with auth error
    const url = typeof input === 'string' ? input : input.toString();
    
    if (url.includes('/api/') && (response.status === 401 || response.status === 404)) {
      const token = getAuthToken();
      
      if (token && (url.includes('/users/me') || url.includes('/business/me'))) {
        console.log('🔧 Detected stale token, clearing authentication...');
        removeAuthToken();
        
        // Redirect to login
        window.location.href = '/login';
      }
    }
    
    return response;
  };
}

/**
 * Initialize auth interceptor when the app loads
 */
if (typeof window !== 'undefined') {
  setupAuthInterceptor();
}
