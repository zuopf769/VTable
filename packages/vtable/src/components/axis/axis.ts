import { degreeToRadian, isNil, isValidNumber, merge } from '@visactor/vutils';
import type { BaseTableAPI } from '../../ts-types/base-table';
import type { ICellAxisOption } from '../../ts-types/component/axis';
import { LineAxis, type LineAxisAttributes } from '@visactor/vrender-components';
import { commonAxis, getAxisAttributes } from './get-axis-attributes';
import { isXAxis, isYAxis } from '../util/orient';
import type { IOrientType } from '../../ts-types/component/util';
import { BandAxisScale } from './band-scale';
import { registerDataSetInstanceParser, registerDataSetInstanceTransform } from '../util/register';
import type { Parser } from '@visactor/vdataset';
import { DataView } from '@visactor/vdataset';
import type { IBaseScale } from '@visactor/vscale';
import { ticks } from '@visactor/vutils-extension';
import { LinearAxisScale } from './linear-scale';
import { doOverlap } from './label-overlap';
import { getQuadProps } from '../../scenegraph/utils/padding';

const DEFAULT_BAND_INNER_PADDING = 0.1;
const DEFAULT_BAND_OUTER_PADDING = 0.3;
const scaleParser: Parser = (scale: IBaseScale) => {
  return scale;
};

export class CartesianAxis {
  width: number;
  height: number;
  table: BaseTableAPI;
  option: ICellAxisOption;
  orient: IOrientType;
  visible: boolean;
  type: 'linear' | 'band' | 'point' | 'time' | 'log' | 'symlog';
  inverse: boolean;
  data?: any[];
  tickData: DataView;
  scale: BandAxisScale | LinearAxisScale;
  component: LineAxis;

  constructor(option: ICellAxisOption, width: number, height: number, table: BaseTableAPI) {
    this.table = table;
    this.width = width;
    this.height = height;
    // this.option = cloneDeep(option);
    this.option = merge({}, commonAxis, option);

    this.orient = option.orient ?? 'left';
    this.visible = option.visible ?? true;
    this.type = option.type ?? 'band';
    this.inverse = 'inverse' in option ? !!option.inverse : false;
    if (option.type === 'band') {
      this.data = option.domain;
    }

    this.initScale();
    this.initData();
    this.createComponent();
    this.initEvent();
  }

  initScale() {
    const option = this.option as any;
    if (this.type === 'band' || this.type === 'point') {
      this.scale = new BandAxisScale();
      this.scale.bandPadding = option.bandPadding;
      this.scale.paddingInner = option.paddingInner;
      this.scale.paddingOuter = option.paddingOuter;
      this.scale.calcScales(DEFAULT_BAND_INNER_PADDING, DEFAULT_BAND_OUTER_PADDING); // 0.1 0.3
      this.scale.updateScaleDomain(this.data);
      this.updateScaleRange();
    } else if (this.type === 'linear' || this.type === 'time' || this.type === 'log' || this.type === 'symlog') {
      this.scale = new LinearAxisScale(this.type);
      this.scale.setExtraAttrFromSpec(
        option.nice,
        option.zero,
        option.range,
        option.expand,
        option.base,
        option.constant
      );
      this.scale.transformScaleDomain();
      this.scale.updateScaleDomain();
      this.updateScaleRange();
    }
  }

  initData() {
    registerDataSetInstanceParser(this.table._vDataSet, 'scale', scaleParser);
    registerDataSetInstanceTransform(this.table._vDataSet, 'ticks', ticks);

    const label = this.option.label || {};
    const tick = this.option.tick || {};
    const tickData = new DataView(this.table._vDataSet)
      .parse(this.scale._scale, {
        type: 'scale'
      })
      .transform(
        {
          type: 'ticks',
          options: {
            sampling: this.option.sampling !== false, // default do sampling
            tickCount: tick.tickCount,
            forceTickCount: tick.forceTickCount,
            tickStep: tick.tickStep,
            tickMode: tick.tickMode,
            noDecimals: tick.noDecimals,

            axisOrientType: this.orient,
            coordinateType: 'cartesian',

            labelStyle: label.style,
            labelFormatter: label.formatMethod,
            labelGap: label.minGap,

            labelLastVisible: label.lastVisible,
            labelFlush: label.flush
          }
        },
        false
      );
    this.tickData = tickData;

    this.computeData();
  }

  computeData(): void {
    this.tickData.reRunAllTransform();
  }

  initEvent() {
    // to be added
  }

  createComponent() {
    const axisStylrAttrs = getAxisAttributes(this.option);
    const attrs = this.getUpdateAttribute();
    attrs.verticalFactor = this.orient === 'top' || this.orient === 'right' ? -1 : 1;
    this.component = new LineAxis(merge({}, axisStylrAttrs, attrs));
    this.component.setAttributes(this.setLayoutStartPosition({ x: 0, y: 0 }));
    (this.component as any).originAxis = this;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.updateScaleRange();
    this.computeData();
    const axisStylrAttrs = getAxisAttributes(this.option);
    const attrs = this.getUpdateAttribute();
    attrs.verticalFactor = this.orient === 'top' || this.orient === 'right' ? -1 : 1;
    this.component.setAttributes(merge({}, axisStylrAttrs, attrs));
    this.component.setAttributes(this.setLayoutStartPosition({ x: 0, y: 0 }));
    this.overlap();
  }

  overlap() {
    doOverlap(this.component, this);
  }

  getLayoutRect() {
    // const padding = getQuadProps(this.table.theme.bodyStyle.padding as number);
    return {
      // width: this.width - (this.orient === 'top' || this.orient === 'bottom' ? padding[3] + padding[1] : 0),
      // height: this.height - (this.orient === 'left' || this.orient === 'right' ? padding[0] + padding[2] : 0)
      width: this.width,
      height: this.height
    };
  }

  getUpdateAttribute() {
    // 获取更新的坐标轴属性
    const regionHeight = this.table.tableNoFrameHeight;
    const regionWidth = this.table.tableNoFrameWidth;

    const { width, height } = this.getLayoutRect();
    const isX = isXAxis(this.orient);
    const isY = isYAxis(this.orient);
    let end = { x: 0, y: 0 };
    let gridLength = 0;
    let axisLength = 0;
    if (isX) {
      end = { x: width, y: 0 };
      gridLength = regionHeight;
      axisLength = width;
    } else if (isY) {
      end = { x: 0, y: height };
      gridLength = regionWidth;
      axisLength = height;
    }
    const attrs: LineAxisAttributes = {
      start: { x: 0, y: 0 },
      end,
      // grid: {
      //   type: 'line',
      //   length: gridLength,
      //   visible: this.option.grid.visible
      // },
      title: {
        text: this.option.title.text,
        maxWidth: this._getTitleLimit(isX)
      },
      items: this.getLabelItems(axisLength)
    };
    return attrs;
  }

  getLabelItems(length: number) {
    return [
      this.tickData.latestData
        .map((obj: any) => {
          return {
            id: obj.value,
            label: obj.value,
            value: length === 0 ? 0 : this.scale.dataToPosition([obj.value]) / length,
            rawValue: obj.value
          };
        })
        .filter((entry: any) => entry.value >= 0 && entry.value <= 1)
    ];
  }

  updateScaleRange() {
    const { width, height } = this.getLayoutRect();
    const inverse = (this.option as any).inverse || false;
    let newRange: [number, number] = [0, 0];
    if (isXAxis(this.orient)) {
      if (isValidNumber(width)) {
        newRange = inverse ? [width, 0] : [0, width];
      }
    } else {
      if (isValidNumber(height)) {
        newRange = inverse ? [0, height] : [height, 0];
      }
    }

    this.scale.updateRange(newRange);
  }

  setLayoutStartPosition(pos: any) {
    let { x, y } = pos;

    if (isValidNumber(x)) {
      x += Number(this.orient === 'left') * this.getLayoutRect().width;
    }
    if (isValidNumber(y)) {
      y += Number(this.orient === 'top') * this.getLayoutRect().height;
    }

    return { x, y };
    // super.setLayoutStartPosition({ x, y });
  }

  private _getTitleLimit(isX: boolean) {
    if (this.option.title.visible && isNil(this.option.title.style?.maxLineWidth)) {
      let angle = this.option.title.style?.angle || 0;
      if (this.option.title?.autoRotate && isNil(this.option.title.angle)) {
        angle = this.option.orient === 'left' ? -90 : 90;
      }
      if (isX) {
        const width = this.getLayoutRect().width;
        const cosValue = Math.abs(Math.cos(degreeToRadian(angle)));
        // VRender 接收到的limit是考虑角度计算后的宽度
        // TODO：还需要考虑angle后，高度是否太高，综合计算一个limit，比如高度不能超过图表整体高度的1/4
        return cosValue < 1e-6 ? Infinity : width / cosValue;
      }
      const height = this.getLayoutRect().height;
      const sinValue = Math.abs(Math.sin(degreeToRadian(angle)));

      // TODO：还需要考虑angle后，宽度是否太宽，综合计算一个limit，比如宽度度不能超过图表整体宽度的1/4
      return sinValue < 1e-6 ? Infinity : height / sinValue;
    }

    return null;
  }

  getScale() {
    return this.scale._scale;
  }

  getDomainSpec() {
    return (this.scale as LinearAxisScale).domain;
  }
}
