import type { Role } from "@/app/generated/prisma";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      nom: string;
      prenom: string;
      email: string;
      username: string;
      role: Role;
      antenneId: string | null;
      antenneName: string | null;
      image?: string | null;
    };
  }

  interface User {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    username: string;
    role: Role;
    antenneId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    nom: string;
    prenom: string;
    role: Role;
    antenneId: string | null;
    antenneName: string | null;
  }
}
