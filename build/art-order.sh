#!/usr/bin/env bash
# Order one drawing from the Codex CLI (ChatGPT's image generation), without a person in
# between. The prompt is one of the "그림 그리는 AI에 넣을 문장" blocks of an art order in
# docs/, saved as a text file; the references are the pictures that order names.
#
#   build/art-order.sh <work dir> <prompt.txt> <output.png> [reference image ...]
#
# The work dir is where Codex may write (keep it under assets/, which is never
# committed). Codex must be installed and logged in (`codex login status`). The picture
# comes back large (about 1672 x 941 for a 16:9 scene): cut and clean it afterwards with
# build/sprite-slice.py and build/sprite-clean.py, then look at it before using it.
set -euo pipefail

if [ "$#" -lt 3 ]; then
  echo "usage: build/art-order.sh <work dir> <prompt.txt> <output.png> [reference image ...]" >&2
  exit 2
fi
work=$1
prompt=$2
out=$3
shift 3

codex=$(command -v codex || true)
[ -n "$codex" ] || codex="$(npm prefix -g)/codex"
[ -x "$codex" ] || { echo "the Codex CLI was not found (npm i -g @openai/codex)" >&2; exit 1; }

mkdir -p "$work"
refs=()
for ref in "$@"; do
  # A reference already in the work dir (an earlier result) stays where it is.
  [ "$ref" -ef "$work/$(basename "$ref")" ] || cp "$ref" "$work/"
  refs+=(-i "$(basename "$ref")")
done

# What every order needs said, before the order's own words.
{
  echo "이 폴더의 참고 그림을 먼저 보십시오: $(for r in "$@"; do printf '%s ' "$(basename "$r")"; done)"
  echo "할 일: 이미지 생성 기능으로 그림 한 장을 만들어 이 폴더에 $out 라는 이름으로 저장하십시오."
  echo "코드(PIL, 캔버스 등)로 그리지 말고 반드시 이미지 생성 기능을 쓰십시오. 참고 그림을 입력으로 함께 넣으십시오."
  echo "끝나면 저장한 파일의 경로와 가로세로 크기만 한 줄로 답하십시오. 다른 파일은 만들거나 고치지 마십시오."
  echo
  echo "그릴 그림:"
  cat "$prompt"
} > "$work/$out.prompt.txt"

rm -f "$work/$out"
(cd "$work" && "$codex" exec --skip-git-repo-check -s workspace-write -C . "${refs[@]}" \
  -o "$out.answer.txt" - < "$out.prompt.txt" > "$out.log" 2>&1) || {
  echo "Codex failed; see $work/$out.log" >&2
  exit 1
}
[ -f "$work/$out" ] || { echo "Codex finished but $work/$out is not there; see $work/$out.log" >&2; exit 1; }
echo "$work/$out: $(cat "$work/$out.answer.txt")"
