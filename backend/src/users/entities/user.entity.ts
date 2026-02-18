import { Exclude } from 'class-transformer';

export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export class UserEntity {
  id: string;
  name: string;
  email: string;

  @Exclude()
  password: string;

  role: Role;
  createdAt: Date;
  updatedAt: Date;
}


