export type Dong = { code: string; name: string; fullName: string };

export type Profile = {
  id: string;
  nickname: string;
  dong: Dong;
  nicknameChangeableAt: string | null;
};

export type ApiErrorBody = { error: { code: string; message: string } };
