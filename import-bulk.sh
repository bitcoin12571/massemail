#!/bin/bash

CSV_FILE="bulk-emails.csv"
CSV_CONTENT=$(cat "$CSV_FILE")

# Escape quotes and newlines for JSON
JSON_CSV=$(printf '%s\n' "$CSV_CONTENT" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')

echo "Importing emails..."
curl -X POST http://localhost:3000/api/contacts/import \
  -H "Content-Type: application/json" \
  -d "{\"csvData\": \"$JSON_CSV\"}" \
  -w "\nStatus: %{http_code}\n"
