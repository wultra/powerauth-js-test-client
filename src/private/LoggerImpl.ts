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

// TODO: chalk 5.0.x is ESM and this cannot be imported in tests
//       This old import syntax works for 4.x versions and also with tests
const chalk = require("chalk")

export interface AbstractLogger {
    info(message: string): void
    warning(message: string): void
    error(message: string): void
    
    request(url: string, method: string, body: any, headers:HeadersInit): void
    response(url: string, data: any, headers: HeadersInit, status: number): void

    setBaseUrl(url: string): void
}

const DEBUG_STR   = "INFO:"
const ERROR_STR   = "ERR!:"
const WARNING_STR = "WARN:"

export class PrettyLogger implements AbstractLogger {
    private readonly tag: string
    private readonly infoStr: string
    private readonly warnStr: string
    private readonly errStr: string
    private baseUrl: string = ""
    
    constructor(tag: string) {
        this.tag = chalk.magenta(tag + ":")
        this.infoStr = chalk.green.dim(DEBUG_STR)
        this.warnStr = chalk.yellow(WARNING_STR)
        this.errStr = chalk.redBright(ERROR_STR)
    }

    setBaseUrl(url: string): void {
        this.baseUrl = url
    }

    info(message: string): void {
        console.log(`${this.infoStr} ${this.tag}: ${message}`)
    }
    warning(message: string): void {
        console.log(`${this.warnStr} ${this.tag}: ${message}`)
    }
    error(message: string): void {
        console.log(`${this.errStr} ${this.tag}: ${message}`)
    }

    request(url: string, method: string, body: any, headers: HeadersInit) {
        let colorUrl = this.highlightUrl(url)
        let colorMethod = chalk.green(method.toUpperCase())
        let colorHeaders = chalk.gray.dim("  Headers ") + chalk.blackBright(JSON.stringify(headers))
        let colorBody    = chalk.gray.dim("     Body ") + chalk.blackBright(JSON.stringify(body))
        console.log(`${this.infoStr} ${this.tag} ${colorMethod} >> ${colorUrl}\n${colorHeaders}\n${colorBody}`)
    }

    response(url: string, data: any, headers: HeadersInit, status: number) {
        let colorUrl = this.highlightUrl(url)
        let colorStatus = status / 100 == 2 ? chalk.green(status) : chalk.redBright(status)
        let colorHeaders = chalk.gray.dim("  Headers ") + chalk.blackBright(JSON.stringify(headers))
        let colorBody    = chalk.gray.dim("     Data ") + chalk.blackBright(JSON.stringify(data))
        console.log(`${this.infoStr} ${this.tag} ${colorStatus} << ${colorUrl}\n${colorHeaders}\n${colorBody}`)
    }

    private highlightUrl(url: string): string {
        if (url.startsWith(this.baseUrl)) {
            return chalk.blue(this.baseUrl) + chalk.blueBright(url.substring(this.baseUrl.length))
        } else {
            return chalk.blueBright(url)
        }
    }
}

export class DefaultLogger implements AbstractLogger {
    readonly tag: string
    constructor(tag: string) {
        this.tag = tag + ":"
    }

    setBaseUrl(url: string): void {
        // empty by purpose
    }

    info(message: string): void {
        console.log(`${DEBUG_STR} ${this.tag}: ${message}`)
    }
    warning(message: string): void {
        console.log(`${WARNING_STR} ${this.tag}: ${message}`)
    }
    error(message: string): void {
        console.log(`${ERROR_STR} ${this.tag}: ${message}`)
    }
    
    request(url: string, method: string, body: any, headers: HeadersInit) {
        let strHeaders = "- Headers  : " + JSON.stringify(headers)
        let strData    = "- Body     : " + JSON.stringify(body)
        console.log(`${DEBUG_STR} ${this.tag} ${method.toUpperCase()}  >> ${url}\n${strHeaders}\n${strData}}`)
    }

    response(url: string, data: any, headers: HeadersInit, status: number) {
        let strHeaders = "- Headers  : " + JSON.stringify(headers)
        let strData    = "- Response : " + JSON.stringify(data)
        console.log(`${DEBUG_STR} ${this.tag} ${status} << ${url}\n${strHeaders}\n${strData}}`)
    }
}