import assert from "node:assert/strict";
import test from "node:test";
import { Storage } from "@nsnanocat/util";
import GEOResourceManifest from "../src/class/GEOResourceManifest.mjs";
import GEOResourceManifestDownload from "../src/class/GEOResourceManifestDownload.mjs";
import { Request } from "../src/process/Request.mjs";
import { Request as RequestDev } from "../src/process/Request.dev.mjs";
import { Response } from "../src/process/Response.mjs";
import { Response as ResponseDev } from "../src/process/Response.dev.mjs";

const manifestURL = "https://gspe35-ssl.ls.apple.com/geo_manifest/dynamic/config?os=ios&lang=en_US&country_code=KR";

for (const [variant, processor] of [["release", Request], ["dev", RequestDev]]) {
	test(`regional request continues after one source fails (${variant})`, async t => {
		const calls = [];
		t.mock.method(Storage, "getItem", () => undefined);
		t.mock.method(GEOResourceManifest, "requiredSources", () => ["KR", "CN", "XX"]);
		t.mock.method(GEOResourceManifest, "getCache", async (_, query) => query.includes("country_code=KR") ? { eTag: "kr-tag", base64: "AA==" } : undefined);
		t.mock.method(GEOResourceManifest, "download", async (request, region) => {
			calls.push({ region, url: request.url, eTag: request.headers["If-None-Match"] });
			if (region === "KR") throw new Error("regional fetch failed");
			return { status: 304 };
		});
		const result = await processor({ url: manifestURL, method: "GET", headers: {} });
		assert.equal(new URL(result.$request.url).searchParams.get("lang"), "en_US");
		assert.deepEqual(calls.map(call => call.region), ["KR", "CN", "US"]);
		assert.equal(calls[0].eTag, "kr-tag");
	});
}

for (const [variant, processor] of [["release", Response], ["dev", ResponseDev]]) {
	test(`KR response uses available source when another cache is absent (${variant})`, async t => {
		const target = { tileSet: [] };
		let received;
		t.mock.method(Storage, "getItem", () => undefined);
		t.mock.method(GEOResourceManifest, "requiredSources", () => ["CN", "XX"]);
		t.mock.method(GEOResourceManifest, "decodeCache", async (_, query) => query.includes("country_code=CN") ? { tileSet: [{ style: "MAP" }] } : undefined);
		t.mock.method(GEOResourceManifest, "compose", (body, sources, _configs, _settings, country) => {
			received = { body, sources, country };
			return body;
		});
		t.mock.method(GEOResourceManifestDownload, "decode", () => target);
		t.mock.method(GEOResourceManifestDownload, "encode", () => new Uint8Array([2]));
		const response = await processor({ url: manifestURL, method: "GET", headers: {} }, { headers: { "Content-Type": "application/octet-stream" }, body: new Uint8Array([1]) });
		assert.equal(received.country, "KR");
		assert.equal(received.body, target);
		assert.equal(received.sources.CN.tileSet[0].style, "MAP");
		assert.equal(received.sources.XX, undefined);
		assert.deepEqual(response.body, new Uint8Array([2]));
	});

	test(`missing legacy source does not block KR tiles (${variant})`, async t => {
		let received;
		t.mock.method(Storage, "getItem", () => undefined);
		t.mock.method(GEOResourceManifest, "requiredSources", () => ["CN", "KR"]);
		t.mock.method(GEOResourceManifest, "decodeCache", async (_, query) => query.includes("country_code=KR") ? { tileSet: [{ style: "MAP" }] } : undefined);
		t.mock.method(GEOResourceManifest, "compose", (_target, sources, _configs, _settings, country) => {
			received = { sources, country };
			return { tileSet: [] };
		});
		t.mock.method(GEOResourceManifestDownload, "decode", () => ({ tileSet: [] }));
		t.mock.method(GEOResourceManifestDownload, "encode", () => new Uint8Array([3]));
		const response = await processor({ url: manifestURL.replace("country_code=KR", "country_code=US"), method: "GET", headers: {} }, { headers: { "Content-Type": "application/octet-stream" }, body: new Uint8Array([1]) });
		assert.equal(received.country, "US");
		assert.equal(received.sources.KR.tileSet[0].style, "MAP");
		assert.deepEqual(response.body, new Uint8Array([3]));
	});
}
