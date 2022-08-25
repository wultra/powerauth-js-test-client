#!/bin/bash
###############################################################################
# Include common functions...
# -----------------------------------------------------------------------------
TOP=$(dirname $0)
source "${TOP}/common-functions.sh"
SRC_ROOT="`( cd \"$TOP/..\" && pwd )`"

# -----------------------------------------------------------------------------
# USAGE prints help and exits the script with error code from provided parameter
# Parameters:
#   $1   - error code to be used as return code from the script
# -----------------------------------------------------------------------------
function USAGE
{
    echo ""
    echo "Usage:  $CMD  [options]"
    echo ""
    echo "  "
    echo ""
    echo "options are:"
    echo "    -v0               turn off all prints to stdout"
    echo "    -v1               print only basic log about build progress"
    echo "    -v2               print full build log with rich debug info"
    echo "    -h | --help       print this help information"
    echo ""
    exit $1
}

###############################################################################
# Script's main execution starts here...
# -----------------------------------------------------------------------------
while [[ $# -gt 0 ]]
do
    opt="$1"
    case "$opt" in
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

OPT_TSC_VERBOSE=$VERBOSE_VARIANT3

REQUIRE_COMMAND tsc
REQUIRE_COMMAND npm

TSC_VERSION=( $(tsc --version))
TSC_VERSION=${TSC_VERSION[1]}

LOG_LINE
LOG "Building library with the following tooling:"
LOG " - npm version $(npm -v)"
LOG " - tsc version $TSC_VERSION"
LOG_LINE

PUSH_DIR "$SRC_ROOT"
###
LOG "Compiling TypeScript..."
tsc -b $OPT_TSC_VERBOSE

###
POP_DIR

EXIT_SUCCESS -l
