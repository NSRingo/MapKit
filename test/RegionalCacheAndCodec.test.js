import assert from "node:assert/strict";
import test from "node:test";
import { Storage } from "@nsnanocat/util";
import { Resources, TileSetStyle } from "@nsringo/mapkit";
import GEOResourceManifest from "../src/class/GEOResourceManifest.mjs";
import GEOResourceManifestDownload from "../src/class/GEOResourceManifestDownload.mjs";

test("regional cache entries coexist in KV and nested Storage backends", async t => {
	const body = new Uint8Array([1, 2, 3]);
	const queries = ["?os=ios&country_code=CN", "?os=ios&country_code=KR", "?os=ios&country_code=US"];
	const items = new Map();
	const KV = {
		getItem: async key => items.get(key),
		setItem: async (key, value) => items.set(key, value),
	};
	for (const query of queries) assert.notEqual(await GEOResourceManifest.setCache({}, query, query, body, KV), false);
	for (const query of queries) assert.equal((await GEOResourceManifest.getCache({}, query, KV)).eTag, query);

	const localItems = new Map();
	t.mock.method(Storage, "getItem", key => localItems.get(key));
	t.mock.method(Storage, "setItem", (key, value) => {
		if (key === "@iRingo.MapKit.Caches") localItems.clear();
		return localItems.set(key, value);
	});
	for (const query of queries) assert.notEqual(await GEOResourceManifest.setCache({}, query, query, body), false);
	for (const query of queries) assert.equal((await GEOResourceManifest.getCache({}, query)).eTag, query);
	assert.equal(localItems.has("@iRingo.MapKit.Caches"), false);
});

test("three-region composition preserves protobuf tiles and metadata references", () => {
	const manifest = (region, offset) => GEOResourceManifestDownload.decode(Resources.toBinary(Resources.create({
		tileSet: [
			{ style: TileSetStyle.VECTOR_COVERAGE, validVersion: [{ identifier: offset + 1 }] },
			{ style: TileSetStyle.RASTER_STANDARD, validVersion: [{ identifier: offset + 2 }] },
			{ style: TileSetStyle.VECTOR_REALISTIC, validVersion: [{ identifier: offset + 3 }] },
		],
		resource: [{ filename: `${region}.json` }],
		displayString: [{ localizedString: [{ locale: "en", stringValue: region }] }],
		attribution: [{ name: region, linkDisplayStringIndex: 0 }],
		tileGroup: [{ identifier: offset + 1 }],
	})));
	const target = manifest("KR", 100);
	GEOResourceManifest.compose(
		target,
		{ CN: manifest("CN", 200), XX: manifest("XX", 300) },
		{ TileStyles: { Base: ["VECTOR_COVERAGE"], Map: ["RASTER_STANDARD"], Traffic: ["VECTOR_REALISTIC"] } },
		{ TileSet: { Map: "CN", Traffic: "XX", Munin: "KR" }, UrlInfoSet: {} },
		"KR",
		"ios",
	);
	const decoded = GEOResourceManifestDownload.decode(GEOResourceManifestDownload.encode(target));
	assert.deepEqual(decoded.tileSet.map(tile => tile.validVersion[0].identifier), [101, 202, 303]);
	assert.deepEqual(decoded.resource.map(resource => resource.filename), ["KR.json", "CN.json", "XX.json"]);
	assert.deepEqual(decoded.tileGroup[0].tileSet.map(item => item.tileSetIndex), [0, 1, 2]);
	assert.deepEqual(decoded.tileGroup[0].resourceIndex, [0, 1, 2]);
	assert.deepEqual(Object.fromEntries(decoded.attribution.map(item => [item.name, decoded.displayString[item.linkDisplayStringIndex].localizedString[0].stringValue])), { KR: "KR", CN: "CN", XX: "XX" });
});
