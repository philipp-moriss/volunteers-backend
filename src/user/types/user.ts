import { User } from '../entities/user.entity';
import { Volunteer } from '../entities/volunteer.entity';
import { Needy } from '../entities/needy.entity';
import { Admin } from '../entities/admin.entity';
import { UserRole } from 'src/shared/user';

export type UserWithOutPassword = Omit<User, 'passwordHash'>;

// Базовый тип пользователя без пароля
type BaseUser = UserWithOutPassword;

// Типы для расширенных пользователей с данными роли
export interface UserWithVolunteerData extends BaseUser {
  role: UserRole.VOLUNTEER;
  volunteer: Omit<Volunteer, 'user' | 'program'> & {
    program?: Volunteer['program'];
  };
}

export interface UserWithNeedyData extends BaseUser {
  role: UserRole.NEEDY;
  needy: Omit<Needy, 'user' | 'program' | 'creator'> & {
    program?: Needy['program'];
    creator?: Needy['creator'];
  };
}

export interface UserWithAdminData extends BaseUser {
  role: UserRole.ADMIN;
  admin: Omit<Admin, 'user' | 'createdByAdmin' | 'ownedPrograms'> & {
    ownedPrograms?: Admin['ownedPrograms'];
    createdByAdmin?: Admin['createdByAdmin'];
  };
}

// Объединенный тип для всех расширенных пользователей
export type UserWithRoleData =
  | UserWithVolunteerData
  | UserWithNeedyData
  | UserWithAdminData;

