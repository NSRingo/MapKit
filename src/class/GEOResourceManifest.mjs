import { Console, fetch, Storage } from "@nsnanocat/util";
import GEOResourceManifestDownload from "./GEOResourceManifestDownload.mjs";
export default class GEOResourceManifest {
	/**
	 * 下载资源清单二进制。
	 * Download resource manifest binary.
	 * @param {object} request 请求对象 / Request object.
	 * @param {string} countryCode 国家代码 / Country code.
	 * @returns {Promise<{status: number, eTag: string|undefined, body: Uint8Array}>} 下载结果 / Download result.
	 */
	static async download(request = $request, countryCode = "CN") {
		Console.log("☑️ Download");
		const newRequest = { ...request };
		newRequest.url = new URL(newRequest.url);
		newRequest.url.searchParams.set("country_code", countryCode === "XX" ? "US" : countryCode);
		newRequest.url = newRequest.url.toString();
		newRequest["binary-mode"] = true;
		const response = await fetch(newRequest);
		const rawBody = response.bodyBytes ? new Uint8Array(response.bodyBytes) : (response.body ?? new Uint8Array());
		Console.log("✅ Download");
		return { status: response.status ?? response.statusCode ?? 0, eTag: response.headers?.Etag ?? response.headers?.etag, body: rawBody };
	}

	/**
	 * 读取资源清单缓存。
	 * Read resource manifest cache.
	 * @param {object} caches 缓存对象 / Cache object.
	 * @param {string} queryString 查询字符串（包含前导问号） / Query string with leading question mark.
	 * @param {object} KV Shared KV storage instance.
	 * @returns {Promise<{eTag?: string, base64?: string}|undefined>} 缓存条目 / Cache entry.
	 */
	static async getCache(caches = {}, queryString = "", KV) {
		Console.log("☑️ Get Cache");
		if (!queryString) {
			Console.error("Get Cache", "Missing query string");
			return undefined;
		}
		let cache = {};
		if (KV) cache = await KV.getItem(`@iRingo.MapKit.Caches.${queryString}`);
		else cache = Storage.getItem(`@iRingo.MapKit.Caches.${queryString}`);
		switch (typeof cache?.base64) {
			case "string":
				Console.log("✅ Get Cache");
				return cache;
			case "undefined":
				Console.warn("Get Cache", `Cache not found: ${queryString}`);
				return undefined;
		}
	}

	/**
	 * 写入资源清单缓存。
	 * Write resource manifest cache.
	 * @param {object} caches 缓存对象 / Cache object.
	 * @param {string} queryString 查询字符串（包含前导问号） / Query string with leading question mark.
	 * @param {string} eTag 实体标签 / Entity tag.
	 * @param {Uint8Array|ArrayBuffer} rawBody 原始二进制 / Raw binary body.
	 * @param {object} KV Shared KV storage instance.
	 * @returns {Promise<boolean>} 是否写入成功 / Whether cache is written.
	 */
	static async setCache(caches = {}, queryString = "", eTag = "", rawBody = new Uint8Array(), KV) {
		Console.log("☑️ Set Cache");
		if (!queryString) {
			Console.error("Set Cache", "Missing query string");
			return false;
		}
		if (!eTag) {
			Console.error("Set Cache", `Missing eTag: ${queryString}`);
			return false;
		}
		rawBody = rawBody instanceof Uint8Array ? rawBody : new Uint8Array(rawBody ?? []);
		if (!rawBody.length) {
			Console.error("Set Cache", `Empty body: ${queryString}`);
			return false;
		}
		let base64 = "";
		try {
			switch (true) {
				case typeof globalThis.Buffer !== "undefined":
					base64 = globalThis.Buffer.from(rawBody.buffer, rawBody.byteOffset, rawBody.byteLength).toString("base64");
					break;
				case typeof globalThis.btoa === "function": {
					const chunks = [];
					for (let index = 0; index < rawBody.length; index += 0x2000) {
						const chunk = rawBody.subarray(index, index + 0x2000);
						let binary = "";
						for (const byte of chunk) binary += String.fromCharCode(byte);
						chunks.push(binary);
					}
					base64 = globalThis.btoa(chunks.join(""));
					break;
				}
				default:
					throw new Error("Unsupported base64 encoder");
			}
			if (!base64) throw new Error(`Empty base64: ${queryString}`);
		} catch (error) {
			Console.error(error);
			Console.error("Set Cache", `Encode failed: ${queryString}`);
			return false;
		}
		let result;
		if (KV) result = await KV.setItem(`@iRingo.MapKit.Caches.${queryString}`, { eTag, base64 });
		else result = Storage.setItem(`@iRingo.MapKit.Caches.${queryString}`, { eTag, base64 });
		Console.log("✅ Set Cache");
		return result;
	}

	/**
	 * 解码资源清单缓存。
	 * Decode resource manifest cache.
	 * @param {object} caches 缓存对象 / Cache object.
	 * @param {string} queryString 查询字符串（包含前导问号） / Query string with leading question mark.
	 * @param {object} KV Shared KV storage instance.
	 * @returns {Promise<object|undefined>} 解码结果 / Decoded manifest.
	 */
	static async decodeCache(caches = {}, queryString = "", KV) {
		Console.log("☑️ Decode Cache");
		const cache = await GEOResourceManifest.getCache(caches, queryString, KV);
		if (!cache?.base64) {
			Console.error("Decode Cache", `Missing cache: ${queryString}`);
			return undefined;
		}
		try {
			let rawBody;
			switch (true) {
				case typeof globalThis.Buffer !== "undefined":
					rawBody = new Uint8Array(globalThis.Buffer.from(cache.base64, "base64"));
					break;
				case typeof globalThis.atob === "function": {
					const binary = globalThis.atob(cache.base64);
					rawBody = new Uint8Array(binary.length);
					for (let index = 0; index < binary.length; index++) rawBody[index] = binary.charCodeAt(index);
					break;
				}
				default:
					throw new Error("Unsupported base64 decoder");
			}
			if (!rawBody?.length) {
				Console.error("Decode Cache", `Empty body: ${queryString}`);
				return undefined;
			}
			const body = GEOResourceManifestDownload.decode(rawBody);
			Console.log("✅ Decode Cache");
			return body;
		} catch (error) {
			Console.error(error);
			Console.error("Decode Cache", `Decode failed: ${queryString}`);
			return undefined;
		}
	}

	/**
	 * 按源地区、图块设置与配置分组构建要从源清单注入的样式表。
	 * Build the style list to inject from the source manifest using the source region, tile settings, and configured groups.
	 * @param {object} configs 图块样式分组 / Tile style groups.
	 * @param {object} settings 地图设置 / Maps settings.
	 * @param {string} sourceCountryCode 源国家代码 / Source country code.
	 * @param {boolean} includeBase 是否注入基础样式 / Whether to inject base styles.
	 * @returns {Array<string>} 要从源清单注入的图块样式 / Tile styles to inject from the source manifest.
	 */
	static tileStyles(configs = {}, settings = {}, sourceCountryCode = "CN", includeBase = true) {
		Console.log("☑️ Set TileStyles");
		const config = configs.TileStyles ?? {};
		const tileStyles = includeBase && Array.isArray(config.Base) ? [...config.Base] : [];
		for (const [setting, group] of Object.entries(config)) {
			if (setting === "Base" || !Array.isArray(group)) continue;
			let settingCountryCode;
			switch (settings.TileSet?.[setting]) {
				case "CN":
				case "AutoNavi":
					settingCountryCode = "CN";
					break;
				case "KR":
				case "Tmap":
					settingCountryCode = ["Map", "POI", "Road", "Earth"].includes(setting) ? "KR" : "XX";
					break;
				case "XX":
				case "Apple":
				default:
					settingCountryCode = "XX";
					break;
			}
			if (settingCountryCode === sourceCountryCode) tileStyles.push(...group);
		}
		const result = [...new Set(tileStyles.filter(tileStyle => typeof tileStyle === "string"))];
		Console.info(`相对源地区 ${sourceCountryCode} 选入的 tileStyles: ${JSON.stringify(result)}`);
		Console.log("✅ Set TileStyles");
		return result;
	}

	static requiredSources(configs = {}, settings = {}, targetCountryCode = "US") {
		const sources = targetCountryCode === "CN" ? ["XX"] : ["CN"];
		const region = targetCountryCode === "KR" ? "XX" : "KR";
		if (GEOResourceManifest.tileStyles(configs, settings, region, false).length) sources.push(region);
		return sources;
	}

	/**
	 * 使用源图块集合中的指定样式组新增或替换目标图块集合中的同名组。
	 * Add or replace matching target style groups with selected style groups from the source tile set.
	 * @param {Array<object>} source 源图块集合 / Source tile set.
	 * @param {Array<object>} target 目标图块集合 / Target tile set.
	 * @param {Array<string>} tileStyles 要选入的图块样式名称 / Tile style names to select.
	 * @returns {Array<object>} 更新后的目标图块集合 / Updated target tile set.
	 */
	static tileSets(source = [], target = [], tileStyles = []) {
		source = Array.isArray(source) ? source : [];
		target = Array.isArray(target) ? target : [];
		tileStyles = Array.isArray(tileStyles) ? tileStyles : [];
		for (let index = tileStyles.length - 1; index >= 0; index--) {
			if (typeof tileStyles[index] !== "string" || tileStyles.indexOf(tileStyles[index]) !== index) tileStyles.splice(index, 1);
		}
		const sourceTileStyles = [];
		const targetTileStyles = [];
		for (const tile of source) {
			if (typeof tile?.style === "string" && !sourceTileStyles.includes(tile.style)) sourceTileStyles.push(tile.style);
		}
		for (const tile of target) {
			if (typeof tile?.style === "string" && !targetTileStyles.includes(tile.style)) targetTileStyles.push(tile.style);
		}
		const sourceExclusiveTileStyles = sourceTileStyles.filter(tileStyle => !targetTileStyles.includes(tileStyle));
		const targetExclusiveTileStyles = targetTileStyles.filter(tileStyle => !sourceTileStyles.includes(tileStyle));
		Console.info(`图块集合 source 拥有的 tileStyles: ${JSON.stringify(sourceTileStyles)}`);
		Console.info(`图块集合 target 拥有的 tileStyles: ${JSON.stringify(targetTileStyles)}`);
		Console.info(`图块集合 source 独占的 tileStyles: ${JSON.stringify(sourceExclusiveTileStyles)}`);
		Console.info(`图块集合 target 独占的 tileStyles: ${JSON.stringify(targetExclusiveTileStyles)}`);
		const modifiedTileStyles = [];
		const unmodifiedTileStyles = [];
		for (const tileStyle of tileStyles) {
			if (source === target || !source.some(tile => tile?.style === tileStyle)) {
				unmodifiedTileStyles.push(tileStyle);
				continue;
			}
			let targetIndex = target.findIndex(tile => tile?.style === tileStyle);
			if (targetIndex < 0) targetIndex = target.length;
			for (let index = target.length - 1; index >= 0; index--) {
				if (target[index]?.style === tileStyle) target.splice(index, 1);
			}
			for (let index = source.length - 1; index >= 0; index--) {
				if (source[index]?.style === tileStyle) target.splice(targetIndex, 0, source[index]);
			}
			modifiedTileStyles.push(tileStyle);
		}
		const returnedTargetTileStyles = [];
		for (const tile of target) {
			if (typeof tile?.style === "string" && !returnedTargetTileStyles.includes(tile.style)) returnedTargetTileStyles.push(tile.style);
		}
		Console.info(`图块集合最终返回的 target tileStyles: ${JSON.stringify(returnedTargetTileStyles)}`);
		Console.info(`图块集合已修改的 tileStyles: ${JSON.stringify(modifiedTileStyles)}`);
		Console.info(`图块集合未修改的 tileStyles: ${JSON.stringify(unmodifiedTileStyles)}`);
		return target;
	}

	/**
	 * 将源署名注入目标署名，并按目标国家代码决定插入顺序。
	 * Inject source attributions into the target and determine insertion order from the target country code.
	 * @param {Array<object>} source 源署名集合 / Source attribution collection.
	 * @param {Array<object>} target 目标署名集合 / Target attribution collection.
	 * @param {string} targetCountryCode 目标国家代码 / Target country code.
	 * @returns {Array<object>} 合成后的署名集合 / Merged attribution collection.
	 */
	static attributions(source = [], target = [], targetCountryCode = "CN") {
		Console.log("☑️ Set Attributions");
		source = Array.isArray(source) ? source : [];
		target = Array.isArray(target) ? target : [];
		let attributions = target;
		switch (targetCountryCode) {
			case "CN":
				source.forEach(attribution => {
					if (!attributions.some(item => item.name === attribution.name)) attributions.unshift(attribution);
				});
				break;
			default:
				source.forEach(attribution => {
					if (!attributions.some(item => item.name === attribution.name)) attributions.push(attribution);
				});
				break;
		}
		attributions.sort((a, b) => {
			switch (a.name) {
				case "‎":
					return -1;
				case "AutoNavi":
					return 0;
				default:
					return 1;
			}
		});
		attributions = attributions
			.map((attribution, index) => {
				switch (attribution.name) {
					case "‎":
						attribution.name = ` iRingo: 📍 GEOResourceManifest\n${new Date()}`;
						delete attribution.plainTextURLSHA256Checksum;
						break;
					case "AutoNavi":
						attribution.resource = attribution.resource?.filter(i => i.resourceType !== 6);
						attribution.region = [
							{ minX: 214, minY: 82, maxX: 216, maxY: 82, minZ: 8, maxZ: 21 },
							{ minX: 213, minY: 83, maxX: 217, maxY: 83, minZ: 8, maxZ: 21 },
							{ minX: 213, minY: 84, maxX: 218, maxY: 84, minZ: 8, maxZ: 21 },
							{ minX: 213, minY: 85, maxX: 218, maxY: 85, minZ: 8, maxZ: 21 },
							{ minX: 212, minY: 86, maxX: 218, maxY: 86, minZ: 8, maxZ: 21 },
							{ minX: 189, minY: 87, maxX: 190, maxY: 87, minZ: 8, maxZ: 21 },
							{ minX: 210, minY: 87, maxX: 220, maxY: 87, minZ: 8, maxZ: 21 },
							{ minX: 188, minY: 88, maxX: 191, maxY: 88, minZ: 8, maxZ: 21 },
							{ minX: 210, minY: 88, maxX: 223, maxY: 88, minZ: 8, maxZ: 21 },
							{ minX: 188, minY: 89, maxX: 192, maxY: 89, minZ: 8, maxZ: 21 },
							{ minX: 210, minY: 89, maxX: 223, maxY: 89, minZ: 8, maxZ: 21 },
							{ minX: 186, minY: 90, maxX: 192, maxY: 90, minZ: 8, maxZ: 21 },
							{ minX: 210, minY: 90, maxX: 223, maxY: 90, minZ: 8, maxZ: 21 },
							{ minX: 209, minY: 91, maxX: 222, maxY: 91, minZ: 8, maxZ: 21 },
							{ minX: 186, minY: 91, maxX: 192, maxY: 91, minZ: 8, maxZ: 21 },
							{ minX: 184, minY: 92, maxX: 195, maxY: 92, minZ: 8, maxZ: 21 },
							{ minX: 207, minY: 92, maxX: 221, maxY: 92, minZ: 8, maxZ: 21 },
							{ minX: 185, minY: 93, maxX: 196, maxY: 93, minZ: 8, maxZ: 21 },
							{ minX: 206, minY: 93, maxX: 221, maxY: 93, minZ: 8, maxZ: 21 },
							{ minX: 185, minY: 94, maxX: 200, maxY: 94, minZ: 8, maxZ: 21 },
							{ minX: 203, minY: 94, maxX: 221, maxY: 94, minZ: 8, maxZ: 21 },
							{ minX: 182, minY: 94, maxX: 219, maxY: 95, minZ: 8, maxZ: 21 },
							{ minX: 180, minY: 96, maxX: 217, maxY: 96, minZ: 8, maxZ: 21 },
							{ minX: 180, minY: 97, maxX: 216, maxY: 97, minZ: 8, maxZ: 21 },
							{ minX: 180, minY: 98, maxX: 214, maxY: 98, minZ: 8, maxZ: 21 },
							{ minX: 180, minY: 99, maxX: 215, maxY: 99, minZ: 8, maxZ: 21 },
							{ minX: 182, minY: 100, maxX: 214, maxY: 100, minZ: 8, maxZ: 21 },
							{ minX: 183, minY: 101, maxX: 213, maxY: 101, minZ: 8, maxZ: 21 },
							{ minX: 184, minY: 102, maxX: 214, maxY: 102, minZ: 8, maxZ: 21 },
							{ minX: 183, minY: 103, maxX: 214, maxY: 103, minZ: 8, maxZ: 21 },
							{ minX: 184, minY: 104, maxX: 215, maxY: 104, minZ: 8, maxZ: 21 },
							{ minX: 185, minY: 105, maxX: 215, maxY: 105, minZ: 8, maxZ: 21 },
							{ minX: 187, minY: 106, maxX: 215, maxY: 106, minZ: 8, maxZ: 21 },
							{ minX: 189, minY: 107, maxX: 193, maxY: 107, minZ: 8, maxZ: 21 },
							{ minX: 197, minY: 107, maxX: 214, maxY: 107, minZ: 8, maxZ: 21 },
							{ minX: 198, minY: 108, maxX: 214, maxY: 108, minZ: 8, maxZ: 21 },
							{ minX: 110, minY: 109, maxX: 214, maxY: 109, minZ: 8, maxZ: 21 },
							{ minX: 197, minY: 110, maxX: 214, maxY: 110, minZ: 8, maxZ: 21 },
							{ minX: 198, minY: 111, maxX: 214, maxY: 111, minZ: 8, maxZ: 21 },
							{ minX: 204, minY: 112, maxX: 209, maxY: 112, minZ: 8, maxZ: 21 },
							{ minX: 213, minY: 112, maxX: 214, maxY: 112, minZ: 8, maxZ: 21 },
							{ minX: 205, minY: 113, maxX: 207, maxY: 113, minZ: 8, maxZ: 21 },
							{ minX: 205, minY: 114, maxX: 206, maxY: 114, minZ: 8, maxZ: 21 },
							{ minX: 204, minY: 115, maxX: 212, maxY: 128, minZ: 8, maxZ: 21 },
						];
						break;
				}
				return attribution;
			})
			.flat(Number.POSITIVE_INFINITY)
			.filter(Boolean);
		Console.log("✅ Set Attributions");
		return attributions;
	}

	/**
	 * 将源资源注入目标资源，并按目标国家代码决定注入范围。
	 * Inject source resources into the target and determine the injection scope from the target country code.
	 * @param {Array<object>} source 源资源集合 / Source resource collection.
	 * @param {Array<object>} target 目标资源集合 / Target resource collection.
	 * @param {string} targetCountryCode 目标国家代码 / Target country code.
	 * @returns {Array<object>} 合成后的资源集合 / Merged resource collection.
	 */
	static resources(source = [], target = [], targetCountryCode = "CN") {
		Console.log("☑️ Set Resources");
		source = Array.isArray(source) ? source : [];
		target = Array.isArray(target) ? target : [];
		const resources = target;
		switch (targetCountryCode) {
			case "CN":
				break;
			default:
				source.forEach(resource => {
					if (resource.filename === "POITypeMapping-CN-1.json") resources.push(resource);
					if (resource.filename === "POITypeMapping-CN-2.json") resources.push(resource);
					if (resource.filename === "China.cms-lpr") resources.push(resource);
				});
				break;
		}
		Console.log("✅ Set Resources");
		return resources;
	}

	/**
	 * 将源数据集注入目标数据集，并按目标国家代码决定是否替换。
	 * Inject source data sets into the target and determine replacement from the target country code.
	 * @param {Array<object>} source 源数据集 / Source data sets.
	 * @param {Array<object>} target 目标数据集 / Target data sets.
	 * @param {string} targetCountryCode 目标国家代码 / Target country code.
	 * @returns {Array<object>} 合成后的数据集 / Merged data sets.
	 */
	static dataSets(source = [], target = [], targetCountryCode = "CN") {
		Console.log("☑️ Set DataSets");
		source = Array.isArray(source) ? source : [];
		target = Array.isArray(target) ? target : [];
		switch (targetCountryCode) {
			case "CN":
				target.splice(0, target.length, ...source);
				break;
			default:
				break;
		}
		//dataSets.push({ "dataSetDescription": "AutoNavi", "identifier": 10 });
		Console.log("✅ Set DataSets");
		return target;
	}

	/**
	 * 将源 URL 配置合入目标 URL 配置并应用服务提供方设置。
	 * Merge source URL information into the target and apply service-provider settings.
	 * @param {Array<object>} source 源 URL 配置集合 / Source URL information collection.
	 * @param {Array<object>} target 目标 URL 配置集合 / Target URL information collection.
	 * @param {object} settings 地图设置 / Maps settings.
	 * @param {string} targetCountryCode 目标国家代码 / Target country code.
	 * @param {string|null} os 操作系统标识 / Operating system identifier.
	 * @returns {Array<object>} 合成后的 URL 配置集合 / Merged URL information collection.
	 */
	static urlInfoSets(source = [], target = [], settings = {}, targetCountryCode = "CN", os = null) {
		Console.log("☑️ Set UrlInfoSets");
		source = Array.isArray(source) ? source : [];
		target = Array.isArray(target) ? target : [];
		let cnURLInfoSet = (targetCountryCode === "CN" ? target : source)[0] ?? {};
		let xxURLInfoSet = (targetCountryCode === "CN" ? source : target)[0] ?? {};
		const urlInfoSets = target.map(urlInfoSet => {
			if (targetCountryCode === "KR") {
				cnURLInfoSet = source.find(item => item.dataSet === urlInfoSet.dataSet) ?? source[0] ?? {};
				xxURLInfoSet = urlInfoSet;
			}
			urlInfoSet = targetCountryCode === "CN" ? { ...xxURLInfoSet, ...cnURLInfoSet } : { ...cnURLInfoSet, ...xxURLInfoSet };
			switch (settings.Config?.Announcements?.Environment ?? settings.Config?.Announcements?.["Environment:"]?.default ?? settings.Config?.Announcements?.["Environment:"]) {
				case "AUTO":
				default:
					break;
				case "CN":
					// Announcements
					urlInfoSet.announcementsURL = cnURLInfoSet.announcementsURL;
					break;
				case "XX":
					// Announcements
					urlInfoSet.announcementsURL = xxURLInfoSet.announcementsURL;
					break;
			}
			switch (settings.UrlInfoSet.Dispatcher) {
				case "AUTO":
				default:
					break;
				case "AutoNavi":
					// PlaceData Dispatcher
					urlInfoSet.dispatcherURL = cnURLInfoSet.dispatcherURL;
					// Background Dispatcher
					urlInfoSet.backgroundDispatcherURL = cnURLInfoSet.backgroundDispatcherURL;
					// Background Reverse Geocoder
					urlInfoSet.backgroundRevGeoURL = cnURLInfoSet.backgroundRevGeoURL;
					// Batch Reverse Geocoder
					urlInfoSet.batchReverseGeocoderPlaceRequestURL = cnURLInfoSet.batchReverseGeocoderPlaceRequestURL;
					break;
				case "Apple":
					// PlaceData Dispatcher
					urlInfoSet.dispatcherURL = xxURLInfoSet.dispatcherURL;
					// Background Dispatcher
					urlInfoSet.backgroundDispatcherURL = xxURLInfoSet.backgroundDispatcherURL;
					// Background Reverse Geocoder
					urlInfoSet.backgroundRevGeoURL = xxURLInfoSet.backgroundRevGeoURL;
					// Batch Reverse Geocoder
					urlInfoSet.batchReverseGeocoderPlaceRequestURL = xxURLInfoSet.batchReverseGeocoderPlaceRequestURL;
					break;
			}
			switch (settings.UrlInfoSet.Directions) {
				case "AutoNavi":
				default:
					// Directions
					urlInfoSet.directionsURL = cnURLInfoSet.directionsURL;
					// ETA
					urlInfoSet.etaURL = cnURLInfoSet.etaURL;
					// Simple ETA
					urlInfoSet.simpleETAURL = cnURLInfoSet.simpleETAURL;
					break;
				case "Apple":
					// Directions
					urlInfoSet.directionsURL = xxURLInfoSet.directionsURL;
					// ETA
					urlInfoSet.etaURL = xxURLInfoSet.etaURL;
					// Simple ETA
					urlInfoSet.simpleETAURL = xxURLInfoSet.simpleETAURL;
					break;
			}
			switch (settings.UrlInfoSet.RAP) {
				case "AutoNavi":
					// RAP Submission
					urlInfoSet.problemSubmissionURL = cnURLInfoSet.problemSubmissionURL;
					// RAP Status
					urlInfoSet.problemStatusURL = cnURLInfoSet.problemStatusURL;
					// RAP V4 Submission
					urlInfoSet.feedbackSubmissionURL = cnURLInfoSet.feedbackSubmissionURL;
					// RAP V4 Lookup
					urlInfoSet.feedbackLookupURL = cnURLInfoSet.feedbackLookupURL;
					break;
				case "Apple":
				default:
					// RAP Submission
					urlInfoSet.problemSubmissionURL = xxURLInfoSet.problemSubmissionURL;
					// RAP Status
					urlInfoSet.problemStatusURL = xxURLInfoSet.problemStatusURL;
					// RAP Opt-Ins
					urlInfoSet.problemOptInURL = xxURLInfoSet.problemOptInURL;
					// RAP V4 Submission
					urlInfoSet.feedbackSubmissionURL = xxURLInfoSet.feedbackSubmissionURL;
					// RAP V4 Lookup
					urlInfoSet.feedbackLookupURL = xxURLInfoSet.feedbackLookupURL;
					break;
			}
			switch (settings.UrlInfoSet.LocationShift) {
				case "AUTO":
					// watchOS 使用国际版定位，其余系统使用中国版定位。
					urlInfoSet.polyLocationShiftURL = os === "watchos" ? xxURLInfoSet.polyLocationShiftURL : cnURLInfoSet.polyLocationShiftURL;
					break;
				case "AutoNavi":
				default:
					// Location Shift (polynomial)
					urlInfoSet.polyLocationShiftURL = cnURLInfoSet.polyLocationShiftURL;
					break;
				case "Apple":
					// Location Shift (polynomial)
					urlInfoSet.polyLocationShiftURL = xxURLInfoSet.polyLocationShiftURL;
					break;
			}
			return urlInfoSet;
		});
		Console.log("✅ Set UrlInfoSets");
		return urlInfoSets;
	}

	/**
	 * 将选定地区的源分桶注入目标分桶。
	 * Inject source buckets for the selected region into the target buckets.
	 * @param {Array<object>} source 源分桶集合 / Source bucket collection.
	 * @param {Array<object>} target 目标分桶集合 / Target bucket collection.
	 * @param {object} settings 地图设置 / Maps settings.
	 * @param {string} targetCountryCode 目标国家代码 / Target country code.
	 * @returns {Array<object>} 选定的分桶集合 / Selected bucket collection.
	 */
	static muninBuckets(source = [], target = [], settings = {}, targetCountryCode = "CN") {
		Console.log("☑️ Set MuninBuckets");
		source = Array.isArray(source) ? source : [];
		target = Array.isArray(target) ? target : [];
		let cnMuninBuckets;
		let xxMuninBuckets;
		switch (targetCountryCode) {
			case "CN":
				cnMuninBuckets = target;
				xxMuninBuckets = source;
				break;
			default:
				cnMuninBuckets = source;
				xxMuninBuckets = target;
				break;
		}
		switch (settings.TileSet.Munin) {
			case "CN":
				target.splice(0, target.length, ...cnMuninBuckets);
				break;
			case "XX":
			default:
				target.splice(0, target.length, ...xxMuninBuckets);
				break;
		}
		Console.log("✅ Set MuninBuckets");
		return target;
	}

	/**
	 * 将源显示字符串注入目标显示字符串，并按目标国家代码决定是否替换。
	 * Inject source display strings into the target and determine replacement from the target country code.
	 * @param {Array<object>} source 源显示字符串集合 / Source display string collection.
	 * @param {Array<object>} target 目标显示字符串集合 / Target display string collection.
	 * @param {string} targetCountryCode 目标国家代码 / Target country code.
	 * @returns {Array<object>} 合成后的显示字符串集合 / Merged display string collection.
	 */
	static displayStrings(source = [], target = [], targetCountryCode = "CN") {
		Console.log("☑️ Set DisplayStrings");
		source = Array.isArray(source) ? source : [];
		target = Array.isArray(target) ? target : [];
		switch (targetCountryCode) {
			case "CN":
				target.splice(0, target.length, ...source);
				break;
			default:
				// 国际显示字符串直接保留目标清单内容。
				// International display strings retain the target manifest content.
				break;
		}
		Console.log("✅ Set DisplayStrings");
		return target;
	}

	/**
	 * 合成选定地区的资源清单，最后重建图块组索引。
	 * Compose selected regional manifests and rebuild tile-group indices once.
	 */
	static compose(target, sources, configs, settings, targetCountryCode, os) {
		const sourceCountryCode = targetCountryCode === "CN" ? "XX" : "CN";
		const source = sources[sourceCountryCode];
		if (source && targetCountryCode !== "KR") {
			target.tileSet = GEOResourceManifest.tileSets(source.tileSet, target.tileSet, GEOResourceManifest.tileStyles(configs, settings, sourceCountryCode));
			target.attribution = GEOResourceManifest.attributions(source.attribution, target.attribution, targetCountryCode);
			target.resource = GEOResourceManifest.resources(source.resource, target.resource, targetCountryCode);
			target.dataSet = GEOResourceManifest.dataSets(source.dataSet, target.dataSet, targetCountryCode);
			target.urlInfoSet = GEOResourceManifest.urlInfoSets(source.urlInfoSet, target.urlInfoSet, settings, targetCountryCode, os);
			target.displayString = GEOResourceManifest.displayStrings(source.displayString, target.displayString, targetCountryCode);
			target.muninBucket = GEOResourceManifest.muninBuckets(source.muninBucket, target.muninBucket, settings, targetCountryCode);
		}
		const muninStyles = configs.TileStyles?.Munin ?? [];
		for (const region of targetCountryCode === "KR" ? ["CN", "XX"] : ["KR"]) {
			const source = sources[region];
			if (!source) continue;
			let styles = GEOResourceManifest.tileStyles(configs, settings, region, false);
			const switchMunin = source.muninBucket?.length && muninStyles.length && muninStyles.every(style => styles.includes(style) && source.tileSet?.some(tile => tile.style === style));
			if (!switchMunin) styles = styles.filter(style => !muninStyles.includes(style));
			const selectedTiles = source.tileSet?.filter(tile => styles.includes(tile.style)) ?? [];
			if (!selectedTiles.length) continue;
			const dataSetIDs = new Set(selectedTiles.map(tile => tile.dataSet).filter(id => id !== undefined));
			for (const urlInfo of source.urlInfoSet ?? []) {
				if (dataSetIDs.has(urlInfo.dataSet) && !target.urlInfoSet?.some(item => item.dataSet === urlInfo.dataSet)) {
					(target.urlInfoSet ??= []).push({ ...urlInfo, alternateResourcesURL: [...(urlInfo.alternateResourcesURL ?? [])] });
				}
			}
			const remapResource = (resource, dataSet) => {
				const sourceURLInfo = source.urlInfoSet?.find(row => row.dataSet === dataSet) ?? source.urlInfoSet?.[0];
				const url = sourceURLInfo?.alternateResourcesURL?.[resource.alternateResourceURLIndex];
				if (!url) return resource;
				let targetURLInfo = target.urlInfoSet?.find(row => row.dataSet === dataSet) ?? target.urlInfoSet?.[0];
				if (!targetURLInfo) {
					targetURLInfo = { ...sourceURLInfo, alternateResourcesURL: [] };
					(target.urlInfoSet ??= []).push(targetURLInfo);
				}
				const urls = (targetURLInfo.alternateResourcesURL ??= []);
				let index = urls.findIndex(item => JSON.stringify(item) === JSON.stringify(url));
				if (index < 0) index = urls.push(url) - 1;
				return { ...resource, alternateResourceURLIndex: index };
			};
			for (const resource of source.resource ?? []) {
				if (!target.resource?.some(item => item.filename === resource.filename)) (target.resource ??= []).push(remapResource(resource));
			}
			target.tileSet = GEOResourceManifest.tileSets(source.tileSet, target.tileSet, styles);
			if (switchMunin) target.muninBucket = source.muninBucket;
			const displayIndices = (source.displayString ?? []).map(displayString => {
				let index = target.displayString?.findIndex(item => JSON.stringify(item) === JSON.stringify(displayString)) ?? -1;
				if (index < 0) index = (target.displayString ??= []).push(displayString) - 1;
				return index;
			});
			const attributions = (source.attribution ?? []).map(attribution => ({
				...attribution,
				resource: (attribution.resource ?? []).map(resource => remapResource(resource, attribution.dataSet)),
				...(displayIndices[attribution.linkDisplayStringIndex] === undefined ? {} : { linkDisplayStringIndex: displayIndices[attribution.linkDisplayStringIndex] }),
			}));
			target.attribution = GEOResourceManifest.attributions(attributions, target.attribution, targetCountryCode);
			for (const dataSet of source.dataSet ?? []) {
				if (!target.dataSet?.some(item => item.identifier === dataSet.identifier)) (target.dataSet ??= []).push(dataSet);
			}
		}
		if (source && targetCountryCode === "KR") target.urlInfoSet = GEOResourceManifest.urlInfoSets(source.urlInfoSet, target.urlInfoSet, settings, targetCountryCode, os);
		target.tileGroup = GEOResourceManifest.tileGroups(target.tileGroup, target.tileSet, target.attribution, target.resource);
		return target;
	}

	static tileGroups(tileGroups = [], tileSets = [], attributions = [], resources = []) {
		Console.log("☑️ Set TileGroups");
		tileGroups = tileGroups.map(tileGroup => {
			Console.debug(`tileGroup.identifier: ${tileGroup.identifier}`);
			tileGroup.identifier += Math.floor(Math.random() * 100) + 1;
			Console.debug(`tileGroup.identifier: ${tileGroup.identifier}`);
			tileGroup.tileSet = tileSets.map((tileSet, index) => {
				return {
					tileSetIndex: index,
					identifier: tileSet.validVersion?.[0]?.identifier,
				};
			});
			if (attributions)
				tileGroup.attributionIndex = attributions.map((attribution, index) => {
					return index;
				});
			if (resources)
				tileGroup.resourceIndex = resources.map((resource, index) => {
					return index;
				});
			return tileGroup;
		});
		Console.log("✅ Set TileGroups");
		return tileGroups;
	}
}
