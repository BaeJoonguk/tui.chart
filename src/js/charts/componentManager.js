/**
 * @fileoverview ComponentManager manages components of chart.
 * @author NHN Ent.
 *         FE Development Lab <dl_javascript@nhnent.com>
 */

'use strict';

var chartConst = require('../const');
var dom = require('../helpers/domHandler');
var Axis = require('../components/axes/axis');
var Plot = require('../components/plots/plot');
var title = require('../components/title/title');
var RadialPlot = require('../components/plots/radialPlot');
var ChartExportMenu = require('../components/chartExportMenu/chartExportMenu');
var DrawingToolPicker = require('../helpers/drawingToolPicker');

// legends
var Legend = require('../components/legends/legend');
var SpectrumLegend = require('../components/legends/spectrumLegend');
var CircleLegend = require('../components/legends/circleLegend');

// tooltips
var Tooltip = require('../components/tooltips/tooltip');
var GroupTooltip = require('../components/tooltips/groupTooltip');
var MapChartTooltip = require('../components/tooltips/mapChartTooltip');

// mouse event detectors
var MapChartEventDetector = require('../components/mouseEventDetectors/mapChartEventDetector');
var mouseEventDetector = require('../components/mouseEventDetectors/mouseEventDetector');

// series
var BarSeries = require('../components/series/barChartSeries');
var ColumnSeries = require('../components/series/columnChartSeries');
var LineSeries = require('../components/series/lineChartSeries');
var RadialSeries = require('../components/series/radialSeries');
var AreaSeries = require('../components/series/areaChartSeries');
var BubbleSeries = require('../components/series/bubbleChartSeries');
var ScatterSeries = require('../components/series/scatterChartSeries');
var MapSeries = require('../components/series/mapChartSeries');
var PieSeries = require('../components/series/pieChartSeries');
var HeatmapSeries = require('../components/series/heatmapChartSeries');
var TreemapSeries = require('../components/series/treemapChartSeries');
var BoxplotSeries = require('../components/series/boxPlotChartSeries');

var Zoom = require('../components/series/zoom');

var COMPONENT_FACTORY_MAP = {
    axis: Axis,
    plot: Plot,
    radialPlot: RadialPlot,
    legend: Legend,
    spectrumLegend: SpectrumLegend,
    circleLegend: CircleLegend,
    tooltip: Tooltip,
    groupTooltip: GroupTooltip,
    mapChartTooltip: MapChartTooltip,
    mapChartEventDetector: MapChartEventDetector,
    mouseEventDetector: mouseEventDetector,
    barSeries: BarSeries,
    columnSeries: ColumnSeries,
    lineSeries: LineSeries,
    radialSeries: RadialSeries,
    areaSeries: AreaSeries,
    bubbleSeries: BubbleSeries,
    scatterSeries: ScatterSeries,
    mapSeries: MapSeries,
    pieSeries: PieSeries,
    heatmapSeries: HeatmapSeries,
    treemapSeries: TreemapSeries,
    boxplotSeries: BoxplotSeries,
    zoom: Zoom,
    chartExportMenu: ChartExportMenu,
    title: title
};

var ComponentManager = tui.util.defineClass(/** @lends ComponentManager.prototype */ {
    /**
     * ComponentManager manages components of chart.
     * @param {object} params parameters
     *      @param {object} params.theme - theme
     *      @param {object} params.options - options
     *      @param {DataProcessor} params.dataProcessor - data processor
     *      @param {boolean} params.hasAxes - whether has axes or not
     * @constructs ComponentManager
     * @private
     */
    init: function(params) {
        var chartOption = params.options.chart;
        var width = tui.util.pick(chartOption, 'width') || chartConst.CHART_DEFAULT_WIDTH;
        var height = tui.util.pick(chartOption, 'height') || chartConst.CHART_DEFAULT_HEIGHT;

        /**
         * Components
         * @type {Array.<object>}
         */
        this.components = [];

        /**
         * componentFactory map.
         * @type {object}
         */
        this.componentMap = {};

        /**
         * theme
         * @type {object}
         */
        this.theme = params.theme || {};

        /**
         * options
         * @type {object}
         */
        this.options = params.options || {};

        /**
         * data processor
         * @type {DataProcessor}
         */
        this.dataProcessor = params.dataProcessor;

        /**
         * whether chart has axes or not
         * @type {boolean}
         */
        this.hasAxes = params.hasAxes;

        /**
         * whether chart is vertical or not
         * @type {boolean}
         */
        this.isVertical = params.isVertical;

        /**
         * event bus for transmitting message
         * @type {object}
         */
        this.eventBus = params.eventBus;

        /**
         * Drawing tool picker
         * @type {object}
         */
        this.drawingToolPicker = new DrawingToolPicker();

        this.drawingToolPicker.initDimension({
            width: width,
            height: height
        });

        /**
         * seriesTypes of chart
         * @type {Array.<string>}
         */
        this.seriesTypes = params.seriesTypes;
    },

    /**
     * Make component options.
     * @param {object} options options
     * @param {string} optionKey component option key
     * @param {string} componentName component name
     * @param {number} index component index
     * @returns {object} options
     * @private
     */
    _makeComponentOptions: function(options, optionKey, componentName, index) {
        options = options || this.options[optionKey];
        options = tui.util.isArray(options) ? options[index] : options || {};

        return options;
    },

    /**
     * Register component.
     * The component refers to a component of the chart.
     * The component types are axis, legend, plot, series and mouseEventDetector.
     * Chart Component Description : https://i-msdn.sec.s-msft.com/dynimg/IC267997.gif
     * @param {string} name component name
     * @param {string} classType component factory name
     * @param {object} params params that for alternative charts, 기본 흐름을 타지않는 특이 차트들을 위해 제공
     */
    register: function(name, classType, params) {
        var index, component, componentType, componentFactory, optionKey;

        params = params || {};

        params.name = name;

        index = params.index || 0;

        componentFactory = COMPONENT_FACTORY_MAP[classType];
        componentType = componentFactory.componentType;

        params.chartTheme = this.theme;
        params.chartOptions = this.options;
        params.seriesTypes = this.seriesTypes;

        // axis의 경우 name으로 테마와 옵션을 가져온다. xAxis, yAxis
        if (componentType === 'axis') {
            optionKey = name;
        } else {
            optionKey = componentType;
        }

        params.theme = this.theme[optionKey];

        if (!params.theme && optionKey === 'rightYAxis') {
            params.theme = this.theme.yAxis;
        }
        params.options = this.options[optionKey];

        if (optionKey === 'series') {
            // 시리즈는 옵션과 테마가 시리즈 이름으로 뎊스가 한번더 들어간다.
            // 테마는 항상 뎊스가 더들어가고 옵션은 콤보인경우에만 더들어간다.
            tui.util.forEach(this.seriesTypes, function(seriesType) {
                if (name.indexOf(seriesType) === 0) {
                    params.options = params.options[seriesType] || params.options;
                    params.theme = params.theme[seriesType];

                    if (tui.util.isArray(params.options)) {
                        params.options = params.options[index] || {};
                    }

                    return false;
                }

                return true;
            });
        }

        params.dataProcessor = this.dataProcessor;
        params.hasAxes = this.hasAxes;
        params.isVertical = this.isVertical;
        params.eventBus = this.eventBus;

        // 맵과 같이 일반적인 스케일 모델을 사용하지 않는 차트를 위한 개별 구현한 차트 모델
        params.alternativeModel = this.alternativeModel;

        component = componentFactory(params);

        // 팩토리에서 옵션에따라 생성을 거부할 수 있다.
        if (component) {
            component.componentName = name;
            component.componentType = componentType;

            this.components.push(component);
            this.componentMap[name] = component;
        }
    },

    /**
     * Make data for rendering.
     * @param {string} name - component name
     * @param {string} type - component type
     * @param {object} paper - raphael object
     * @param {{
     *      layoutBounds: {
     *          dimensionMap: object,
     *          positionMap: object
     *      },
     *      limitMap: object,
     *      axisDataMap: object,
     *      maxRadius: ?number
     * }} boundsAndScale - bounds and scale data
     * @param {?object} additionalData - additional data
     * @returns {object}
     * @private
     */
    _makeDataForRendering: function(name, type, paper, boundsAndScale, additionalData) {
        var data = tui.util.extend({
            paper: paper
        }, additionalData);

        if (boundsAndScale) {
            tui.util.extend(data, boundsAndScale);

            data.layout = {
                dimension: data.dimensionMap[name] || data.dimensionMap[type],
                position: data.positionMap[name] || data.positionMap[type]
            };
        }

        return data;
    },

    /**
     * Render components.
     * @param {string} funcName - function name for executing
     * @param {{
     *      layoutBounds: {
     *          dimensionMap: object,
     *          positionMap: object
     *      },
     *      limitMap: object,
     *      axisDataMap: object,
     *      maxRadius: ?number
     * }} boundsAndScale - bounds and scale data
     * @param {?object} additionalData - additional data
     * @param {?HTMLElement} container - container
     */
    render: function(funcName, boundsAndScale, additionalData, container) {
        var self = this;
        var name, type;

        var elements = tui.util.map(this.components, function(component) {
            var element = null;
            var data, result, paper;

            if (component[funcName]) {
                name = component.componentName;
                type = component.componentType;
                paper = self.drawingToolPicker.getPaper(container, component.drawingType);
                data = self._makeDataForRendering(name, type, paper, boundsAndScale, additionalData);

                result = component[funcName](data);

                if (result && !result.paper) {
                    element = result;
                }
            }

            return element;
        });

        if (container) {
            dom.append(container, elements);
        }
    },

    /**
     * Find components to conditionMap.
     * @param {object} conditionMap condition map
     * @returns {Array.<object>} filtered components
     */
    where: function(conditionMap) {
        return tui.util.filter(this.components, function(component) {
            var contained = true;

            tui.util.forEach(conditionMap, function(value, key) {
                if (component[key] !== value) {
                    contained = false;
                }

                return contained;
            });

            return contained;
        });
    },

    /**
     * Execute components.
     * @param {string} funcName - function name
     */
    execute: function(funcName) {
        var args = Array.prototype.slice.call(arguments, 1);

        tui.util.forEachArray(this.components, function(component) {
            if (component[funcName]) {
                component[funcName].apply(component, args);
            }
        });
    },

    /**
     * Get component.
     * @param {string} name component name
     * @returns {object} component instance
     */
    get: function(name) {
        return this.componentMap[name];
    },

    /**
     * Whether has component or not.
     * @param {string} name - comopnent name
     * @returns {boolean}
     */
    has: function(name) {
        return !!this.get(name);
    }
});

module.exports = ComponentManager;
