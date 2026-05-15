#!/bin/bash
# run.sh - Test Execution Script
# Runs test suite and generates before/after results

set -e

# ============================================================================
# CONFIGURATION SECTION
# ============================================================================

PROJECT_NAME="billing-payments-system"
PYTHON_VERSION="3.11"
TEST_FRAMEWORK="pytest"
TEST_FILE="tests.py"
BEFORE_OUTPUT="before.json"
AFTER_OUTPUT="after.json"
TEST_TIMEOUT=300
VERBOSE=true

# Database configuration (if applicable)
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/billing_test}"
export DATABASE_URL

# Stripe test keys (from environment or defaults)
STRIPE_API_KEY="${STRIPE_API_KEY:-sk_test_stripe_key_placeholder}"
STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET:-whsec_test_webhook_secret_placeholder}"
export STRIPE_API_KEY
export STRIPE_WEBHOOK_SECRET

# Flask configuration
export FLASK_ENV="testing"
export JWT_SECRET="test-secret"

# ============================================================================
# LOGGING & HELPERS
# ============================================================================

log_info() {
    echo "[INFO] $1"
}

log_error() {
    echo "[ERROR] $1" >&2
}

log_success() {
    echo "[SUCCESS] $1"
}

# ============================================================================
# PRE-TEST SETUP
# ============================================================================

log_info "================================"
log_info "Billing & Payments System - Tests"
log_info "================================"

# Check if running from correct directory
if [ ! -f "$TEST_FILE" ]; then
    log_error "Test file not found: $TEST_FILE"
    log_error "Please run from project root directory"
    exit 1
fi

# Check Python installation
if ! command -v python3 &> /dev/null; then
    log_error "Python3 not found. Please install Python $PYTHON_VERSION"
    exit 1
fi

PYTHON_VERSION_ACTUAL=$(python3 --version 2>&1 | awk '{print $2}')
log_info "Python version: $PYTHON_VERSION_ACTUAL"

# ============================================================================
# INSTALL DEPENDENCIES
# ============================================================================

log_info "Installing Python dependencies..."

if [ -f "requirements.txt" ]; then
    pip install -q -r requirements.txt || log_error "Failed to install requirements.txt"
else
    log_error "requirements.txt not found"
    exit 1
fi

# Install test dependencies
pip install -q pytest pytest-cov pytest-flask pytest-mock || log_error "Failed to install test dependencies"

log_success "Dependencies installed"

# ============================================================================
# DATABASE SETUP (if applicable)
# ============================================================================

log_info "Setting up test database..."

# Create test database (PostgreSQL example)
# If using SQLite, this step is skipped
if [[ $DATABASE_URL == postgres* ]]; then
    log_info "Creating PostgreSQL test database..."
    # Database creation would happen here (create test DB if needed)
    # This is handled by Flask test client fixtures
fi

# ============================================================================
# RUN TESTS WITH PYTEST
# ============================================================================

log_info "Running pytest suite..."
log_info "Test file: $TEST_FILE"
log_info "Timeout: ${TEST_TIMEOUT}s"

# Run tests with detailed output
pytest \
    "$TEST_FILE" \
    --tb=short \
    --timeout=$TEST_TIMEOUT \
    -v \
    --capture=no \
    --color=yes \
    --json-report \
    --json-report-file=test_report.json \
    2>&1 | tee test_execution.log

TEST_EXIT_CODE=${PIPESTATUS[0]}

# ============================================================================
# PARSE TEST RESULTS
# ============================================================================

log_info "Parsing test results..."

# Call parsing.py to convert test output to JSON format
python3 parsing.py \
    --input-file test_report.json \
    --output-file test_results.json \
    --format json

PARSE_EXIT_CODE=$?

if [ $PARSE_EXIT_CODE -ne 0 ]; then
    log_error "Failed to parse test results"
    exit 1
fi

log_success "Test results parsed"

# ============================================================================
# DETERMINE OUTPUT FILE (before.json vs after.json)
# ============================================================================

# Check if this is a "before" run (empty codebase) or "after" run (with solution)
if [ -f "codebase.zip" ] || [ -d "src" ] || [ -d "app" ]; then
    # Solution exists - this is "after" run
    OUTPUT_FILE="$AFTER_OUTPUT"
    log_info "Solution found - generating AFTER results"
else
    # Empty codebase - this is "before" run
    OUTPUT_FILE="$BEFORE_OUTPUT"
    log_info "No solution found - generating BEFORE results"
fi

# Copy parsed results to appropriate output file
cp test_results.json "$OUTPUT_FILE"
log_success "Results written to: $OUTPUT_FILE"

# ============================================================================
# GENERATE SUMMARY
# ============================================================================

log_info "Generating test summary..."

# Extract test counts from JSON
if command -v jq &> /dev/null; then
    TOTAL_TESTS=$(jq '.tests' test_results.json 2>/dev/null || echo "N/A")
    PASSED_TESTS=$(jq '.passed' test_results.json 2>/dev/null || echo "N/A")
    FAILED_TESTS=$(jq '.failed' test_results.json 2>/dev/null || echo "N/A")
    SKIPPED_TESTS=$(jq '.skipped' test_results.json 2>/dev/null || echo "N/A")
    PASS_RATE=$(jq '.pass_rate' test_results.json 2>/dev/null || echo "N/A")
else
    TOTAL_TESTS="Unknown (jq not available)"
    PASSED_TESTS="See test_results.json"
    FAILED_TESTS="See test_results.json"
    SKIPPED_TESTS="See test_results.json"
    PASS_RATE="See test_results.json"
fi

cat << EOF

================================
TEST EXECUTION SUMMARY
================================
Output File:     $OUTPUT_FILE
Total Tests:     $TOTAL_TESTS
Passed:          $PASSED_TESTS
Failed:          $FAILED_TESTS
Skipped:         $SKIPPED_TESTS
Pass Rate:       $PASS_RATE
Test Exit Code:  $TEST_EXIT_CODE
================================

EOF

# ============================================================================
# CLEANUP
# ============================================================================

log_info "Running cleanup..."

# Optional: drop test database
if [[ $DATABASE_URL == postgres* ]]; then
    # Database cleanup would happen here
    true
fi

log_success "Cleanup completed"

# ============================================================================
# FINAL STATUS
# ============================================================================

if [ $TEST_EXIT_CODE -eq 0 ]; then
    log_success "All tests passed!"
    exit 0
else
    log_error "Some tests failed. See $OUTPUT_FILE for details"
    exit 1
fi
