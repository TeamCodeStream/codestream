"use strict";

import { describe, expect, it } from "@jest/globals";
import { Parser } from "../../../../src/managers/stackTraceParsers/phpStackTraceParser";

describe("phpStackTraceParser", () => {
	it("stack1", () => {
		const str = `in Acme\\Foundation\\Bootstrap\\HandleExceptions::handleError called at ? (?)
in file_put_contents called at /var/www/vendor/foocorp/framework/src/Acme/Filesystem/Filesystem.php (133)
in Acme\\Filesystem\\Filesystem::put called at /var/www/vendor/foocorp/framework/src/Acme/Session/FileSessionHandler.php (83)
in Acme\\Session\\FileSessionHandler::write called at /var/www/vendor/foocorp/framework/src/Acme/Session/Store.php (129)
in Acme\\Session\\Store::save called at /var/www/vendor/foocorp/framework/src/Acme/Session/Middleware/StartSession.php (170)
in Acme\\Session\\Middleware\\StartSession::saveSession called at /var/www/vendor/foocorp/framework/src/Acme/Session/Middleware/StartSession.php (65)
in Acme\\Session\\Middleware\\StartSession::handle called at /var/www/vendor/foocorp/framework/src/Acme/Pipeline/Pipeline.php (167)
in Acme\\Pipeline\\Pipeline::Acme\\Pipeline\\{closure} called at /var/www/vendor/foocorp/framework/src/Acme/Cookie/Middleware/AddQueuedCookiesToResponse.php (37)
in Acme\\Cookie\\Middleware\\AddQueuedCookiesToResponse::handle called at /var/www/vendor/foocorp/framework/src/Acme/Pipeline/Pipeline.php (167)
in Acme\\Pipeline\\Pipeline::Acme\\Pipeline\\{closure} called at /var/www/vendor/foocorp/framework/src/Acme/Cookie/Middleware/EncryptCookies.php (66)
in Acme\\Cookie\\Middleware\\EncryptCookies::handle called at /var/www/vendor/foocorp/framework/src/Acme/Pipeline/Pipeline.php (167)
in Acme\\Pipeline\\Pipeline::Acme\\Pipeline\\{closure} called at /var/www/vendor/foocorp/framework/src/Acme/Pipeline/Pipeline.php (103)
in Acme\\Pipeline\\Pipeline::then called at /var/www/vendor/foocorp/framework/src/Acme/Routing/Router.php (687)
in Acme\\Routing\\Router::runRouteWithinStack called at /var/www/vendor/foocorp/framework/src/Acme/Routing/Router.php (662)
in Acme\\Routing\\Router::runRoute called at /var/www/vendor/foocorp/framework/src/Acme/Routing/Router.php (628)
in Acme\\Routing\\Router::dispatchToRoute called at /var/www/vendor/foocorp/framework/src/Acme/Routing/Router.php (617)
in Acme\\Routing\\Router::dispatch called at /var/www/vendor/foocorp/framework/src/Acme/Foundation/Http/Kernel.php (165)
in Acme\\Foundation\\Http\\Kernel::Acme\\Foundation\\Http\\{closure} called at /var/www/vendor/foocorp/framework/src/Acme/Pipeline/Pipeline.php (128)
in Acme\\Pipeline\\Pipeline::Acme\\Pipeline\\{closure} called at /var/www/vendor/foocorp/framework/src/Acme/Foundation/Http/Middleware/TransformsRequest.php (21)
in Acme\\Foundation\\Http\\Middleware\\TransformsRequest::handle called at /var/www/vendor/foocorp/framework/src/Acme/Pipeline/Pipeline.php (167)
in Acme\\Pipeline\\Pipeline::Acme\\Pipeline\\{closure} called at /var/www/vendor/foocorp/framework/src/Acme/Foundation/Http/Middleware/TransformsRequest.php (21)
in Acme\\Foundation\\Http\\Middleware\\TransformsRequest::handle called at /var/www/vendor/foocorp/framework/src/Acme/Pipeline/Pipeline.php (167)
in Acme\\Pipeline\\Pipeline::Acme\\Pipeline\\{closure} called at /var/www/vendor/foocorp/framework/src/Acme/Foundation/Http/Middleware/ValidatePostSize.php (27)
in Acme\\Foundation\\Http\\Middleware\\ValidatePostSize::handle called at /var/www/vendor/foocorp/framework/src/Acme/Pipeline/Pipeline.php (167)
in Acme\\Pipeline\\Pipeline::Acme\\Pipeline\\{closure} called at /var/www/vendor/foocorp/framework/src/Acme/Foundation/Http/Middleware/CheckForMaintenanceMode.php (63)
in Acme\\Foundation\\Http\\Middleware\\CheckForMaintenanceMode::handle called at /var/www/vendor/foocorp/framework/src/Acme/Pipeline/Pipeline.php (167)
in Acme\\Pipeline\\Pipeline::Acme\\Pipeline\\{closure} called at /var/www/vendor/fruitcake/foocorp-cors/src/HandleCors.php (36)
in Fruitcake\\Cors\\HandleCors::handle called at /var/www/vendor/foocorp/framework/src/Acme/Pipeline/Pipeline.php (167)
in Acme\\Pipeline\\Pipeline::Acme\\Pipeline\\{closure} called at /var/www/vendor/fideloper/proxy/src/TrustProxies.php (57)
in Fideloper\\Proxy\\TrustProxies::handle called at /var/www/vendor/foocorp/framework/src/Acme/Pipeline/Pipeline.php (167)
in Acme\\Pipeline\\Pipeline::Acme\\Pipeline\\{closure} called at /var/www/vendor/foocorp/framework/src/Acme/Pipeline/Pipeline.php (103)
in Acme\\Pipeline\\Pipeline::then called at /var/www/vendor/foocorp/framework/src/Acme/Foundation/Http/Kernel.php (140)
in Acme\\Foundation\\Http\\Kernel::sendRequestThroughRouter called at /var/www/vendor/foocorp/framework/src/Acme/Foundation/Http/Kernel.php (109)
in Acme\\Foundation\\Http\\Kernel::handle called at /var/www/public/index.php (55)`;

		const result = Parser(str);
		expect(result).toEqual({
			language: "php",
			lines: [
				{
					method: "Acme\\Foundation\\Bootstrap\\HandleExceptions::handleError",
					fileFullPath: "?",
					line: undefined
				},
				{
					method: "file_put_contents",
					fileFullPath: "/var/www/vendor/foocorp/framework/src/Acme/Filesystem/Filesystem.php",
					line: 133
				},
				{
					method: "Acme\\Filesystem\\Filesystem::put",
					fileFullPath: "/var/www/vendor/foocorp/framework/src/Acme/Session/FileSessionHandler.php",
					line: 83
				},
				{
					method: "Acme\\Session\\FileSessionHandler::write",
					fileFullPath: "/var/www/vendor/foocorp/framework/src/Acme/Session/Store.php",
					line: 129
				},
				{
					method: "Acme\\Session\\Store::save",
					fileFullPath:
						"/var/www/vendor/foocorp/framework/src/Acme/Session/Middleware/StartSession.php",
					line: 170
				},
				{
					method: "Acme\\Session\\Middleware\\StartSession::saveSession",
					fileFullPath:
						"/var/www/vendor/foocorp/framework/src/Acme/Session/Middleware/StartSession.php",
					line: 65
				},
				{
					method: "Acme\\Session\\Middleware\\StartSession::handle",
					fileFullPath: "/var/www/vendor/foocorp/framework/src/Acme/Pipeline/Pipeline.php",
					line: 167
				},
				{
					method: "Acme\\Pipeline\\Pipeline::Acme\\Pipeline\\{closure}",
					fileFullPath:
						"/var/www/vendor/foocorp/framework/src/Acme/Cookie/Middleware/AddQueuedCookiesToResponse.php",
					line: 37
				},
				{
					method: "Acme\\Cookie\\Middleware\\AddQueuedCookiesToResponse::handle",
					fileFullPath: "/var/www/vendor/foocorp/framework/src/Acme/Pipeline/Pipeline.php",
					line: 167
				},
				{
					method: "Acme\\Pipeline\\Pipeline::Acme\\Pipeline\\{closure}",
					fileFullPath:
						"/var/www/vendor/foocorp/framework/src/Acme/Cookie/Middleware/EncryptCookies.php",
					line: 66
				},
				{
					method: "Acme\\Cookie\\Middleware\\EncryptCookies::handle",
					fileFullPath: "/var/www/vendor/foocorp/framework/src/Acme/Pipeline/Pipeline.php",
					line: 167
				},
				{
					method: "Acme\\Pipeline\\Pipeline::Acme\\Pipeline\\{closure}",
					fileFullPath: "/var/www/vendor/foocorp/framework/src/Acme/Pipeline/Pipeline.php",
					line: 103
				},
				{
					method: "Acme\\Pipeline\\Pipeline::then",
					fileFullPath: "/var/www/vendor/foocorp/framework/src/Acme/Routing/Router.php",
					line: 687
				},
				{
					method: "Acme\\Routing\\Router::runRouteWithinStack",
					fileFullPath: "/var/www/vendor/foocorp/framework/src/Acme/Routing/Router.php",
					line: 662
				},
				{
					method: "Acme\\Routing\\Router::runRoute",
					fileFullPath: "/var/www/vendor/foocorp/framework/src/Acme/Routing/Router.php",
					line: 628
				},
				{
					method: "Acme\\Routing\\Router::dispatchToRoute",
					fileFullPath: "/var/www/vendor/foocorp/framework/src/Acme/Routing/Router.php",
					line: 617
				},
				{
					method: "Acme\\Routing\\Router::dispatch",
					fileFullPath: "/var/www/vendor/foocorp/framework/src/Acme/Foundation/Http/Kernel.php",
					line: 165
				},
				{
					method: "Acme\\Foundation\\Http\\Kernel::Acme\\Foundation\\Http\\{closure}",
					fileFullPath: "/var/www/vendor/foocorp/framework/src/Acme/Pipeline/Pipeline.php",
					line: 128
				},
				{
					method: "Acme\\Pipeline\\Pipeline::Acme\\Pipeline\\{closure}",
					fileFullPath:
						"/var/www/vendor/foocorp/framework/src/Acme/Foundation/Http/Middleware/TransformsRequest.php",
					line: 21
				},
				{
					method: "Acme\\Foundation\\Http\\Middleware\\TransformsRequest::handle",
					fileFullPath: "/var/www/vendor/foocorp/framework/src/Acme/Pipeline/Pipeline.php",
					line: 167
				},
				{
					method: "Acme\\Pipeline\\Pipeline::Acme\\Pipeline\\{closure}",
					fileFullPath:
						"/var/www/vendor/foocorp/framework/src/Acme/Foundation/Http/Middleware/TransformsRequest.php",
					line: 21
				},
				{
					method: "Acme\\Foundation\\Http\\Middleware\\TransformsRequest::handle",
					fileFullPath: "/var/www/vendor/foocorp/framework/src/Acme/Pipeline/Pipeline.php",
					line: 167
				},
				{
					method: "Acme\\Pipeline\\Pipeline::Acme\\Pipeline\\{closure}",
					fileFullPath:
						"/var/www/vendor/foocorp/framework/src/Acme/Foundation/Http/Middleware/ValidatePostSize.php",
					line: 27
				},
				{
					method: "Acme\\Foundation\\Http\\Middleware\\ValidatePostSize::handle",
					fileFullPath: "/var/www/vendor/foocorp/framework/src/Acme/Pipeline/Pipeline.php",
					line: 167
				},
				{
					method: "Acme\\Pipeline\\Pipeline::Acme\\Pipeline\\{closure}",
					fileFullPath:
						"/var/www/vendor/foocorp/framework/src/Acme/Foundation/Http/Middleware/CheckForMaintenanceMode.php",
					line: 63
				},
				{
					method: "Acme\\Foundation\\Http\\Middleware\\CheckForMaintenanceMode::handle",
					fileFullPath: "/var/www/vendor/foocorp/framework/src/Acme/Pipeline/Pipeline.php",
					line: 167
				},
				{
					fileFullPath: "/var/www/vendor/fruitcake/foocorp-cors/src/HandleCors.php",
					line: 36,
					method: "Acme\\Pipeline\\Pipeline::Acme\\Pipeline\\{closure}"
				},
				{
					method: "Fruitcake\\Cors\\HandleCors::handle",
					fileFullPath: "/var/www/vendor/foocorp/framework/src/Acme/Pipeline/Pipeline.php",
					line: 167
				},
				{
					method: "Acme\\Pipeline\\Pipeline::Acme\\Pipeline\\{closure}",
					fileFullPath: "/var/www/vendor/fideloper/proxy/src/TrustProxies.php",
					line: 57
				},
				{
					method: "Fideloper\\Proxy\\TrustProxies::handle",
					fileFullPath: "/var/www/vendor/foocorp/framework/src/Acme/Pipeline/Pipeline.php",
					line: 167
				},
				{
					method: "Acme\\Pipeline\\Pipeline::Acme\\Pipeline\\{closure}",
					fileFullPath: "/var/www/vendor/foocorp/framework/src/Acme/Pipeline/Pipeline.php",
					line: 103
				},
				{
					method: "Acme\\Pipeline\\Pipeline::then",
					fileFullPath: "/var/www/vendor/foocorp/framework/src/Acme/Foundation/Http/Kernel.php",
					line: 140
				},
				{
					method: "Acme\\Foundation\\Http\\Kernel::sendRequestThroughRouter",
					fileFullPath: "/var/www/vendor/foocorp/framework/src/Acme/Foundation/Http/Kernel.php",
					line: 109
				},
				{
					method: "Acme\\Foundation\\Http\\Kernel::handle",
					fileFullPath: "/var/www/public/index.php",
					line: 55
				}
			]
		});
	});
});
