#! /bin/bash
# Launcher for OpenAPI Generator

set -e

API_JSON_URL="http://localhost:3000/api/docs-json"
SCRIPT_DIR="$(cd $(dirname $0); pwd)"
SERVER_DIR="${SCRIPT_DIR}/../packages/server/"
CLIENT_DIR="${SCRIPT_DIR}/../packages/client/"

if [ "${1}" = "online" ]; then
  # 起動中のサーバに接続してAPIドキュメント(JSON)を生成
  echo "Waiting for server..."
  until curl --silent "${API_JSON_URL}"; do
    sleep 2
  done
  curl --silent "${API_JSON_URL}" > /tmp/api.json
else
  # サーバを起動せずにAPIドキュメント(JSON)を生成
  "${SERVER_DIR}node_modules/.bin/ts-node" -r tsconfig-paths/register "${SERVER_DIR}src/openapi-doc-generator.ts" "--output=/tmp/api.json"
fi

# JSONをYAMLへ変換
"${SERVER_DIR}/node_modules/.bin/json2yaml" /tmp/api.json > /tmp/api.yaml

# OpenAPI Generator でAPIクライアントを生成
/opt/openapi-generator/docker-entrypoint.sh generate -i /tmp/api.yaml -g typescript-angular -o "${CLIENT_DIR}/src/.api-client/"