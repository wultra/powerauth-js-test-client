//
// Copyright 2022 Wultra s.r.o.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { PowerAuthServerError } from "./PowerAuthServerError";
import { AbstractLogger, DefaultLogger, PrettyLogger } from "./private/LoggerImpl";

/**
 * Verbose leves for `Logger` class.
 */
export enum VerboseLevel {
    /**
     * Debug log is turned off.
     */
    None,
    /**
     * Print errors only.
     */
    Error,
    /**
     * Print errors and warnings.
     */
    Warning,
    /**
     * Print all debug information.
     */
    All
}

/**
 * Logger used internally by this library.
 */
export class Logger {

    private static verboseLevel = VerboseLevel.All
    private static debugRequestResponse = true
    private static readonly TAG = "PowerAuthTestServer"
    private static logImpl: AbstractLogger = new PrettyLogger(this.TAG)

    /**
     * Enable or disable pretty log. By default, pretty log is turned on.
     * @param pretty Enable or disable pretty log.
     * @param tag If provided, then new tag will be used for all messages. 
     */
    static setPretty(pretty: boolean, tag: string | undefined) {
        const newTag = tag ?? this.TAG
        if (pretty) {
            this.logImpl = new DefaultLogger(newTag)
        } else {
            this.logImpl = new DefaultLogger(newTag)
        }
    }

    /**
     * Change verbose level. Default verbose level is `VerboseLevel.All`.
     * @param level New verbose level.
     */
    static setVerboseLevel(level: VerboseLevel) {
        this.verboseLevel = level
    }

    /**
     * Enable or disable log for request and response data. By default, log for request
     * and response is turned on.
     * @param debugRequestResponse Enable or disable debug responses.
     */
    static setDebugRequestResponse(debugRequestResponse: boolean) {
        this.debugRequestResponse = debugRequestResponse

    }

    /**
     * Configure baseUrl for better request and response logging.
     * @param baseUrl Base URL to set.
     */
    static setBaseUrlForRequests(baseUrl: string) {
        this.logImpl.setBaseUrl(baseUrl)
    }

    static error(message: string): void
    static error(message: any): void {
        if (this.verboseLevel >= VerboseLevel.Error) {
            if (typeof message !== 'string') {
                this.logImpl.error(`${JSON.stringify(message)}`)
            } else {
                this.logImpl.error(message)
            }
        }
    }

    static exception(exception: any) {
        if (this.verboseLevel >= VerboseLevel.Error) {
            if (exception instanceof PowerAuthServerError) {
                const stack = !exception.stack ? "" : `, Stack = ${exception.stack}`
                this.error(`${exception.name}: ${exception.message}${stack}`)
            } else {
                const error = exception as Error
                if (error.name != undefined && error.message != undefined) {
                    const stack = !error.stack ? "" : `, Stack = ${error.stack}`
                    this.error(`${error.name}: ${error.message}${stack}`)
                } else {
                    // Fallback
                    this.error(`Error object: ${exception.toString()}`)
                }
            }
        }
    }

    static warning(message: string): void
    static warning(message: any): void {
        if (this.verboseLevel >= VerboseLevel.Warning) {
            if (typeof message !== 'string') {
                this.logImpl.warning(`${JSON.stringify(message)}`)
            } else {
                this.logImpl.warning(message)
            }
        }
    }

    static info(message: string): void
    static info(message: any): void {
        if (this.verboseLevel == VerboseLevel.All) {
            if (typeof message !== 'string') {
                this.logImpl.info(`${JSON.stringify(message)}`)
            } else {
                this.logImpl.info(message)
            }
        }
    }

    static request(url: string, method: string, body: any, headers: HeadersInit) {
        if (this.debugRequestResponse) {
            this.logImpl.request(url, method, body, headers)
        }
    }

    static response(url: string, data: any, headers: HeadersInit, status: number) {
        if (this.debugRequestResponse) {
            this.logImpl.response(url, data, headers, status)
        }
    }
}
