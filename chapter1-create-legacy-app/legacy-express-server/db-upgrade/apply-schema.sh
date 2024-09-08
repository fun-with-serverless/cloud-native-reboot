#!/bin/bash

# Check if .env file exists
if [ ! -f .env ]; then
    echo ".env file not found!"
    exit 1
fi

# Load environment variables from .env file
export $(grep -v '^#' .env | xargs)

# Database connection details
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}
DB_NAME=${DB_NAME:-"galacticgamers"}
DB_USER=${DB_USER:-"postgres"}

# Path to the SQL file
SQL_FILE=$1

# Check if psql is installed
if ! command -v psql &> /dev/null
then
    echo "psql could not be found. Please install PostgreSQL client."
    exit 1
fi

# Check if required variables are set
if [ -z "$DB_PASSWORD" ]; then
    echo "DB_PASSWORD is not set in the .env file!"
    exit 1
fi

# Apply the SQL schema
PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -U $DB_USER -f $SQL_FILE

# Check the exit status
if [ $? -eq 0 ]; then
    echo "Database schema applied successfully."
else
    echo "Error applying database schema. Please check the output above for details."
    exit 1
fi