import * as VTable from '../../src';
const ListTable = VTable.ListTable;
const CONTAINER_ID = 'vTable';

export function createTable() {
  fetch('https://lf9-dp-fe-cms-tos.byteorg.com/obj/bit-cloud/VTable/North_American_Superstore_Pivot_data.json')
    .then(res => res.json())
    .then(data => {
      const option: VTable.PivotTableConstructorOptions = {
        container: document.getElementById(CONTAINER_ID),
        records: data,
        indicatorTitle: '指标名称',
        indicatorsAsCol: false,
        menu: {
          contextMenuItems: ['复制单元格内容', '查询详情']
        },
        columnTree: [
          {
            dimensionKey: 'City',
            value: 'Aberdeen'
          },
          {
            dimensionKey: 'City',
            value: 'Abilene'
          },
          {
            dimensionKey: 'City',
            value: 'Akron'
          },
          {
            dimensionKey: 'City',
            value: 'Albuquerque'
          },
          {
            dimensionKey: 'City',
            value: 'Alexandria'
          },
          {
            dimensionKey: 'City',
            value: 'Allen'
          },
          {
            dimensionKey: 'City',
            value: 'Allentown'
          },
          {
            dimensionKey: 'City',
            value: 'Altoona'
          },
          {
            dimensionKey: 'City',
            value: 'Amarillo'
          },
          {
            dimensionKey: 'City',
            value: 'Anaheim'
          },
          {
            dimensionKey: 'City',
            value: 'Andover'
          },
          {
            dimensionKey: 'City',
            value: 'Ann Arbor'
          },
          {
            dimensionKey: 'City',
            value: 'Antioch'
          },
          {
            dimensionKey: 'City',
            value: 'Apopka'
          },
          {
            dimensionKey: 'City',
            value: 'Apple Valley'
          },
          {
            dimensionKey: 'City',
            value: 'Appleton'
          },
          {
            dimensionKey: 'City',
            value: 'Arlington'
          },
          {
            dimensionKey: 'City',
            value: 'Arlington Heights'
          },
          {
            dimensionKey: 'City',
            value: 'Arvada'
          },
          {
            dimensionKey: 'City',
            value: 'Asheville'
          },
          {
            dimensionKey: 'City',
            value: 'Athens'
          },
          {
            dimensionKey: 'City',
            value: 'Atlanta'
          },
          {
            dimensionKey: 'City',
            value: 'Atlantic City'
          },
          {
            dimensionKey: 'City',
            value: 'Auburn'
          },
          {
            dimensionKey: 'City',
            value: 'Aurora'
          },
          {
            dimensionKey: 'City',
            value: 'Austin'
          },
          {
            dimensionKey: 'City',
            value: 'Avondale'
          },
          {
            dimensionKey: 'City',
            value: 'Bakersfield'
          },
          {
            dimensionKey: 'City',
            value: 'Baltimore'
          },
          {
            dimensionKey: 'City',
            value: 'Bangor'
          },
          {
            dimensionKey: 'City',
            value: 'Bartlett'
          },
          {
            dimensionKey: 'City',
            value: 'Bayonne'
          },
          {
            dimensionKey: 'City',
            value: 'Baytown'
          },
          {
            dimensionKey: 'City',
            value: 'Beaumont'
          },
          {
            dimensionKey: 'City',
            value: 'Bedford'
          },
          {
            dimensionKey: 'City',
            value: 'Belleville'
          },
          {
            dimensionKey: 'City',
            value: 'Bellevue'
          },
          {
            dimensionKey: 'City',
            value: 'Bellingham'
          },
          {
            dimensionKey: 'City',
            value: 'Bethlehem'
          },
          {
            dimensionKey: 'City',
            value: 'Beverly'
          },
          {
            dimensionKey: 'City',
            value: 'Billings'
          },
          {
            dimensionKey: 'City',
            value: 'Bloomington'
          },
          {
            dimensionKey: 'City',
            value: 'Boca Raton'
          },
          {
            dimensionKey: 'City',
            value: 'Boise'
          },
          {
            dimensionKey: 'City',
            value: 'Bolingbrook'
          },
          {
            dimensionKey: 'City',
            value: 'Bossier City'
          },
          {
            dimensionKey: 'City',
            value: 'Bowling Green'
          },
          {
            dimensionKey: 'City',
            value: 'Boynton Beach'
          },
          {
            dimensionKey: 'City',
            value: 'Bozeman'
          },
          {
            dimensionKey: 'City',
            value: 'Brentwood'
          }
        ],
        rowTree: [
          {
            dimensionKey: 'Category',
            value: 'Office Supplies',
            children: [
              {
                indicatorKey: 'Quantity'
              },
              {
                indicatorKey: 'Sales'
              },
              {
                indicatorKey: 'Profit'
              }
            ]
          },
          {
            dimensionKey: 'Category',
            value: 'Technology',
            children: [
              {
                indicatorKey: 'Quantity'
              },
              {
                indicatorKey: 'Sales'
              },
              {
                indicatorKey: 'Profit'
              }
            ]
          },
          {
            dimensionKey: 'Category',
            value: 'Furniture',
            children: [
              {
                indicatorKey: 'Quantity'
              },
              {
                indicatorKey: 'Sales'
              },
              {
                indicatorKey: 'Profit'
              }
            ]
          }
        ],
        columns: [
          {
            dimensionKey: 'City',
            title: 'City',
            headerStyle: {
              textStick: true,
              bgColor: '#356b9c',
              color: '#00ffff'
            },
            width: 'auto'
          }
        ],
        rows: [
          {
            dimensionKey: 'Category',
            title: 'Category',
            headerStyle: {
              textStick: true
            },
            width: 'auto'
          },
          {
            dimensionKey: 'Category',
            title: 'Category',
            headerStyle: {
              textStick: true
            },
            width: 'auto'
          }
        ],
        indicators: [
          {
            indicatorKey: 'Quantity',
            title: 'Quantity',
            width: 'auto',
            showSort: false,
            style: {
              color: 'black',
              fontWeight: 'bold'
            },
            headerStyle: {
              color: 'black',
              textStick: true,
              fontWeight: 'bold'
            }
          },
          {
            indicatorKey: 'Sales',
            title: 'Sales',
            width: 'auto',
            showSort: false,
            format: rec => {
              return Number(rec['230517143221040']).toFixed(2);
            },
            style: {
              color: 'blue',
              fontWeight: 'bold'
            },
            headerStyle: {
              textStick: true,
              color: 'blue'
            }
          },
          {
            indicatorKey: 'Profit',
            title: 'Profit',
            width: 'auto',
            showSort: false,
            format: rec => {
              return Number(rec['230517143221041']).toFixed(2);
            },
            style: {
              color: 'pink'
            },
            headerStyle: {
              color: 'pink',
              textStick: true
            }
          }
        ],
        corner: {
          titleOnDimension: 'row',
          headerStyle: {
            bgColor: 'yellow',
            color: 'red'
          }
        },
        widthMode: 'standard'
      };
      const tableInstance = new VTable.PivotTable(option);
      // 只为了方便控制太调试用，不要拷贝
      window.tableInstance = tableInstance;

      tableInstance.on('mouseenter_cell', args => {
        const { col, row } = args;
        const rect = tableInstance.getVisibleCellRangeRelativeRect({ col, row });
        tableInstance.showTooltip(col, row, {
          content: '你好！',
          position: {
            x: rect.left,
            y: rect.bottom
          },
          referencePosition: { rect, placement: VTable.TYPES.Placement.right }, //TODO
          className: 'defineTooltip',
          style: {
            bgColor: 'black',
            color: 'white',
            fontSize: 14,
            fontFamily: 'STKaiti',
            arrowMark: true
          }
        });
      });
    })
    // eslint-disable-next-line no-console
    .catch(e => console.log(e));
}
