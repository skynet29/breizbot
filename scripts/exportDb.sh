#!/bin/bash

# --- Configuration ---
DB_NAME="breizbot"
EXPORT_DIR="dump_$DB_NAME"
ARCHIVE_NAME="$DB_NAME_$(date +%Y-%m-%d_%H-%M-%S).tgz"
MONGO_HOST="localhost"
MONGO_PORT="27017"
# Ajouter --username et --password si besoin d'authentification

# --- Export de la base ---
echo "Export de la base $DB_NAME..."
mongodump --host $MONGO_HOST --port $MONGO_PORT --db $DB_NAME --out $EXPORT_DIR

# --- Création de l'archive ---
echo "Compression dans $ARCHIVE_NAME..."
tar -czf $ARCHIVE_NAME $EXPORT_DIR

# --- Nettoyage ---
echo "Suppression du dossier temporaire $EXPORT_DIR..."
rm -rf $EXPORT_DIR

echo "✅ Export terminé : $ARCHIVE_NAME"

