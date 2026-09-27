import assert from "node:assert/strict";
import test from "node:test";
import { Storage } from "@nsnanocat/util";
import { Resources, TileSetStyle } from "@nsringo/mapkit";
import GEOResourceManifest from "../src/class/GEOResourceManifest.mjs";
import { Request as RequestDev } from "../src/process/Request.dev.mjs";
import { Request } from "../src/process/Request.mjs";
import { Response as ResponseDev } from "../src/process/Response.dev.mjs";
import { Response } from "../src/process/Response.mjs";

const manifestURL = "https://gspe35-ssl.ls.apple.com/geo_manifest/dynamic/config?os=ios&country_code=US";

for (const [variant, request, response] of [
	["release", Request, Response],
	["dev", RequestDev, ResponseDev],
]) {
	test(`regional downloads use their own ETags and continue after failure (${variant})`, async t => {
		const settings = { GeoManifest: { Dynamic: { Config: { CountryCode: "KR" } } } };
		t.mock.method(Storage, "getItem", () => ({ MapKit: { Settings: settings } }));
		const KV = { getItem: async key => (key.endsWith("country_code=US") ? { eTag: "us-tag", base64: "AA==" } : undefined) };
		const calls = [];
		t.mock.method(GEOResourceManifest, "download", async (request, region) => {
			calls.push([region, request.headers]);
			if (region === "CN") throw new Error("CN unavailable");
			return { status: 304 };
		});
		const headers = { Accept: "application/octet-stream" };
		await request({ url: manifestURL, method: "GET", headers }, KV);
		assert.deepEqual(calls, [
			["CN", { Accept: "application/octet-stream" }],
			["US", { Accept: "application/octet-stream", "If-None-Match": "us-tag" }],
		]);
	});

	test(`KR tiles and dataset URLs survive response encoding without CN cache (${variant})`, async t => {
		t.mock.method(Storage, "getItem", () => ({ MapKit: { Settings: { TileSet: { Map: "KR" } } } }));
		const target = Resources.create({
			tileSet: [{ style: TileSetStyle.VECTOR_COVERAGE, validVersion: [{ identifier: 1 }] }],
			tileGroup: [{ identifier: 1 }],
		});
		const source = Resources.create({
			tileSet: [{ style: TileSetStyle.VECTOR_STANDARD, dataSet: 10, validVersion: [{ identifier: 2 }] }],
			dataSet: [{ identifier: 10 }],
			urlInfoSet: [{ dataSet: 10, dispatcherURL: { url: "https://kr.example" } }],
		});
		const base64 = Buffer.from(Resources.toBinary(source)).toString("base64");
		const KV = { getItem: async key => (key.endsWith("country_code=KR") ? { base64 } : undefined) };
		const result = await response({ url: manifestURL, method: "GET", headers: {} }, { headers: { "Content-Type": "application/octet-stream" }, body: Resources.toBinary(target) }, KV);
		const body = Resources.fromBinary(result.body);
		assert.deepEqual(
			body.tileSet.map(tile => tile.validVersion[0].identifier),
			[1, 2],
		);
		assert.equal(body.tileSet[1].dataSet, body.dataSet[0].identifier);
		assert.equal(body.urlInfoSet.find(row => row.dataSet === 10).dispatcherURL.url, "https://kr.example");
	});
}
