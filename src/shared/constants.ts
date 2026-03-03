export const expiresAccessIn = '7m';
export const expiresRefreshIn = '15d';

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;

// Default program: "Assistance to widows" - основная программа для всех пользователей
export const DEFAULT_PROGRAM_ID =
  process.env.DEFAULT_PROGRAM_ID ?? '2e190188-94d3-4643-baa2-afa4bbe9a281';

export enum RolesEnum {
  Admin = 'Admin',
  // Interviewer = 'Interviewer',
}
