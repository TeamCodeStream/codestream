"use strict";

import { expect } from "chai";
require("mocha").describe;
require("mocha").it;
import { Parser } from "../../../../src/managers/stackTraceParsers/rubyStackTraceParser";

describe("rubyStackTraceParser", () => {
	it("stack with spaces", () => {
		const str = `
			/usr/local/lib/ruby/2.4.0/net/http.rb:906:in \`rescue in block in connect'
			/usr/local/lib/ruby/2.4.0/net/http.rb:903:in \`block in connect'
			/usr/local/lib/ruby/2.4.0/timeout.rb:93:in \`block in timeout'
			/usr/local/lib/ruby/2.4.0/timeout.rb:103:in \`timeout'
			/usr/local/lib/ruby/2.4.0/net/http.rb:902:in \`connect'
			/usr/local/lib/ruby/2.4.0/net/http.rb:887:in \`do_start'
			/usr/local/lib/ruby/2.4.0/net/http.rb:876:in \`start'
			/usr/local/lib/ruby/2.4.0/net/http.rb:1407:in \`request'
			/usr/local/bundle/gems/newrelic_rpm-6.7.0.359/lib/new_relic/agent/instrumentation/net.rb:36:in \`block in request_with_newrelic_trace'
			/usr/local/bundle/gems/newrelic_rpm-6.7.0.359/lib/new_relic/agent.rb:506:in \`disable_all_tracing'
			/usr/local/bundle/gems/newrelic_rpm-6.7.0.359/lib/new_relic/agent/instrumentation/net.rb:35:in \`request_with_newrelic_trace'
			/mnt/rubytron/rubytron.rb:96:in \`post'
			/mnt/rubytron/rubytron.rb:111:in \`block in sequence'
			/mnt/rubytron/rubytron.rb:110:in \`each'
			/mnt/rubytron/rubytron.rb:110:in \`sequence'
			/mnt/rubytron/rubytron.rb:201:in \`block in <class:Rubytron>'
			/usr/local/bundle/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:1636:in \`call'
			/usr/local/bundle/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:1636:in \`block in compile!'
			/usr/local/bundle/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:987:in \`block (3 levels) in route!'
			/usr/local/bundle/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:1006:in \`route_eval'
			/usr/local/bundle/gems/newrelic_rpm-6.7.0.359/lib/new_relic/agent/instrumentation/sinatra.rb:138:in \`route_eval_with_newrelic'
			/usr/local/bundle/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:987:in \`block (2 levels) in route!'
			/usr/local/bundle/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:1035:in \`block in process_route'
			/usr/local/bundle/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:1033:in \`catch'
			/usr/local/bundle/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:1033:in \`process_route'
			/usr/local/bundle/gems/newrelic_rpm-6.7.0.359/lib/new_relic/agent/instrumentation/middleware_tracing.rb:99:in \`call'
			/usr/local/bundle/gems/rack-protection-2.0.8.1/lib/rack/protection/frame_options.rb:31:in \`call'
			/usr/local/bundle/gems/newrelic_rpm-6.7.0.359/lib/new_relic/agent/instrumentation/middleware_tracing.rb:99:in \`call'
			/usr/local/bundle/gems/rack-2.2.2/lib/rack/null_logger.rb:11:in \`call'
			/usr/local/bundle/gems/newrelic_rpm-6.7.0.359/lib/new_relic/agent/instrumentation/middleware_tracing.rb:99:in \`call'
			/usr/local/bundle/gems/rack-2.2.2/lib/rack/head.rb:12:in \`call'
			/usr/local/bundle/gems/newrelic_rpm-6.7.0.359/lib/new_relic/agent/instrumentation/middleware_tracing.rb:99:in \`call'
			/usr/local/bundle/gems/sinatra-2.0.8.1/lib/sinatra/show_exceptions.rb:22:in \`call'
			/usr/local/bundle/gems/newrelic_rpm-6.7.0.359/lib/new_relic/agent/instrumentation/middleware_tracing.rb:99:in \`call'
			/usr/local/bundle/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:194:in \`call'
			/usr/local/bundle/gems/newrelic_rpm-6.7.0.359/lib/new_relic/agent/instrumentation/middleware_tracing.rb:99:in \`call'
			/usr/local/bundle/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:1951:in \`call'
			/usr/local/bundle/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:1503:in \`block in call'
			/usr/local/bundle/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:1730:in \`synchronize'
			/usr/local/bundle/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:1503:in \`call'
			/usr/local/bundle/gems/newrelic_rpm-6.7.0.359/lib/new_relic/agent/instrumentation/middleware_tracing.rb:99:in \`call'
			/usr/local/bundle/gems/rack-2.2.2/lib/rack/tempfile_reaper.rb:15:in \`call'
			/usr/local/bundle/gems/rack-2.2.2/lib/rack/lint.rb:50:in \`_call'
			/usr/local/bundle/gems/rack-2.2.2/lib/rack/lint.rb:38:in \`call'
			/usr/local/bundle/gems/rack-2.2.2/lib/rack/show_exceptions.rb:23:in \`call'
			/usr/local/bundle/gems/rack-2.2.2/lib/rack/content_length.rb:17:in \`call'
			/usr/local/bundle/gems/rack-2.2.2/lib/rack/handler/webrick.rb:95:in \`service'
			/usr/local/lib/ruby/2.4.0/webrick/httpserver.rb:140:in \`service'
			/usr/local/lib/ruby/2.4.0/webrick/httpserver.rb:96:in \`run'
			/usr/local/lib/ruby/2.4.0/webrick/server.rb:308:in \`block in start_thread'
	`;

		const result = Parser(str);
		expect(result).to.deep.equals({
			lines: [
				{
					method: "rescue in block in connect",
					fileFullPath: "/usr/local/lib/ruby/2.4.0/net/http.rb",
					line: 906
				},
				{
					method: "block in connect",
					fileFullPath: "/usr/local/lib/ruby/2.4.0/net/http.rb",
					line: 903
				},
				{
					method: "block in timeout",
					fileFullPath: "/usr/local/lib/ruby/2.4.0/timeout.rb",
					line: 93
				},
				{
					method: "timeout",
					fileFullPath: "/usr/local/lib/ruby/2.4.0/timeout.rb",
					line: 103
				},
				{
					method: "connect",
					fileFullPath: "/usr/local/lib/ruby/2.4.0/net/http.rb",
					line: 902
				},
				{
					method: "do_start",
					fileFullPath: "/usr/local/lib/ruby/2.4.0/net/http.rb",
					line: 887
				},
				{
					method: "start",
					fileFullPath: "/usr/local/lib/ruby/2.4.0/net/http.rb",
					line: 876
				},
				{
					method: "request",
					fileFullPath: "/usr/local/lib/ruby/2.4.0/net/http.rb",
					line: 1407
				},
				{
					method: "block in request_with_newrelic_trace",
					fileFullPath:
						"/usr/local/bundle/gems/newrelic_rpm-6.7.0.359/lib/new_relic/agent/instrumentation/net.rb",
					line: 36
				},
				{
					method: "disable_all_tracing",
					fileFullPath: "/usr/local/bundle/gems/newrelic_rpm-6.7.0.359/lib/new_relic/agent.rb",
					line: 506
				},
				{
					method: "request_with_newrelic_trace",
					fileFullPath:
						"/usr/local/bundle/gems/newrelic_rpm-6.7.0.359/lib/new_relic/agent/instrumentation/net.rb",
					line: 35
				},
				{
					method: "post",
					fileFullPath: "/mnt/rubytron/rubytron.rb",
					line: 96
				},
				{
					method: "block in sequence",
					fileFullPath: "/mnt/rubytron/rubytron.rb",
					line: 111
				},
				{
					method: "each",
					fileFullPath: "/mnt/rubytron/rubytron.rb",
					line: 110
				},
				{
					method: "sequence",
					fileFullPath: "/mnt/rubytron/rubytron.rb",
					line: 110
				},
				{
					method: "block in <class:Rubytron>",
					fileFullPath: "/mnt/rubytron/rubytron.rb",
					line: 201
				},
				{
					method: "call",
					fileFullPath: "/usr/local/bundle/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 1636
				},
				{
					method: "block in compile!",
					fileFullPath: "/usr/local/bundle/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 1636
				},
				{
					method: "block (3 levels) in route!",
					fileFullPath: "/usr/local/bundle/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 987
				},
				{
					method: "route_eval",
					fileFullPath: "/usr/local/bundle/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 1006
				},
				{
					method: "route_eval_with_newrelic",
					fileFullPath:
						"/usr/local/bundle/gems/newrelic_rpm-6.7.0.359/lib/new_relic/agent/instrumentation/sinatra.rb",
					line: 138
				},
				{
					method: "block (2 levels) in route!",
					fileFullPath: "/usr/local/bundle/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 987
				},
				{
					method: "block in process_route",
					fileFullPath: "/usr/local/bundle/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 1035
				},
				{
					method: "catch",
					fileFullPath: "/usr/local/bundle/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 1033
				},
				{
					method: "process_route",
					fileFullPath: "/usr/local/bundle/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 1033
				},
				{
					method: "call",
					fileFullPath:
						"/usr/local/bundle/gems/newrelic_rpm-6.7.0.359/lib/new_relic/agent/instrumentation/middleware_tracing.rb",
					line: 99
				},
				{
					method: "call",
					fileFullPath:
						"/usr/local/bundle/gems/rack-protection-2.0.8.1/lib/rack/protection/frame_options.rb",
					line: 31
				},
				{
					method: "call",
					fileFullPath:
						"/usr/local/bundle/gems/newrelic_rpm-6.7.0.359/lib/new_relic/agent/instrumentation/middleware_tracing.rb",
					line: 99
				},
				{
					method: "call",
					fileFullPath: "/usr/local/bundle/gems/rack-2.2.2/lib/rack/null_logger.rb",
					line: 11
				},
				{
					method: "call",
					fileFullPath:
						"/usr/local/bundle/gems/newrelic_rpm-6.7.0.359/lib/new_relic/agent/instrumentation/middleware_tracing.rb",
					line: 99
				},
				{
					method: "call",
					fileFullPath: "/usr/local/bundle/gems/rack-2.2.2/lib/rack/head.rb",
					line: 12
				},
				{
					method: "call",
					fileFullPath:
						"/usr/local/bundle/gems/newrelic_rpm-6.7.0.359/lib/new_relic/agent/instrumentation/middleware_tracing.rb",
					line: 99
				},
				{
					method: "call",
					fileFullPath: "/usr/local/bundle/gems/sinatra-2.0.8.1/lib/sinatra/show_exceptions.rb",
					line: 22
				},
				{
					method: "call",
					fileFullPath:
						"/usr/local/bundle/gems/newrelic_rpm-6.7.0.359/lib/new_relic/agent/instrumentation/middleware_tracing.rb",
					line: 99
				},
				{
					method: "call",
					fileFullPath: "/usr/local/bundle/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 194
				},
				{
					method: "call",
					fileFullPath:
						"/usr/local/bundle/gems/newrelic_rpm-6.7.0.359/lib/new_relic/agent/instrumentation/middleware_tracing.rb",
					line: 99
				},
				{
					method: "call",
					fileFullPath: "/usr/local/bundle/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 1951
				},
				{
					method: "block in call",
					fileFullPath: "/usr/local/bundle/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 1503
				},
				{
					method: "synchronize",
					fileFullPath: "/usr/local/bundle/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 1730
				},
				{
					method: "call",
					fileFullPath: "/usr/local/bundle/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 1503
				},
				{
					method: "call",
					fileFullPath:
						"/usr/local/bundle/gems/newrelic_rpm-6.7.0.359/lib/new_relic/agent/instrumentation/middleware_tracing.rb",
					line: 99
				},
				{
					method: "call",
					fileFullPath: "/usr/local/bundle/gems/rack-2.2.2/lib/rack/tempfile_reaper.rb",
					line: 15
				},
				{
					method: "_call",
					fileFullPath: "/usr/local/bundle/gems/rack-2.2.2/lib/rack/lint.rb",
					line: 50
				},
				{
					method: "call",
					fileFullPath: "/usr/local/bundle/gems/rack-2.2.2/lib/rack/lint.rb",
					line: 38
				},
				{
					method: "call",
					fileFullPath: "/usr/local/bundle/gems/rack-2.2.2/lib/rack/show_exceptions.rb",
					line: 23
				},
				{
					method: "call",
					fileFullPath: "/usr/local/bundle/gems/rack-2.2.2/lib/rack/content_length.rb",
					line: 17
				},
				{
					method: "service",
					fileFullPath: "/usr/local/bundle/gems/rack-2.2.2/lib/rack/handler/webrick.rb",
					line: 95
				},
				{
					method: "service",
					fileFullPath: "/usr/local/lib/ruby/2.4.0/webrick/httpserver.rb",
					line: 140
				},
				{
					method: "run",
					fileFullPath: "/usr/local/lib/ruby/2.4.0/webrick/httpserver.rb",
					line: 96
				},
				{
					method: "block in start_thread",
					fileFullPath: "/usr/local/lib/ruby/2.4.0/webrick/server.rb",
					line: 308
				}
			]
		});
	});

	it("stack2", () => {
		let lines = [
			"/home/ec2-user/rubytron/custom_apis/purchase_cart_api.rb:156:in `status_check'",
			"/home/ec2-user/rubytron/custom_apis/purchase_cart_api.rb:46:in `block in registered'",
			"/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:1636:in `call'",
			"/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:1636:in `block in compile!'",
			"/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:987:in `block (3 levels) in route!'",
			"/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:1006:in `route_eval'",
			"/home/ec2-user/.gem/ruby/2.4/gems/newrelic_rpm-6.15.0/lib/new_relic/agent/instrumentation/sinatra.rb:138:in `route_eval_with_newrelic'",
			"/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:987:in `block (2 levels) in route!'",
			"/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:1035:in `block in process_route'",
			"/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:1033:in `catch'",
			"/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:1033:in `process_route'",
			"/home/ec2-user/.gem/ruby/2.4/gems/newrelic_rpm-6.15.0/lib/new_relic/agent/instrumentation/sinatra.rb:118:in `process_route_with_newrelic'",
			"/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:985:in `block in route!'",
			"/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:984:in `each'",
			"/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:984:in `route!'",
			"/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:1098:in `block in dispatch!'",
			"/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:1072:in `block in invoke'",
			"/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:1072:in `catch'",
			"/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:1072:in `invoke'",
			"/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:1095:in `dispatch!'",
			"/home/ec2-user/.gem/ruby/2.4/gems/newrelic_rpm-6.15.0/lib/new_relic/agent/instrumentation/sinatra.rb:163:in `dispatch_and_notice_errors_with_newrelic'",
			"/home/ec2-user/.gem/ruby/2.4/gems/newrelic_rpm-6.15.0/lib/new_relic/agent/instrumentation/sinatra.rb:149:in `block in dispatch_with_newrelic'",
			"/home/ec2-user/.gem/ruby/2.4/gems/newrelic_rpm-6.15.0/lib/new_relic/agent/instrumentation/controller_instrumentation.rb:376:in `perform_action_with_newrelic_trace'",
			"/home/ec2-user/.gem/ruby/2.4/gems/newrelic_rpm-6.15.0/lib/new_relic/agent/instrumentation/sinatra.rb:146:in `dispatch_with_newrelic'",
			"/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:919:in `block in call!'",
			"&lt;truncated 18 additional frames&gt;",
			"/home/ec2-user/.gem/ruby/2.4/gems/newrelic_rpm-6.15.0/lib/new_relic/agent/instrumentation/middleware_tracing.rb:101:in `call'",
			"/home/ec2-user/.gem/ruby/2.4/gems/rack-protection-2.0.8.1/lib/rack/protection/frame_options.rb:31:in `call'",
			"/home/ec2-user/.gem/ruby/2.4/gems/newrelic_rpm-6.15.0/lib/new_relic/agent/instrumentation/middleware_tracing.rb:101:in `call'",
			"/home/ec2-user/.gem/ruby/2.4/gems/rack-2.2.3/lib/rack/null_logger.rb:11:in `call'",
			"/home/ec2-user/.gem/ruby/2.4/gems/newrelic_rpm-6.15.0/lib/new_relic/agent/instrumentation/middleware_tracing.rb:101:in `call'",
			"/home/ec2-user/.gem/ruby/2.4/gems/rack-2.2.3/lib/rack/head.rb:12:in `call'",
			"/home/ec2-user/.gem/ruby/2.4/gems/newrelic_rpm-6.15.0/lib/new_relic/agent/instrumentation/middleware_tracing.rb:101:in `call'",
			"/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/show_exceptions.rb:22:in `call'",
			"/home/ec2-user/.gem/ruby/2.4/gems/newrelic_rpm-6.15.0/lib/new_relic/agent/instrumentation/middleware_tracing.rb:101:in `call'",
			"/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:194:in `call'",
			"/home/ec2-user/.gem/ruby/2.4/gems/newrelic_rpm-6.15.0/lib/new_relic/agent/instrumentation/middleware_tracing.rb:101:in `call'",
			"/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:1951:in `call'",
			"/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:1503:in `block in call'",
			"/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:1730:in `synchronize'",
			"/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb:1503:in `call'",
			"/home/ec2-user/.gem/ruby/2.4/gems/newrelic_rpm-6.15.0/lib/new_relic/agent/instrumentation/middleware_tracing.rb:101:in `call'",
			"/home/ec2-user/.gem/ruby/2.4/gems/rack-2.2.3/lib/rack/tempfile_reaper.rb:15:in `call'",
			"/home/ec2-user/.gem/ruby/2.4/gems/rack-2.2.3/lib/rack/lint.rb:50:in `_call'",
			"/home/ec2-user/.gem/ruby/2.4/gems/rack-2.2.3/lib/rack/lint.rb:38:in `call'",
			"/home/ec2-user/.gem/ruby/2.4/gems/rack-2.2.3/lib/rack/show_exceptions.rb:23:in `call'",
			"/home/ec2-user/.gem/ruby/2.4/gems/rack-2.2.3/lib/rack/content_length.rb:17:in `call'",
			"/home/ec2-user/.gem/ruby/2.4/gems/rack-2.2.3/lib/rack/handler/webrick.rb:95:in `service'",
			"/usr/share/ruby/2.4/webrick/httpserver.rb:140:in `service'",
			"/usr/share/ruby/2.4/webrick/httpserver.rb:96:in `run'",
			"/usr/share/ruby/2.4/webrick/server.rb:308:in `block in start_thread'"
		];

		const result = Parser(lines.join("\n"));
		expect(result).to.deep.equals({
			lines: [
				{
					method: "status_check",
					fileFullPath: "/home/ec2-user/rubytron/custom_apis/purchase_cart_api.rb",
					line: 156
				},
				{
					method: "block in registered",
					fileFullPath: "/home/ec2-user/rubytron/custom_apis/purchase_cart_api.rb",
					line: 46
				},
				{
					method: "call",
					fileFullPath: "/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 1636
				},
				{
					method: "block in compile!",
					fileFullPath: "/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 1636
				},
				{
					method: "block (3 levels) in route!",
					fileFullPath: "/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 987
				},
				{
					method: "route_eval",
					fileFullPath: "/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 1006
				},
				{
					method: "route_eval_with_newrelic",
					fileFullPath:
						"/home/ec2-user/.gem/ruby/2.4/gems/newrelic_rpm-6.15.0/lib/new_relic/agent/instrumentation/sinatra.rb",
					line: 138
				},
				{
					method: "block (2 levels) in route!",
					fileFullPath: "/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 987
				},
				{
					method: "block in process_route",
					fileFullPath: "/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 1035
				},
				{
					method: "catch",
					fileFullPath: "/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 1033
				},
				{
					method: "process_route",
					fileFullPath: "/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 1033
				},
				{
					method: "process_route_with_newrelic",
					fileFullPath:
						"/home/ec2-user/.gem/ruby/2.4/gems/newrelic_rpm-6.15.0/lib/new_relic/agent/instrumentation/sinatra.rb",
					line: 118
				},
				{
					method: "block in route!",
					fileFullPath: "/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 985
				},
				{
					method: "each",
					fileFullPath: "/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 984
				},
				{
					method: "route!",
					fileFullPath: "/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 984
				},
				{
					method: "block in dispatch!",
					fileFullPath: "/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 1098
				},
				{
					method: "block in invoke",
					fileFullPath: "/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 1072
				},
				{
					method: "catch",
					fileFullPath: "/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 1072
				},
				{
					method: "invoke",
					fileFullPath: "/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 1072
				},
				{
					method: "dispatch!",
					fileFullPath: "/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 1095
				},
				{
					method: "dispatch_and_notice_errors_with_newrelic",
					fileFullPath:
						"/home/ec2-user/.gem/ruby/2.4/gems/newrelic_rpm-6.15.0/lib/new_relic/agent/instrumentation/sinatra.rb",
					line: 163
				},
				{
					method: "block in dispatch_with_newrelic",
					fileFullPath:
						"/home/ec2-user/.gem/ruby/2.4/gems/newrelic_rpm-6.15.0/lib/new_relic/agent/instrumentation/sinatra.rb",
					line: 149
				},
				{
					method: "perform_action_with_newrelic_trace",
					fileFullPath:
						"/home/ec2-user/.gem/ruby/2.4/gems/newrelic_rpm-6.15.0/lib/new_relic/agent/instrumentation/controller_instrumentation.rb",
					line: 376
				},
				{
					method: "dispatch_with_newrelic",
					fileFullPath:
						"/home/ec2-user/.gem/ruby/2.4/gems/newrelic_rpm-6.15.0/lib/new_relic/agent/instrumentation/sinatra.rb",
					line: 146
				},
				{
					method: "block in call!",
					fileFullPath: "/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 919
				},
				{
					method: "call",
					fileFullPath:
						"/home/ec2-user/.gem/ruby/2.4/gems/newrelic_rpm-6.15.0/lib/new_relic/agent/instrumentation/middleware_tracing.rb",
					line: 101
				},
				{
					method: "call",
					fileFullPath:
						"/home/ec2-user/.gem/ruby/2.4/gems/rack-protection-2.0.8.1/lib/rack/protection/frame_options.rb",
					line: 31
				},
				{
					method: "call",
					fileFullPath:
						"/home/ec2-user/.gem/ruby/2.4/gems/newrelic_rpm-6.15.0/lib/new_relic/agent/instrumentation/middleware_tracing.rb",
					line: 101
				},
				{
					method: "call",
					fileFullPath: "/home/ec2-user/.gem/ruby/2.4/gems/rack-2.2.3/lib/rack/null_logger.rb",
					line: 11
				},
				{
					method: "call",
					fileFullPath:
						"/home/ec2-user/.gem/ruby/2.4/gems/newrelic_rpm-6.15.0/lib/new_relic/agent/instrumentation/middleware_tracing.rb",
					line: 101
				},
				{
					method: "call",
					fileFullPath: "/home/ec2-user/.gem/ruby/2.4/gems/rack-2.2.3/lib/rack/head.rb",
					line: 12
				},
				{
					method: "call",
					fileFullPath:
						"/home/ec2-user/.gem/ruby/2.4/gems/newrelic_rpm-6.15.0/lib/new_relic/agent/instrumentation/middleware_tracing.rb",
					line: 101
				},
				{
					method: "call",
					fileFullPath:
						"/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/show_exceptions.rb",
					line: 22
				},
				{
					method: "call",
					fileFullPath:
						"/home/ec2-user/.gem/ruby/2.4/gems/newrelic_rpm-6.15.0/lib/new_relic/agent/instrumentation/middleware_tracing.rb",
					line: 101
				},
				{
					method: "call",
					fileFullPath: "/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 194
				},
				{
					method: "call",
					fileFullPath:
						"/home/ec2-user/.gem/ruby/2.4/gems/newrelic_rpm-6.15.0/lib/new_relic/agent/instrumentation/middleware_tracing.rb",
					line: 101
				},
				{
					method: "call",
					fileFullPath: "/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 1951
				},
				{
					method: "block in call",
					fileFullPath: "/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 1503
				},
				{
					method: "synchronize",
					fileFullPath: "/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 1730
				},
				{
					method: "call",
					fileFullPath: "/home/ec2-user/.gem/ruby/2.4/gems/sinatra-2.0.8.1/lib/sinatra/base.rb",
					line: 1503
				},
				{
					method: "call",
					fileFullPath:
						"/home/ec2-user/.gem/ruby/2.4/gems/newrelic_rpm-6.15.0/lib/new_relic/agent/instrumentation/middleware_tracing.rb",
					line: 101
				},
				{
					method: "call",
					fileFullPath: "/home/ec2-user/.gem/ruby/2.4/gems/rack-2.2.3/lib/rack/tempfile_reaper.rb",
					line: 15
				},
				{
					method: "_call",
					fileFullPath: "/home/ec2-user/.gem/ruby/2.4/gems/rack-2.2.3/lib/rack/lint.rb",
					line: 50
				},
				{
					method: "call",
					fileFullPath: "/home/ec2-user/.gem/ruby/2.4/gems/rack-2.2.3/lib/rack/lint.rb",
					line: 38
				},
				{
					method: "call",
					fileFullPath: "/home/ec2-user/.gem/ruby/2.4/gems/rack-2.2.3/lib/rack/show_exceptions.rb",
					line: 23
				},
				{
					method: "call",
					fileFullPath: "/home/ec2-user/.gem/ruby/2.4/gems/rack-2.2.3/lib/rack/content_length.rb",
					line: 17
				},
				{
					method: "service",
					fileFullPath: "/home/ec2-user/.gem/ruby/2.4/gems/rack-2.2.3/lib/rack/handler/webrick.rb",
					line: 95
				},
				{
					method: "service",
					fileFullPath: "/usr/share/ruby/2.4/webrick/httpserver.rb",
					line: 140
				},
				{
					method: "run",
					fileFullPath: "/usr/share/ruby/2.4/webrick/httpserver.rb",
					line: 96
				},
				{
					method: "block in start_thread",
					fileFullPath: "/usr/share/ruby/2.4/webrick/server.rb",
					line: 308
				}
			]
		});
	});
});
