import { Console, Lodash as _ } from "@nsnanocat/util";
import XML from "@nsnanocat/xml";
import database from "../function/database.mjs";
import setENV from "../function/setENV.mjs";
import GEOResourceManifest from "../class/GEOResourceManifest.mjs";
import GEOResourceManifestDownload from "../class/GEOResourceManifestDownload.mjs";
import { BinaryReader, UnknownFieldHandler } from "@protobuf-ts/runtime";
/***************** Processing *****************/
export async function Response($request, $response, KV) {
	// 解构URL
	const url = new URL($request.url);
	Console.info(`url: ${url.toJSON()}`);
	// 获取连接参数
	const PATHs = url.pathname.split("/").filter(Boolean);
	Console.info(`PATHs: ${PATHs}`);
	// 解析格式
	const FORMAT = ($response.headers?.["Content-Type"] ?? $response.headers?.["content-type"])?.split(";")?.[0];
	Console.info(`FORMAT: ${FORMAT}`);
	const PLATFORM = ["MapKit"];
	if (url.searchParams.get("os") === "watchos") PLATFORM.push("Watch");
	Console.info(`PLATFORM: ${PLATFORM}`);
	/**
	 * 设置
	 * @type {{Settings: import('./types').Settings}}
	 */
	const { Settings, Caches, Configs } = await setENV("iRingo", PLATFORM, database);
	Console.logLevel = Settings.LogLevel;
	// 创建空数据
	let body = {};
	// 格式判断
	switch (FORMAT) {
		case undefined: // 视为无body
			break;
		case "application/x-www-form-urlencoded":
		case "text/plain":
		default:
			//Console.debug(`body: ${body}`);
			break;
		case "application/x-mpegURL":
		case "application/x-mpegurl":
		case "application/vnd.apple.mpegurl":
		case "audio/mpegurl":
			//body = M3U8.parse($response.body);
			//Console.debug(`body: ${JSON.stringify(body)}`);
			//$response.body = M3U8.stringify(body);
			break;
		case "text/xml":
		case "text/html":
		case "text/plist":
		case "application/xml":
		case "application/plist":
		case "application/x-plist":
			// 主机判断
			switch (url.hostname) {
				case "configuration.ls.apple.com":
					//body = await PLISTs("plist2json", $response.body);
					BigInt.prototype.toJSON = function () {
						return this.toString();
					};
					body = XML.parse($app === "Node.js" ? new TextDecoder().decode($response.body ?? new Uint8Array()) : $response.body);
					Console.debug(`body: ${JSON.stringify(body)}`);
					// 路径判断
					switch (url.pathname) {
						case "/config/defaults": {
							const PLIST = body.plist;
							if (PLIST) {
								// CN
								PLIST["com.apple.GEO"].CountryProviders.CN.ShouldEnableLagunaBeach = true; // XX
								delete PLIST["com.apple.GEO"]?.CountryProviders?.CN?.DrivingMultiWaypointRoutesEnabled; // 路线-驾驶-停靠点
								//PLIST["com.apple.GEO"].CountryProviders.CN.EnableAlberta = false; // CN
								//PLIST["com.apple.GEO"].CountryProviders.CN.EnableClientDrapedVectorPolygons = true; // CN
								//delete PLIST["com.apple.GEO"]?.CountryProviders?.CN?.GEOAddressCorrectionEnabled; // 启用更正地址
								//delete PLIST["com.apple.GEO"]?.CountryProviders?.CN?.GEOBatchSpatialEventLookupMaxParametersCount; // CN
								//delete PLIST["com.apple.GEO"]?.CountryProviders?.CN?.GEOBatchSpatialPlaceLookupMaxParametersCount; // CN
								delete PLIST["com.apple.GEO"]?.CountryProviders?.CN?.LocalitiesAndLandmarksSupported; // 支持地名和地标
								delete PLIST["com.apple.GEO"]?.CountryProviders?.CN?.NavigationShowHeadingKey; // 导航时显示朝向按钮
								//delete PLIST["com.apple.GEO"]?.CountryProviders?.CN?.ODcwM0Y2NTgtOTY2M; // CN ??
								//delete PLIST["com.apple.GEO"]?.CountryProviders?.CN?.POIBusynessDifferentialPrivacy; // POI 繁忙度差分隐私？（需要，默认仅 CN 停用）
								delete PLIST["com.apple.GEO"]?.CountryProviders?.CN?.POIBusynessRealTime; // 兴趣点繁忙度的实时展示？（需要，默认仅 CN 停用）
								delete PLIST["com.apple.GEO"]?.CountryProviders?.CN?.PedestrianAREnabled; // 步行-现实世界中的线路-举起以查看
								//delete PLIST["com.apple.GEO"]?.CountryProviders?.CN?.SupportedCountriesCustomRouteCreation; // 支持创建自定义步行或徒步线路
								//PLIST["com.apple.GEO"].CountryProviders.CN.TransitPayEnabled = true; // 地图 App 中的交通卡和支付卡（不需要，默认全局启用）
								//PLIST["com.apple.GEO"].CountryProviders.CN.WiFiQualityNetworkDisabled = undefined; // CN
								//PLIST["com.apple.GEO"].CountryProviders.CN.WiFiQualityTileDisabled = undefined; // CN
								//PLIST["com.apple.GEO"].CountryProviders.CN.SupportsOffline = true; // 支持离线地图（不需要，macOS 不支持）
								PLIST["com.apple.GEO"].CountryProviders.CN.SupportsCarIntegration = true; // 支持车辆集成
								// TW
								//PLIST["com.apple.GEO"].CountryProviders.CN.GEOShouldSpeakWrittenAddresses = true; // TW
								//PLIST["com.apple.GEO"].CountryProviders.CN.GEOShouldSpeakWrittenPlaceNames = true; // TW
								// Public
								//PLIST["com.apple.GEO"].GEOMapDarkStylesEnabledKey = "1"; // 深色地图样式启用按钮（不需要，仅 macOS 支持）
								//if (PLIST["com.apple.GEO"].Q0FFNUI2QUEtRUU2) PLIST["com.apple.GEO"].Q0FFNUI2QUEtRUU2.push("CN");
								//if (PLIST["com.apple.GEO"].SupportedCountriesCustomRouteCreation) PLIST["com.apple.GEO"].SupportedCountriesCustomRouteCreation.push("CN"); // 支持创建自定义步行或徒步线路
								//if (PLIST["com.apple.GEO"].VisitedPlacesWarmingSheetCountryEnabled) PLIST["com.apple.GEO"].VisitedPlacesWarmingSheetCountryEnabled.push("CN");
								// mod
								PLIST["com.apple.GEO"].DrivingMultiWaypointRoutesEnabled = true; // 路线-驾驶-停靠点（不需要，默认全局启用）
								PLIST["com.apple.GEO"].LocalitiesAndLandmarksSupported = true; // 支持地名和地标（不需要，默认全局启用）
								PLIST["com.apple.GEO"].NavigationShowHeadingKey = true; // 导航时显示朝向按钮（需要，默认全局停用）
								PLIST["com.apple.GEO"]["6694982d2b14e95815e44e970235e230"] = true; // ?（需要，默认仅 US 启用）
								PLIST["com.apple.GEO"].OpticalHeadingEnabled = true; // 步行-导航精确度-增强（需要，默认仅 US 启用）
								PLIST["com.apple.GEO"].PedestrianAREnabled = true; // 步行-现实世界中的线路-举起以查看（不需要，默认全局启用）
								PLIST["com.apple.GEO"].TransitPayEnabled = true; // 地图 App 中的交通卡和支付卡（不需要，默认全局启用）
								PLIST["com.apple.GEO"].UseCLPedestrianMapMatchedLocations = true; // 使用 Pedestrian 地图匹配位置？（需要，默认仅 US 启用）
							}
							break;
						}
					}
					Console.debug(`body: ${JSON.stringify(body)}`);
					//$response.body = await PLISTs("json2plist", body); // json2plist
					$response.body = XML.stringify(body);
					break;
				case "gspe1-ssl.ls.apple.com":
					// 路径判断
					switch (url.pathname) {
						case "/pep/gcc":
							break;
					}
					break;
			}
			break;
		case "text/vtt":
		case "application/vtt":
			//body = VTT.parse($response.body);
			//Console.debug(`body: ${JSON.stringify(body)}`);
			//$response.body = VTT.stringify(body);
			break;
		case "text/json":
		case "application/json":
			body = JSON.parse($app === "Node.js" ? new TextDecoder().decode($response.body ?? new Uint8Array()) : ($response.body ?? "{}"));
			Console.debug(`body: ${JSON.stringify(body)}`);
			$response.body = JSON.stringify(body);
			break;
		case "application/protobuf":
		case "application/x-protobuf":
		case "application/vnd.google.protobuf":
		case "application/grpc":
		case "application/grpc+proto":
		case "application/octet-stream": {
			//Console.debug(`$response: ${JSON.stringify($response, null, 2)}`);
			let rawBody = $response.bodyBytes ? new Uint8Array($response.bodyBytes) : ($response.body ?? new Uint8Array());
			//Console.debug(`isBuffer? ${ArrayBuffer.isView(rawBody)}: ${JSON.stringify(rawBody)}`);
			switch (FORMAT) {
				case "application/protobuf":
				case "application/x-protobuf":
				case "application/vnd.google.protobuf":
				case "application/octet-stream":
					switch (url.hostname) {
						case "gspe35-ssl.ls.apple.com":
							geoManifestPath: switch (url.pathname) {
								case "/config/announcements":
									break;
								case "/geo_manifest/dynamic/config": {
									body = GEOResourceManifestDownload.decode(rawBody);
									Console.debug(`body before: ${JSON.stringify(body)}`);
									/*
                                    let UF = UnknownFieldHandler.list(body);
                                    //Console.debug(`调试信息`, `UF: ${JSON.stringify(UF)}`);
                                    if (UF) {
                                        UF = UF.map(uf => {
                                            uf.no; // 22
                                            uf.wireType; // WireType.Varint
                                            // use the binary reader to decode the raw data:
                                            let reader = new BinaryReader(uf.data);
                                            let addedNumber = reader.int32(); // 7777
                                            Console.debug(`no: ${uf.no}, wireType: ${uf.wireType}, reader: ${reader}, addedNumber: ${addedNumber}`);
                                        });
                                    };
									*/
									const targetCountryCode = url.searchParams.get("country_code");
									const sources = {};
									for (const region of GEOResourceManifest.requiredSources(Configs, Settings, targetCountryCode)) {
										const cacheURL = new URL(url.toString());
										cacheURL.searchParams.set("country_code", region === "XX" ? "US" : region);
										sources[region] = await GEOResourceManifest.decodeCache(Caches, cacheURL.search, KV);
									}
									if (!Object.values(sources).some(Boolean)) break geoManifestPath;
									const target = GEOResourceManifest.compose(body, sources, Configs, Settings, targetCountryCode, url.searchParams.get("os"));
									Console.debug(`releaseInfo: ${body.releaseInfo}`);
									Console.debug(`body after: ${JSON.stringify(body)}`);
									rawBody = GEOResourceManifestDownload.encode(target);
									break;
								}
							}
							break;
					}
					break;
				case "application/grpc":
				case "application/grpc+proto":
					break;
			}
			// 写入二进制数据
			$response.body = rawBody;
			break;
		}
	}
	return $response;
}
