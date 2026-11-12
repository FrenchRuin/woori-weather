---
# 프로젝트 이름 (40자 이내)
title: 우리동네 날씨
# 한 줄 소개 (50자 이내)
summary: 날씨 예보에 동네 사람들의 체감 투표와 한마디를 더한 웹
# 사용한 AI 도구 (1개 이상)
tools: [Claude Code]
# 진행중 / 완료 / 중단
status: 진행중
# 팀원을 구하면 true로 바꾸고 아래 두 줄을 채워 주세요
recruiting: false
looking_for: []
# 디스코드 아이디나 오픈카톡 링크만 (전화번호, 이메일은 안 받아요. 여기 적은 내용은 공개돼요)
contact:
# 배포한 주소가 있으면 (https://로 시작)
demo: https://woori-weather.vercel.app
---

<!--
체크된 항목 비율이 진행률이 돼요. 이 파일은 Vico(https://github.com/FrenchRuin/vico)에 등록하기 위한 것이에요.
-->

## 기획
- [x] 스펙 정리 (SPEC.md)
- [x] 화면 디자인

## 개발
- [x] 프로젝트 세팅
- [x] DB (테이블·트리거·RLS)
- [x] 카카오 로그인 + 온보딩
- [x] 기상청 날씨
- [x] 체감 투표
- [x] 동네 한마디
- [x] 신고 + 내 정보
- [x] 이웃 동네 지도

## 출시
- [x] Vercel 배포
- [ ] 실제 폰에서 전체 흐름 확인
- [ ] 보안 정리 (Supabase 액세스 토큰 회수)
