

export type Role = 'ADMIN' | 'PM' | 'DEVELOPER';


export interface AccessTokenPayload {
  id: string;
  role: Role;
}

export interface RefreshTokenPayload {
  id: string;
  tokenVersion: number; // bumped on logout/rotation to invalidate old refresh tokens
}



export interface RegisterRequestBody {
  email: string;
  password: string;
  name: string;
  role: Role;
}

export interface LoginRequestBody {
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

/** Returned by /login and /refresh. Refresh token itself never appears
 * in the JSON body — it's set via Set-Cookie only. */
export interface AuthResponseBody {
  accessToken: string;
  user: AuthenticatedUser;
}


declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}