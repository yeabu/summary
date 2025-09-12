@echo off
echo Executing database optimization plan...

REM Change to project root directory
cd /d "c:\Users\Administrator\CodeBuddy\Projects\summary"

echo.
echo Step 1: Running database migration script...
echo.

REM Try to execute SQL script using mysql command
mysql -u root -p123456 expense_tracker < database_migration/ensure_complete_user_bases_relationship.sql

if %errorlevel% neq 0 (
    echo Warning: Database migration script execution failed or mysql command not available
    echo Please manually execute: database_migration/ensure_complete_user_bases_relationship.sql
)

echo.
echo Step 2: Building and running verification program...
echo.

REM Change to database_migration directory
cd database_migration

REM Ensure Go modules are tidy
go mod tidy

REM Run the verification program
go run verify_user_bases_relationship.go

if %errorlevel% neq 0 (
    echo Warning: Verification program execution failed
)

echo.
echo Optimization plan execution completed!
echo.

echo Please manually run the following SQL queries to verify results:
echo 1. Check users table structure:
echo    DESCRIBE users;
echo 2. Check user_bases table structure:
echo    DESCRIBE user_bases;
echo 3. Check user_bases table indexes:
echo    SHOW INDEX FROM user_bases;
echo 4. Statistics:
echo    SELECT (SELECT COUNT(*) FROM user_bases) as total_associations, (SELECT COUNT(DISTINCT user_id) FROM user_bases) as unique_users, (SELECT COUNT(DISTINCT base_id) FROM user_bases) as unique_bases;

echo.
echo All operations completed!
pause