import { z } from "zod";

// R3: 2~10자, 한글/영문/숫자
export const nicknameSchema = z
  .string()
  .trim()
  .min(2, "닉네임은 2자 이상이에요")
  .max(10, "닉네임은 10자까지예요")
  .regex(/^[가-힣A-Za-z0-9]+$/, "한글, 영문, 숫자만 쓸 수 있어요");

export const dongCodeSchema = z
  .string()
  .regex(/^[0-9]{10}$/, "동네를 다시 선택해주세요");
