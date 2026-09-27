import assert from "node:assert/strict";
import test from "node:test";
import GEOResourceManifest from "../src/class/GEOResourceManifest.mjs";

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
	assert.deepEqual(GEOResourceManifest.tileStyles(configs, {}, "CN"), ["BASE"]);
	assert.deepEqual(GEOResourceManifest.tileStyles(configs, {}, "XX"), ["BASE", "MAP", "SATELLITE_2D", "SATELLITE_3D"]);
});

test("KR tile selections request only the extra regional manifest", () => {
	const configs = { TileStyles: { Base: ["BASE"], Map: ["MAP"], Traffic: ["TRAFFIC"] } };
	const settings = { TileSet: { Map: "KR", Traffic: "CN" } };
	assert.deepEqual(GEOResourceManifest.tileStyles(configs, settings, "KR", false), ["MAP"]);
	assert.deepEqual(GEOResourceManifest.requiredSources(configs, settings, "KR"), ["CN"]);
	assert.deepEqual(GEOResourceManifest.requiredSources(configs, settings, "US"), ["CN", "KR"]);
	settings.TileSet.Traffic = "XX";
	assert.deepEqual(GEOResourceManifest.requiredSources(configs, settings, "KR"), ["CN", "XX"]);
});

test("KR composition keeps target base, imports selected groups and referenced metadata", () => {
	const makeManifest = region => ({
		tileSet: [{ style: "BASE", validVersion: [{ identifier: `${region}-base` }] }, { style: "MAP", validVersion: [{ identifier: `${region}-map` }] }, { style: "TRAFFIC", validVersion: [{ identifier: `${region}-traffic` }] }, { style: "MUNIN_METADATA", validVersion: [{ identifier: `${region}-munin` }] }],
		attribution: [{ name: region }],
		resource: [{ filename: `${region}.json` }],
		dataSet: [{ identifier: region }],
		displayString: [{ identifier: region }],
		muninBucket: [{ bucketID: region }],
		urlInfoSet: [{ dispatcherURL: region, directionsURL: region, problemSubmissionURL: region, polyLocationShiftURL: region }],
		tileGroup: [{ identifier: 1 }],
	});
	const target = makeManifest("KR");
	const configs = { TileStyles: { Base: ["BASE"], Map: ["MAP"], Traffic: ["TRAFFIC"], Munin: ["MUNIN_METADATA"] } };
	const settings = { TileSet: { Map: "CN", Traffic: "XX", Munin: "XX" }, UrlInfoSet: { Dispatcher: "AUTO", Directions: "Apple", RAP: "Apple", LocationShift: "Apple" } };
	GEOResourceManifest.compose(target, { CN: makeManifest("CN"), XX: makeManifest("XX") }, configs, settings, "KR", "ios");
	assert.deepEqual(target.tileSet.map(tile => tile.validVersion[0].identifier), ["KR-base", "CN-map", "XX-traffic", "XX-munin"]);
	assert.deepEqual(target.muninBucket, [{ bucketID: "XX" }]);
	assert.equal(target.urlInfoSet[0].dispatcherURL, "KR");
	assert.deepEqual(new Set(target.resource.map(resource => resource.filename)), new Set(["KR.json", "CN.json", "XX.json"]));
	assert.deepEqual(new Set(target.dataSet.map(dataSet => dataSet.identifier)), new Set(["KR", "CN", "XX"]));
	assert.deepEqual(new Set(target.displayString.map(value => value.identifier)), new Set(["KR", "CN", "XX"]));
	assert.deepEqual(target.tileGroup[0].tileSet.map(item => item.tileSetIndex), [0, 1, 2, 3]);
	assert.deepEqual(target.tileGroup[0].resourceIndex, [0, 1, 2]);
});

test("missing KR source keeps target tiles and buckets while legacy base still composes", () => {
	const target = {
		tileSet: [{ style: "BASE", validVersion: [{ identifier: "US-base" }] }, { style: "MAP", validVersion: [{ identifier: "US-map" }] }],
		muninBucket: [{ bucketID: "US" }],
		tileGroup: [{ identifier: 1 }],
	};
	const source = { tileSet: [{ style: "BASE", validVersion: [{ identifier: "CN-base" }] }] };
	GEOResourceManifest.compose(target, { CN: source }, { TileStyles: { Base: ["BASE"], Map: ["MAP"] } }, { TileSet: { Map: "KR", Munin: "KR" }, UrlInfoSet: {} }, "US", "ios");
	assert.deepEqual(target.tileSet.map(tile => tile.validVersion[0].identifier), ["CN-base", "US-map"]);
	assert.deepEqual(target.muninBucket, [{ bucketID: "US" }]);
	assert.deepEqual(target.tileGroup[0].tileSet.map(item => item.tileSetIndex), [0, 1]);
});

test("Munin tiles and buckets switch together only when source has both", () => {
	const configs = { TileStyles: { Munin: ["MUNIN_METADATA", "VECTOR_SPR_ROADS"] } };
	const settings = { TileSet: { Munin: "KR" }, UrlInfoSet: {} };
	for (const source of [
		{ tileSet: [{ style: "MUNIN_METADATA", validVersion: [{ identifier: 2 }] }], muninBucket: [] },
		{ tileSet: [], muninBucket: [{ bucketID: "KR" }] },
		{ tileSet: [{ style: "VECTOR_SPR_ROADS", validVersion: [{ identifier: 2 }] }], muninBucket: [{ bucketID: "KR" }] },
	]) {
		const target = {
			tileSet: [{ style: "MUNIN_METADATA", validVersion: [{ identifier: 1 }] }],
			muninBucket: [{ bucketID: "US" }],
			tileGroup: [{ identifier: 1 }],
		};
		GEOResourceManifest.compose(target, { KR: source }, configs, settings, "US", "ios");
		assert.equal(target.tileSet[0].validVersion[0].identifier, 1);
		assert.deepEqual(target.muninBucket, [{ bucketID: "US" }]);
	}
});

test("Munin Apple alias selects XX tiles and buckets together on KR target", () => {
	const target = { tileSet: [{ style: "MUNIN_METADATA", validVersion: [{ identifier: 1 }] }], muninBucket: [{ bucketID: "KR" }], tileGroup: [{ identifier: 1 }] };
	const source = { tileSet: [{ style: "MUNIN_METADATA", validVersion: [{ identifier: 2 }] }], muninBucket: [{ bucketID: "XX" }] };
	GEOResourceManifest.compose(target, { XX: source }, { TileStyles: { Munin: ["MUNIN_METADATA"] } }, { TileSet: { Munin: "Apple" }, UrlInfoSet: {} }, "KR", "ios");
	assert.equal(target.tileSet[0].validVersion[0].identifier, 2);
	assert.deepEqual(target.muninBucket, [{ bucketID: "XX" }]);
});

test("KR composition matches URL rows by dataSet and retains source-only dataSet rows", () => {
	const target = {
		tileSet: [{ style: "MAP", dataSet: 1, validVersion: [{ identifier: 1 }] }],
		dataSet: [{ identifier: 1 }],
		urlInfoSet: [{ dataSet: 2, directionsURL: "KR-2" }, { dataSet: 1, directionsURL: "KR-1" }],
		tileGroup: [{ identifier: 1 }],
	};
	const source = {
		tileSet: [{ style: "MAP", dataSet: 10, validVersion: [{ identifier: 10 }] }],
		dataSet: [{ identifier: 10 }],
		urlInfoSet: [{ dataSet: 1, directionsURL: "CN-1" }, { dataSet: 10, directionsURL: "CN-10" }, { dataSet: 2, directionsURL: "CN-2" }],
	};
	GEOResourceManifest.compose(target, { CN: source }, { TileStyles: { Map: ["MAP"] } }, { TileSet: { Map: "CN", Munin: "KR" }, UrlInfoSet: { Directions: "AutoNavi" } }, "KR", "ios");
	assert.equal(target.tileSet[0].dataSet, 10);
	assert.deepEqual(target.dataSet.map(item => item.identifier), [1, 10]);
	assert.deepEqual(target.urlInfoSet.map(item => [item.dataSet, item.directionsURL]), [[2, "CN-2"], [1, "CN-1"], [10, "CN-10"]]);
});

test("KR keeps native Apple URLs and matches AutoNavi rows by dataSet", () => {
	const source = [2, 1].map(dataSet => ({ dataSet, dispatcherURL: `CN-${dataSet}`, directionsURL: `CN-${dataSet}`, problemSubmissionURL: `CN-${dataSet}`, polyLocationShiftURL: `CN-${dataSet}` }));
	const target = [1, 2].map(dataSet => ({ dataSet, dispatcherURL: `KR-${dataSet}`, directionsURL: `KR-${dataSet}`, problemSubmissionURL: `KR-${dataSet}`, polyLocationShiftURL: `KR-${dataSet}` }));
	const settings = { UrlInfoSet: { Dispatcher: "AUTO", Directions: "Apple", RAP: "Apple", LocationShift: "AUTO" } };
	const ios = GEOResourceManifest.urlInfoSets(source, target, settings, "KR", "ios");
	assert.deepEqual(ios.map(row => [row.dispatcherURL, row.directionsURL, row.problemSubmissionURL, row.polyLocationShiftURL]), [["KR-1", "KR-1", "KR-1", "CN-1"], ["KR-2", "KR-2", "KR-2", "CN-2"]]);
	const watch = GEOResourceManifest.urlInfoSets(source, target, settings, "KR", "watchos");
	assert.deepEqual(watch.map(row => row.polyLocationShiftURL), ["KR-1", "KR-2"]);
	settings.UrlInfoSet.Dispatcher = "AutoNavi";
	settings.UrlInfoSet.Directions = "AutoNavi";
	settings.UrlInfoSet.RAP = "AutoNavi";
	const cn = GEOResourceManifest.urlInfoSets(source, target, settings, "KR", "ios");
	assert.deepEqual(cn.map(row => [row.dispatcherURL, row.directionsURL, row.problemSubmissionURL]), [["CN-1", "CN-1", "CN-1"], ["CN-2", "CN-2", "CN-2"]]);
});

test("US composition retains KR tile dataSet URL after legacy provider merge", () => {
	const target = {
		tileSet: [{ style: "BASE", validVersion: [{ identifier: 1 }] }, { style: "MAP", dataSet: 0, validVersion: [{ identifier: 2 }] }],
		dataSet: [{ identifier: 0 }],
		urlInfoSet: [{ dataSet: 0, dispatcherURL: "US" }],
		tileGroup: [{ identifier: 1 }],
	};
	const sources = {
		CN: { tileSet: [{ style: "BASE", validVersion: [{ identifier: 11 }] }], urlInfoSet: [{ dataSet: 0, dispatcherURL: "CN" }] },
		KR: { tileSet: [{ style: "MAP", dataSet: 10, validVersion: [{ identifier: 20 }] }], dataSet: [{ identifier: 10 }], urlInfoSet: [{ dataSet: 10, dispatcherURL: "KR" }] },
	};
	GEOResourceManifest.compose(target, sources, { TileStyles: { Base: ["BASE"], Map: ["MAP"] } }, { TileSet: { Map: "KR" }, UrlInfoSet: { Dispatcher: "AutoNavi" } }, "US", "ios");
	assert.deepEqual(target.tileSet.map(tile => tile.validVersion[0].identifier), [11, 20]);
	assert.deepEqual(target.urlInfoSet.map(row => [row.dataSet, row.dispatcherURL]), [[0, "CN"], [10, "KR"]]);
	assert.deepEqual(target.dataSet.map(row => row.identifier), [0, 10]);
});
