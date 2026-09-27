export interface Settings {
	GeoManifest?: {
		Dynamic?: {
			Config?: {
				/**
				 * [动态配置] 资源清单的国家或地区代码
				 *
				 * 此选项影响“地图”整体配置内容，包括地图功能与服务。
				 *
				 * @remarks
				 *
				 * Possible values:
				 * - `'AUTO'` - 🇺🇳自动（跟随用户当前所在地区）
				 * - `'CN'` - 🇨🇳中国大陆
				 * - `'HK'` - 🇭🇰中国香港
				 * - `'TW'` - 🇹🇼中国台湾
				 * - `'SG'` - 🇸🇬新加坡
				 * - `'US'` - 🇺🇸美国
				 * - `'JP'` - 🇯🇵日本
				 * - `'AU'` - 🇦🇺澳大利亚
				 * - `'GB'` - 🇬🇧英国
				 * - `'KR'` - 🇰🇷韩国
				 * - `'CA'` - 🇨🇦加拿大
				 * - `'IE'` - 🇮🇪爱尔兰
				 *
				 * @defaultValue "US"
				 */
				CountryCode?: "AUTO" | "CN" | "HK" | "TW" | "SG" | "US" | "JP" | "AU" | "GB" | "KR" | "CA" | "IE";
			};
		};
	};
	Config?: {
		Announcements?: {
			/**
			 * [公告] 服务环境
			 *
			 * 选择公告请求参数与资源清单中的公告服务环境。
			 *
			 * @remarks
			 *
			 * Possible values:
			 * - `'AUTO'` - 自动（保留请求与资源清单原值）
			 * - `'CN'` - 🇨🇳中国大陆（prod-cn）
			 * - `'XX'` - 🇺🇳国际版（prod）
			 *
			 * @defaultValue "AUTO"
			 */
			Environment?: "AUTO" | "CN" | "XX";
		};
	};
	UrlInfoSet?: {
		/**
		 * [URL信息集] 调度器
		 *
		 * 地点数据接口，此选项影响公共指南、兴趣点与位置信息等功能。
		 *
		 * @remarks
		 *
		 * Possible values:
		 * - `'AUTO'` - 自动（保留资源清单原值）
		 * - `'AutoNavi'` - 🧭高德（互动百科/大众点评/携程）
		 * - `'Apple'` - Apple（维基百科/Yelp/Booking）
		 *
		 * @defaultValue "AutoNavi"
		 */
		Dispatcher?: "AUTO" | "AutoNavi" | "Apple";
		/**
		 * [URL信息集] 导航与 ETA
		 *
		 * 导航与 ETA 服务接口。
		 *
		 * @remarks
		 *
		 * Possible values:
		 * - `'AutoNavi'` - 🧭高德（高德地图/TomTom）
		 * - `'Apple'` - Apple（TomTom）
		 *
		 * @defaultValue "AutoNavi"
		 */
		Directions?: "AutoNavi" | "Apple";
		/**
		 * [URL信息集] 评分和照片
		 *
		 * 评分、照片及问题反馈服务接口。
		 *
		 * @remarks
		 *
		 * Possible values:
		 * - `'AutoNavi'` - 🧭高德
		 * - `'Apple'` - Apple
		 *
		 * @defaultValue "Apple"
		 */
		RAP?: "AutoNavi" | "Apple";
		/**
		 * [URL信息集] 定位漂移
		 *
		 * 定位漂移修正服务接口，控制指南针与坐标使用的坐标系。
		 *
		 * @remarks
		 *
		 * Possible values:
		 * - `'AUTO'` - 自动（watchOS 使用 Apple，其他系统使用高德）
		 * - `'AutoNavi'` - 🧭高德（GCJ-02）
		 * - `'Apple'` - Apple（WGS-84）
		 *
		 * @defaultValue "AUTO"
		 */
		LocationShift?: "AUTO" | "AutoNavi" | "Apple";
	};
	TileSet?: {
		/**
		 * [瓦片数据集] 地图
		 *
		 * 标准地图、地貌、建筑与室内地图等瓦片。
		 *
		 * @remarks
		 *
		 * Possible values:
		 * - `'CN'` - 🇨🇳中国版
		 * - `'XX'` - 🇺🇳国际版
		 * - `'KR'` - 🇰🇷韩国版
		 *
		 * @defaultValue "CN"
		 */
		Map?: "CN" | "XX" | "KR";
		/**
		 * [瓦片数据集] 2D 卫星图像
		 *
		 * 2D 卫星图像及其夜间、极地等变体。
		 *
		 * @remarks
		 *
		 * Possible values:
		 * - `'CN'` - 🇨🇳中国版
		 * - `'XX'` - 🇺🇳国际版
		 * - `'KR'` - 🇰🇷韩国版
		 *
		 * @defaultValue "CN"
		 */
		Satellite2D?: "CN" | "XX" | "KR";
		/**
		 * [瓦片数据集] 3D 卫星图像
		 *
		 * 3D 卫星图像、地表模型与边界数据。
		 *
		 * @remarks
		 *
		 * Possible values:
		 * - `'CN'` - 🇨🇳中国版
		 * - `'XX'` - 🇺🇳国际版
		 * - `'KR'` - 🇰🇷韩国版
		 *
		 * @defaultValue "XX"
		 */
		Satellite3D?: "CN" | "XX" | "KR";
		/**
		 * [瓦片数据集] 交通状况
		 *
		 * 实时交通、交通事件、历史交通与限速数据。
		 *
		 * @remarks
		 *
		 * Possible values:
		 * - `'CN'` - 🇨🇳中国版
		 * - `'XX'` - 🇺🇳国际版
		 * - `'KR'` - 🇰🇷韩国版
		 *
		 * @defaultValue "CN"
		 */
		Traffic?: "CN" | "XX" | "KR";
		/**
		 * [瓦片数据集] 兴趣点
		 *
		 * 兴趣点、街道兴趣点与繁忙程度数据。
		 *
		 * @remarks
		 *
		 * Possible values:
		 * - `'CN'` - 🇨🇳中国版
		 * - `'XX'` - 🇺🇳国际版
		 * - `'KR'` - 🇰🇷韩国版
		 *
		 * @defaultValue "CN"
		 */
		POI?: "CN" | "XX" | "KR";
		/**
		 * [瓦片数据集] 俯瞰
		 *
		 * 俯瞰模型、纹理、可见性与导航图数据。
		 *
		 * @remarks
		 *
		 * Possible values:
		 * - `'CN'` - 🇨🇳中国版
		 * - `'XX'` - 🇺🇳国际版
		 * - `'KR'` - 🇰🇷韩国版
		 *
		 * @defaultValue "XX"
		 */
		Flyover?: "CN" | "XX" | "KR";
		/**
		 * [瓦片数据集] 四处看看
		 *
		 * 四处看看元数据与可用道路数据。
		 *
		 * @remarks
		 *
		 * Possible values:
		 * - `'CN'` - 🇨🇳中国版
		 * - `'XX'` - 🇺🇳国际版
		 * - `'KR'` - 🇰🇷韩国版
		 *
		 * @defaultValue "XX"
		 */
		Munin?: "CN" | "XX" | "KR";
		/**
		 * [瓦片数据集] 道路
		 *
		 * 道路、道路标签与道路选区数据。
		 *
		 * @remarks
		 *
		 * Possible values:
		 * - `'CN'` - 🇨🇳中国版
		 * - `'XX'` - 🇺🇳国际版
		 * - `'KR'` - 🇰🇷韩国版
		 *
		 * @defaultValue "CN"
		 */
		Road?: "CN" | "XX" | "KR";
		/**
		 * [瓦片数据集] 地球
		 *
		 * 地球视图模型、材质、行政区划名称与极地数据。
		 *
		 * @remarks
		 *
		 * Possible values:
		 * - `'CN'` - 🇨🇳中国版
		 * - `'XX'` - 🇺🇳国际版
		 * - `'KR'` - 🇰🇷韩国版
		 *
		 * @defaultValue "CN"
		 */
		Earth?: "CN" | "XX" | "KR";
		/**
		 * [瓦片数据集] 公共交通
		 *
		 * 公共交通与公共交通选区数据。
		 *
		 * @remarks
		 *
		 * Possible values:
		 * - `'CN'` - 🇨🇳中国版
		 * - `'XX'` - 🇺🇳国际版
		 * - `'KR'` - 🇰🇷韩国版
		 *
		 * @defaultValue "CN"
		 */
		Transit?: "CN" | "XX" | "KR";
	};
	/**
	 * [储存] 配置类型
	 *
	 * 选择运行时读取模块参数、PersistentStore 或内置数据库的方式。
	 *
	 * @remarks
	 *
	 * Possible values:
	 * - `'Argument'` - 优先使用模块参数，缺少的设置由 PersistentStore (BoxJS) 提供
	 * - `'PersistentStore'` - 只使用 PersistentStore (BoxJS) 配置
	 * - `'database'` - 只使用脚本内置默认配置
	 *
	 * @defaultValue "Argument"
	 */
	Storage?: "Argument" | "PersistentStore" | "database";
	/**
	 * [调试] 日志等级
	 *
	 * 选择脚本日志的输出等级。
	 *
	 * @remarks
	 *
	 * Possible values:
	 * - `'OFF'` - 关闭
	 * - `'ERROR'` - ❌ 错误
	 * - `'WARN'` - ⚠️ 警告
	 * - `'INFO'` - ℹ️ 信息
	 * - `'DEBUG'` - 🅱️ 调试
	 * - `'ALL'` - 全部
	 *
	 * @defaultValue "WARN"
	 */
	LogLevel?: "OFF" | "ERROR" | "WARN" | "INFO" | "DEBUG" | "ALL";
}
