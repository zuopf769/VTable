import type { IGraphic } from '@visactor/vrender';
import type { ProgressBarStyle } from '../../body-helper/style/ProgressBarStyle';
import { CartesianAxis } from '../../components/axis/axis';
import { getStyleTheme } from '../../core/tableHelper';
import type { BaseTableAPI } from '../../ts-types/base-table';
import type { IProgressbarColumnBodyDefine } from '../../ts-types/list-table/define/progressbar-define';
import { dealWithCustom } from '../component/custom';
import type { Group } from '../graphic/group';
import type { Icon } from '../graphic/icon';
import { updateImageCellContentWhileResize } from '../group-creater/cell-type/image-cell';
import { createProgressBarCell } from '../group-creater/cell-type/progress-bar-cell';
import { createSparkLineCellGroup } from '../group-creater/cell-type/spark-line-cell';
import { resizeCellGroup } from '../group-creater/column-helper';
import type { Scenegraph } from '../scenegraph';
import { getCellMergeInfo } from '../utils/get-cell-merge';
import { getProp } from '../utils/get-prop';
import { isMergeCellGroup } from '../utils/is-merge-cell-group';
import { getQuadProps } from '../utils/padding';
import { updateCellContentWidth } from '../utils/text-icon-layout';
import { computeRowHeight, computeRowsHeight } from './compute-row-height';
import { updateCellHeightForRow } from './update-height';
import { getHierarchyOffset } from '../utils/get-hierarchy-offset';
// import { updateAutoRowHeight } from './auto-height';

/**
 * @description: 更新指定列列宽，在拖拽调整列宽中使用
 * @param {Scenegraph} scene
 * @param {number} col
 * @param {number} detaX
 * @return {*}
 */
export function updateColWidth(scene: Scenegraph, col: number, detaX: number) {
  scene.table.setColWidth(col, scene.table.getColWidth(col) + detaX, true);

  const autoRowHeight = scene.table.heightMode === 'autoHeight';
  // deal with corner header or column header
  const colOrCornerHeaderColumn = scene.getColGroup(col, true) as Group;
  if (colOrCornerHeaderColumn) {
    updateColunmWidth(colOrCornerHeaderColumn, detaX, autoRowHeight, 'col-corner', scene);
  }
  // deal with row header or body or right frozen cells
  const rowHeaderOrBodyColumn = scene.getColGroup(col) as Group;
  if (rowHeaderOrBodyColumn) {
    updateColunmWidth(rowHeaderOrBodyColumn, detaX, autoRowHeight, 'row-body', scene);
  }

  const leftBottomColumn = scene.getColGroupInLeftBottomCorner(col);
  // deal with left bottom frozen cells
  if (leftBottomColumn) {
    updateColunmWidth(leftBottomColumn, detaX, autoRowHeight, 'left-bottom', scene);
  }
  // deal with bottom frozen cells
  const bottomColumn = scene.getColGroupInBottom(col);
  if (bottomColumn) {
    updateColunmWidth(bottomColumn, detaX, autoRowHeight, 'bottom', scene);
  }
  // deal with right bottom frozen cells
  const rightBottomColumn = scene.getColGroupInRightBottomCorner(col);
  if (rightBottomColumn) {
    updateColunmWidth(bottomColumn, detaX, autoRowHeight, 'right-bottom', scene);
  }

  // 更新剩余列位置
  if (col < scene.frozenColCount) {
    scene.cornerHeaderGroup.forEachChildrenSkipChild((column: Group, index) => {
      if (column.col > col) {
        column.setAttribute('x', column.attribute.x + detaX);
      }
    });
    scene.rowHeaderGroup.forEachChildrenSkipChild((column: Group, index) => {
      if (column.col > col) {
        column.setAttribute('x', column.attribute.x + detaX);
      }
    });
  } else {
    scene.colHeaderGroup.forEachChildrenSkipChild((column: Group, index) => {
      if (column.col > col) {
        column.setAttribute('x', column.attribute.x + detaX);
      }
    });
    scene.bodyGroup.forEachChildrenSkipChild((column: Group, index) => {
      if (column.col > col) {
        column.setAttribute('x', column.attribute.x + detaX);
      }
    });
  }

  if (leftBottomColumn) {
    scene.leftBottomCornerGroup.forEachChildrenSkipChild((column: Group, index) => {
      if (column.col > col) {
        column.setAttribute('x', column.attribute.x + detaX);
      }
    });
  }
  if (bottomColumn) {
    scene.bottomFrozenGroup.forEachChildrenSkipChild((column: Group, index) => {
      if (column.col > col) {
        column.setAttribute('x', column.attribute.x + detaX);
      }
    });
  }
  if (rightBottomColumn) {
    scene.rightBottomCornerGroup.forEachChildrenSkipChild((column: Group, index) => {
      if (column.col > col) {
        column.setAttribute('x', column.attribute.x + detaX);
      }
    });
  }

  // scene.table.setColWidth(col, rowHeaderOrBodyColumn.attribute.width, true);
}

function updateColunmWidth(
  columnGroup: Group,
  detaX: number,
  autoRowHeight: boolean,
  mode: 'col-corner' | 'row-body' | 'bottom' | 'left-bottom' | 'right-bottom',
  scene: Scenegraph
) {
  let needRerangeRow = false;
  // const colOrCornerHeaderColumn = scene.getColGroup(col, true) as Group;
  const oldColumnWidth = columnGroup?.attribute.width ?? 0;
  columnGroup?.setAttribute('width', oldColumnWidth + detaX);
  // 更新单元格宽度
  columnGroup?.forEachChildren((cell: Group, index: number) => {
    const isHeightChange = updateCellWidth(
      scene,
      cell,
      cell.col,
      cell.row,
      oldColumnWidth,
      oldColumnWidth + detaX,
      detaX,
      mode === 'row-body' ? cell.col < scene.table.rowHeaderLevelCount : true,
      autoRowHeight
    );
    if (isHeightChange) {
      const mergeInfo = getCellMergeInfo(scene.table, cell.col, cell.row);
      if (mergeInfo && mergeInfo.end.row - mergeInfo.start.row) {
        for (let row = mergeInfo.start.row; row <= mergeInfo.end.row; row++) {
          resetRowHeight(scene, row);
        }
      } else {
        resetRowHeight(scene, cell.row);
      }
      needRerangeRow = true;
    }
  });

  if (needRerangeRow) {
    let newTotalHeight = 0;
    let colGroup;
    let oldContainerHeight;
    let row;
    for (let col = 0; col < scene.table.colCount; col++) {
      // const colGroup = scene.getColGroup(col, true);
      if (mode === 'col-corner') {
        row = 0;
        colGroup = scene.getColGroup(col, true);
        oldContainerHeight = scene.colHeaderGroup.attribute.height ?? 0;
      } else if (mode === 'row-body') {
        row = scene.table.frozenRowCount;
        colGroup = scene.getColGroup(col, false);
        oldContainerHeight = scene.bodyGroup.attribute.height ?? 0;
      } else if (mode === 'bottom') {
        row = scene.table.rowCount - scene.table.bottomFrozenRowCount;
        colGroup = scene.getColGroupInBottom(col);
        oldContainerHeight = scene.bottomFrozenGroup.attribute.height ?? 0;
      } else if (mode === 'left-bottom') {
        row = scene.table.rowCount - scene.table.bottomFrozenRowCount;
        colGroup = scene.getColGroupInLeftBottomCorner(col);
        oldContainerHeight = scene.leftBottomCornerGroup.attribute.height ?? 0;
      } else if (mode === 'right-bottom') {
        row = scene.table.rowCount - scene.table.bottomFrozenRowCount;
        colGroup = scene.getColGroupInRightBottomCorner(col);
        oldContainerHeight = scene.rightBottomCornerGroup.attribute.height ?? 0;
      }
      let y = 0;
      colGroup.forEachChildren((cellGroup: Group) => {
        // if (cellGroup.role !== 'cell') {
        //   cellGroup.setAttribute('y', y);
        //   y += scene.table.getRowHeight(cellGroup.row) ?? 0;
        //   return;
        // }
        // y += cellGroup.attribute.height ?? 0;
        cellGroup.setAttribute('y', y);
        y += scene.table.getRowHeight(cellGroup.row) ?? 0;
      });
      newTotalHeight = y;
    }
    scene.updateContainerHeight(row, newTotalHeight - oldContainerHeight);
  }
}

/**
 * @description: 更新单个单元格宽度
 * @return {*}
 */
function updateCellWidth(
  scene: Scenegraph,
  cell: Group,
  col: number,
  row: number,
  oldWidth: number, // old width, not dist
  distWidth: number, // old width, not dist
  detaX: number,
  isHeader: boolean,
  // autoColWidth: boolean,
  autoRowHeight: boolean
): boolean {
  if (cell.attribute.width === distWidth) {
    return false;
  }

  cell.setAttribute('width', distWidth);
  // const mergeInfo = getCellMergeInfo(scene.table, col, row);
  // if (mergeInfo && mergeInfo.start.row !== row) {
  //   return false;
  // }
  const cellGroup = cell;
  // const distWidth = width + detaX;

  if (!cellGroup) {
    // 合并单元格非主单元格，不处理
    return false;
  }

  // 更新单元格布局
  const type = scene.table.isHeader(col, row)
    ? scene.table._getHeaderLayoutMap(col, row).headerType
    : scene.table.getBodyColumnType(col, row);
  let isHeightChange = false;
  if (type === 'progressbar') {
    // 目前先采用重新生成节点的方案
    const columnDefine = scene.table.getBodyColumnDefine(col, row) as IProgressbarColumnBodyDefine;
    const style = scene.table._getCellStyle(col, row) as ProgressBarStyle;
    const value = scene.table.getCellValue(col, row);
    const dataValue = scene.table.getCellOriginValue(col, row);
    const padding = getQuadProps(getProp('padding', style, col, row, scene.table));

    const newBarCell = createProgressBarCell(
      columnDefine,
      style,
      cellGroup.attribute.width,
      // cellGroup.attribute.height,
      value,
      dataValue,
      col,
      row,
      padding,
      scene.table
    );

    const oldBarCell = cellGroup.getChildByName('progress-bar') as Group;
    // cell.replaceChild(newBarCell, oldBarCell);
    cellGroup.insertBefore(newBarCell, oldBarCell);
    cellGroup.removeChild(oldBarCell);
    oldBarCell.removeAllChild();
    oldBarCell.release();
  } else if (type === 'sparkline') {
    // 目前先采用重新生成节点的方案
    cellGroup.removeAllChild();
    const headerStyle = scene.table._getCellStyle(col, row);
    const padding = getQuadProps(getProp('padding', headerStyle, col, row, scene.table));
    createSparkLineCellGroup(
      cellGroup,
      cellGroup.parent,
      cellGroup.attribute.x,
      cellGroup.attribute.y,
      col,
      row,
      cellGroup.attribute.width,
      cellGroup.attribute.height,
      padding,
      scene.table,
      getStyleTheme(headerStyle, scene.table, col, row, getProp).theme
    );
  } else if (type === 'image' || type === 'video') {
    // // 只更新背景边框
    // const rect = cell.firstChild as Rect;
    // rect.setAttribute('width', cell.attribute.width);
    updateImageCellContentWhileResize(cellGroup, col, row, scene.table);
  } else if (cellGroup.firstChild?.name === 'axis') {
    // recreate axis component
    const axisConfig = scene.table.internalProps.layoutMap.getAxisConfigInPivotChart(col, row);
    if (axisConfig) {
      const axis = new CartesianAxis(axisConfig, cellGroup.attribute.width, cellGroup.attribute.height, scene.table);
      cellGroup.clear();
      cellGroup.appendChild(axis.component);
      axis.overlap();
    }
  } else if (cell.firstChild?.name === 'axis') {
    (cell.firstChild as any)?.originAxis.resize(cell.attribute.width, cell.attribute.height);
  } else {
    let renderDefault = true;
    const customContainer = cell.getChildByName('custom-container') as Group;
    if (customContainer) {
      let customElementsGroup;
      customContainer.removeAllChild();
      cell.removeChild(customContainer);

      let customRender;
      let customLayout;
      const cellType = scene.table.getCellLocation(col, row);
      if (cellType !== 'body') {
        const define = scene.table.getHeaderDefine(col, row);
        customRender = define?.headerCustomRender;
        customLayout = define?.headerCustomLayout;
      } else {
        const define = scene.table.getBodyColumnDefine(col, row);
        customRender = define?.customRender || scene.table.customRender;
        customLayout = define?.customLayout;
      }

      if (customLayout || customRender) {
        // const { autoRowHeight } = table.internalProps;
        const customResult = dealWithCustom(
          customLayout,
          customRender,
          col,
          row,
          cellGroup.attribute.width,
          cellGroup.attribute.height,
          false,
          scene.table.heightMode === 'autoHeight',
          scene.table
        );
        customElementsGroup = customResult.elementsGroup;
        renderDefault = customResult.renderDefault;
        isHeightChange = true;
      }

      if (cell.childrenCount > 0) {
        cell.insertBefore(customElementsGroup, cell.firstChild);
      } else {
        cell.appendChild(customElementsGroup);
      }
    }

    if (renderDefault) {
      // 处理文字
      const style = scene.table._getCellStyle(col, row);
      isHeightChange = updateMergeCellContentWidth(
        cellGroup,
        distWidth,
        detaX,
        autoRowHeight,
        getQuadProps(style.padding as number),
        style.textAlign,
        style.textBaseline,
        scene.table
      );
    }
  }

  return autoRowHeight ? isHeightChange : false;
}

function updateMergeCellContentWidth(
  cellGroup: Group,
  distWidth: number,
  detaX: number,
  autoRowHeight: boolean,
  padding: [number, number, number, number],
  textAlign: CanvasTextAlign,
  textBaseline: CanvasTextBaseline,
  table: BaseTableAPI
) {
  if (isMergeCellGroup(cellGroup)) {
    distWidth = 0;
    let isHeightChange = false;
    for (let col = cellGroup.mergeStartCol; col <= cellGroup.mergeEndCol; col++) {
      distWidth += table.getColWidth(col);
    }
    let cellHeight = 0;
    for (let row = cellGroup.mergeStartRow; row <= cellGroup.mergeEndRow; row++) {
      cellHeight += table.getRowHeight(row);
    }

    for (let col = cellGroup.mergeStartCol; col <= cellGroup.mergeEndCol; col++) {
      for (let row = cellGroup.mergeStartRow; row <= cellGroup.mergeEndRow; row++) {
        const singleCellGroup = table.scenegraph.getCell(col, row);
        singleCellGroup.forEachChildren((child: IGraphic) => {
          child.setAttributes({
            dx: 0,
            dy: 0
          });
        });
        const changed = updateCellContentWidth(
          singleCellGroup,
          distWidth,
          cellHeight,
          detaX,
          autoRowHeight,
          padding,
          textAlign,
          textBaseline,
          table.scenegraph
        );

        // reset hierarchy offset
        const hierarchyOffset = getHierarchyOffset(singleCellGroup.col, singleCellGroup.row, table);
        if (hierarchyOffset) {
          const text = singleCellGroup.getChildByName('text');
          const icon = singleCellGroup.getChildByName('expand') || singleCellGroup.getChildByName('collapse');
          // icon-left deal with hierarchy offset, no need add to text dx
          if (icon?.role !== 'icon-left' && text) {
            text.setAttribute('dx', hierarchyOffset);
          }
        }

        const rangeHeight = table.getRowHeight(row);
        const rangeWidth = table.getColWidth(col);

        // const { width: contentWidth } = cellGroup.attribute;
        singleCellGroup.contentWidth = distWidth;

        resizeCellGroup(
          singleCellGroup,
          rangeWidth,
          rangeHeight,
          {
            start: {
              col: cellGroup.mergeStartCol,
              row: cellGroup.mergeStartRow
            },
            end: {
              col: cellGroup.mergeEndCol,
              row: cellGroup.mergeEndRow
            }
          },
          table
        );
        isHeightChange = isHeightChange || changed;
      }
    }
    return isHeightChange;
  }
  return updateCellContentWidth(
    cellGroup,
    distWidth,
    table.getRowHeight(cellGroup.row),
    detaX,
    autoRowHeight,
    padding,
    textAlign,
    textBaseline,
    table.scenegraph
  );
}

/**
 * @description: 重置指定行行高
 * @param {Scenegraph} scene
 * @param {number} row
 * @return {*}
 */
function resetRowHeight(scene: Scenegraph, row: number) {
  // 获取高度
  const maxHeight = computeRowHeight(row, 0, scene.table.colCount - 1, scene.table);
  // 更新table行高存储
  scene.table.setRowHeight(row, maxHeight, true);

  // 更新高度
  for (let col = 0; col < scene.table.colCount; col++) {
    const distHeight = maxHeight;
    const cell = scene.highPerformanceGetCell(col, row);
    if (cell.role === 'empty') {
      return;
    }

    updateCellHeightForRow(
      scene,
      cell,
      col,
      row,
      distHeight,
      distHeight - cell.attribute.height,
      scene.table.isHeader(col, row)
    );
  }
}
