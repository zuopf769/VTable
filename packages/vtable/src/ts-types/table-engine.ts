import type { RectProps, MaybePromiseOrUndefined, IDimensionInfo, SortOrder } from './common';
import type { SvgIcon } from './icon';
export type { HeaderData } from './list-table/layout-map/api';
export type LayoutObjectId = number | string;
import type { Rect } from '../tools/Rect';
import type { BaseTableAPI, BaseTableConstructorOptions } from './base-table';
import type { IDataConfig } from './new-data-set';
import type { Either } from '../tools/helper';
import type { IChartIndicator, ICornerDefine, IDimension, IIndicator, ITitleDefine } from './pivot-table';
import type { ColumnsDefine } from './list-table';
import type { ICellAxisOption, ITableAxisOption } from './component/axis';
import type { ITextStyleOption } from '../body-helper/style';

export interface CellAddress {
  col: number;
  row: number;
  rect?: RectProps;
  x?: number;
  y?: number;
}
export interface CellRange {
  start: CellAddress;
  end: CellAddress;
}

export type FieldGetter = (record: any, col?: number, row?: number, table?: BaseTableAPI) => any;
export type FieldSetter = (record: any, value: any) => void;
export interface FieldAssessor {
  get: FieldGetter;
  set: FieldSetter;
}

export type FieldDef = string | number | string[];
export type FieldKeyDef = string | number;
export type FieldFormat = FieldGetter | FieldAssessor;

export type FieldData = MaybePromiseOrUndefined;

export type WidthModeDef = 'standard' | 'adaptive' | 'autoWidth';
export type HeightModeDef = 'standard' | 'adaptive' | 'autoHeight';
export type ShowColumnRowType = 'column' | 'row' | 'none';
/** 单元格所处表格哪部分 */
export type CellLocation = 'body' | 'rowHeader' | 'columnHeader' | 'cornerHeader';
export type CellSubLocation =
  | 'body'
  | 'rowHeader'
  | 'columnHeader'
  | 'cornerHeader'
  | 'bottomFrozen'
  | 'rightFrozen'
  | 'rightTopCorner'
  | 'leftBottomCorner'
  | 'rightBottomCorner';

export interface TableKeyboardOptions {
  // moveCellOnTab?: boolean;
  // moveCellOnEnter?: boolean;
  // deleteCellValueOnDel?: boolean;

  /** 开启快捷键全选 默认：false */
  selectAllOnCtrlA?: boolean;
  /** 快捷键复制  默认不开启*/
  copySelected?: boolean; //这个copy是和浏览器的快捷键一致的
}
export interface DataSourceAPI {
  clearCurrentIndexedData: () => void;
  length: number;
  get: (index: number) => MaybePromiseOrUndefined;
  getField: <F extends FieldDef>(index: number, field: F, col: number, row: number, table: BaseTableAPI) => FieldData;
  hasField: (index: number, field: FieldDef) => boolean;
  sort: (field: FieldDef, order: SortOrder, orderFn: (v1: any, v2: any, order: SortOrder) => -1 | 0 | 1) => void;
  clearSortedMap: () => void;
  updatePagination: (pagination: IPagination) => void;
  getIndexKey: (index: number) => number | number[];
  /** 数据是否为树形结构 且可以展开收起 */
  enableHierarchyState: boolean;
}

export interface SortState {
  /** 排序依据字段 */
  field: FieldDef;

  fieldKey?: FieldKeyDef;
  /** 排序规则 */
  order: SortOrder;
}
export interface PivotSortState {
  col: number;
  row: number;
  order: SortOrder;
}

/**
 * 分页配置
 */
export interface IPagination {
  /** 数据总条数 透视表中这个数据会自动加上 不需用户传入*/
  totalCount?: number;
  /** 每页显示数据条数  */
  perPageCount: number;
  /** 每页显示条数 */
  currentPage?: number;
}
export type HeaderValues = Map<any, any>;
export interface ListTableConstructorOptions extends BaseTableConstructorOptions {
  /**
   * 数据集合
   */
  records?: any[];
  /**
   * 是否显示表头
   */
  showHeader?: boolean;
  /**
   * Simple header property
   */
  columns?: ColumnsDefine; //请不要再这个上面修改配置,这里相当于是一个原始值备份，有一个内部专用的protectspace.columns
  /**
   *@deprecated 已废弃 请使用columns
   */
  header?: ColumnsDefine;

  transpose?: boolean; //是否转置
  /**
   * 展示为tree的列 层级缩进值
   */
  hierarchyIndent?: number;
  /** 展开层数 默认为1只显示根节点*/
  hierarchyExpandLevel?: number;

  /** 分页配置 */
  pagination?: IPagination;

  /**
   * 排序状态
   */
  sortState?: SortState | SortState[];
}

export interface ListTableAPI extends BaseTableAPI {
  options: ListTableConstructorOptions;
  sortState: SortState[] | SortState | null;
  // internalProps: ListTableProtected;
  isListTable: () => true;
  isPivotTable: () => false;
}
export interface PivotTableConstructorOptions extends BaseTableConstructorOptions {
  /**
   * 数据集合
   */
  records?: any[];
  /**
   * 调整列宽的生效范围：'column' | 'indicator' | 'all' | 'indicatorGroup'，单列|按指标|所有列|属于同一维度值的多个指标
   */
  columnResizeType?: 'column' | 'indicator' | 'all' | 'indicatorGroup';
  /** 设置排序状态，只对应按钮展示效果 无数据排序逻辑 */
  pivotSortState?: {
    dimensions: IDimensionInfo[];
    order: SortOrder;
  }[];

  //#region layout中挪到外层的属性
  /**层级维度结构显示形式 */
  rowHierarchyType?: 'grid' | 'tree';
  /**展开层数 */
  rowExpandLevel?: number;
  /**子层级维度缩进距离 */
  rowHierarchyIndent?: number;
  /** 列表头维度结构 */
  columnTree?: IHeaderTreeDefine[];
  /** 行表头维度结构 */
  rowTree?: IHeaderTreeDefine[];
  /** 定义各个维度和各个指标的具体配置项和样式定义 rows 和 dimension 代替掉 */
  // dimensions?: IDimension[];

  /** 定义行上各个维度具体配置项和样式定义 */
  rows?: (IDimension | string)[]; // (string | IDimension)[]; 后续支持数据分析的透视表 支持string配置
  /** 定义列上各个维度具体配置项和样式定义 */
  columns?: (IDimension | string)[]; // (string | IDimension)[];
  /** 定义指标具体配置项和样式定义 包含表头和body的定义*/
  indicators?: (IIndicator | string)[]; // (string | IIndicator)[];

  /** 指标以列展示 ———有数据分析的透视表才需要配置这个 */
  indicatorsAsCol?: boolean;
  /** 指标在具体维度展示的层级顺序，从0开始 ———有数据分析的透视表才需要配置这个 */
  indicatorIndex?: number;
  /** 是否隐藏指标名称 */
  hideIndicatorName?: boolean; //
  /** 指标维度key 注意非具体指标key 数据分析的透视表才需要配置这个 */
  // indicatorDimensionKey?: string;
  /** 角头单元格配置项和样式定义 */
  corner?: ICornerDefine;
  /**
   * boolean 是否显示列维度值表头
   */
  showColumnHeader?: boolean;
  /**
   * boolean 是否显示行维度值表头
   */
  showRowHeader?: boolean;
  /**
   * 列表头增加一行来显示维度名称 可以自定义或者显示dimension.title组合名
   */
  columnHeaderTitle?: ITitleDefine;
  /**
   * 行表头的增加一列来显示维度名称 可以自定义或者显示dimension.title组合名
   */
  rowHeaderTitle?: ITitleDefine;
  //#endregion
  /** 数据分析相关配置 enableDataAnalysis开启后该配置才会有效 */
  dataConfig?: IDataConfig;
  /**
   * 透视表是否开启数据分析
   * 如果传入数据是明细数据需要聚合分析则开启
   * 如传入数据是经过聚合好的为了提升性能这里设置为false，同时需要传入columnTree和rowTree
   */
  enableDataAnalysis?: boolean;
  /** 指标标题 用于显示到角头的值*/
  indicatorTitle?: string;
  /** 分页配置 */
  pagination?: IPagination;

  extensionRows?: IExtensionRowDefine[];
}
export interface PivotChartConstructorOptions extends BaseTableConstructorOptions {
  /**
   * 数据集合, 平坦数据集合。另外一种特殊方式是传入分组后的数据，分组依据为指标
   */
  records?: any[] | Record<string, any[]>;
  /**
   * 调整列宽的生效范围：'column' | 'indicator' | 'all' | 'indicatorGroup'，单列|按指标|所有列|属于同一维度值的多个指标
   */
  columnResizeType?: 'column' | 'indicator' | 'all' | 'indicatorGroup';
  /** 列表头维度结构 */
  columnTree?: IHeaderTreeDefine[];
  /** 行表头维度结构 */
  rowTree?: IHeaderTreeDefine[];
  /** 定义各个维度和各个指标的具体配置项和样式定义 rows 和 dimension 代替掉 */
  // dimensions?: IDimension[];

  /** 定义行上各个维度具体配置项和样式定义 */
  rows?: (IDimension | string)[]; // (string | IDimension)[]; 后续支持数据分析的透视表 支持string配置
  /** 定义列上各个维度具体配置项和样式定义 */
  columns?: (IDimension | string)[]; // (string | IDimension)[];
  /** 定义指标具体配置项和样式定义 包含表头和body的定义*/
  indicators?: (IChartIndicator | string)[]; // (string | IIndicator)[];

  /** 指标以列展示 ———有数据分析的透视表才需要配置这个 */
  indicatorsAsCol?: boolean;
  /** 是否隐藏指标名称 */
  hideIndicatorName?: boolean; //
  /** 角头单元格配置项和样式定义 */
  corner?: ICornerDefine;
  /**
   * boolean 是否显示列维度值表头
   */
  showColumnHeader?: boolean;
  /**
   * boolean 是否显示行维度值表头
   */
  showRowHeader?: boolean;
  /**
   * 列表头增加一行来显示维度名称 可以自定义或者显示dimension.title组合名
   */
  columnHeaderTitle?: ITitleDefine;
  /**
   * 行表头的增加一列来显示维度名称 可以自定义或者显示dimension.title组合名
   */
  rowHeaderTitle?: ITitleDefine;
  /** 指标标题 用于显示到角头的值*/
  indicatorTitle?: string;

  axes?: ITableAxisOption[];
}
export interface PivotTableAPI extends BaseTableAPI {
  records?: any;
  options: PivotTableConstructorOptions;
  // internalProps: PivotTableProtected;
  pivotSortState: PivotSortState[];
  isListTable: () => false;
  isPivotTable: () => true;
  getPivotSortState: (col: number, row: number) => SortOrder;
  toggleHierarchyState: (col: number, row: number) => void;
}
export interface PivotChartAPI extends BaseTableAPI {
  records?: any | Record<string, any[]>;
  options: PivotChartConstructorOptions;
  // internalProps: PivotTableProtected;
  isListTable: () => false;
  isPivotTable: () => true;
}
export type SetPasteValueTestData = CellAddress & {
  table: BaseTableAPI;
  record: any;
  value: string;

  oldValue: any;
};

export interface InlineAPI {
  width: (arg: { ctx: CanvasRenderingContext2D }) => number;
  font: () => string | null;
  color: () => string | null;
  canDraw: () => boolean;
  onReady: (callback: Function) => void;

  draw: (opt: any) => void;
  canBreak: () => boolean;
}

export interface CellContext {
  readonly col: number;
  readonly row: number;
  /**format之后的值 */
  readonly value: FieldData;
  /**原始值 */
  readonly dataValue: FieldData;
  showIcon?: SvgIcon;
  getContext: () => CanvasRenderingContext2D;
  toCurrentContext: () => CellContext;
  getDrawRect: () => RectProps | null;
  getRect: () => RectProps;
  setRectFilter: (rectFilter: (base: RectProps) => RectProps) => void;
  updateRect: (rect: Rect | RectProps) => void;
  updateDrawRect: (rect: Rect | RectProps) => void;
}

export enum Placement {
  top = 'top',
  bottom = 'bottom',
  left = 'left',
  right = 'right'
}

export enum HierarchyState {
  expand = 'expand',
  collapse = 'collapse',
  none = 'none'
}
export type IHeaderTreeDefine = Either<IDimensionHeaderNode, IIndicatorHeaderNode>;
export interface IIndicatorHeaderNode {
  /**
   * 指标的key值 对应数据集的字段名
   */
  indicatorKey: string | number;
  /**
   * 指标名称 如：“销售额”，“例如”， 对应到单元格显示的值。可不填，不填的话 从indicators的对应配置中取值显示
   */
  value?: string;
  /** 维度成员下的子维度树结构 */
  children?: IHeaderTreeDefine[] | null;
}
export interface IDimensionHeaderNode {
  /**
   * 维度的唯一标识，对应数据集的字段名称
   */
  dimensionKey: string | number;
  /** 维度成员值 */
  value: string;
  /** 维度成员下的子维度树结构 */
  children?: IHeaderTreeDefine[] | null;
  /** 折叠状态 TODO */
  hierarchyState?: HierarchyState;
}

export interface IExtensionRowDefine {
  rows: (IDimension | string)[];
  rowTree: IHeaderTreeDefine[] | ((args: { dimensionKey: string | number; value: string }[]) => IHeaderTreeDefine[]);
}

export type StickCell = { col: number; row: number; dx: number; dy: number };

export type CustomMergeCell = (col: number, row: number, table: BaseTableAPI) => undefined | CustomMerge;
export type CustomMerge = {
  range: CellRange;
  text: string;
  style?: ITextStyleOption;
};
