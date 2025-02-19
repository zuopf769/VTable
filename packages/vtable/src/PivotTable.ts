import type {
  FieldData,
  FieldDef,
  FieldFormat,
  PivotTableAPI,
  SortRules,
  PivotSortState,
  CellAddress,
  ICellHeaderPaths,
  DropDownMenuEventInfo,
  FieldKeyDef,
  PivotTableConstructorOptions,
  IHeaderTreeDefine,
  IDimensionInfo,
  SortOrder,
  IPagination,
  CellLocation
} from './ts-types';
import { HierarchyState } from './ts-types';
import { PivotHeaderLayoutMap } from './layout/pivot-header-layout';
import { getField } from './data/DataSource';
import { FlatDataToObjects } from './dataset/flatDataToObject';
import { PIVOT_TABLE_EVENT_TYPE } from './ts-types/pivot-table/PIVOT_TABLE_EVENT_TYPE';
import { cellInRange, emptyFn } from './tools/helper';
import { Dataset } from './dataset/dataset';
import { _setDataSource } from './core/tableHelper';
import { BaseTable } from './core/BaseTable';
import type { PivotTableProtected } from './ts-types/base-table';
import { Title } from './components/title/title';
import { cloneDeep } from '@visactor/vutils';
import { Env } from './tools/env';

export class PivotTable extends BaseTable implements PivotTableAPI {
  declare internalProps: PivotTableProtected;
  declare options: PivotTableConstructorOptions;
  pivotSortState: PivotSortState[];

  dataset?: Dataset; //数据处理对象  开启数据透视分析的表
  flatDataToObjects?: FlatDataToObjects; //数据处理对象 聚合后的flat数据 转成便于查询的行列二维数组
  // drillMenu: Menu; //上卷下钻的按钮
  // eslint-disable-next-line default-param-last
  constructor(options: PivotTableConstructorOptions);
  constructor(container: HTMLElement, options: PivotTableConstructorOptions);
  constructor(container?: HTMLElement | PivotTableConstructorOptions, options?: PivotTableConstructorOptions) {
    if (Env.mode === 'node') {
      options = container as PivotTableConstructorOptions;
      container = null;
    } else if (!(container instanceof HTMLElement)) {
      options = container as PivotTableConstructorOptions;
      if ((container as PivotTableConstructorOptions).container) {
        container = (container as PivotTableConstructorOptions).container;
      } else {
        container = null;
      }
    }
    super(container as HTMLElement, options);
    if ((options as any).layout) {
      //TODO hack处理之前的demo都是定义到layout上的 所以这里直接并到options中
      Object.assign(options, (options as any).layout);
    }
    this.internalProps.columns = cloneDeep(options.columns);
    this.internalProps.rows = cloneDeep(options.rows);
    this.internalProps.indicators = cloneDeep(options.indicators);
    this.internalProps.columnTree =
      options.indicatorsAsCol && !options.columns?.length && !options.columnTree ? [] : cloneDeep(options.columnTree);
    this.internalProps.rowTree =
      !options.indicatorsAsCol && !options.rows?.length && !options.rowTree ? [] : cloneDeep(options.rowTree);
    //分页配置
    this.pagination = options.pagination;
    this.internalProps.columnResizeType = options.columnResizeType ?? 'column';
    this.internalProps.dataConfig = cloneDeep(options.dataConfig);
    this.internalProps.enableDataAnalysis = options.enableDataAnalysis;
    if (this.internalProps.enableDataAnalysis) {
      const rowKeys =
        options.rows?.reduce((keys, rowObj) => {
          if (typeof rowObj === 'string') {
            keys.push(rowObj);
          } else {
            keys.push(rowObj.dimensionKey);
          }
          return keys;
        }, []) ?? [];
      const columnKeys =
        options.columns?.reduce((keys, columnObj) => {
          if (typeof columnObj === 'string') {
            keys.push(columnObj);
          } else {
            keys.push(columnObj.dimensionKey);
          }
          return keys;
        }, []) ?? [];
      const indicatorKeys =
        options.indicators?.reduce((keys, indicatorObj) => {
          if (typeof indicatorObj === 'string') {
            keys.push(indicatorObj);
          } else {
            keys.push(indicatorObj.indicatorKey);
          }
          return keys;
        }, []) ?? [];
      this.dataset = new Dataset(
        this.internalProps.dataConfig,
        // this.pagination,
        rowKeys,
        columnKeys,
        // options.indicatorsAsCol === false ? rowKeys.concat(IndicatorDimensionKeyPlaceholder) : rowKeys,
        // options.indicatorsAsCol !== false ? columnKeys.concat(IndicatorDimensionKeyPlaceholder) : columnKeys,
        indicatorKeys,
        this.internalProps.indicators,
        options.indicatorsAsCol ?? true,
        options.records,
        options.rowHierarchyType,
        this.internalProps.columnTree, //传递自定义树形结构会在dataset中补充指标节点children
        this.internalProps.rowTree
      );
    }

    this.refreshHeader();

    this.pivotSortState = [];
    if (options.pivotSortState) {
      this.updatePivotSortState(options.pivotSortState);
    }

    if (options.dataSource) {
      _setDataSource(this, options.dataSource);
    } else if (options.records) {
      this.setRecords(options.records as any, this.internalProps.sortState);
    } else {
      this.setRecords([]);
    }
    if (options.title) {
      this.internalProps.title = new Title(options.title, this);
      this.scenegraph.resize();
    }
  }
  static get EVENT_TYPE(): typeof PIVOT_TABLE_EVENT_TYPE {
    return PIVOT_TABLE_EVENT_TYPE;
  }
  isListTable(): false {
    return false;
  }
  isPivotTable(): true {
    return true;
  }
  isPivotChart(): false {
    return false;
  }
  _canResizeColumn(col: number, row: number): boolean {
    const ifCan = super._canResizeColumn(col, row);
    if (ifCan) {
      if (!this.internalProps.layoutMap.indicatorsAsCol) {
        // 列上是否配置了禁止拖拽列宽的配置项disableColumnResize
        const cellDefine = this.internalProps.layoutMap.getBody(col, this.columnHeaderLevelCount);
        if (cellDefine?.disableColumnResize) {
          return false;
        }
      }
    }
    return ifCan;
  }
  updateOption(options: PivotTableConstructorOptions, accelerateFirstScreen = false) {
    const internalProps = this.internalProps;
    //维护选中状态
    // const range = internalProps.selection.range; //保留原有单元格选中状态
    super.updateOption(options);
    this.internalProps.columns = cloneDeep(options.columns);
    this.internalProps.rows = cloneDeep(options.rows);
    this.internalProps.indicators = !options.indicators?.length ? [] : cloneDeep(options.indicators);
    this.internalProps.columnTree =
      options.indicatorsAsCol && !options.columns?.length && !options.columnTree ? [] : cloneDeep(options.columnTree);
    this.internalProps.rowTree =
      !options.indicatorsAsCol && !options.rows?.length && !options.rowTree ? [] : cloneDeep(options.rowTree);
    //分页配置
    this.pagination = options.pagination;
    // 更新protectedSpace
    internalProps.columnResizeType = options.columnResizeType ?? 'column';
    internalProps.dataConfig = cloneDeep(options.dataConfig);
    internalProps.enableDataAnalysis = options.enableDataAnalysis;

    //维护tree树形结构的展开状态
    if (
      options?.rowHierarchyType === 'tree' &&
      (this.internalProps.layoutMap as PivotHeaderLayoutMap).rowHierarchyType === 'tree' &&
      (this.internalProps.layoutMap as PivotHeaderLayoutMap).rowExpandLevel === options?.rowExpandLevel
    ) {
      const beforeRowDimensions = (this.internalProps.layoutMap as PivotHeaderLayoutMap).rowDimensionTree.tree.children;
      this.internalProps.rowTree?.forEach((node: IHeaderTreeDefine, index: number) => {
        const beforeRowDimension = beforeRowDimensions.find(
          item => item.dimensionKey === node.dimensionKey && item.value === node.value
        );
        if (beforeRowDimension) {
          this.syncHierarchyState(beforeRowDimension, node);
        }
      });
    }

    //TODO 这里需要加上判断 dataConfig是否有配置变化
    if (this.internalProps.enableDataAnalysis && (options.rows || options.columns)) {
      const rowKeys = options.rows.reduce((keys, rowObj) => {
        if (typeof rowObj === 'string') {
          keys.push(rowObj);
        } else {
          keys.push(rowObj.dimensionKey);
        }
        return keys;
      }, []);
      const columnKeys = options.columns.reduce((keys, columnObj) => {
        if (typeof columnObj === 'string') {
          keys.push(columnObj);
        } else {
          keys.push(columnObj.dimensionKey);
        }
        return keys;
      }, []);
      const indicatorKeys = options.indicators?.reduce((keys, indicatorObj) => {
        if (typeof indicatorObj === 'string') {
          keys.push(indicatorObj);
        } else {
          keys.push(indicatorObj.indicatorKey);
        }
        return keys;
      }, []);
      this.dataset = new Dataset(
        internalProps.dataConfig,
        // this.pagination,
        rowKeys,
        columnKeys,
        indicatorKeys,
        this.internalProps.indicators,
        options.indicatorsAsCol ?? true,
        options.records,
        options.rowHierarchyType,
        this.internalProps.columnTree, //传递自定义树形结构会在dataset中补充指标节点children
        this.internalProps.rowTree
      );
    }
    // 更新表头
    this.refreshHeader();

    // this.hasMedia = null; // 避免重复绑定
    // 清空目前数据
    if (internalProps.releaseList) {
      internalProps.releaseList.forEach(releaseObj => releaseObj?.release?.());
      internalProps.releaseList = null;
    }
    // // 恢复selection状态
    // internalProps.selection.range = range;
    // this._updateSize();
    // 传入新数据
    if (options.dataSource) {
      _setDataSource(this, options.dataSource);
    } else if (options.records) {
      this.setRecords(options.records as any, undefined);
    } else {
      this._resetFrozenColCount();
      // 生成单元格场景树
      this.scenegraph.createSceneGraph();
      this.render();
    }
    if (options.title) {
      this.internalProps.title = new Title(options.title, this);
      this.scenegraph.resize();
    }
    this.pivotSortState = [];
    if (options.pivotSortState) {
      this.updatePivotSortState(options.pivotSortState);
    }
    return new Promise(resolve => {
      setTimeout(resolve, 0);
    });
  }

  /**
   * 更新页码
   * @param pagination 修改页码
   */
  updatePagination(pagination?: IPagination): void {
    if (pagination) {
      if (!this.pagination) {
        this.pagination = { currentPage: 0, perPageCount: 0 };
      }
      typeof pagination.currentPage === 'number' &&
        pagination.currentPage >= 0 &&
        (this.pagination.currentPage = pagination.currentPage);
      pagination.perPageCount &&
        (this.pagination.perPageCount = pagination.perPageCount || this.pagination.perPageCount);
      // 清空单元格内容
      this.scenegraph.clearCells();
      //数据源缓存数据更新
      (this.internalProps.layoutMap as PivotHeaderLayoutMap).setPagination(this.pagination);
      // this.refreshHeader();
      //刷新表头，原来这里是_refreshRowCount 后改名为_refreshRowColCount  因为表头定义会影响行数，而转置模式下会影响列数
      this.refreshRowColCount();
      // 生成单元格场景树
      this.scenegraph.createSceneGraph();
      this.render();
    } else if (this.pagination) {
      // 原来有分页 现在更新成不分页
      this.pagination = undefined;
      // 清空单元格内容
      this.scenegraph.clearCells();
      //数据源缓存数据更新
      (this.internalProps.layoutMap as PivotHeaderLayoutMap).setPagination(undefined);
      // this.refreshHeader();
      //刷新表头，原来这里是_refreshRowCount 后改名为_refreshRowColCount  因为表头定义会影响行数，而转置模式下会影响列数
      this.refreshRowColCount();
      // 生成单元格场景树
      this.scenegraph.createSceneGraph();
      this.render();
    }
  }

  refreshHeader(): void {
    const internalProps = this.internalProps;

    //原表头绑定的事件 解除掉
    if (internalProps.headerEvents) {
      internalProps.headerEvents.forEach((id: number) => this.off(id));
    }
    const records = this.options.records ?? this.internalProps.records;
    if (this.options.enableDataAnalysis) {
      internalProps.layoutMap = new PivotHeaderLayoutMap(this, this.dataset);
    } else if (Array.isArray(this.internalProps.columnTree) || Array.isArray(this.internalProps.rowTree)) {
      internalProps.layoutMap = new PivotHeaderLayoutMap(this, null);
      //判断如果数据是二维数组 则标识已经分析过 直接从二维数组挨个读取渲染即可
      //不是二维数组 对应是个object json对象 则表示flat数据，需要对应行列维度进行转成方便数据查询的行列树结构
      if (records?.[0]?.constructor !== Array) {
        this.flatDataToObjects = new FlatDataToObjects(
          {
            rows: internalProps.layoutMap.fullRowDimensionKeys,
            columns: internalProps.layoutMap.colDimensionKeys,
            indicators: internalProps.layoutMap.indicatorKeys,
            indicatorsAsCol: internalProps.layoutMap.indicatorsAsCol,
            indicatorDimensionKey: internalProps.layoutMap.indicatorDimensionKey
          },
          records
        );
      }
    }

    //设置列宽
    for (let col = 0; col < internalProps.layoutMap.columnWidths.length; col++) {
      const { width, minWidth, maxWidth } = internalProps.layoutMap.columnWidths?.[col] ?? {};
      // width 为 "auto" 时先不存储ColWidth
      if (width && ((typeof width === 'string' && width !== 'auto') || (typeof width === 'number' && width > 0))) {
        this.setColWidth(col, width);
      }
      if (minWidth && ((typeof minWidth === 'number' && minWidth > 0) || typeof minWidth === 'string')) {
        this.setMinColWidth(col, minWidth);
      }
      if (maxWidth && ((typeof maxWidth === 'number' && maxWidth > 0) || typeof maxWidth === 'string')) {
        this.setMaxColWidth(col, maxWidth);
      }
    }
    //刷新表头，原来这里是_refreshRowCount 后改名为_refreshRowColCount  因为表头定义会影响行数，而转置模式下会影响列数
    this.refreshRowColCount();
  }

  refreshRowColCount(): void {
    const table = this;
    const { layoutMap } = table.internalProps;
    if (!layoutMap) {
      return;
    }
    table.colCount = layoutMap.colCount ?? 0;
    table.rowCount = layoutMap.rowCount ?? 0;
    table.frozenColCount = layoutMap.rowHeaderLevelCount; //TODO
    table.frozenRowCount = layoutMap.headerLevelCount;

    table.bottomFrozenRowCount = this.options.bottomFrozenRowCount ?? 0;
    table.rightFrozenColCount = this.options.rightFrozenColCount ?? 0;
  }
  protected _getSortFuncFromHeaderOption(
    columns: undefined,
    field: FieldDef,
    fieldKey?: FieldKeyDef
  ): ((v1: any, v2: any, order: SortOrder) => 0 | 1 | -1) | undefined {
    return undefined;
  }
  /**
   * Get rowHierarchyType of pivotTable
   */
  get rowHierarchyType(): 'grid' | 'tree' {
    return (this.internalProps.layoutMap as PivotHeaderLayoutMap).rowHierarchyType;
  }
  /**
   * 将现有tree中的的hierarchyState同步到rows透视树中
   * @param sourceNode
   * @param targetNode
   */
  private syncHierarchyState(sourceNode: any, targetNode: IHeaderTreeDefine) {
    if (sourceNode.value === targetNode.value && sourceNode.dimensionKey === targetNode.dimensionKey) {
      targetNode.hierarchyState =
        targetNode.hierarchyState ?? (targetNode?.children ? sourceNode.hierarchyState : undefined);
      targetNode?.children?.forEach((targetChildNode: IHeaderTreeDefine, index: number) => {
        if (sourceNode?.children?.[index] && targetChildNode) {
          const beforeRowDimension = sourceNode.children.find(
            (item: any) => item.dimensionKey === targetChildNode.dimensionKey && item.value === targetChildNode.value
          );
          if (beforeRowDimension) {
            this.syncHierarchyState(beforeRowDimension, targetChildNode);
          }
        }
      });
    }
  }
  getRecordIndexByCell(col: number, row: number): number {
    return undefined;
  }
  getTableIndexByRecordIndex(recordIndex: number): number {
    return undefined;
  }
  getTableIndexByField(field: FieldDef): number {
    return undefined;
  }
  getCellAddrByFieldRecord(field: FieldDef, recordIndex: number): CellAddress {
    return undefined;
  }
  getBodyIndexByRow(row: number): number {
    const { layoutMap } = this.internalProps;
    return layoutMap.getBodyIndexByRow(row);
  }
  getBodyIndexByCol(col: number): number {
    const { layoutMap } = this.internalProps;
    return layoutMap.getBodyIndexByCol(col);
  }
  getFieldData(field: FieldDef | FieldFormat | undefined, col: number, row: number): FieldData {
    if (field === null || field === undefined) {
      return null;
    }
    const table = this;
    if (table.internalProps.layoutMap.isHeader(col, row)) {
      return null;
    }
    const rowIndex = this.getBodyIndexByRow(row);
    const colIndex = this.getBodyIndexByCol(col);
    const dataValue = table.dataSource?.getField(rowIndex, colIndex, col, row, this);
    if (typeof field !== 'string') {
      //field为函数format
      const cellHeaderPaths = table.internalProps.layoutMap.getCellHeaderPaths(col, row);
      return getField({ dataValue, ...cellHeaderPaths }, field, col, row, this, emptyFn as any);
    }
    return dataValue;
  }

  getCellValue(col: number, row: number): FieldData {
    if (this.internalProps.layoutMap.isHeader(col, row)) {
      const { title, fieldFormat } = this.internalProps.layoutMap.getHeader(col, row);
      return typeof fieldFormat === 'function' ? fieldFormat(title) : title;
    }
    if (this.dataset) {
      const cellDimensionPath = this.internalProps.layoutMap.getCellHeaderPaths(col, row);
      const colKeys = cellDimensionPath.colHeaderPaths.map((colPath: any) => {
        return colPath.indicatorKey ?? colPath.value;
      });
      const rowKeys = cellDimensionPath.rowHeaderPaths.map((rowPath: any) => {
        return rowPath.indicatorKey ?? rowPath.value;
      });
      const aggregator = this.dataset.getAggregator(
        !this.internalProps.layoutMap.indicatorsAsCol ? rowKeys.slice(0, -1) : rowKeys,
        this.internalProps.layoutMap.indicatorsAsCol ? colKeys.slice(0, -1) : colKeys,
        (this.internalProps.layoutMap as PivotHeaderLayoutMap).getIndicatorKey(col, row)
      );
      return aggregator.formatValue ? aggregator.formatValue(col, row, this) : '';
    } else if (this.flatDataToObjects) {
      //数据为行列树结构 根据row col获取对应的维度名称 查找到对应值
      const cellDimensionPath = this.internalProps.layoutMap.getCellHeaderPaths(col, row);
      const colKeys = cellDimensionPath.colHeaderPaths.map((colPath: any) => {
        return colPath.indicatorKey ?? colPath.value;
      });
      const rowKeys = cellDimensionPath.rowHeaderPaths.map((rowPath: any) => {
        return rowPath.indicatorKey ?? rowPath.value;
      });
      const valueNode = this.flatDataToObjects.getTreeNode(
        rowKeys,
        colKeys,
        this.internalProps.layoutMap.getBody(col, row).indicatorKey
      );
      const { fieldFormat } = this.internalProps.layoutMap.getBody(col, row);
      return typeof fieldFormat === 'function'
        ? fieldFormat(valueNode?.record, col, row, this)
        : valueNode?.value ?? '';
    }
    const { field, fieldFormat } = this.internalProps.layoutMap.getBody(col, row);
    return this.getFieldData(fieldFormat || field, col, row);
  }

  getCellOriginValue(col: number, row: number): FieldData {
    const table = this;
    if (table.internalProps.layoutMap.isHeader(col, row)) {
      const { title } = table.internalProps.layoutMap.getHeader(col, row);
      return typeof title === 'function' ? title() : title;
    }
    if (this.dataset) {
      const cellDimensionPath = this.internalProps.layoutMap.getCellHeaderPaths(col, row);
      const colKeys = cellDimensionPath.colHeaderPaths.map((colPath: any) => {
        return colPath.indicatorKey ?? colPath.value;
      });
      const rowKeys = cellDimensionPath.rowHeaderPaths.map((rowPath: any) => {
        return rowPath.indicatorKey ?? rowPath.value;
      });
      const aggregator = this.dataset.getAggregator(
        !this.internalProps.layoutMap.indicatorsAsCol ? rowKeys.slice(0, -1) : rowKeys,
        this.internalProps.layoutMap.indicatorsAsCol ? colKeys.slice(0, -1) : colKeys,
        (this.internalProps.layoutMap as PivotHeaderLayoutMap).getIndicatorKey(col, row)
      );
      return aggregator.value ? aggregator.value() : undefined;
      // return ''
    } else if (this.flatDataToObjects) {
      //数据为行列树结构 根据row col获取对应的维度名称 查找到对应值
      const cellDimensionPath = this.internalProps.layoutMap.getCellHeaderPaths(col, row);
      const colKeys = cellDimensionPath.colHeaderPaths.map((colPath: any) => {
        return colPath.indicatorKey ?? colPath.value;
      });
      const rowKeys = cellDimensionPath.rowHeaderPaths.map((rowPath: any) => {
        return rowPath.indicatorKey ?? rowPath.value;
      });
      const treeNode = this.flatDataToObjects.getTreeNode(
        rowKeys,
        colKeys,
        this.internalProps.layoutMap.getBody(col, row).indicatorKey
      );
      return treeNode?.value;
    }
    const { field } = table.internalProps.layoutMap.getBody(col, row);
    return table.getFieldData(field, col, row);
  }

  // 获取原始数据
  getCellOriginRecord(col: number, row: number) {
    const table = this;
    if (table.internalProps.layoutMap.isHeader(col, row)) {
      return undefined;
    }
    if (this.dataset) {
      const cellDimensionPath = this.internalProps.layoutMap.getCellHeaderPaths(col, row);
      const colKeys = cellDimensionPath.colHeaderPaths.map((colPath: any) => {
        return colPath.indicatorKey ?? colPath.value;
      });
      const rowKeys = cellDimensionPath.rowHeaderPaths.map((rowPath: any) => {
        return rowPath.indicatorKey ?? rowPath.value;
      });
      const aggregator = this.dataset.getAggregator(
        !this.internalProps.layoutMap.indicatorsAsCol ? rowKeys.slice(0, -1) : rowKeys,
        this.internalProps.layoutMap.indicatorsAsCol ? colKeys.slice(0, -1) : colKeys,
        (this.internalProps.layoutMap as PivotHeaderLayoutMap).getIndicatorKey(col, row)
      );
      return aggregator.records;
      // return ''
    } else if (this.flatDataToObjects) {
      //数据为行列树结构 根据row col获取对应的维度名称 查找到对应值
      const cellDimensionPath = this.internalProps.layoutMap.getCellHeaderPaths(col, row);
      const colKeys = cellDimensionPath.colHeaderPaths.map((colPath: any) => {
        return colPath.indicatorKey ?? colPath.value;
      });
      const rowKeys = cellDimensionPath.rowHeaderPaths.map((rowPath: any) => {
        return rowPath.indicatorKey ?? rowPath.value;
      });
      const treeNode = this.flatDataToObjects.getTreeNode(
        rowKeys,
        colKeys,
        this.internalProps.layoutMap.getBody(col, row).indicatorKey
      );
      return treeNode?.record;
    }
    return undefined;
  }
  /**
   * 全量更新排序规则 TODO  待完善
   * @param sortRules
   */
  updateSortRules(sortRules: SortRules) {
    this.internalProps.dataConfig.sortRules = sortRules;
    this.dataset.updateSortRules(sortRules);
    // (this.internalProps.layoutMap as PivotLayoutMap).updateDataset(this.dataset);
    // 清空单元格内容
    this.scenegraph.clearCells();
    this.refreshHeader();
    // 生成单元格场景树
    this.scenegraph.createSceneGraph();
    this.render();
  }
  /**
   * 更新排序状态
   * @param pivotSortStateConfig.dimensions 排序状态维度对应关系；pivotSortStateConfig.order 排序状态
   */
  updatePivotSortState(
    pivotSortStateConfig: {
      dimensions: IDimensionInfo[];
      order: SortOrder;
    }[]
  ) {
    // // dimensions: IDimensionInfo[], order: SortOrder
    // // 清空当前 pivot sort 状态
    // const cells = this.pivotSortState.map((cell) => ({ col: cell.col, row: cell.row }));
    // this.pivotSortState.length = 0;
    // cells.map((cell) => {
    //   this.invalidateCellRange(this.getCellRange(cell.col, cell.row));
    // });

    // 更新 pivot sort 状态
    for (let i = 0; i < pivotSortStateConfig.length; i++) {
      const { dimensions, order } = pivotSortStateConfig[i];
      const cellAddress = (this.internalProps.layoutMap as PivotHeaderLayoutMap).getPivotCellAdress(dimensions);

      cellAddress &&
        this.pivotSortState.push({
          col: cellAddress.col,
          row: cellAddress.row,
          order
        });
    }

    // // 更新相关单元格样式
    // this.pivotSortState.map((cell) => {
    //   this.invalidateCellRange(this.getCellRange(cell.col, cell.row));
    // });
  }

  getPivotSortState(col: number, row: number): SortOrder {
    if (!this.pivotSortState) {
      return undefined;
    }
    const cellRange = this.getCellRange(col, row);
    for (let i = 0; i < this.pivotSortState.length; i++) {
      const { col: sortCol, row: sortRow, order } = this.pivotSortState[i];

      if (cellInRange(cellRange, sortCol, sortRow)) {
        return order;
      }
    }
    return undefined;
  }
  /**
   * 拖拽移动表头位置
   * @param source 移动源位置
   * @param target 移动目标位置
   */
  moveHeaderPosition(source: CellAddress, target: CellAddress) {
    // 调用布局类 布局数据结构调整为移动位置后的
    const moveContext = (this.internalProps.layoutMap as PivotHeaderLayoutMap).moveHeaderPosition(source, target);
    if (moveContext) {
      if (moveContext.moveType === 'column') {
        // 是扁平数据结构 需要将二维数组this.records进行调整
        if (this.options.records?.[0]?.constructor === Array) {
          for (let row = 0; row < this.internalProps.records.length; row++) {
            const sourceColumns = (this.internalProps.records[row] as unknown as number[]).splice(
              moveContext.sourceIndex - this.rowHeaderLevelCount,
              moveContext.moveSize
            );
            sourceColumns.unshift((moveContext.targetIndex as any) - this.rowHeaderLevelCount, 0 as any);
            Array.prototype.splice.apply(this.internalProps.records[row] as unknown as number[], sourceColumns);
          }
        }
        //colWidthsMap 中存储着每列的宽度 根据移动 sourceCol targetCol 调整其中的位置
        this.colWidthsMap.adjustOrder(moveContext.sourceIndex, moveContext.targetIndex, moveContext.moveSize);
        //下面代码取自refreshHeader列宽设置逻辑
        //设置列宽极限值 TODO 目前是有问题的 最大最小宽度限制 移动列位置后不正确
        for (let col = 0; col < this.internalProps.layoutMap.columnWidths.length; col++) {
          const { minWidth, maxWidth } = this.internalProps.layoutMap.columnWidths?.[col] ?? {};
          if (minWidth && ((typeof minWidth === 'number' && minWidth > 0) || typeof minWidth === 'string')) {
            this.setMinColWidth(col, minWidth);
          }
          if (maxWidth && ((typeof maxWidth === 'number' && maxWidth > 0) || typeof maxWidth === 'string')) {
            this.setMaxColWidth(col, maxWidth);
          }
        }
      } else if (moveContext.moveType === 'row') {
        // 是扁平数据结构 需要将二维数组this.records进行调整
        if (this.options.records?.[0]?.constructor === Array) {
          const sourceRows = (this.internalProps.records as unknown as number[]).splice(
            moveContext.sourceIndex - this.columnHeaderLevelCount,
            moveContext.moveSize
          );
          sourceRows.unshift((moveContext.targetIndex as any) - this.columnHeaderLevelCount, 0 as any);
          Array.prototype.splice.apply(this.internalProps.records, sourceRows);
        }
        //colWidthsMap 中存储着每列的宽度 根据移动 sourceCol targetCol 调整其中的位置
        this.rowHeightsMap.adjustOrder(moveContext.sourceIndex, moveContext.targetIndex, moveContext.moveSize);
      }
      return true;
    }
    return false;
  }
  /**
   * 表头切换层级状态
   * @param col
   * @param row
   */
  toggleHierarchyState(col: number, row: number) {
    const hierarchyState = this.getHierarchyState(col, row);
    if (hierarchyState === HierarchyState.expand) {
      this.fireListeners(PIVOT_TABLE_EVENT_TYPE.TREE_HIERARCHY_STATE_CHANGE, {
        col: col,
        row: row,
        hierarchyState: HierarchyState.collapse
      });
    } else if (hierarchyState === HierarchyState.collapse) {
      this.fireListeners(PIVOT_TABLE_EVENT_TYPE.TREE_HIERARCHY_STATE_CHANGE, {
        col: col,
        row: row,
        hierarchyState: HierarchyState.expand,
        originData: this.getCellOriginRecord(col, row)
      });
    }

    const result = (this.internalProps.layoutMap as PivotHeaderLayoutMap).toggleHierarchyState(col, row);
    //影响行数
    this.refreshRowColCount();
    // this.scenegraph.clearCells();
    // this.scenegraph.createSceneGraph();
    // this.invalidate();
    this.clearCellStyleCache();
    this.scenegraph.updateHierarchyIcon(col, row);
    this.scenegraph.updateRow(result.removeCellPositions, result.addCellPositions, result.updateCellPositions);
  }
  /**
   * 通过表头的维度值路径来计算单元格位置  getCellAddressByHeaderPaths接口更强大一些 不限表头 不限参数格式
   * @param dimensionPaths
   * @returns
   */
  getHeaderCellAddressByPath(dimensionPaths: IDimensionInfo[]): CellAddress {
    const cellAddress = (this.internalProps.layoutMap as PivotHeaderLayoutMap).getPivotCellAdress(dimensionPaths);
    return cellAddress;
  }
  /**
   * 通过表头的维度值路径来计算单元格位置
   * @param dimensionPaths
   * @returns
   */
  getCellAddressByHeaderPaths(
    dimensionPaths:
      | {
          colHeaderPaths: IDimensionInfo[];
          rowHeaderPaths: IDimensionInfo[];
          cellLocation: CellLocation;
        }
      | IDimensionInfo[]
  ): CellAddress {
    const cellAddress = (this.internalProps.layoutMap as PivotHeaderLayoutMap).getCellAdressByHeaderPath(
      dimensionPaths
    );
    return cellAddress;
  }

  /**
   * 通过传入的坐标 获取该位置当前单元格的维度路径；
   * @param coordinate 从body左上角为原点 coordinate为偏移距离 去计算单元格的headerPath；
   * 如不传coordinate坐标则按取body中左上角第一个单元格的维度路径
   * @returns
   */
  getHeaderPathByXY(coordinate?: { x: number; y: number }): ICellHeaderPaths {
    let cellAddr;
    if (coordinate) {
      cellAddr = this.getCellAt(
        coordinate.x + this.getFrozenColsWidth() + this.scrollLeft + 1,
        coordinate.y + this.getFrozenRowsHeight() + this.scrollTop + 1
      );
    } else {
      cellAddr = this.getCellAt(
        this.getFrozenColsWidth() + this.scrollLeft + 1,
        this.getFrozenRowsHeight() + this.scrollTop + 1
      );
    }
    const cellHeaderPaths = this.internalProps.layoutMap.getCellHeaderPaths(cellAddr.col, cellAddr.row);
    return cellHeaderPaths;
  }
  getHierarchyState(col: number, row: number): HierarchyState {
    return this._getHeaderLayoutMap(col, row)?.hierarchyState;
  }

  hasHierarchyTreeHeader() {
    return (this.internalProps.layoutMap as PivotHeaderLayoutMap).rowHierarchyType === 'tree';
  }

  getMenuInfo(col: number, row: number, type: string): DropDownMenuEventInfo {
    const dimensionInfos = (this.internalProps.layoutMap as PivotHeaderLayoutMap).getPivotDimensionInfo(col, row);
    const result: DropDownMenuEventInfo = {
      dimensionKey: dimensionInfos[dimensionInfos.length - 1].dimensionKey,
      value: this.getCellValue(col, row),
      cellLocation: this.getCellLocation(col, row),
      isPivotCorner: this.isCornerHeader(col, row)
    };
    return result;
  }
}
