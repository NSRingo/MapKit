import { type ArgumentItem, defineConfig } from "@iringo/arguments-builder";
export const output = {
	surge: {
		path: "./dist/iRingo.MapKit.sgmodule",
		transformEgern: {
			enable: true,
			path: "./dist/iRingo.MapKit.yaml",
		},
	},
	loon: {
		path: "./dist/iRingo.MapKit.plugin",
	},
	customItems: [
		{
			path: "./dist/iRingo.MapKit.snippet",
			template: "./template/quantumultx.handlebars",
		},
		{
			path: "./dist/iRingo.MapKit.stoverride",
			template: "./template/stash.handlebars",
		},
	],
	dts: { isExported: true, path: "./src/types.d.ts" },
	boxjsSettings: {
		path: "./template/boxjs.settings.json",
		scope: "@iRingo.MapKit.Settings",
	},
};

const countryCode: ArgumentItem = {
	defaultValue: "US",
	description: "此选项影响“地图”整体配置内容，包括地图功能与服务。",
	key: "GeoManifest.Dynamic.Config.CountryCode",
	name: "[动态配置] 资源清单的国家或地区代码",
	options: [
		{ key: "AUTO", label: "🇺🇳自动（跟随用户当前所在地区）" },
		{ key: "CN", label: "🇨🇳中国大陆" },
		{ key: "HK", label: "🇭🇰中国香港" },
		{ key: "TW", label: "🇹🇼中国台湾" },
		{ key: "SG", label: "🇸🇬新加坡" },
		{ key: "US", label: "🇺🇸美国" },
		{ key: "JP", label: "🇯🇵日本" },
		{ key: "AU", label: "🇦🇺澳大利亚" },
		{ key: "GB", label: "🇬🇧英国" },
		{ key: "KR", label: "🇰🇷韩国" },
		{ key: "CA", label: "🇨🇦加拿大" },
		{ key: "IE", label: "🇮🇪爱尔兰" },
	],
	type: "string",
};

const announcementsEnvironment: ArgumentItem = {
	defaultValue: "AUTO",
	description: "选择公告请求参数与资源清单中的公告服务环境。",
	key: "Config.Announcements.Environment",
	name: "[公告] 服务环境",
	options: [
		{ key: "AUTO", label: "自动（保留请求与资源清单原值）" },
		{ key: "CN", label: "🇨🇳中国大陆（prod-cn）" },
		{ key: "XX", label: "🇺🇳国际版（prod）" },
	],
	type: "string",
};

const dispatcher: ArgumentItem = {
	defaultValue: "AutoNavi",
	description: "地点数据接口，此选项影响公共指南、兴趣点与位置信息等功能。",
	key: "UrlInfoSet.Dispatcher",
	name: "[URL信息集] 调度器",
	options: [
		{ key: "AUTO", label: "自动（保留资源清单原值）" },
		{ key: "AutoNavi", label: "🧭高德（互动百科/大众点评/携程）" },
		{ key: "Apple", label: "Apple（维基百科/Yelp/Booking）" },
	],
	type: "string",
};

const directions: ArgumentItem = {
	defaultValue: "AutoNavi",
	description: "导航与 ETA 服务接口。",
	key: "UrlInfoSet.Directions",
	name: "[URL信息集] 导航与 ETA",
	options: [
		{ key: "AutoNavi", label: "🧭高德（高德地图/TomTom）" },
		{ key: "Apple", label: "Apple（TomTom）" },
	],
	type: "string",
};

const rap: ArgumentItem = {
	defaultValue: "Apple",
	description: "评分、照片及问题反馈服务接口。",
	key: "UrlInfoSet.RAP",
	name: "[URL信息集] 评分和照片",
	options: [
		{ key: "AutoNavi", label: "🧭高德" },
		{ key: "Apple", label: "Apple" },
	],
	type: "string",
};

const locationShift: ArgumentItem = {
	defaultValue: "AUTO",
	description: "定位漂移修正服务接口，控制指南针与坐标使用的坐标系。",
	key: "UrlInfoSet.LocationShift",
	name: "[URL信息集] 定位漂移",
	options: [
		{ key: "AUTO", label: "自动（watchOS 使用 Apple，其他系统使用高德）" },
		{ key: "AutoNavi", label: "🧭高德（GCJ-02）" },
		{ key: "Apple", label: "Apple（WGS-84）" },
	],
	type: "string",
};

const tileSetOptions = [
	{ key: "CN", label: "🇨🇳中国版" },
	{ key: "XX", label: "🇺🇳国际版" },
];
const koreanTileSetOptions = [...tileSetOptions, { key: "KR", label: "🇰🇷韩国版" }];

const map: ArgumentItem = {
	defaultValue: "CN",
	description: "标准地图、地貌、建筑与室内地图等瓦片。",
	key: "TileSet.Map",
	name: "[瓦片数据集] 地图",
	options: koreanTileSetOptions,
	type: "string",
};

const satellite2D: ArgumentItem = {
	defaultValue: "CN",
	description: "2D 卫星图像及其夜间、极地等变体。",
	key: "TileSet.Satellite2D",
	name: "[瓦片数据集] 2D 卫星图像",
	options: tileSetOptions,
	type: "string",
};

const satellite3D: ArgumentItem = {
	defaultValue: "XX",
	description: "3D 卫星图像、地表模型与边界数据。",
	key: "TileSet.Satellite3D",
	name: "[瓦片数据集] 3D 卫星图像",
	options: tileSetOptions,
	type: "string",
};

const traffic: ArgumentItem = {
	defaultValue: "CN",
	description: "实时交通、交通事件、历史交通与限速数据。",
	key: "TileSet.Traffic",
	name: "[瓦片数据集] 交通状况",
	options: tileSetOptions,
	type: "string",
};

const poi: ArgumentItem = {
	defaultValue: "CN",
	description: "兴趣点、街道兴趣点与繁忙程度数据。",
	key: "TileSet.POI",
	name: "[瓦片数据集] 兴趣点",
	options: koreanTileSetOptions,
	type: "string",
};

const flyover: ArgumentItem = {
	defaultValue: "XX",
	description: "俯瞰模型、纹理、可见性与导航图数据。",
	key: "TileSet.Flyover",
	name: "[瓦片数据集] 俯瞰",
	options: tileSetOptions,
	type: "string",
};

const munin: ArgumentItem = {
	defaultValue: "XX",
	description: "四处看看元数据与可用道路数据。",
	key: "TileSet.Munin",
	name: "[瓦片数据集] 四处看看",
	options: tileSetOptions,
	type: "string",
};

const road: ArgumentItem = {
	defaultValue: "CN",
	description: "道路、道路标签与道路选区数据。",
	key: "TileSet.Road",
	name: "[瓦片数据集] 道路",
	options: koreanTileSetOptions,
	type: "string",
};

const earth: ArgumentItem = {
	defaultValue: "CN",
	description: "地球视图模型、材质、行政区划名称与极地数据。",
	key: "TileSet.Earth",
	name: "[瓦片数据集] 地球",
	options: koreanTileSetOptions,
	type: "string",
};

const transit: ArgumentItem = {
	defaultValue: "CN",
	description: "公共交通与公共交通选区数据。",
	key: "TileSet.Transit",
	name: "[瓦片数据集] 公共交通",
	options: tileSetOptions,
	type: "string",
};

const storage: ArgumentItem = {
	key: "Storage",
	name: "[储存] 配置类型",
	defaultValue: "Argument",
	type: "string",
	exclude: ["boxjs"],
	options: [
		{ key: "Argument", label: "优先使用模块参数，缺少的设置由 PersistentStore (BoxJS) 提供" },
		{ key: "PersistentStore", label: "只使用 PersistentStore (BoxJS) 配置" },
		{ key: "database", label: "只使用脚本内置默认配置" },
	],
	description: "选择运行时读取模块参数、PersistentStore 或内置数据库的方式。",
};

const logLevel: ArgumentItem = {
	key: "LogLevel",
	name: "[调试] 日志等级",
	type: "string",
	defaultValue: "WARN",
	description: "选择脚本日志的输出等级。",
	options: [
		{ key: "OFF", label: "关闭" },
		{ key: "ERROR", label: "❌ 错误" },
		{ key: "WARN", label: "⚠️ 警告" },
		{ key: "INFO", label: "ℹ️ 信息" },
		{ key: "DEBUG", label: "🅱️ 调试" },
		{ key: "ALL", label: "全部" },
	],
};

export const args: ArgumentItem[] = [dispatcher, directions, rap, locationShift, earth, road, satellite2D, transit, storage, logLevel];

export const argsFull: ArgumentItem[] = [countryCode, announcementsEnvironment, dispatcher, directions, rap, locationShift, map, satellite2D, satellite3D, traffic, poi, flyover, munin, road, earth, transit, storage, logLevel];

export default defineConfig({
	output,
	args: argsFull,
});
