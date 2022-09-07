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

import { Endpoint } from '../Endpoint'

export class Endpoints {
    static readonly getSystemStatus: Endpoint           = { path: '/v3/status' }

    static readonly applicationCreate: Endpoint         = { path: '/v3/application/create' }
    static readonly applicationDetail: Endpoint         = { path: '/v3/application/detail' } 
    static readonly applicationList: Endpoint           = { path: '/v3/application/list' } 
    static readonly applicationVersionCreate: Endpoint  = { path: '/v3/application/version/create' }
    static applicationVersionSupport(value: boolean): Endpoint { return { path: value ? '/v3/application/version/support' : '/v3/application/version/unsupport' } }

    static readonly activationInit: Endpoint            = { path: '/v3/activation/init' }
    static readonly activationCommit: Endpoint          = { path: '/v3/activation/commit' }
    static readonly activationRemove: Endpoint          = { path: '/v3/activation/remove' }
    static readonly activationBlock: Endpoint           = { path: '/v3/activation/block' }
    static readonly activationUnblock: Endpoint         = { path: '/v3/activation/unblock' }
    static readonly activationUpdateOtp: Endpoint       = { path: '/v3/activation/otp/update' }
    static readonly activationDetail: Endpoint          = { path: '/v3/activation/status' }
    static readonly activationPrepare: Endpoint          = { path: '/v3/activation/prepare' }

    static readonly recoveryConfigDetail: Endpoint      = { path: '/v3/recovery/config/detail' }
    static readonly recoveryConfigUpdate: Endpoint      = { path: '/v3/recovery/config/update' }
}