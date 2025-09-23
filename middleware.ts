import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // API istekleri için auth kontrolü
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Auth gerektiren endpoint'ler
    const protectedPaths = ['/api/users/me', '/api/business/me'];
    
    if (protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
      const authHeader = request.headers.get('Authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          {
            error: 'Authentication required',
            requiresLogin: true,
            message: 'Oturum süresi doldu. Lütfen tekrar giriş yapın.',
            clearToken: true
          },
          { status: 401 }
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*']
};
