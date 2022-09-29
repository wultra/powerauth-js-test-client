#!/bin/bash
###############################################################################
# Include common functions...
# -----------------------------------------------------------------------------
TOP=$(dirname $0)
source "${TOP}/common-functions.sh"
SRC_ROOT="`( cd \"$TOP/..\" && pwd )`"

# -----------------------------------------------------------------------------
# Configuration

LIB_NAME='powerauth-js-test-client'

# -----------------------------------------------------------------------------
# USAGE prints help and exits the script with error code from provided parameter
# Parameters:
#   $1   - error code to be used as return code from the script
# -----------------------------------------------------------------------------
function USAGE
{
    echo ""
    echo "Usage:  $CMD  [options] [command]"
    echo ""
    echo "  Prepare package with '$LIB_NAME' library."
    echo ""
    echo "commands are:"
    echo ""
    echo "     build            Build library and prepare package."
    echo "                      This is the default command if no"
    echo "                      command is specified."
    echo ""
    echo "     compile          Compile library and tests"
    echo ""
    echo "     test             Run jest tests"
    echo ""
    echo "     test-verbose     Run jest tests with full log"
    echo ""
    echo "options are:"
    echo "    -v0               turn off all prints to stdout"
    echo "    -v1               print only basic log about build progress"
    echo "    -v2               print full build log with rich debug info"
    echo "    -h | --help       print this help information"
    echo ""
    exit $1
}

# -----------------------------------------------------------------------------
# Cleanum dist folder
# -----------------------------------------------------------------------------
function DIST_CLEANUP
{
    LOG "Removing dist folder..."
    if [ -d "$SRC_ROOT/dist" ]; then
        $RM -r "$SRC_ROOT/dist"
    fi
}

# -----------------------------------------------------------------------------
# Build and create package
# -----------------------------------------------------------------------------
function DO_BUILD
{
    LOG_LINE
    LOG "Building '$LIB_NAME'..."
    LOG " - node version $NODE_VERSION"
    LOG " - npm  version $NPM_VERSION"
    LOG " - tsc  version $TSC_VERSION"
    LOG_LINE

    PUSH_DIR "$SRC_ROOT"
    ###

    DIST_CLEANUP

    LOG "Removing old packages..."
    local file=( ${LIB_NAME}*.tgz )
    [[ -f "$file" ]] && $RM ${LIB_NAME}*.tgz

    LOG "Compiling TypeScript..."
    tsc

    LOG "Creating npm package..."
    npm pack

    ###
    POP_DIR    
}

# -----------------------------------------------------------------------------
# Compile library and tests
# -----------------------------------------------------------------------------
function DO_COMPILE
{
    LOG_LINE
    LOG "Compiling '$LIB_NAME' with all tests..."
    LOG " - node version $NODE_VERSION"
    LOG " - npm  version $NPM_VERSION"
    LOG " - tsc  version $TSC_VERSION"
    LOG_LINE

    PUSH_DIR "$SRC_ROOT"
    ###

    DIST_CLEANUP

    LOG "Compiling TypeScript..."
    tsc -p tsconfig.tests.json

    ###
    POP_DIR    
}

# -----------------------------------------------------------------------------
# Compile library and tests
# -----------------------------------------------------------------------------
function DO_TEST
{
    local JEST_OPT=$1
    PUSH_DIR "$SRC_ROOT"
    ###
    JEST='./node_modules/.bin/jest'

    LOG_LINE
    LOG "Testing '$LIB_NAME'..."
    LOG " - node version $NODE_VERSION"
    LOG " - npm  version $NPM_VERSION"
    LOG " - tsc  version $TSC_VERSION"
    LOG " - jest version $($JEST --version)"
    LOG_LINE

    DIST_CLEANUP

    LOG "Compiling TypeScript..."
    tsc

    LOG "Running tests..."

    $JEST $JEST_OPT

    ###
    POP_DIR    
}


###############################################################################
# Script's main execution starts here...
# -----------------------------------------------------------------------------

OPT_TSC_VERBOSE=$VERBOSE_VARIANT3
DO_COMMAND="build"

while [[ $# -gt 0 ]]
do
    opt="$1"
    case "$opt" in
        build | test | test-verbose | compile)
            DO_COMMAND=$opt
            ;;
        -h | --help | help)
            USAGE 0
            ;;
        -v*)
            SET_VERBOSE_LEVEL_FROM_SWITCH $opt
            ;;
        *)
            FAILURE "Unknown command or option '$opt'"
            ;;
    esac
    shift
done

REQUIRE_COMMAND tsc
REQUIRE_COMMAND npm
REQUIRE_COMMAND node

TSC_VERSION=( $(tsc --version))
TSC_VERSION=${TSC_VERSION[1]}
NODE_VERSION=$(node -v)
NODE_VERSION=${NODE_VERSION:1}
NPM_VERSION=$(npm -v)

case "$DO_COMMAND" in
    build) DO_BUILD ;;
    compile) DO_COMPILE ;;
    test) DO_TEST --silent ;;
    test-verbose) DO_TEST ;;
    *) FAILURE "Unknown command '$DO_COMMAND'"
esac

EXIT_SUCCESS -l
