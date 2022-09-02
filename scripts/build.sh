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
    echo "options are:"
    echo "    -v0               turn off all prints to stdout"
    echo "    -v1               print only basic log about build progress"
    echo "    -v2               print full build log with rich debug info"
    echo "    -h | --help       print this help information"
    echo ""
    exit $1
}

# -----------------------------------------------------------------------------
# Build and create package
# -----------------------------------------------------------------------------
function DO_BUILD
{
    LOG_LINE
    LOG "Building '$LIB_NAME'..."
    LOG " - npm version $(npm -v)"
    LOG " - tsc version $TSC_VERSION"
    LOG_LINE

    PUSH_DIR "$SRC_ROOT"
    ###

    LOG "Compiling TypeScript..."
    npm run build

    LOG "Removing old packages..."

    LOG "Creating npm package..."
    npm pack

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
        build)
            DO_COMMAND=$opt
            ;;
        -h | --help)
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

TSC_VERSION=( $(tsc --version))
TSC_VERSION=${TSC_VERSION[1]}

case "$DO_COMMAND" in
    build) DO_BUILD ;;
    *) FAILURE "Unknown command '$DO_COMMAND'"
esac

EXIT_SUCCESS -l
