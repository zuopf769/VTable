# Pivot data analysis

In the figure below, there are four business dimensions: region, province, year, quarter, and indicators: sales, profit.
 <div style="width: 80%; text-align: center;">
     <img src="https://lf9-dp-fe-cms-tos.byteorg.com/obj/bit-cloud/VTable/guide/pivot-analysis.png" />
    <p>Pivot table structure description</p>
  </div>
Regarding the sales data in the figure, the location is in cell [5, 5], that is, the data in column 5 and row 5: represents the sales profit value of Heilongjiang Province in the Northeast region in the Q2 quarter of 2016. That is to say, it corresponds to the row dimension value: ['Northeast', 'Heilongjiang'], the column dimension: ['2016', '2016-Q2'], and the indicator: 'Profit'. Next, we will introduce how to use VTable to implement this multi-dimensional table.

# VTable implements multi-dimensional tables
## Concept mapping to configuration items
The configuration of the pivot table above is as follows:
```
const option={
  rows:['region','province'], //row dimensions
  columns:['year','quarter'], //column dimensions
  indicators:['sales','profit'], //Indicators
  records:[ //Data source。 If summary data is passed in, use user incoming data
    {
      region:'东北',
      province:'黑龙江',
      year:'2016',
      quarter:'2016-Q1',
      sales:1243,
      profit:546
    },
    ...
  ]
}
```
This configuration is the simplest configuration for multidimensional tables. As the functional requirements become more complex, various configurations can be added for each function point to meet the needs.
## Data analysis related configuration:
|Configuration item|Type|Description|
|:----|:----|:----|
|rows|string[] \| IDimension[]|Row dimension field array, used to parse out the corresponding dimension members|
|columns|string[] \| IDimension[]|Column dimension field array, used to parse out the corresponding dimension members|
|indicators|string[] \| IIndicator[]|Specific display indicators|
|dataConfig.aggregationRules|aggregationRule[]|Aggregation value calculation rules according to row and column dimensions|
|dataConfig.derivedFieldRules|DerivedFieldRule[]|Derived fields|
|dataConfig.sortRules|sortRule[]|Sort rules|
|dataConfig.filterRules|filterRule[]|Filter Rules|
|dataConfig.totals|totalRule[]|Subtotal or total|

dataConfig configuration definition:
```
/**
 * Data processing configuration
 */
export interface IDataConfig {
  aggregationRules?: AggregationRules; //按照行列维度聚合值计算规则；
  sortRules?: SortRules; //排序规则；
  filterRules?: FilterRules; //过滤规则；
  totals?: Totals; //小计或总计；
  derivedFieldRules?: DerivedFieldRules; //派生字段定义
  ...
}
```
dataConfig application example:
### 1. Totals
[option description](../../../option/PivotTable#dataConfig.totals)
Configuration example:
```
dataConfig: {
      totals: {
        row: {
          showGrandTotals: true,
          showSubTotals: true,
          subTotalsDimensions: ['province'],
          grandTotalLabel: 'row total',
          subTotalLabel: 'Subtotal'
        },
        column: {
          showGrandTotals: true,
          showSubTotals: true,
          subTotalsDimensions: ['quarter'],
          grandTotalLabel: 'column total',
          subTotalLabel: 'Subtotal'
        }
      }
    },
```
Online demo：https://visactor.io/vtable/demo/data-analysis/pivot-analysis-total
### 2. Sorting rules
[option description](../../../option/PivotTable#dataConfig.sortRules)
Configuration example:
```
    sortRules: [
        {
          sortField: 'city',
          sortByIndicator: 'sales',
          sortType: VTable.TYPES.SortType.DESC,
          query: ['office supplies', 'pen']
        } as VTable.TYPES.SortByIndicatorRule
      ]

```
Online demo：https://visactor.io/vtable/demo/data-analysis/pivot-analysis-sort-dimension
### 3. Filter rules
[option description](../../../option/PivotTable#dataConfig.filterRules)
Configuration example:
```
filterRules: [
        {
          filterFunc: (record: Record<string, any>) => {
            return record.province !== 'Sichuan Province' || record.category !== 'Furniture';
          }
        }
      ]
```
Online demo：https://visactor.io/vtable/demo/data-analysis/pivot-analysis-filter
### 4. Aggregation method
[option description](../../../option/PivotTable#dataConfig.aggregationRules)
Configuration example:
```
    aggregationRules: [
        //The basis for doing aggregate calculations, such as sales. If there is no configuration, the cell content will be displayed by default based on the aggregate sum calculation result.
        {
          indicatorKey: 'TotalSales', //Indicator name
          field: 'Sales', //Indicator based on field
          aggregationType: VTable.TYPES.AggregationType.SUM, //Calculation type
          formatFun: sumNumberFormat
        },
        {
          indicatorKey: 'OrderCount', //Indicator name
          field: 'Sales', //Indicator based on field
          aggregationType: VTable.TYPES.AggregationType.COUNT, //Computation type
          formatFun: countNumberFormat
        },
        {
          indicatorKey: 'AverageOrderSales', //Indicator name
          field: 'Sales', //Indicator based on field
          aggregationType: VTable.TYPES.AggregationType.AVG, //Computation type
          formatFun: sumNumberFormat
        }
      ]
```
Online demo：https://visactor.io/vtable/demo/data-analysis/pivot-analysis-aggregation
### 5. Derive Field
[option description](../../../option/PivotTable#dataConfig.derivedFieldRules)
Configuration example:
```
    derivedFieldRules: [
      {
        fieldName: 'Year',
        derivedFunc: VTable.DataStatistics.dateFormat('Order Date', '%y', true),
      },
      {
        fieldName: 'Month',
        derivedFunc: VTable.DataStatistics.dateFormat('Order Date', '%n', true),
      }
    ]
```
Online demo：https://visactor.io/vtable/demo/data-analysis/pivot-analysis-derivedField
## Data analysis process
Dependent configuration: dimensions, indicators and dataConfig.
### The process of traversing data:
Traverse the records once, parse the row header dimension value to display the header cell, distribute all data in the records to the corresponding row and column path set, and calculate the aggregate value of the body part indicator cell.
 <div style="width: 80%; text-align: center;">
     <img src="https://lf9-dp-fe-cms-tos.byteorg.com/obj/bit-cloud/VTable/guide/data-analysis-process.png" />
    <p>Data analysis process</p>
  </div>

### Data dimension tree
According to the above traversed structure, a dimension tree will be generated, from which the value of the cell and the original data entry of the value can be found.
 <div style="width: 80%; text-align: center;">
     <img src="https://lf9-dp-fe-cms-tos.byteorg.com/obj/bit-cloud/VTable/guide/dimension-tree.png" />
    <p>Organize dimension tree to aggregate data</p>
  </div>
  After analysis and calculation of record grouping and aggregation, the corresponding relationship between the cell data in the table and the records data source is finally presented:
   <div style="width: 80%; text-align: center;">
     <img src="https://lf9-dp-fe-cms-tos.byteorg.com/obj/bit-cloud/VTable/guide/recordsToCell.png" />
    <p>Correspondence between data source entries and cells</p>
  </div>

### 自定义维度树
虽然具有分析能力的多维表格可以自动分析各个维度的维度值组成行列表头的树形结构，并且可以根据`dataConfig.sortRules`进行排序，但具有复杂业务逻辑的场景还是期望可以能够**自定义行列表头维度值**及顺序。那么可以通过rowTree和columnTree来实现这些业务需求场景。
   <div style="width: 80%; text-align: center;">
     <img src="https://lf9-dp-fe-cms-tos.byteorg.com/obj/bit-cloud/VTable/guide/custom-tree.png" />
    <p>custom rowTree columnTree</p>
  </div>

自定义树的配置：
```
const option = {
    rowTree: [{
        dimensionKey: 'region',
        value: '中南',
        children: [
            {
                dimensionKey: 'province',
                value: '广东',
            },
            {
                dimensionKey: 'province',
                value: '广西',
            }
        ]
    },
    {
        dimensionKey: 'region',
        value: '华东',
        children: [
            {
                dimensionKey: 'province',
                value: '上海',
            },
            {
                dimensionKey: 'province',
                value: '山东',
            }
        ]
    }],
    columnTree: [{
        dimensionKey: 'year',
        value: '2016',
        children: [
            {
                dimensionKey: 'quarter',
                value: '2016-Q1',
                children: [
                    {
                        indicatorKey: 'sales',
                        value: 'sales'
                    },
                    {
                        indicatorKey: 'profit',
                        value: 'profit'
                    }
                ]
            },
            {
                dimensionKey: 'quarter',
                value: '2016-Q2',
                children: [
                    {
                        indicatorKey: 'sales',
                        value: 'sales'
                    },
                    {
                        indicatorKey: 'profit',
                        value: 'profit'
                    }
                ]
            }
        ]
    }],
    indicators: ['sales', 'profit'],
    //enableDataAnalysis:true,
    corner: {
        titleOnDimension: 'none'
    },
    records: [
        {
            region: '中南',
            province: '广东',
            year: '2016',
            quarter: '2016-Q1',
            sales: 1243,
            profit: 546
        },
        {
            region: '中南',
            province: '广东',
            year: '2016',
            quarter: '2016-Q2',
            sales: 2243,
            profit: 169
        }, {
            region: '中南',
            province: '广西',
            year: '2016',
            quarter: '2016-Q1',
            sales: 3043,
            profit: 1546
        },
        {
            region: '中南',
            province: '广西',
            year: '2016',
            quarter: '2016-Q2',
            sales: 1463,
            profit: 609
        },
        {
            region: '华东',
            province: '上海',
            year: '2016',
            quarter: '2016-Q1',
            sales: 4003,
            profit: 1045
        },
        {
            region: '华东',
            province: '上海',
            year: '2016',
            quarter: '2016-Q2',
            sales: 5243,
            profit: 3169
        }, {
            region: '华东',
            province: '山东',
            year: '2016',
            quarter: '2016-Q1',
            sales: 4543,
            profit: 3456
        },
        {
            region: '华东',
            province: '山东',
            year: '2016',
            quarter: '2016-Q2',
            sales: 6563,
            profit: 3409
        }
    ]
};
```
VTable official website example: https://visactor.io/vtable/demo/table-type/pivot-table.

The complexity of the custom tree lies in the formation of the row, column and dimension trees. You can choose to use it according to the business scenario. If you have complex sorting, aggregation or paging rules, you can choose to use a custom method.

**Note: If you choose the custom tree configuration method, there will be no data aggregation capability, that is, one of the matched data entries will be used as the cell indicator value. **