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

import { fetch } from "cross-fetch";
import { Base64 } from "js-base64";
import { Logger } from "../Logger";
import { Config, ConnectionConfig, DEFAULT_REQUEST_TIMEOUT } from "../model/Config";
import { PowerAuthServerError } from "../PowerAuthServerError";
import { Endpoint } from "./Endpoint";
import { TimeoutHandler } from "./TimeoutHandler";

/**
 * Class implementing communication with PowerAuth Server RESTful API.
 */
export class HttpClient {

    readonly config: Config
    private readonly baseUrl: string
    private readonly defaultHeaders: Record<string, string>

    /**
     * Construct HTTP client with configuration.
     * @param config Client configuration.
     */
    constructor(config: Config) {
        this.config = config
        this.baseUrl = this.buildBaseUrl(config.connection)
        this.defaultHeaders = this.buildDefaultHeaders(config.connection)
    }

    /**
     * Execute post request with empty request body.
     * @param endpoint Endpoint definition.
     * @returns Promise with response object.
     */
    async postEmpty<TResponse>(endpoint: Endpoint): Promise<TResponse> {
        return await this.post<EmptyObject, TResponse>(endpoint, {})
    }

    /**
     * Execute post request with empty response.
     * @param endpoint Endpoint definition.
     * @param request Request object.
     */
    async postNoResponse<TRequest>(endpoint: Endpoint, request: TRequest): Promise<void> {
        await this.post<TRequest, EmptyObject>(endpoint, request)
    }

    /**
     * Execute post request with request and response object types defined.
     * @param endpoint Endpoint definition.
     * @param request Request object.
     * @returns Promise with response object.
     */
    async post<TRequest, TResponse>(endpoint: Endpoint, request: TRequest): Promise<TResponse> {
        // Prepare full URL and request data
        const url = new URL(this.baseUrl + endpoint.path)
        const requestObject: RequestObject<TRequest> = { requestObject: request }
        const headers = this.defaultHeaders
        
        Logger.request(url, "POST", requestObject, headers)

        // fetch data from remote location
        const timeout = new TimeoutHandler(this.config.connection.requestTimeout ?? DEFAULT_REQUEST_TIMEOUT)
        let response: Response
        let plainResponseObject: PlainResponse
        let statusCode: number
        try {
            response = await fetch(url, {
                signal: timeout.signal,
                method: 'post',
                body: JSON.stringify(requestObject),
                headers: headers
            })
            plainResponseObject = await response.json() as PlainResponse
            statusCode = response.status
        } catch (error) {
            if ((error as Error)?.name == "AbortError") {
                throw new PowerAuthServerError(`request to ${url} timed out.`)
            }
            throw error
        } finally {
            timeout.clear()
        }

        Logger.response(url, plainResponseObject, response.headers, statusCode)

        if (!(plainResponseObject instanceof Object && !(plainResponseObject instanceof Array))) {
            throw new PowerAuthServerError(`No response object returned from the server. Status = ${statusCode}`, statusCode)
        }
        
        // At first, try to evaluate status property
        if (!plainResponseObject.status) {
            throw new PowerAuthServerError(`Unknown response object returned from the server. Status = ${statusCode}`, statusCode)
        }
        // Cast to proper response object
        if (response.status / 100 == 2) {
            if (plainResponseObject.status != ResponseStatus.OK) {
                throw new PowerAuthServerError(`Error response received with status code 200. Status = ${statusCode}`, statusCode)
            }
            return (plainResponseObject as ResponseObject<TResponse>).responseObject
        }
        // Throw an error
        const errorResponse = plainResponseObject as ResponseObject<ErrorResponse>
        if (!errorResponse.responseObject) {
            if (statusCode == 401)
            throw new PowerAuthServerError(`No error response returned from the server. Status = ${statusCode}`, statusCode)
        }
        // Throw an error
        const code = errorResponse.responseObject?.code ?? '<<null-code>>'
        const message = errorResponse.responseObject?.message ?? '<<null-message>>'
        throw new PowerAuthServerError(`Server returned error ${code}, message '${message}'. Status = ${statusCode}`, statusCode)
    }

    // Private methods

    /**
     * Build normalized base URL from provided string.
     * @param config Connection config.
     * @returns Normalized URL.
     */
    private buildBaseUrl(config: ConnectionConfig): string {
        let url = config.baseUrl
        if (url.endsWith('/')) {
            url = url.substring(0, url.length - 1)
        }
        if (!url.endsWith('/rest')) {
            url = `${url}/rest`
        }
        return url
    }

    /**
     * Build default headers for requests.
     * @param config Connection configuration.
     * @returns Headers in form of key-value record.
     */
    private buildDefaultHeaders(config: ConnectionConfig): Record<string, string> {
        const authHeader = this.buildAuthHeader(config)
        if (!authHeader) {
            return {
                'Content-Type': 'application/json; charset=utf-8',
                'Accept': 'application/json; charset=utf-8'
            }
        } else {
            return {
                'Content-Type': 'application/json; charset=utf-8',
                'Accept': 'application/json; charset=utf-8',
                'Authorization': authHeader
            }
        }
    }

    /**
     * Construct value for basic authentication header if username and password is provided.
     * @param config Connection configuration.
     * @returns Value for basic authentication header if username and password is provided. If password or username is missing, then return `undefined`.
     */
    private buildAuthHeader(config: ConnectionConfig): string | undefined {
        if (config.username != undefined && config.password != undefined) {
            const credentials = Base64.encode(`${config.username}:${config.password}`)
            return  `Basic ${credentials}`
        }
    }
}

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

/**
 * Request envelope, containing wrapped request object type.
 */
export interface RequestObject<TRequest> {
    requestObject: TRequest
}

/**
 * Empty request or response obect.
 */
export interface EmptyObject {}

// ---------------------------------------------------------------------------
// Response
// ---------------------------------------------------------------------------

/**
 * Status of response (OK or ERROR)
 */
export enum ResponseStatus {
    OK = "OK",
    ERROR = "ERROR"
}

/**
 * Simple response containing response status.
 */
export interface PlainResponse {
    status: ResponseStatus
}

/**
 * Response envelope. 
 */
export interface ResponseObject<TResponse> extends PlainResponse {
    responseObject: TResponse
}

/**
 * Error object returned from the server.
 */
export interface ErrorResponse {
    /**
     * Error code.
     */
    code: string
    /**
     * Error message.
     */
    message: string
}

