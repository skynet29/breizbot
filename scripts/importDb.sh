#!/bin/bash

# --- Configuration ---
ARCHIVE_NAME="$1"
MONGO_HOST="localhost"
MONGO_PORT="27017"
USE_DROP="false"

# --- Vérification du fichier en argument ---
if [ -z "$ARCHIVE_NAME" ]; then
  echo "❌ Usage : $0 <fichier_archive.tgz>"
  echo "Usage : $0 <archive.tgz>"
  exit 1
fi

if [ ! -f "$ARCHIVE_NAME" ]; then
  echo "❌ Le fichier $ARCHIVE_NAME n'existe pas."
  exit 1
fi

# --- Extraction temporaire ---
TEMP_DIR="mongo_restore_tmp_$(date +%s)"
mkdir "$TEMP_DIR"
echo "📦 Extraction de l'archive $ARCHIVE_NAME dans $TEMP_DIR..."
tar -xzf "$ARCHIVE_NAME" -C "$TEMP_DIR"

# --- Aperçu des bases/collections ---
echo ""
echo "🔍 Contenu de l'archive :"
find "$TEMP_DIR" -type f -name "*.bson" | while read -r file; do
  relative_path=${file#"$TEMP_DIR"/dump/}
  db_name=$(dirname "$relative_path")
  coll_name=$(basename "$file" .bson)
  echo "  🗂 Base: $db_name | Collection: $coll_name"
done
echo ""

# --- Choix de la base à restaurer ---
read -p "🎯 Voulez-vous importer une seule base ? (laisser vide pour tout) : " TARGET_DB
read -p "📂 Voulez-vous importer une seule collection ? (laisser vide pour tout) : " TARGET_COLL

# --- Confirmation pour --drop ---
read -p "⚠️ Voulez-vous écraser les collections existantes ? (y/N) " CONFIRM
if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
  USE_DROP="true"
  echo "🗑 Les collections existantes seront supprimées avant import."
else
  echo "📥 Import sans suppression des collections existantes."
fi

# --- Construction de la commande mongorestore ---
RESTORE_CMD="mongorestore --host $MONGO_HOST --port $MONGO_PORT"

if [ "$USE_DROP" = "true" ]; then
  RESTORE_CMD+=" --drop"
fi

if [ -n "$TARGET_DB" ]; then
  RESTORE_CMD+=" --nsInclude=${TARGET_DB}.*"
  if [ -n "$TARGET_COLL" ]; then
    RESTORE_CMD="mongorestore --host $MONGO_HOST --port $MONGO_PORT --db $TARGET_DB --collection $TARGET_COLL"
    [ "$USE_DROP" = "true" ] && RESTORE_CMD+=" --drop"
    RESTORE_CMD+=" $TEMP_DIR/dump_$TARGET_DB/$TARGET_DB/$TARGET_COLL.bson"
  else
    RESTORE_CMD+=" $TEMP_DIR/dump_$TARGET_DB/$TARGET_DB"
  fi
else
  RESTORE_CMD+=" $TEMP_DIR/dump"
fi

# --- Exécution ---
echo ""
echo "🚀 Exécution de la commande suivante :"
echo "$RESTORE_CMD"
echo ""

eval $RESTORE_CMD

# --- Nettoyage ---
echo "🧹 Nettoyage temporaire..."
#rm -rf "$TEMP_DIR"

echo "✅ Import terminé."
