import { Console, Lodash as _ } from "@nsnanocat/util";
import database from "../function/database.mjs";
import setENV from "../function/setENV.mjs";
import GEOResourceManifest from "../class/GEOResourceManifest.mjs";
/***************** Processing *****************/
export async function Request($request, KV) {
	// 构造回复数据
	let $response = undefined;
	// 解构URL
	const url = new URL($request.url);
	Console.info(`url: ${url.toJSON()}`);
	// 获取连接参数
	const PATHs = url.pathname.split("/").filter(Boolean);
	Console.info(`PATHs: ${PATHs}`);
	// 解析格式
	const FORMAT = ($request.headers?.["Content-Type"] ?? $request.headers?.["content-type"])?.split(";")?.[0];
	Console.info(`FORMAT: ${FORMAT}`);
	/**
	 * 设置
	 * @type {{Settings: import('./types').Settings}}
	 */
	const { Settings, Caches, Configs } = await setENV("iRingo", "MapKit", database);
	Console.logLevel = Settings.LogLevel;
	// 创建空数据
	let body = {};
	// 方法判断
	switch ($request.method) {
		case "POST":
		case "PUT":
		case "PATCH":
		// biome-ignore lint/suspicious/noFallthroughSwitchClause: <explanation>
		case "DELETE":
			// 格式判断
			switch (FORMAT) {
				case undefined: // 视为无body
					break;
				case "application/x-www-form-urlencoded":
				case "text/plain":
				default:
					break;
				case "application/x-mpegURL":
				case "application/x-mpegurl":
				case "application/vnd.apple.mpegurl":
				case "audio/mpegurl":
					//body = M3U8.parse($request.body);
					//Console.debug(`body: ${JSON.stringify(body)}`);
					//$request.body = M3U8.stringify(body);
					break;
				case "text/xml":
				case "text/html":
				case "text/plist":
				case "application/xml":
				case "application/plist":
				case "application/x-plist":
					//body = XML.parse($request.body);
					//Console.debug(`body: ${JSON.stringify(body)}`);
					//$request.body = XML.stringify(body);
					break;
				case "text/vtt":
				case "application/vtt":
					//body = VTT.parse($request.body);
					//Console.debug(`body: ${JSON.stringify(body)}`);
					//$request.body = VTT.stringify(body);
					break;
				case "text/json":
				case "application/json":
					//body = JSON.parse($request.body ?? "{}");
					//Console.debug(`body: ${JSON.stringify(body)}`);
					//$request.body = JSON.stringify(body);
					break;
				case "application/protobuf":
				case "application/x-protobuf":
				case "application/vnd.google.protobuf":
				case "application/grpc":
				case "application/grpc+proto":
				case "application/octet-stream": {
					//Console.debug(`$request: ${JSON.stringify($request, null, 2)}`);
					let rawBody = $request.bodyBytes ? new Uint8Array($request.bodyBytes) : ($request.body ?? new Uint8Array());
					//Console.debug(`isBuffer? ${ArrayBuffer.isView(rawBody)}: ${JSON.stringify(rawBody, null, 2)}`);
					// 写入二进制数据
					$request.body = rawBody;
					break;
				}
			}
		//break; // 不中断，继续处理URL
		case "GET":
		case "HEAD":
		case "OPTIONS":
		default:
			for (const header of Object.keys($request.headers ?? {})) {
				if (header.toLowerCase() === "if-none-match") delete $request.headers[header];
			}
			// 主机判断
			switch (url.hostname) {
				case "configuration.ls.apple.com":
					// 路径判断
					switch (url.pathname) {
						case "/config/defaults":
							break;
					}
					break;
				case "gspe35-ssl.ls.apple.com":
					switch (url.pathname) {
						case "/config/announcements":
							switch (Settings?.Config?.Announcements?.Environment ?? Settings?.Config?.Announcements?.["Environment:"]?.default ?? Settings?.Config?.Announcements?.["Environment:"]) {
								case "AUTO":
									break;
								case "CN":
								default:
									url.searchParams.set("environment", "prod-cn");
									break;
								case "XX":
									url.searchParams.set("environment", "prod");
									break;
							}
							break;
						case "/geo_manifest/dynamic/config": {
							switch (Settings?.GeoManifest?.Dynamic?.Config?.CountryCode) {
								case "AUTO":
									if (Caches?.pep?.gcc) url.searchParams.set("country_code", Caches.pep.gcc);
									break;
								default:
									url.searchParams.set("country_code", Settings?.GeoManifest?.Dynamic?.Config?.CountryCode ?? "CN");
									break;
							}
							const request = { ...$request, url: url.toString() };
							for (const cacheCountryCode of GEOResourceManifest.requiredSources(Configs, Settings, url.searchParams.get("country_code"))) {
								const cacheURL = new URL(url.toString());
								const requestCountryCode = cacheCountryCode === "XX" ? "US" : cacheCountryCode;
								cacheURL.searchParams.set("country_code", requestCountryCode);
								const cache = await GEOResourceManifest.getCache(Caches, cacheURL.search, KV);
								const headers = { ...request.headers };
								if (cache?.eTag) headers["If-None-Match"] = cache.eTag;
								let response;
								try {
									response = await GEOResourceManifest.download({ ...request, headers }, requestCountryCode);
								} catch (error) {
									Console.warn(`Cache request failed: ${cacheCountryCode}`, error);
									continue;
								}
								switch (response?.status) {
									case 200:
										if (!response?.eTag || !response?.body?.length) Console.warn(`Skip cache update: ${cacheCountryCode}`);
										else await GEOResourceManifest.setCache(Caches, cacheURL.search, response.eTag, response.body, KV);
										break;
									case 304:
										Console.info(`Cache not modified: ${cacheCountryCode}`);
										break;
									default:
										Console.warn(`Cache request failed: ${cacheCountryCode}, status: ${response?.status}`);
										break;
								}
							}
							break;
						}
					}
					break;
			}
			break;
		case "CONNECT":
		case "TRACE":
			break;
	}
	$request.url = url.toString();
	Console.debug(`$request.url: ${$request.url}`);
	return { $request, $response };
}
