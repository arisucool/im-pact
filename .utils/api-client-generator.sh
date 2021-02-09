#! /bin/bash
# Launcher for OpenAPI Generator

set -e

API_JSON_URL="http://localhost:3000/api/docs-json"
TMP_DIR="/tmp/"
SCRIPT_DIR="$(cd $(dirname $0); pwd)"
SERVER_DIR="${SCRIPT_DIR}/../packages/server/"
CLIENT_DIR="${SCRIPT_DIR}/../packages/client/"

# 前回生成された APIドキュメント(JSON) のハッシュ値を取得
API_JSON_HASH_OLD=""
if [ -f "${TMP_DIR}api.json" ]; then
  API_JSON_HASH_OLD=`sha1sum "${TMP_DIR}api.json" | awk '{ print $1 }'`
fi

# 前回生成されたAPIクライアントが存在するかを確認
EXISTS_API_CLIENT=0
if [ -f "${CLIENT_DIR}/src/.api-client/index.ts" ]; then
  EXISTS_API_CLIENT=1
fi

# 引数を確認
if [ "${1}" = "online" ]; then
  # 起動中のサーバに接続してAPIドキュメント(JSON)を生成
  until curl --silent "${API_JSON_URL}" > /dev/null; do
    sleep 2
  done
  curl --silent "${API_JSON_URL}" > /tmp/api.json
else
  # サーバを起動せずにAPIドキュメント(JSON)を生成
  "${SERVER_DIR}node_modules/.bin/ts-node" -r tsconfig-paths/register "${SERVER_DIR}src/openapi-doc-generator.ts" "--output=${TMP_DIR}api.json"
fi

# 前回と今回で APIドキュメントに差異があるかを確認
API_JSON_HASH_NEW=`sha1sum "${TMP_DIR}api.json" | awk '{ print $1 }'`
if [ $EXISTS_API_CLIENT -eq 1 -a "${API_JSON_HASH_OLD}" = "${API_JSON_HASH_NEW}" ]; then
  # APIクライアントが存在しており、かつ、差異がなければ、何もせずに終了
  exit 0
fi

# JSONをYAMLへ変換
"${SERVER_DIR}/node_modules/.bin/json2yaml" ${TMP_DIR}api.json > "${TMP_DIR}api.yaml"

# OpenAPI Generator でAPIクライアントを生成
/opt/openapi-generator/docker-entrypoint.sh generate -i "${TMP_DIR}api.yaml" -g typescript-angular -o "${CLIENT_DIR}/src/.api-client/" rm "${TMP_DIR}api.json"

# 完了
exit 0