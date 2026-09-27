import assert from "node:assert/strict";
import test from "node:test";
import { Storage } from "@nsnanocat/util";
import { Resources, TileSetStyle } from "@nsringo/mapkit";
import GEOResourceManifest from "../src/class/GEOResourceManifest.mjs";
import GEOResourceManifestDownload from "../src/class/GEOResourceManifestDownload.mjs";
import database from "../src/function/database.mjs";

test("source 始终注入 target，targetCountryCode 只决定注入规则", () => {
	const sourceAttributions = [{ name: "Source" }];
	const targetAttributions = [{ name: "Target" }];
	const attributions = GEOResourceManifest.attributions(sourceAttributions, targetAttributions, "CN");
	assert.deepEqual(attributions.map(({ name }) => name).sort(), ["Source", "Target"]);
	assert.deepEqual(targetAttributions.map(({ name }) => name).sort(), ["Source", "Target"]);

	const sourceResources = [{ filename: "CN-base.json" }, { filename: "POITypeMapping-CN-1.json" }];
	const cnTargetResources = [{ filename: "CN-target.json" }];
	assert.equal(GEOResourceManifest.resources(sourceResources, cnTargetResources, "CN"), cnTargetResources);
	assert.deepEqual(cnTargetResources, [{ filename: "CN-target.json" }]);
	const xxTargetResources = [{ filename: "XX-target.json" }];
	assert.equal(GEOResourceManifest.resources(sourceResources, xxTargetResources, "US"), xxTargetResources);
	assert.deepEqual(xxTargetResources, [{ filename: "XX-target.json" }, sourceResources[1]]);

	const sourceDataSets = [{ identifier: "CN" }];
	const cnTargetDataSets = [{ identifier: "CN-target" }];
	assert.equal(GEOResourceManifest.dataSets(sourceDataSets, cnTargetDataSets, "CN"), cnTargetDataSets);
	assert.deepEqual(cnTargetDataSets, sourceDataSets);
	const xxTargetDataSets = [{ identifier: "XX-target" }];
	assert.equal(GEOResourceManifest.dataSets(sourceDataSets, xxTargetDataSets, "US"), xxTargetDataSets);
	assert.deepEqual(xxTargetDataSets, [{ identifier: "XX-target" }]);

	const sourceDisplayStrings = [{ identifier: "XX" }];
	const cnTargetDisplayStrings = [{ identifier: "CN-target" }];
	assert.equal(GEOResourceManifest.displayStrings(sourceDisplayStrings, cnTargetDisplayStrings, "CN"), cnTargetDisplayStrings);
	assert.deepEqual(cnTargetDisplayStrings, sourceDisplayStrings);
	const xxTargetDisplayStrings = [{ identifier: "XX-target" }];
	assert.equal(GEOResourceManifest.displayStrings(sourceDisplayStrings, xxTargetDisplayStrings, "US"), xxTargetDisplayStrings);
	assert.deepEqual(xxTargetDisplayStrings, [{ identifier: "XX-target" }]);
});

test("URL 配置始终以 target 为基底并按 targetCountryCode 选择地区字段", () => {
	const source = [
		{
			shared: "source",
			alternateResourcesURL: [{ url: "https://source.example" }],
			polyLocationShiftURL: { url: "https://shift.source.example" },
			problemSubmissionURL: { url: "https://rap.source.example" },
			dispatcherURL: { url: "https://dispatcher.source.example" },
			directionsURL: { url: "https://directions.source.example" },
		},
	];
	const target = [
		{
			shared: "target",
			alternateResourcesURL: [{ url: "https://target.example" }],
			polyLocationShiftURL: { url: "https://shift.target.example" },
			problemSubmissionURL: { url: "https://rap.target.example" },
			dispatcherURL: { url: "https://dispatcher.target.example" },
			directionsURL: { url: "https://directions.target.example" },
		},
	];
	const settings = {
		Config: { Announcements: { "Environment:": "AUTO" } },
		UrlInfoSet: {
			Dispatcher: "AutoNavi",
			Directions: "AUTO",
			RAP: "AUTO",
			LocationShift: "AUTO",
		},
	};

	const cn = GEOResourceManifest.urlInfoSets(source, target, settings, "CN")[0];
	assert.equal(cn.shared, "target");
	assert.deepEqual(cn.alternateResourcesURL, target[0].alternateResourcesURL);
	assert.deepEqual(cn.polyLocationShiftURL, target[0].polyLocationShiftURL);
	assert.deepEqual(cn.problemSubmissionURL, source[0].problemSubmissionURL);
	assert.deepEqual(cn.directionsURL, target[0].directionsURL);

	const xx = GEOResourceManifest.urlInfoSets(source, target, settings, "US")[0];
	assert.equal(xx.shared, "target");
	assert.deepEqual(xx.alternateResourcesURL, target[0].alternateResourcesURL);
	assert.deepEqual(xx.polyLocationShiftURL, source[0].polyLocationShiftURL);
	assert.deepEqual(xx.problemSubmissionURL, target[0].problemSubmissionURL);
	assert.deepEqual(xx.directionsURL, source[0].directionsURL);
});

test("LocationShift AUTO 仅在 watchOS 使用国际版定位配置", () => {
	const settings = { UrlInfoSet: { LocationShift: "AUTO" } };
	const cn = { polyLocationShiftURL: { url: "https://shift.cn.example" } };
	const xx = { polyLocationShiftURL: { url: "https://shift.xx.example" } };

	assert.deepEqual(GEOResourceManifest.urlInfoSets([cn], [xx], settings, "US", "ios")[0].polyLocationShiftURL, cn.polyLocationShiftURL);
	assert.deepEqual(GEOResourceManifest.urlInfoSets([cn], [xx], settings, "US", "watchos")[0].polyLocationShiftURL, xx.polyLocationShiftURL);
	assert.deepEqual(GEOResourceManifest.urlInfoSets([cn], [xx], settings, "US", "macos")[0].polyLocationShiftURL, cn.polyLocationShiftURL);
	assert.deepEqual(GEOResourceManifest.urlInfoSets([cn], [xx], settings, "US")[0].polyLocationShiftURL, cn.polyLocationShiftURL);
	assert.deepEqual(GEOResourceManifest.urlInfoSets([xx], [cn], settings, "CN", "ios")[0].polyLocationShiftURL, cn.polyLocationShiftURL);
	assert.deepEqual(GEOResourceManifest.urlInfoSets([xx], [cn], settings, "CN", "watchos")[0].polyLocationShiftURL, xx.polyLocationShiftURL);
	settings.UrlInfoSet.LocationShift = "AutoNavi";
	assert.deepEqual(GEOResourceManifest.urlInfoSets([cn], [xx], settings, "US", "watchos")[0].polyLocationShiftURL, cn.polyLocationShiftURL);
	settings.UrlInfoSet.LocationShift = "Apple";
	assert.deepEqual(GEOResourceManifest.urlInfoSets([cn], [xx], settings, "US", "ios")[0].polyLocationShiftURL, xx.polyLocationShiftURL);
});

test("Munin 按 targetCountryCode 将选定地区的 source 注入 target", () => {
	const inject = (targetCountryCode, munin) => {
		const source = [{ bucketID: "source" }];
		const target = [{ bucketID: "target" }];
		const result = GEOResourceManifest.muninBuckets(source, target, { TileSet: { Munin: munin } }, targetCountryCode);
		assert.equal(result, target);
		return target;
	};

	assert.deepEqual(inject("CN", "CN"), [{ bucketID: "target" }]);
	assert.deepEqual(inject("CN", "XX"), [{ bucketID: "source" }]);
	assert.deepEqual(inject("US", "CN"), [{ bucketID: "source" }]);
	assert.deepEqual(inject("US", "XX"), [{ bucketID: "target" }]);
});

test("tileStyles 按源地区与设置选择配置分组", () => {
	const configs = {
		TileStyles: {
			Base: ["BASE"],
			Map: ["MAP"],
			Satellite2D: ["SATELLITE_2D"],
			Satellite3D: ["SATELLITE_3D"],
		},
	};
	const settings = {
		TileSet: {
			Map: "AutoNavi",
			Satellite2D: "Apple",
			Satellite3D: "CN",
		},
	};

	assert.deepEqual(GEOResourceManifest.tileStyles(configs, settings, "CN"), ["BASE", "MAP", "SATELLITE_3D"]);
	assert.deepEqual(GEOResourceManifest.tileStyles(configs, settings, "XX"), ["BASE", "SATELLITE_2D"]);
	assert.deepEqual(GEOResourceManifest.tileStyles(configs, { TileSet: { Map: "Tmap" } }, "KR", false), ["MAP"]);
	assert.deepEqual(GEOResourceManifest.tileStyles(configs, {}, "CN"), ["BASE"]);
	assert.deepEqual(GEOResourceManifest.tileStyles(configs, {}, "XX"), ["BASE", "MAP", "SATELLITE_2D", "SATELLITE_3D"]);
});

test("KR is selected only for supported tile groups", () => {
	const configs = database.MapKit.Configs;
	const settings = { TileSet: { Map: "KR" } };
	assert.deepEqual(GEOResourceManifest.requiredSources(configs, settings, "US"), ["CN", "KR"]);
	assert.deepEqual(GEOResourceManifest.requiredSources(configs, settings, "KR"), ["CN", "XX"]);
	for (const group of Object.keys(configs.TileStyles)) {
		const selected = { TileSet: { [group]: "KR" } };
		const expected = ["Map", "POI", "Road", "Earth"].includes(group) ? configs.TileStyles[group] : [];
		assert.deepEqual(GEOResourceManifest.tileStyles(configs, selected, "KR", false), expected, group);
	}
});

test("writing a regional cache preserves earlier regions", async t => {
	const store = {};
	t.mock.method(Storage.nodeBackend, "load", () => store);
	t.mock.method(Storage.nodeBackend, "write", () => {});
	for (const region of ["CN", "KR", "US"]) {
		await GEOResourceManifest.setCache({}, `?country_code=${region}`, region, new Uint8Array([1]));
	}
	for (const region of ["CN", "KR", "US"]) {
		assert.deepEqual(await GEOResourceManifest.getCache({}, `?country_code=${region}`), { eTag: region, base64: "AQ==" });
	}
});

test("KR composition preserves base tiles and protobuf metadata references", () => {
	const manifest = (region, id) => {
		const body = Resources.create({
			tileSet: ["VECTOR_COVERAGE", "VECTOR_STANDARD", "MUNIN_METADATA", "VECTOR_SPR_ROADS"].map(style => ({
				style: TileSetStyle[style],
				validVersion: [{ identifier: id }],
			})),
			resource: [{ filename: region }],
			displayString: [{ localizedString: [{ locale: "en", stringValue: region }] }],
			attribution: [{ name: region, dataSet: 1, linkDisplayStringIndex: 0, resource: [{ filename: "badge", alternateResourceURLIndex: 0 }] }],
			urlInfoSet: [0, 1].map(dataSet => ({ dataSet, alternateResourcesURL: [{ url: `https://${region}.example/${dataSet}` }] })),
			muninBucket: [{ bucketID: id }],
			tileGroup: [{ identifier: 1 }],
		});
		return GEOResourceManifestDownload.decode(Resources.toBinary(body));
	};
	const target = manifest("KR", 1);
	const sources = { CN: manifest("CN", 2), XX: manifest("XX", 3) };
	const settings = { TileSet: { Map: "CN", Munin: "Apple" }, UrlInfoSet: {} };
	GEOResourceManifest.compose(target, sources, database.MapKit.Configs, settings, "KR", "ios");
	const result = Resources.fromBinary(GEOResourceManifestDownload.encode(target));

	assert.deepEqual(
		result.tileSet.map(tile => tile.validVersion[0].identifier),
		[1, 2, 3, 3],
	);
	assert.deepEqual(
		result.muninBucket.map(bucket => bucket.bucketID),
		[3],
	);
	assert.deepEqual(
		result.tileGroup[0].tileSet.map(tile => tile.tileSetIndex),
		[0, 1, 2, 3],
	);
	assert.deepEqual(
		result.tileGroup[0].resourceIndex.map(index => result.resource[index].filename),
		["KR", "CN", "XX"],
	);
	assert.equal(result.attribution.length, 3);
	for (const attribution of result.attribution) {
		assert.equal(result.displayString[attribution.linkDisplayStringIndex].localizedString[0].stringValue, attribution.name);
		const urls = result.urlInfoSet.find(row => row.dataSet === attribution.dataSet).alternateResourcesURL;
		assert.deepEqual(
			attribution.resource.map(resource => urls[resource.alternateResourceURLIndex]?.url),
			[`https://${attribution.name}.example/1`],
		);
	}
});

test("imported generic tiles resolve appended and reused resources after encoding", () => {
	const decode = body => GEOResourceManifestDownload.decode(Resources.toBinary(Resources.create(body)));
	const target = decode({
		tileSet: [{ style: TileSetStyle.VECTOR_COVERAGE, validVersion: [{ identifier: 1, genericTile: [{ resourceIndex: 0 }] }] }],
		resource: [{ filename: "native" }, { filename: "shared" }],
	});
	const source = decode({
		tileSet: [{ style: TileSetStyle.RASTER_SATELLITE, validVersion: [2, 3].map(identifier => ({ identifier, genericTile: [{ resourceIndex: 0 }, { resourceIndex: 1 }] })) }],
		resource: [{ filename: "shared" }, { filename: "water" }],
	});
	GEOResourceManifest.compose(target, { XX: source }, database.MapKit.Configs, { TileSet: { Satellite2D: "XX" }, UrlInfoSet: {} }, "KR", "ios");
	const result = Resources.fromBinary(GEOResourceManifestDownload.encode(target));
	assert.deepEqual(
		result.resource.map(resource => resource.filename),
		["native", "shared", "water"],
	);
	assert.equal(result.tileSet[0].validVersion[0].genericTile[0].resourceIndex, 0);
	for (const version of result.tileSet[1].validVersion) {
		assert.deepEqual(
			version.genericTile.map(tile => result.resource[tile.resourceIndex].filename),
			["shared", "water"],
		);
	}
	for (const version of source.tileSet[0].validVersion) {
		assert.deepEqual(
			version.genericTile.map(tile => tile.resourceIndex),
			[0, 1],
		);
	}
});

test("missing or incomplete Munin source keeps native tiles and buckets", () => {
	const tileSet = ["MUNIN_METADATA", "VECTOR_SPR_ROADS"].map(style => ({ style, validVersion: [{ identifier: 2 }] }));
	const nativeTiles = tileSet.map(tile => ({ ...tile, validVersion: [{ identifier: 1 }] }));
	const muninBucket = [{ bucketID: 2 }];
	const settings = { TileSet: { Munin: "XX" }, UrlInfoSet: {} };
	for (const source of [undefined, { tileSet, muninBucket: [] }, { tileSet: tileSet.slice(0, 1), muninBucket }]) {
		const target = { tileSet: structuredClone(nativeTiles), muninBucket: [{ bucketID: 1 }] };
		GEOResourceManifest.compose(target, { XX: source }, database.MapKit.Configs, settings, "KR", "ios");
		assert.deepEqual(target.tileSet, nativeTiles);
		assert.deepEqual(target.muninBucket, [{ bucketID: 1 }]);
	}
});

test("KR URL defaults and provider overrides use the matching dataset", () => {
	const source = [2, 1].map(dataSet => ({
		dataSet,
		resourcesURL: { url: `CN-${dataSet}` },
		directionsURL: { url: `CN-${dataSet}` },
	}));
	const target = [
		{ dataSet: 1, directionsURL: { url: "KR-1" } },
		{ dataSet: 2, resourcesURL: { url: "KR-2" }, directionsURL: { url: "KR-2" } },
	];
	const settings = { UrlInfoSet: { Directions: "Apple" } };
	const native = GEOResourceManifest.urlInfoSets(source, target, settings, "KR", "ios");
	assert.deepEqual(
		native.map(row => row.resourcesURL.url),
		["CN-1", "KR-2"],
	);
	assert.deepEqual(
		native.map(row => row.directionsURL.url),
		["KR-1", "KR-2"],
	);
	settings.UrlInfoSet.Directions = "AutoNavi";
	const cn = GEOResourceManifest.urlInfoSets(source, target, settings, "KR", "ios");
	assert.deepEqual(
		cn.map(row => row.directionsURL.url),
		["CN-1", "CN-2"],
	);
});

test("KR retains CN service resources when no CN tiles are selected", () => {
	const filenames = ["POITypeMapping-CN-1.json", "POITypeMapping-CN-2.json", "China.cms-lpr"];
	const source = {
		tileSet: [{ style: "VECTOR_STANDARD", baseURL: "https://cn.example" }],
		resource: [...filenames, "unselected-map-resource"].map(filename => ({ filename })),
		urlInfoSet: [{ dispatcherURL: { url: "https://cn.example" } }],
	};
	const target = { tileSet: [{ style: "VECTOR_STANDARD", baseURL: "https://kr.example" }], resource: [], urlInfoSet: [{}] };
	GEOResourceManifest.compose(target, { CN: source }, database.MapKit.Configs, { TileSet: { Map: "KR" }, UrlInfoSet: { Dispatcher: "AutoNavi" } }, "KR", "ios");
	assert.deepEqual(
		target.resource.map(resource => resource.filename),
		filenames,
	);
	assert.deepEqual(target.tileSet, [{ style: "VECTOR_STANDARD", baseURL: "https://kr.example" }]);
	assert.equal(target.urlInfoSet[0].dispatcherURL.url, "https://cn.example");
});
